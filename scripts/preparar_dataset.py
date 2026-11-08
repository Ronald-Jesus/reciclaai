"""
Monta a pasta bruta do dataset do ReciclaAI a partir de datasets públicos do
Kaggle baixados manualmente. Gera uma pasta com uma subpasta por classe-alvo,
pronta para o split_dataset.py:

    python scripts/preparar_dataset.py \
        --garbage12 caminho/garbage-classification \
        --natural caminho/natural-images \
        --garbage6 caminho/garbage-classification-6 \
        --dest dataset_raw

Os arquivos são sempre COPIADOS (nunca movidos).
"""

from __future__ import annotations

import argparse
import hashlib
import random
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

CLASSES_ALVO = [
    "cardboard", "glass", "metal", "organic", "paper", "plastic", "trash", "nao_residuo",
]

# Mapeamento pasta de origem -> classe-alvo. None = pasta excluída.
MAPEAMENTO: dict[str, dict[str, str | None]] = {
    # Kaggle "mostafaabla/garbage-classification" (12 classes)
    "garbage12": {
        "biological": "organic",
        "brown-glass": "glass",
        "green-glass": "glass",
        "white-glass": "glass",
        "cardboard": "cardboard",
        "metal": "metal",
        "paper": "paper",
        "plastic": "plastic",
        "trash": "trash",
        "clothes": "trash",   # não reciclável para esta máquina
        "shoes": "trash",     # não reciclável para esta máquina
        "battery": None,      # resíduo perigoso: coleta separada
        "batteries": None,    # grafia alternativa
    },
    # Kaggle "prasunroy/natural-images" (8 classes) -> nao_residuo
    "natural": {
        "person": "nao_residuo",
        "cat": "nao_residuo",
        "dog": "nao_residuo",
        "car": "nao_residuo",
        "motorbike": "nao_residuo",
        "airplane": "nao_residuo",
        "fruit": None,    # seria confundida com orgânico
        "flower": None,   # seria confundida com orgânico
    },
    # Kaggle "asdasdasasdas/garbage-classification" (6 classes, opcional)
    "garbage6": {
        "cardboard": "cardboard",
        "glass": "glass",
        "metal": "metal",
        "paper": "paper",
        "plastic": "plastic",
        "trash": "trash",
    },
}


def listar_imagens(pasta: Path) -> list[Path]:
    return sorted(p for p in pasta.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)


def localizar_raiz(pasta: Path, fonte: str, profundidade: int = 3) -> Path | None:
    """Acha a pasta que contém as subpastas de classe (os zips costumam aninhar uma pasta extra)."""
    conhecidas = set(MAPEAMENTO[fonte])
    if not pasta.is_dir():
        return None
    if any(d.is_dir() and d.name.lower() in conhecidas for d in pasta.iterdir()):
        return pasta
    if profundidade > 0:
        for sub in sorted(d for d in pasta.iterdir() if d.is_dir()):
            achada = localizar_raiz(sub, fonte, profundidade - 1)
            if achada:
                return achada
    return None


def hash_arquivo(caminho: Path) -> str:
    return hashlib.sha1(caminho.read_bytes()).hexdigest()


def coletar(
    fontes: dict[str, Path],
) -> tuple[dict[str, dict[str, list[tuple[str, Path]]]], dict[str, int]]:
    """Coleta por classe-alvo e por pasta de origem, descartando cópias exatas (SHA-1).

    Devolve (coleta[classe][fonte/pasta] = [(prefixo, caminho)], duplicadas[classe]).
    """
    coleta: dict[str, dict[str, list[tuple[str, Path]]]] = {c: {} for c in CLASSES_ALVO}
    duplicadas = {c: 0 for c in CLASSES_ALVO}
    vistos: set[str] = set()
    for fonte, pasta in fontes.items():
        raiz = localizar_raiz(pasta, fonte)
        if raiz is None:
            raise SystemExit(f"Nenhuma pasta de classe conhecida de '{fonte}' em: {pasta}")
        for sub in sorted(d for d in raiz.iterdir() if d.is_dir()):
            chave = sub.name.lower()
            if chave not in MAPEAMENTO[fonte]:
                print(f"Aviso: pasta desconhecida ignorada ({fonte}/{sub.name})")
                continue
            alvo = MAPEAMENTO[fonte][chave]
            if alvo is None:
                continue
            grupo = coleta[alvo].setdefault(f"{fonte}/{chave}", [])
            for img in listar_imagens(sub):
                h = hash_arquivo(img)
                if h in vistos:
                    duplicadas[alvo] += 1
                    continue
                vistos.add(h)
                grupo.append((f"{fonte}_{chave}_", img))
    return coleta, duplicadas


