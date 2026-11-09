"""
Lógica de negócio da Reverse Vending Machine (RVM).

A RVM recebe embalagens, usa o classificador (treino.py / app.py) para
identificar o material e decide se aceita o item. Itens aceitos geram
crédito para o usuário e ocupam espaço no compartimento correspondente.
Ao final da sessão, o saldo vira um voucher resgatável.

Tudo fica salvo em SQLite (rvm.db), para que o painel do operador mostre
estatísticas e o nível de cada compartimento.
"""

from __future__ import annotations

import secrets
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "rvm.db"

# Confiança mínima (%) para a máquina aceitar o item. Abaixo disso o item
# é devolvido — é melhor recusar do que pagar por uma embalagem errada.
MIN_CONFIDENCE = 70.0

# Materiais que a máquina aceita: valor do crédito (R$) e capacidade do
# compartimento (em itens). Os valores são ilustrativos — ajuste à vontade.
ACCEPTED: dict[str, dict] = {
    "plastic": {"value": 0.10, "capacity": 200},
    "metal": {"value": 0.15, "capacity": 300},
    "glass": {"value": 0.25, "capacity": 100},
}

# Materiais recusados, com a orientação mostrada ao usuário.
REJECT_REASONS: dict[str, str] = {
    "paper": "Papel não é aceito pela máquina. Descarte no coletor azul.",
    "cardboard": "Papelão não é aceito pela máquina. Descarte no coletor azul.",
    "trash": "Item não reciclável. Descarte no lixo comum.",
    "organic": "Orgânico não vai na máquina. Use a lixeira marrom ou uma composteira.",
    "biological": "Orgânico não vai na máquina. Use a lixeira marrom ou uma composteira.",
    "nao_residuo": "Item não reconhecido como embalagem.",
}

# Mensagem única para foto sem embalagem reconhecida (classe nao_residuo ou confiança baixa).
NAO_RECONHECIDO = "Não reconheci uma embalagem nesta foto."

# Avisa o operador quando o compartimento passar deste percentual.
FULL_WARNING_PCT = 85.0


