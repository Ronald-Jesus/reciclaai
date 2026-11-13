"""
Monta a pasta bruta do dataset do ReciclaAI a partir de datasets públicos do
Kaggle baixados manualmente. Gera uma pasta com uma subpasta por classe-alvo,
pronta para o split_dataset.py:

    python scripts/preparar_dataset.py \
        --garbage12 caminho/garbage-classification \
        --natural caminho/natural-images \
        --garbage6 caminho/garbage-classification-6 \
        --dest dataset_raw

Fontes extras OPCIONAIS para nao_residuo (fotos de casa, comida e cenas reais,
para o modelo não confundir uma selfie ou um ovo com papel). Cada uma só entra
se a pasta existir. Os padrões ficam em ~/datasets/ (no Windows, C:/Users/<voce>/datasets):

    --rooms       house-rooms-image-dataset  (Kaggle robinreni/house-rooms-image-dataset)
    --food11      food11-image-dataset       (Kaggle trolukovich/food11-image-dataset)
    --drinking    drinking-waste             (Kaggle arkadiyhacks/drinking-waste-classification)
--openimages  openimages_nao_residuo     (pasta plana com CREDITOS.json)

FOTOS PRÓPRIAS NUNCA ENTRAM NO TREINO. A pasta ~/datasets/fotos-proprias/<classe>/
é o teste do mundo real e só é usada por:

    python scripts/teste_externo.py --externo ... --fotos-proprias ~/datasets/fotos-proprias

Os arquivos são sempre COPIADOS (nunca movidos). Cópias exatas (SHA-1) e quase
iguais (dHash, distância de Hamming <= 6), na mesma fonte ou entre fontes, são
descartadas, para quase-duplicatas não caírem em treino e teste ao mesmo tempo.
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scripts.teste_externo import LIMIAR_PADRAO, hash_arquivo, popcount64  # noqa: E402

DATASETS_DIR = Path.home() / "datasets"

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
    # Kaggle "robinreni/house-rooms-image-dataset" (opcional): cômodos da casa
    "rooms": {
        "bathroom": "nao_residuo",
        "bedroom": "nao_residuo",
        "dinning": "nao_residuo",
        "kitchen": "nao_residuo",
        "livingroom": "nao_residuo",
    },
    # Kaggle "trolukovich/food11-image-dataset" (opcional): só ovo e hortifrúti
    "food11": {
        "egg": "nao_residuo",
        "vegetable-fruit": "nao_residuo",
        "bread": None,
        "dairy product": None,
        "dessert": None,
        "fried food": None,
        "meat": None,
        "noodles-pasta": None,
        "rice": None,
        "seafood": None,
        "soup": None,
    },
    # Kaggle "arkadiyhacks/drinking-waste-classification" (opcional): embalagens
    # fotografadas com celular em chão e tapete, o contexto real que faltava.
    "drinking": {
        "alucan": "metal",
        "glass": "glass",
        "pet": "plastic",
        "hdpem": "plastic",
    },
    # Pasta plana com imagens do Open Images (opcional): todas viram nao_residuo
    "openimages": {"todas": "nao_residuo"},
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


# Fontes opcionais: pasta padrão em DATASETS_DIR e origem.
FONTES_EXTRAS = {
    "rooms": ("house-rooms-image-dataset", "https://www.kaggle.com/datasets/robinreni/house-rooms-image-dataset"),
    "food11": ("food11-image-dataset", "https://www.kaggle.com/datasets/trolukovich/food11-image-dataset"),
    "drinking": ("drinking-waste", "https://www.kaggle.com/datasets/arkadiyhacks/drinking-waste-classification"),
    "openimages": ("openimages_nao_residuo", "pasta plana montada a partir do Open Images (ver CREDITOS.json)"),
}
SPLITS_FOOD11 = ["training", "evaluation"]  # validation fica de fora

# Cota fixa por pasta de origem (aplicada antes do limite da classe).
COTAS_FIXAS = {
    **{f"rooms/{c}": 80 for c in ["bathroom", "bedroom", "dinning", "kitchen", "livingroom"]},
    "food11/egg": 150,
    "food11/vegetable-fruit": 100,
    "openimages/todas": 450,
    "drinking/alucan": 350,
    "drinking/glass": 350,
    "drinking/pet": 250,
    "drinking/hdpem": 150,
}

FATOR_NAO_RESIDUO = 1.5  # nao_residuo <= 1,5x a média das outras classes


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


def subpastas(fonte: str, pasta: Path) -> list[tuple[str, str, Path]]:
    """Lista (chave, prefixo do arquivo, pasta) de cada pasta de classe da fonte."""
    if fonte == "openimages":
        return [("todas", "openimages_", pasta)]
    raiz = localizar_raiz(pasta, fonte)
    if raiz is None:
        raise SystemExit(f"Nenhuma pasta de classe conhecida de '{fonte}' em: {pasta}")
    bases = [(raiz, f"{fonte}_")]
    if fonte == "food11":  # food11/<split>/<classe>: junta training e evaluation, se existirem
        bases = [(raiz.parent / s, f"food11_{s}_") for s in SPLITS_FOOD11 if (raiz.parent / s).is_dir()] or bases
    return [(sub.name.lower(), f"{prefixo}{sub.name.lower()}_", sub)
            for base, prefixo in bases for sub in sorted(d for d in base.iterdir() if d.is_dir())]


def coletar(
    fontes: dict[str, Path],
    limiar: int = LIMIAR_PADRAO,
) -> tuple[dict[str, dict[str, list[tuple[str, Path]]]], dict[str, int], dict[str, int]]:
    """Coleta por classe-alvo e por pasta de origem, descartando duplicatas.

    Cópia exata (SHA-1) ou quase igual (dHash a distância <= limiar) de uma
    imagem já aceita sai, na mesma fonte ou entre fontes. As fontes extras são
    lidas primeiro: numa duplicata, a cópia delas é a que fica.
    Devolve (coleta[classe][fonte/pasta] = [(prefixo, caminho)], duplicadas[classe],
    quase_duplicadas[classe]).
    """
    coleta: dict[str, dict[str, list[tuple[str, Path]]]] = {c: {} for c in CLASSES_ALVO}
    duplicadas = {c: 0 for c in CLASSES_ALVO}
    quase = {c: 0 for c in CLASSES_ALVO}
    vistos: set[str] = set()
    aceitos = np.empty(1024, dtype=np.uint64)  # dHash das imagens aceitas (buffer que cresce)
    n_aceitos = 0
    for fonte in sorted(fontes, key=lambda f: f not in FONTES_EXTRAS):  # sort estável
        pasta = fontes[fonte]
        for chave, prefixo, sub in subpastas(fonte, pasta):
            if chave not in MAPEAMENTO[fonte]:
                print(f"Aviso: pasta desconhecida ignorada ({fonte}/{sub.name})")
                continue
            alvo = MAPEAMENTO[fonte][chave]
            if alvo is None:
                continue
            grupo = coleta[alvo].setdefault(f"{fonte}/{chave}", [])
            for img in listar_imagens(sub):
                h, d = hash_arquivo(img)
                if h in vistos:
                    duplicadas[alvo] += 1
                    continue
                vistos.add(h)
                if d is not None:
                    if n_aceitos and popcount64(np.bitwise_xor(aceitos[:n_aceitos], np.uint64(d))).min() <= limiar:
                        quase[alvo] += 1
                        continue
                    if n_aceitos == aceitos.size:
                        aceitos = np.resize(aceitos, aceitos.size * 2)
                    aceitos[n_aceitos] = d
                    n_aceitos += 1
                grupo.append((prefixo, img))
    return coleta, duplicadas, quase


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
    fator_nao_residuo: float = FATOR_NAO_RESIDUO,
) -> dict[str, int]:
    """Copia as imagens mapeadas para dest/<classe>/ e devolve a contagem por classe.

    nao_residuo não segue max_por_classe: o limite é fator_nao_residuo x a média
    das outras classes (0 = usa max_por_classe). Nele, as fontes extras entram
    primeiro e o Natural Images completa o resto.
    Se `relatorio` for informado, recebe {"por_origem": {classe: {origem: n}},
    "duplicadas": {classe: n}, "quase_duplicadas": {classe: n}}.
    """
    if "garbage6" in fontes and "garbage12" in fontes:
        print("AVISO: garbage6 e garbage12 se sobrepõem em grande parte; a deduplicação remove "
              "cópias exatas (SHA-1) e quase iguais (dHash), mas fotos parecidas podem passar.")
    coleta, duplicadas, quase = coletar(fontes)
    rng = random.Random(seed)
    contagem: dict[str, int] = {}
    por_origem: dict[str, dict[str, int]] = {}
    for classe in CLASSES_ALVO:  # nao_residuo é a última: a média das outras já existe
        grupos = coleta[classe]
        for k, cota in COTAS_FIXAS.items():
            if k in grupos and len(grupos[k]) > cota:
                grupos[k] = rng.sample(grupos[k], cota)
        limite = max_por_classe
        # Fontes extras são fotos do mundo real: entram antes do limite da classe.
        prioritarios = {k for k in grupos if k.split("/")[0] in FONTES_EXTRAS}
        if classe == "trash":
            prioritarios |= {k for k in grupos if k.endswith("/trash")}
        if classe == "nao_residuo":
            outras = [n for n in contagem.values() if n]
            if fator_nao_residuo and outras:
                limite = int(fator_nao_residuo * sum(outras) / len(outras))
        cotas = alocar_cotas({k: len(v) for k, v in grupos.items()}, limite, prioritarios)
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
        relatorio["quase_duplicadas"] = quase
    return contagem


def imprimir_tabela(contagem: dict[str, int], relatorio: dict | None = None) -> None:
    print(f"\n{'classe':14s} | {'imagens':>7s} | {'dup SHA-1':>9s} | {'dup dHash':>9s} | origens")
    print("-" * 80)
    for classe, n in contagem.items():
        dup = relatorio["duplicadas"][classe] if relatorio else 0
        qd = relatorio["quase_duplicadas"][classe] if relatorio else 0
        origens = ", ".join(f"{k}={v}" for k, v in relatorio["por_origem"][classe].items()) if relatorio else ""
        print(f"{classe:14s} | {n:7d} | {dup:9d} | {qd:9d} | {origens}")
    print("-" * 80)
    print(f"{'total':14s} | {sum(contagem.values()):7d} |")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Mescla datasets do Kaggle nas 8 classes do ReciclaAI.")
    p.add_argument("--garbage12", type=Path, help="Pasta do Garbage Classification (12 classes).")
    p.add_argument("--natural", type=Path, help="Pasta do Natural Images (para nao_residuo).")
    p.add_argument("--garbage6", type=Path, help="Pasta do Garbage Classification de 6 classes (opcional).")
    for nome, (pasta, origem) in FONTES_EXTRAS.items():
        p.add_argument(f"--{nome}", type=Path,
                       help=f"Fonte opcional de nao_residuo (padrão: ~/datasets/{pasta}). Origem: {origem}.")
    p.add_argument("--fator-nao-residuo", type=float, default=FATOR_NAO_RESIDUO,
                   help="nao_residuo fica com no máximo este fator x a média das outras classes (0 = desliga).")
    p.add_argument("--dest", type=Path, default=Path("dataset_raw"), help="Pasta de saída (default: dataset_raw).")
    p.add_argument("--max-por-classe", type=int, default=1000, help="Máximo de imagens por classe (default: 1000; 0 = sem limite).")
    p.add_argument("--seed", type=int, default=42, help="Seed da amostragem (default: 42).")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    fontes = {n: getattr(args, n) for n in MAPEAMENTO if n not in FONTES_EXTRAS and getattr(args, n)}
    if not fontes:
        raise SystemExit("Informe ao menos uma fonte: --garbage12, --natural ou --garbage6.")
    for nome, (pasta, origem) in FONTES_EXTRAS.items():
        explicito = getattr(args, nome)
        if explicito and not explicito.is_dir():
            raise SystemExit(f"Erro: pasta de --{nome} não encontrada: {explicito}")
        caminho = explicito or DATASETS_DIR / pasta
        if caminho.is_dir():
            fontes[nome] = caminho
        else:
            print(f"Aviso: fonte opcional '{nome}' não encontrada em {caminho}; seguindo sem ela. "
                  f"Origem: {origem}")
    relatorio: dict = {}
    contagem = preparar(fontes, args.dest, args.max_por_classe, args.seed, relatorio,
                        args.fator_nao_residuo)
    imprimir_tabela(contagem, relatorio)
    print(f"\nDataset bruto em: {args.dest.resolve()}")


if __name__ == "__main__":
    main()
