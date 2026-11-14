"""
Teste externo do modelo do ReciclaAI (issue #17).

Avalia o modelo em imagens que não vieram do dataset de treino, para medir
como ele se comporta fora do domínio em que foi treinado:

    python scripts/teste_externo.py --externo caminho/garbage-classification \
        [--fotos-proprias caminho/fotos] [--limiar 6] [--saida docs/modelo/teste-externo] [--filtro]

Com --filtro, avalia a IA em 2 etapas (filtro CLIP + classificador), com a mesma
regra de app.py (filtro.combinar).

Passos:
1. Acha as subpastas de classe (o zip do Kaggle costuma aninhar pastas).
2. Remove imagens que já existem no dataset interno (dataset/ e dataset_raw/):
   cópia exata (SHA-1) ou quase igual (dHash de 64 bits, distância de Hamming
   <= limiar). Os hashes do dataset interno ficam em cache em
   dataset/.cache_hashes/ (dataset/ não vai para o Git).
3. Roda o modelo nas imagens que sobraram e grava métricas, matriz de
   confusão, lista dos piores erros e um resultados.md gerado dos números.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import filtro  # noqa: E402  (regra única das 2 etapas)
import rvm  # noqa: E402  (regra única de "não reconhecido")

MODEL_PATH = BASE_DIR / "model" / "reciclaai.pth"
SAIDA_PADRAO = BASE_DIR / "docs" / "modelo" / "teste-externo"
PASTAS_REFERENCIA = [BASE_DIR / "dataset", BASE_DIR / "dataset_raw"]
CACHE_PADRAO = BASE_DIR / "dataset" / ".cache_hashes" / "hashes.json"
METRICAS_INTERNAS = BASE_DIR / "docs" / "modelo" / "metricas.json"
ACURACIA_INTERNA_PADRAO = 0.9351  # docs/modelo/resultados.md

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

CLASSES_MODELO = [
    "cardboard", "glass", "metal", "nao_residuo", "organic", "paper", "plastic", "trash",
]

# Nomes alternativos de pasta (ex.: fotos próprias com nomes em português).
ALIASES = {
    "papelao": "cardboard",
    "vidro": "glass",
    "metais": "metal",
    "lata": "metal",
    "latas": "metal",
    "papel": "paper",
    "plastico": "plastic",
    "rejeito": "trash",
    "lixo": "trash",
    "organico": "organic",
    "biological": "organic",
    "nao_e_residuo": "nao_residuo",
}

LIMIAR_PADRAO = 6
N_PIORES = 20
FONTE_EXTERNA = "Kaggle, \"Garbage classification\" (asdasdasasdas/garbage-classification)"
URL_EXTERNA = "https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification"


# ---------------------------------------------------------------------------
# Pastas e nomes
# ---------------------------------------------------------------------------

def normalizar_nome(nome: str, classes: list[str] | None = None) -> str | None:
    """Converte o nome de uma pasta na classe do modelo, ou None se não bater.

    Ignora maiúsculas, acentos, espaços e hífens; aceita alguns nomes em português.
    """
    classes = classes or CLASSES_MODELO
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    chave = sem_acento.strip().lower().replace("-", "_").replace(" ", "_")
    if chave in classes:
        return chave
    alvo = ALIASES.get(chave)
    if alvo in classes:
        return alvo
    if chave.endswith("s") and chave[:-1] in classes:  # plural simples: "plastics"
        return chave[:-1]
    return None


def localizar_classes(pasta: Path, classes: list[str] | None = None,
                      profundidade: int = 4) -> dict[str, Path]:
    """Acha a pasta com subpastas de classe (busca em largura) e devolve {classe: pasta}.

    Escolhe o nível mais raso que tenha pelo menos uma subpasta de classe;
    dentro dele, a primeira pasta encontrada para cada classe.
    """
    classes = classes or CLASSES_MODELO
    nivel = [pasta]
    for _ in range(profundidade + 1):
        proximo: list[Path] = []
        for atual in nivel:
            subs = sorted(d for d in atual.iterdir() if d.is_dir())
            achadas: dict[str, Path] = {}
            for d in subs:
                classe = normalizar_nome(d.name, classes)
                if classe and classe not in achadas:
                    achadas[classe] = d
            if achadas:
                return achadas
            proximo.extend(subs)
        nivel = proximo
        if not nivel:
            break
    return {}


def listar_imagens(pasta: Path) -> list[Path]:
    return sorted(p for p in pasta.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)


def coletar_imagens(pasta: Path, classes: list[str] | None = None) -> list[tuple[Path, str]]:
    """Lista (caminho, classe real) de uma pasta externa. Sai com erro claro se faltar algo."""
    if not pasta.is_dir():
        raise SystemExit(f"Erro: pasta não encontrada: {pasta}")
    mapa = localizar_classes(pasta, classes)
    if not mapa:
        nomes = ", ".join(classes or CLASSES_MODELO)
        raise SystemExit(
            f"Erro: nenhuma subpasta de classe encontrada em {pasta}. "
            f"Esperado: pastas com os nomes das classes ({nomes})."
        )
    itens = [(img, classe) for classe, sub in sorted(mapa.items()) for img in listar_imagens(sub)]
    if not itens:
        raise SystemExit(f"Erro: as pastas de classe em {pasta} não têm imagens.")
    return itens


# ---------------------------------------------------------------------------
# Hashes
# ---------------------------------------------------------------------------

def dhash(imagem: Image.Image) -> int:
    """Hash perceptual de diferença (dHash) de 64 bits.

    Tons de cinza, reduz para 9x8 e compara cada pixel com o vizinho da direita.
    """
    pequena = imagem.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    px = np.asarray(pequena, dtype=np.int16)
    bits = (px[:, 1:] > px[:, :-1]).flatten()
    valor = 0
    for b in bits:
        valor = (valor << 1) | int(b)
    return valor


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def popcount64(x: np.ndarray) -> np.ndarray:
    """Conta bits 1 de um vetor uint64 (vetorizado)."""
    if hasattr(np, "bitwise_count"):
        return np.bitwise_count(x).astype(np.int64)
    tabela = np.array([bin(i).count("1") for i in range(256)], dtype=np.int64)
    return tabela[x.view(np.uint8).reshape(-1, 8)].sum(axis=1)


def hash_arquivo(caminho: Path) -> tuple[str, int | None]:
    """Devolve (SHA-1 do conteúdo, dHash). dHash é None se a imagem não abrir."""
    dados = caminho.read_bytes()
    sha1 = hashlib.sha1(dados).hexdigest()
    try:
        with Image.open(caminho) as img:
            return sha1, dhash(img)
    except Exception:
        return sha1, None


def dhash_espelhada(caminho: Path) -> int | None:
    """dHash da imagem espelhada na horizontal (pega cópias espelhadas do treino)."""
    try:
        with Image.open(caminho) as img:
            return dhash(img.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
    except Exception:
        return None


class Referencia:
    """Hashes do dataset interno, prontos para comparação vetorizada."""

    def __init__(self, sha1: dict[str, str], caminhos: list[str], dhashes: list[int]):
        self.sha1 = sha1                      # sha1 -> caminho
        self.caminhos = caminhos              # caminho de cada dHash
        self.dhashes = np.array(dhashes, dtype=np.uint64)

    def __len__(self) -> int:
        return len(self.sha1)

    def mais_proximo(self, h: int) -> tuple[int, str | None]:
        if self.dhashes.size == 0:
            return 64, None
        dist = popcount64(np.bitwise_xor(self.dhashes, np.uint64(h)))
        i = int(dist.argmin())
        return int(dist[i]), self.caminhos[i]


def _rel(caminho: Path, base: Path) -> str:
    try:
        return caminho.resolve().relative_to(base.resolve()).as_posix()
    except ValueError:
        return caminho.resolve().as_posix()


def carregar_referencia(pastas: list[Path], cache: Path | None = CACHE_PADRAO,
                        base: Path = BASE_DIR) -> tuple[Referencia, dict]:
    """Calcula (ou lê do cache) os hashes de todas as imagens das pastas de referência.

    O cache guarda tamanho e data de modificação de cada arquivo; só recalcula o
    que mudou. Arquivos com o mesmo SHA-1 (ex.: dataset/ é cópia de dataset_raw/)
    entram uma vez só.
    """
    antigo: dict = {}
    if cache and cache.exists():
        try:
            antigo = json.loads(cache.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            antigo = {}

    novo: dict = {}
    sha1: dict[str, str] = {}
    caminhos: list[str] = []
    dhashes: list[int] = []
    calculados = 0
    inicio = time.perf_counter()
    for pasta in pastas:
        if not pasta.is_dir():
            continue
        for img in listar_imagens(pasta):
            chave = _rel(img, base)
            st = img.stat()
            reg = antigo.get(chave)
            if not reg or reg.get("tam") != st.st_size or reg.get("mtime") != st.st_mtime_ns:
                s, d = hash_arquivo(img)
                reg = {"tam": st.st_size, "mtime": st.st_mtime_ns, "sha1": s,
                       "dhash": None if d is None else f"{d:016x}"}
                calculados += 1
            novo[chave] = reg
            if reg["sha1"] in sha1:
                continue
            sha1[reg["sha1"]] = chave
            if reg["dhash"] is not None:
                caminhos.append(chave)
                dhashes.append(int(reg["dhash"], 16))

    if cache and (calculados or novo.keys() != antigo.keys()):
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(novo), encoding="utf-8")

    info = {"arquivos": len(novo), "unicos": len(sha1), "calculados": calculados,
            "segundos": round(time.perf_counter() - inicio, 1)}
    return Referencia(sha1, caminhos, dhashes), info


def deduplicar(itens: list[tuple[Path, str]], ref: Referencia,
               limiar: int = LIMIAR_PADRAO) -> tuple[list[tuple[Path, str]], list[dict]]:
    """Separa as imagens externas em (mantidas, removidas).

    Removida = mesmo SHA-1 de uma imagem interna, ou dHash a distância <= limiar.
    Vale a menor distância entre a imagem normal e a espelhada na horizontal
    (motivo "dhash_espelhada" quando a espelhada é a mais próxima).
    Imagens que não abrem também saem (motivo "ilegivel").
    """
    mantidas: list[tuple[Path, str]] = []
    removidas: list[dict] = []
    for caminho, classe in itens:
        s, d = hash_arquivo(caminho)
        if s in ref.sha1:
            removidas.append({"arquivo": str(caminho), "classe": classe, "motivo": "sha1",
                              "distancia": 0, "igual_a": ref.sha1[s]})
            continue
        if d is None:
            removidas.append({"arquivo": str(caminho), "classe": classe, "motivo": "ilegivel",
                              "distancia": None, "igual_a": None})
            continue
        dist, perto = ref.mais_proximo(d)
        motivo = "dhash"
        de = dhash_espelhada(caminho)
        if de is not None:
            dist_e, perto_e = ref.mais_proximo(de)
            if dist_e < dist:
                dist, perto, motivo = dist_e, perto_e, "dhash_espelhada"
        if dist <= limiar:
            removidas.append({"arquivo": str(caminho), "classe": classe, "motivo": motivo,
                              "distancia": dist, "igual_a": perto})
            continue
        mantidas.append((caminho, classe))
    return mantidas, removidas


# ---------------------------------------------------------------------------
# Modelo e avaliação
# ---------------------------------------------------------------------------

def _transform():
    from torchvision import transforms  # mesmo pré-processamento de app.py
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def carregar_modelo(caminho: Path, device):
    """Carrega o checkpoint do treino (mesma montagem de app.load_model).

    Devolve (modelo, classes, temperatura). Checkpoint sem temperatura usa 1.0.
    """
    import torch
    from torch import nn
    from torchvision import models

    if not caminho.exists():
        raise SystemExit(f"Erro: modelo não encontrado em {caminho}. Rode 'python treino.py' primeiro.")
    checkpoint = torch.load(caminho, map_location=device)
    classes = list(checkpoint["classes"])
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(classes))
    model.load_state_dict(checkpoint["model_state"])
    model.to(device).eval()
    return model, classes, float(checkpoint.get("temperatura", 1.0))


def prever(model, classes: list[str], itens: list[tuple[Path, str]], device=None,
           batch: int = 64, temperatura: float = 1.0, filtro_clip=None) -> list[dict]:
    """Roda o modelo em lotes. Devolve [{arquivo, real, previsto, confianca (%)}].

    Os logits são divididos pela temperatura do treino antes do softmax.
    Com `filtro_clip`, cada item ganha p_residuo e passa por filtro.combinar.
    """
    import torch

    device = device or torch.device("cpu")
    tf = _transform()
    saida: list[dict] = []
    for i in range(0, len(itens), batch):
        lote = itens[i:i + batch]
        tensores, ps = [], []
        for caminho, _ in lote:
            with Image.open(caminho) as bruta:
                img = ImageOps.exif_transpose(bruta).convert("RGB")  # foto de celular vem deitada sem isso
                ps.append(None if filtro_clip is None else filtro_clip.p_residuo(img))
                tensores.append(tf(img))
        x = torch.stack(tensores).to(device)
        with torch.no_grad():
            prob = torch.softmax(model(x) / temperatura, dim=1).cpu()
        for (caminho, real), linha, p in zip(lote, prob.tolist(), ps):
            combinadas = filtro.combinar(dict(zip(classes, linha)), p)
            previsto = max(combinadas, key=combinadas.get)
            item = {"arquivo": str(caminho), "real": real, "previsto": previsto,
                    "confianca": round(combinadas[previsto] * 100, 2)}
            if p is not None:
                item["p_residuo"] = round(p, 4)
            saida.append(item)
    return saida


def calcular_metricas(previsoes: list[dict], classes_modelo: list[str]) -> dict:
    """Métricas a partir das previsões.

    - acuracia: previsto == real.
    - nao_reconhecido: regra de rvm.nao_reconhecido (nao_residuo ou confiança < 70%).
    - acuracia_aceitando_nao_reconhecido: conta "não reconhecido" como resultado
      aceitável (a máquina devolve o item, não paga errado). Erro de verdade é só
      o erro confiante.
    - acuracia_entre_reconhecidos: acertos entre as que o modelo reconheceu.
    """
    n = len(previsoes)
    reais = [c for c in classes_modelo if any(p["real"] == c for p in previsoes)]
    acertos = sum(p["real"] == p["previsto"] for p in previsoes)
    nr = [rvm.nao_reconhecido(p["previsto"], p["confianca"]) for p in previsoes]
    n_nr = sum(nr)
    acertos_reconhecidos = sum(p["real"] == p["previsto"] and not r for p, r in zip(previsoes, nr))
    erros_confiantes = sum(p["real"] != p["previsto"] and not r for p, r in zip(previsoes, nr))

    matriz = [[sum(p["real"] == r and p["previsto"] == c for p in previsoes) for c in classes_modelo]
              for r in reais]

    por_classe = {}
    for c in classes_modelo:
        n_real = sum(p["real"] == c for p in previsoes)
        n_prev = sum(p["previsto"] == c for p in previsoes)
        vp = sum(p["real"] == c and p["previsto"] == c for p in previsoes)
        if not n_real and not n_prev:
            continue
        por_classe[c] = {
            "n": n_real,
            "previstos": n_prev,
            "precisao": vp / n_prev if n_prev else None,
            "recall": vp / n_real if n_real else None,
            "nao_reconhecido": sum(r for p, r in zip(previsoes, nr) if p["real"] == c),
        }

    erros = [p for p in previsoes if p["real"] != p["previsto"]]
    piores = sorted(erros, key=lambda p: (-p["confianca"], p["arquivo"]))[:N_PIORES]

    return {
        "n": n,
        "acertos": acertos,
        "acuracia": acertos / n if n else None,
        "nao_reconhecido": n_nr,
        "taxa_nao_reconhecido": n_nr / n if n else None,
        "acuracia_aceitando_nao_reconhecido": (acertos_reconhecidos + n_nr) / n if n else None,
        "acuracia_entre_reconhecidos": (acertos_reconhecidos / (n - n_nr)) if n - n_nr else None,
        "erros_confiantes": erros_confiantes,
        "por_classe": por_classe,
        "confusao": {"linhas_reais": reais, "colunas_previstas": list(classes_modelo),
                     "valores": matriz},
        "piores_erros": piores,
    }


# ---------------------------------------------------------------------------
# Saídas
# ---------------------------------------------------------------------------

def salvar_confusao(confusao: dict, destino_csv: Path, destino_png: Path, titulo: str) -> bool:
    """Grava a matriz em CSV e, se o matplotlib existir, em PNG. Devolve True se gerou o PNG."""
    with destino_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["real \\ previsto", *confusao["colunas_previstas"]])
        for r, linha in zip(confusao["linhas_reais"], confusao["valores"]):
            w.writerow([r, *linha])
    if not confusao["valores"]:
        return False  # nenhuma imagem avaliada: não há o que desenhar
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return False
    valores = np.array(confusao["valores"])
    fig, ax = plt.subplots(figsize=(9, 5.5))
    ax.imshow(valores, cmap="Blues")
    ax.set_xticks(range(len(confusao["colunas_previstas"])), confusao["colunas_previstas"],
                  rotation=35, ha="right")
    ax.set_yticks(range(len(confusao["linhas_reais"])), confusao["linhas_reais"])
    ax.set_xlabel("Previsto")
    ax.set_ylabel("Real")
    ax.set_title(titulo)
    limite = valores.max() / 2 if valores.size else 0
    for i in range(valores.shape[0]):
        for j in range(valores.shape[1]):
            ax.text(j, i, int(valores[i, j]), ha="center", va="center",
                    color="white" if valores[i, j] > limite else "black", fontsize=9)
    fig.tight_layout()
    fig.savefig(destino_png, dpi=120)
    plt.close(fig)
    return True


def salvar_removidas(removidas: list[dict], destino: Path) -> None:
    with destino.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["arquivo", "classe", "motivo", "distancia", "igual_a"])
        w.writeheader()
        w.writerows(removidas)


def acuracia_interna(caminho: Path = METRICAS_INTERNAS) -> float:
    try:
        return float(json.loads(caminho.read_text(encoding="utf-8"))["acuracia_teste"])
    except (OSError, ValueError, KeyError, TypeError):
        return ACURACIA_INTERNA_PADRAO


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.2f}%".replace(".", ",")


def _bloco_md(nome: str, bloco: dict, sufixo: str) -> list[str]:
    d = bloco["dedup"]
    m = bloco["metricas"]
    motivos = d["por_motivo"]
    linhas = [
        f"## {nome}",
        "",
        f"- Imagens encontradas: {d['total']}.",
        f"- Removidas por duplicata: {d['removidas']} "
        f"({motivos.get('sha1', 0)} cópias exatas por SHA-1, "
        f"{motivos.get('dhash', 0)} quase iguais por dHash e "
        f"{motivos.get('dhash_espelhada', 0)} espelhadas, com distância até {d['limiar']}"
        + (f", {motivos['ilegivel']} ilegíveis" if motivos.get("ilegivel") else "") + ").",
        f"- Imagens avaliadas: {m['n']}.",
        "",
    ]
    if not m["n"]:
        linhas += ["Nenhuma imagem sobrou depois da deduplicação. Não há métricas.", ""]
        return linhas
    linhas += [
        "| Métrica | Valor |",
        "|---|---|",
        f"| Acurácia | {_pct(m['acuracia'])} |",
        f"| Caíram em \"não reconhecido\" | {m['nao_reconhecido']} ({_pct(m['taxa_nao_reconhecido'])}) |",
        f"| Acurácia aceitando \"não reconhecido\" | {_pct(m['acuracia_aceitando_nao_reconhecido'])} |",
        f"| Acurácia entre as reconhecidas | {_pct(m['acuracia_entre_reconhecidos'])} |",
        f"| Erros confiantes | {m['erros_confiantes']} |",
        "",
        "| Classe real | n | Precisão | Recall | Não reconhecido |",
        "|---|---|---|---|---|",
    ]
    for c, v in m["por_classe"].items():
        if v["n"]:
            linhas.append(f"| {c} | {v['n']} | {_pct(v['precisao'])} | {_pct(v['recall'])} | "
                          f"{v['nao_reconhecido']} |")
    extras = [c for c, v in m["por_classe"].items() if not v["n"]]
    if extras:
        linhas += ["", "Classes que não existem neste conjunto, mas foram previstas: "
                   + ", ".join(f"{c} ({m['por_classe'][c]['previstos']})" for c in extras) + "."]
    png = f"confusao{sufixo}.png"
    linhas += ["", f"Matriz de confusão: `confusao{sufixo}.csv`"
               + (f" e ![Matriz de confusão]({png})" if bloco.get("png") else "") + ".", ""]
    if m["piores_erros"]:
        linhas += ["Piores erros (maior confiança no rótulo errado):", "",
                   "| Arquivo | Real | Previsto | Confiança |", "|---|---|---|---|"]
        for p in m["piores_erros"]:
            conf = f"{p['confianca']:.1f}".replace(".", ",")
            linhas.append(f"| {Path(p['arquivo']).name} | {p['real']} | {p['previsto']} | {conf}% |")
        linhas.append("")
    return linhas


def gerar_md(resultado: dict) -> str:
    """Monta o resultados.md só com números do resultado (sem valores fixos)."""
    ext = resultado["externo"]
    m = ext["metricas"]
    interna = resultado["acuracia_teste_interno"]
    linhas = [
        "# Teste externo do modelo",
        "",
        f"Gerado por `scripts/teste_externo.py` em {resultado['data']}. "
        "Os números abaixo saem direto do script.",
        "",
    ]
    if resultado.get("filtro"):
        f = resultado["filtro"]
        linhas += [f"IA em 2 etapas: filtro CLIP {f['modelo']} ({f['pesos']}) com limiar "
                   f"{f['limiar']}, depois o classificador escolhe o material.", ""]
    linhas += [
        "## Fonte dos dados",
        "",
        f"- Dataset: {FONTE_EXTERNA}.",
        f"- Página: {URL_EXTERNA}",
        "- Licença: conferir licença na página do Kaggle.",
        "- As imagens não são redistribuídas no repositório.",
        "",
        "## Por que remover duplicatas",
        "",
        "Este dataset e o usado no treino têm origem parecida. Uma imagem que o modelo "
        "já viu no treino inflaria o resultado. Por isso cada imagem externa foi comparada "
        f"com as {resultado['referencia']['unicos']} imagens únicas de `dataset/` (treino, "
        "validação e teste) e `dataset_raw/`. Saiu a imagem com o mesmo conteúdo (SHA-1) ou "
        f"com hash perceptual (dHash de 64 bits) a distância de Hamming até {ext['dedup']['limiar']}, "
        "comparando também a imagem espelhada na horizontal. "
        "A lista das removidas está em `duplicatas.csv`.",
        "",
    ]
    linhas += _bloco_md("Resultado no dataset externo", ext, "")
    if resultado.get("fotos_proprias"):
        linhas += _bloco_md("Resultado nas fotos do autor", resultado["fotos_proprias"], "_fotos_proprias")

    linhas += ["## Comparação com o teste interno", ""]
    if m["n"]:
        dif = (m["acuracia"] - interna) * 100
        linhas += [
            f"No teste interno a acurácia foi {_pct(interna)}. No teste externo foi "
            f"{_pct(m['acuracia'])}, uma diferença de {f'{dif:+.2f}'.replace('.', ',')} pontos percentuais.",
            "",
            "## Interpretação",
            "",
        ]
        if dif < -2:
            linhas.append("A queda é esperada. As fotos externas têm outro fundo, outra luz e outra "
                          "câmera. É a mudança de domínio. O teste interno mede o modelo em fotos "
                          "parecidas com as do treino; este teste mede fora delas.")
        elif dif <= 2:
            linhas.append("A acurácia ficou próxima do teste interno. Mesmo assim, o resultado vale "
                          "só para fotos parecidas com estas. Fotos com outro fundo, luz ou câmera "
                          "podem dar resultado pior.")
        else:
            linhas.append("A acurácia ficou acima do teste interno. Isso não quer dizer que o modelo "
                          "é melhor fora do treino. Pode ser amostra pequena ou fotos muito parecidas "
                          "com as do treino que passaram pela deduplicação.")
        if m["n"] < 100:
            linhas += ["", f"Atenção: só {m['n']} imagens foram avaliadas. Com poucas imagens, "
                       "a acurácia muda muito com cada acerto ou erro."]
        linhas += [
            "",
            "Cair em \"não reconhecido\" não é erro grave: a máquina devolve o item e não paga "
            "crédito. O erro que custa caro é o erro confiante, quando o modelo dá outro "
            f"material com confiança de 70% ou mais. Aqui foram {m['erros_confiantes']} de {m['n']}.",
            "",
        ]
    else:
        linhas += ["Não há comparação: nenhuma imagem externa sobrou depois da deduplicação.", ""]
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------

def processar(itens: list[tuple[Path, str]], ref: Referencia, limiar: int, model,
              classes: list[str], device, saida: Path, sufixo: str, titulo: str,
              batch: int = 64, temperatura: float = 1.0, filtro_clip=None) -> dict:
    mantidas, removidas = deduplicar(itens, ref, limiar)
    motivos: dict[str, int] = {}
    for r in removidas:
        motivos[r["motivo"]] = motivos.get(r["motivo"], 0) + 1
    salvar_removidas(removidas, saida / f"duplicatas{sufixo}.csv")
    previsoes = (prever(model, classes, mantidas, device, batch, temperatura, filtro_clip)
                 if mantidas else [])
    metricas = calcular_metricas(previsoes, classes)
    png = salvar_confusao(metricas["confusao"], saida / f"confusao{sufixo}.csv",
                          saida / f"confusao{sufixo}.png", titulo)
    return {
        "dedup": {"total": len(itens), "removidas": len(removidas), "mantidas": len(mantidas),
                  "limiar": limiar, "por_motivo": motivos},
        "metricas": metricas,
        "png": png,
    }


def executar(externo: Path, saida: Path, limiar: int = LIMIAR_PADRAO,
             fotos_proprias: Path | None = None, model=None, classes: list[str] | None = None,
             referencias: list[Path] | None = None, cache: Path | None = CACHE_PADRAO,
             modelo_path: Path = MODEL_PATH, device=None, batch: int = 64,
             temperatura: float = 1.0, filtro_clip=None) -> dict:
    """Roda o teste completo e grava os arquivos em `saida`. Devolve o resultado.

    Sem `model`, carrega o checkpoint e usa a temperatura dele.
    Com `filtro_clip`, avalia as 2 etapas.
    """
    import torch

    itens_ext = coletar_imagens(externo)
    itens_fotos = coletar_imagens(fotos_proprias) if fotos_proprias else None

    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if model is None:
        model, classes, temperatura = carregar_modelo(modelo_path, device)
    classes = classes or CLASSES_MODELO

    print("Calculando hashes do dataset interno (usa cache quando possível)...")
    ref, info = carregar_referencia(referencias if referencias is not None else PASTAS_REFERENCIA,
                                    cache)
    print(f"  {info['arquivos']} arquivos, {info['unicos']} únicos, {info['calculados']} "
          f"recalculados em {info['segundos']} s.")

    saida.mkdir(parents=True, exist_ok=True)
    resultado = {
        "data": date.today().isoformat(),
        "fonte": FONTE_EXTERNA,
        "url": URL_EXTERNA,
        "licenca": "conferir licença na página do Kaggle",
        "referencia": info,
        "temperatura": temperatura,
        "acuracia_teste_interno": acuracia_interna(),
        "filtro": (None if filtro_clip is None else
                   {"modelo": filtro.MODELO, "pesos": filtro.PESOS, "limiar": filtro.LIMIAR_FILTRO}),
        "externo": processar(itens_ext, ref, limiar, model, classes, device, saida, "",
                             "Teste externo", batch, temperatura, filtro_clip),
    }
    if itens_fotos is not None:
        resultado["fotos_proprias"] = processar(itens_fotos, ref, limiar, model, classes, device,
                                                saida, "_fotos_proprias", "Fotos do autor", batch,
                                                temperatura, filtro_clip)

    (saida / "metricas.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2),
                                         encoding="utf-8")
    (saida / "resultados.md").write_text(gerar_md(resultado), encoding="utf-8")
    return resultado


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Teste externo do modelo do ReciclaAI (com deduplicação).")
    p.add_argument("--externo", type=Path, required=True,
                   help="Pasta do dataset externo, com subpastas por classe (pode estar aninhada).")
    p.add_argument("--fotos-proprias", type=Path, help="Pasta opcional com fotos do autor, mesma estrutura.")
    p.add_argument("--limiar", type=int, default=LIMIAR_PADRAO,
                   help=f"Distância de Hamming máxima do dHash para considerar duplicata (padrão {LIMIAR_PADRAO}).")
    p.add_argument("--saida", type=Path, default=SAIDA_PADRAO, help="Pasta de saída.")
    p.add_argument("--modelo", type=Path, default=MODEL_PATH, help="Checkpoint do modelo.")
    p.add_argument("--batch", type=int, default=64, help="Tamanho do lote na avaliação.")
    p.add_argument("--filtro", action="store_true",
                   help="Avalia a IA em 2 etapas (filtro CLIP antes do classificador).")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    if not 0 <= args.limiar <= 64:
        raise SystemExit("Erro: --limiar deve ficar entre 0 e 64.")
    if not args.modelo.exists():
        raise SystemExit(f"Erro: modelo não encontrado em {args.modelo}. Rode 'python treino.py' primeiro.")
    filtro_clip = None
    if args.filtro:
        filtro_clip = filtro.carregar()
        if filtro_clip is None:
            raise SystemExit("Erro: --filtro pedido, mas o filtro CLIP não carregou (veja o aviso acima).")
    r = executar(args.externo, args.saida, args.limiar, args.fotos_proprias,
                 modelo_path=args.modelo, batch=args.batch, filtro_clip=filtro_clip)
    e = r["externo"]
    print(f"\nExterno: {e['dedup']['total']} imagens, {e['dedup']['removidas']} removidas por duplicata, "
          f"{e['metricas']['n']} avaliadas.")
    if e["metricas"]["n"]:
        print(f"Acurácia: {_pct(e['metricas']['acuracia'])} "
              f"(teste interno: {_pct(r['acuracia_teste_interno'])}).")
    for nome, bloco in [("Externo", e), ("Fotos próprias", r.get("fotos_proprias"))]:
        if bloco and bloco["metricas"]["n"]:
            m = bloco["metricas"]
            print(f"{nome}: acurácia {_pct(m['acuracia'])}, aceitando não reconhecido "
                  f"{_pct(m['acuracia_aceitando_nao_reconhecido'])}, não reconhecido "
                  f"{m['nao_reconhecido']}/{m['n']}, erros confiantes {m['erros_confiantes']}.")
    print(f"Arquivos gravados em {args.saida}")


if __name__ == "__main__":
    main()