def alocar_cotas(tamanhos: dict[str, int], limite: int, prioritarios: set[str] | None = None) -> dict[str, int]:
    """Divide o limite da classe entre as pastas de origem.

    Pastas prioritárias entram inteiras primeiro; o restante é repartido em cotas
    iguais, e a sobra de quem tem menos imagens que a cota vai para as demais.
    """
    prioritarios = prioritarios or set()
    if not limite or sum(tamanhos.values()) <= limite:
        return dict(tamanhos)
    cotas = {k: 0 for k in tamanhos}
    restante = limite
    for grupo in ([k for k in tamanhos if k in prioritarios], [k for k in tamanhos if k not in prioritarios]):
        pendentes = sorted(grupo, key=lambda k: tamanhos[k])
        for pos, k in enumerate(pendentes):
            cotas[k] = min(tamanhos[k], restante // (len(pendentes) - pos))
            restante -= cotas[k]
    return cotas


def preparar(
    fontes: dict[str, Path],
    dest: Path,
    max_por_classe: int = 1000,
    seed: int = 42,
    relatorio: dict | None = None,
) -> dict[str, int]:
    """Copia as imagens mapeadas para dest/<classe>/ e devolve a contagem por classe.

    Se `relatorio` for informado, recebe {"por_origem": {classe: {origem: n}}, "duplicadas": {classe: n}}.
    """
    if "garbage6" in fontes and "garbage12" in fontes:
        print("AVISO: garbage6 e garbage12 se sobrepõem em grande parte; a deduplicação "
              "remove apenas cópias exatas (mesmo conteúdo), não imagens parecidas.")
    coleta, duplicadas = coletar(fontes)
    rng = random.Random(seed)
    contagem: dict[str, int] = {}
    por_origem: dict[str, dict[str, int]] = {}
    for classe in CLASSES_ALVO:
        grupos = coleta[classe]
        prioritarios = {k for k in grupos if k.endswith("/trash")} if classe == "trash" else set()
        cotas = alocar_cotas({k: len(v) for k, v in grupos.items()}, max_por_classe, prioritarios)
        pasta = dest / classe
        pasta.mkdir(parents=True, exist_ok=True)
        por_origem[classe] = {}
        for k in sorted(grupos):
            itens = grupos[k]
            if cotas[k] < len(itens):
                itens = rng.sample(itens, cotas[k])
            for prefixo, img in itens:
                shutil.copy2(img, pasta / (prefixo + img.name))
            por_origem[classe][k] = len(itens)
        contagem[classe] = sum(por_origem[classe].values())
    if relatorio is not None:
        relatorio["por_origem"] = por_origem
        relatorio["duplicadas"] = duplicadas
    return contagem


def imprimir_tabela(contagem: dict[str, int], relatorio: dict | None = None) -> None:
    print(f"\n{'classe':14s} | {'imagens':>7s} | {'duplicadas':>10s} | origens")
    print("-" * 70)
    for classe, n in contagem.items():
        dup = relatorio["duplicadas"][classe] if relatorio else 0
        origens = ", ".join(f"{k}={v}" for k, v in relatorio["por_origem"][classe].items()) if relatorio else ""
        print(f"{classe:14s} | {n:7d} | {dup:10d} | {origens}")
    print("-" * 70)
    print(f"{'total':14s} | {sum(contagem.values()):7d} |")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Mescla datasets do Kaggle nas 8 classes do ReciclaAI.")
    p.add_argument("--garbage12", type=Path, help="Pasta do Garbage Classification (12 classes).")
    p.add_argument("--natural", type=Path, help="Pasta do Natural Images (para nao_residuo).")
    p.add_argument("--garbage6", type=Path, help="Pasta do Garbage Classification de 6 classes (opcional).")
    p.add_argument("--dest", type=Path, default=Path("dataset_raw"), help="Pasta de saída (default: dataset_raw).")
    p.add_argument("--max-por-classe", type=int, default=1000, help="Máximo de imagens por classe (default: 1000; 0 = sem limite).")
    p.add_argument("--seed", type=int, default=42, help="Seed da amostragem (default: 42).")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    fontes = {n: getattr(args, n) for n in MAPEAMENTO if getattr(args, n)}
    if not fontes:
        raise SystemExit("Informe ao menos uma fonte: --garbage12, --natural ou --garbage6.")
    relatorio: dict = {}
    contagem = preparar(fontes, args.dest, args.max_por_classe, args.seed, relatorio)
    imprimir_tabela(contagem, relatorio)
    print(f"\nDataset bruto em: {args.dest.resolve()}")


if __name__ == "__main__":
    main()