@dataclass
class Decision:
    accepted: bool
    reason: str
    value: float = 0.0


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                started_at  TEXT NOT NULL,
                finished_at TEXT,
                total       REAL NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL REFERENCES sessions(id),
                material    TEXT NOT NULL,
                confidence  REAL NOT NULL,
                accepted    INTEGER NOT NULL,
                value       REAL NOT NULL,
                reason      TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS vouchers (
                code        TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL REFERENCES sessions(id),
                amount      REAL NOT NULL,
                created_at  TEXT NOT NULL,
                redeemed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS bins (
                material    TEXT PRIMARY KEY,
                count       INTEGER NOT NULL DEFAULT 0,
                capacity    INTEGER NOT NULL
            );
            """
        )
        for material, cfg in ACCEPTED.items():
            conn.execute(
                "INSERT INTO bins (material, capacity) VALUES (?, ?) "
                "ON CONFLICT(material) DO UPDATE SET capacity = excluded.capacity",
                (material, cfg["capacity"]),
            )


def nao_reconhecido(material: str, confidence: float) -> bool:
    """Regra única: classe nao_residuo ou confiança abaixo do mínimo."""
    return material == "nao_residuo" or confidence < MIN_CONFIDENCE


def decide(material: str, confidence: float, bin_full: bool) -> Decision:
    """Regra de aceitação de um item já classificado pelo modelo."""
    if nao_reconhecido(material, confidence):
        return Decision(False, NAO_RECONHECIDO)
    if material in REJECT_REASONS:
        return Decision(False, REJECT_REASONS[material])
    if material not in ACCEPTED:
        return Decision(False, "Material não aceito por esta máquina.")
    if bin_full:
        return Decision(False, "Compartimento cheio. Chame um operador.")
    return Decision(True, "Embalagem aceita!", ACCEPTED[material]["value"])


def start_session() -> str:
    session_id = secrets.token_urlsafe(12)
    with db() as conn:
        conn.execute("INSERT INTO sessions (id, started_at) VALUES (?, ?)", (session_id, _now()))
    return session_id


class SessionError(Exception):
    pass


def _open_session(conn: sqlite3.Connection, session_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if row is None:
        raise SessionError("Sessão inexistente.")
    if row["finished_at"] is not None:
        raise SessionError("Sessão já finalizada.")
    return row


def insert_item(session_id: str, material: str, confidence: float) -> dict:
    """Registra uma embalagem inserida e devolve a decisão + saldo atualizado."""
    with db() as conn:
        _open_session(conn, session_id)

        bin_row = conn.execute("SELECT count, capacity FROM bins WHERE material = ?", (material,)).fetchone()
        bin_full = bin_row is not None and bin_row["count"] >= bin_row["capacity"]

        decision = decide(material, confidence, bin_full)

        conn.execute(
            "INSERT INTO items (session_id, material, confidence, accepted, value, reason, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session_id, material, confidence, int(decision.accepted), decision.value, decision.reason, _now()),
        )
        if decision.accepted:
            conn.execute("UPDATE bins SET count = count + 1 WHERE material = ?", (material,))
            conn.execute("UPDATE sessions SET total = total + ? WHERE id = ?", (decision.value, session_id))

        total = conn.execute("SELECT total FROM sessions WHERE id = ?", (session_id,)).fetchone()["total"]

    return {
        "accepted": decision.accepted,
        "reason": decision.reason,
        "value": round(decision.value, 2),
        "balance": round(total, 2),
    }


def finish_session(session_id: str) -> dict:
    """Encerra a sessão e emite um voucher com o saldo (se houver)."""
    with db() as conn:
        session = _open_session(conn, session_id)
        conn.execute("UPDATE sessions SET finished_at = ? WHERE id = ?", (_now(), session_id))

        accepted = conn.execute(
            "SELECT material, COUNT(*) AS n FROM items WHERE session_id = ? AND accepted = 1 GROUP BY material",
            (session_id,),
        ).fetchall()

        amount = round(session["total"], 2)
        code = None
        if amount > 0:
            code = "RVM-" + secrets.token_hex(3).upper() + "-" + secrets.token_hex(3).upper()
            conn.execute(
                "INSERT INTO vouchers (code, session_id, amount, created_at) VALUES (?, ?, ?, ?)",
                (code, session_id, amount, _now()),
            )

    return {
        "voucher": code,
        "amount": amount,
        "items": {row["material"]: row["n"] for row in accepted},
    }


def redeem_voucher(code: str) -> dict:
    with db() as conn:
        row = conn.execute("SELECT * FROM vouchers WHERE code = ?", (code.strip().upper(),)).fetchone()
        if row is None:
            return {"ok": False, "error": "Voucher não encontrado."}
        if row["redeemed_at"] is not None:
            return {"ok": False, "error": f"Voucher já resgatado em {row['redeemed_at']}."}
        conn.execute("UPDATE vouchers SET redeemed_at = ? WHERE code = ?", (_now(), row["code"]))
    return {"ok": True, "amount": row["amount"]}


def empty_bin(material: str) -> bool:
    with db() as conn:
        cur = conn.execute("UPDATE bins SET count = 0 WHERE material = ?", (material,))
        return cur.rowcount > 0


def bin_status() -> list[dict]:
    with db() as conn:
        rows = conn.execute("SELECT material, count, capacity FROM bins ORDER BY material").fetchall()
    result = []
    for row in rows:
        pct = 100.0 * row["count"] / row["capacity"] if row["capacity"] else 0.0
        result.append(
            {
                "material": row["material"],
                "count": row["count"],
                "capacity": row["capacity"],
                "percent": round(pct, 1),
                "warning": pct >= FULL_WARNING_PCT,
                "full": row["count"] >= row["capacity"],
            }
        )
    return result


def stats() -> dict:
    with db() as conn:
        totals = conn.execute(
            "SELECT COUNT(*) AS total, COALESCE(SUM(accepted), 0) AS accepted, "
            "COALESCE(SUM(value), 0) AS paid FROM items"
        ).fetchone()
        by_material = conn.execute(
            "SELECT material, SUM(accepted) AS accepted, COUNT(*) - SUM(accepted) AS rejected "
            "FROM items GROUP BY material ORDER BY material"
        ).fetchall()
        sessions = conn.execute("SELECT COUNT(*) AS n FROM sessions").fetchone()["n"]
        vouchers = conn.execute(
            "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN redeemed_at IS NULL THEN amount END), 0) AS pending "
            "FROM vouchers"
        ).fetchone()
        recent = conn.execute(
            "SELECT material, confidence, accepted, value, reason, created_at FROM items "
            "ORDER BY id DESC LIMIT 15"
        ).fetchall()

    return {
        "items_total": totals["total"],
        "items_accepted": totals["accepted"],
        "items_rejected": totals["total"] - totals["accepted"],
        "credits_paid": round(totals["paid"], 2),
        "sessions": sessions,
        "vouchers": vouchers["n"],
        "vouchers_pending": round(vouchers["pending"], 2),
        "by_material": [dict(r) for r in by_material],
        "recent": [dict(r) for r in recent],
    }
