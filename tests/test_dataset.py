import itertools
import random
from pathlib import Path

from PIL import Image

import split_dataset
from scripts import preparar_dataset as prep


_contador = itertools.count()


def _img(caminho: Path, conteudo: int | None = None) -> None:
    """Cria uma imagem; cada chamada gera conteúdo único, salvo se `conteudo` for dado."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    n = next(_contador) if conteudo is None else conteudo
    ruido = random.Random(n).randbytes(16 * 16 * 3)  # conteúdo distinto mesmo após compressão JPEG
    Image.frombytes("RGB", (16, 16), ruido).save(caminho)


def _criar_fontes(base: Path, n: int = 3) -> dict[str, Path]:
    g12 = base / "g12"
    for pasta in ["biological", "brown-glass", "green-glass", "white-glass", "cardboard",
                  "metal", "paper", "plastic", "trash", "clothes", "shoes", "battery"]:
        for i in range(n):
            _img(g12 / pasta / f"{i}.jpg")
    nat = base / "natural" / "natural_images"  # aninhado, como no zip do Kaggle
    for pasta in ["person", "cat", "dog", "car", "motorbike", "airplane", "fruit", "flower"]:
        for i in range(n):
            _img(nat / pasta / f"{i}.jpg")
    return {"garbage12": g12, "natural": base / "natural"}


def test_mapeamento(tmp_path):
    fontes = _criar_fontes(tmp_path / "src")
    contagem = prep.preparar(fontes, tmp_path / "raw", max_por_classe=1000)

    assert sorted(p.name for p in (tmp_path / "raw").iterdir()) == sorted(prep.CLASSES_ALVO)
    assert contagem["glass"] == 9          # 3 pastas de vidro mescladas
    assert contagem["organic"] == 3        # biological
    assert contagem["trash"] == 9          # trash + clothes + shoes
    assert contagem["nao_residuo"] == 18   # 6 pastas (fruit/flower excluídas)
    total_copiado = sum(1 for _ in (tmp_path / "raw").rglob("*.jpg"))
    assert total_copiado == sum(contagem.values())
    # battery, fruit e flower não aparecem em nenhum nome de arquivo
    nomes = " ".join(p.name for p in (tmp_path / "raw").rglob("*.jpg"))
    assert "battery" not in nomes and "fruit" not in nomes and "flower" not in nomes
    assert "natural_person_0.jpg" in nomes


def test_nao_move_origem_e_evita_conflito_de_nomes(tmp_path):
    fontes = _criar_fontes(tmp_path / "src")
    prep.preparar(fontes, tmp_path / "raw")
    assert (fontes["garbage12"] / "metal" / "0.jpg").exists()
    # glass tem 0.jpg em três pastas: nenhum foi sobrescrito
    assert len(list((tmp_path / "raw" / "glass").glob("*.jpg"))) == 9


def test_limite_por_classe_e_seed(tmp_path):
    fontes = _criar_fontes(tmp_path / "src", n=5)
    c1 = prep.preparar(fontes, tmp_path / "a", max_por_classe=4, seed=1)
    c2 = prep.preparar(fontes, tmp_path / "b", max_por_classe=4, seed=1)
    assert all(v <= 4 for v in c1.values())
    assert c1["glass"] == 4 and c1["nao_residuo"] == 4
    nomes_a = sorted(p.name for p in (tmp_path / "a" / "glass").iterdir())
    nomes_b = sorted(p.name for p in (tmp_path / "b" / "glass").iterdir())
    assert nomes_a == nomes_b


def test_cli_preparar(tmp_path, capsys):
    fontes = _criar_fontes(tmp_path / "src")
    prep.main(["--garbage12", str(fontes["garbage12"]), "--natural", str(fontes["natural"]),
               "--dest", str(tmp_path / "raw"), "--max-por-classe", "5"])
    saida = capsys.readouterr().out
    assert "nao_residuo" in saida and "total" in saida


def test_split_proporcoes_sem_sobreposicao(tmp_path):
    raw = tmp_path / "raw"
    for classe in ["glass", "organic"]:
        for i in range(20):
            _img(raw / classe / f"{classe}_{i}.jpg")
    dest = tmp_path / "dataset"
    split_dataset.main(["--source", str(raw), "--dest", str(dest),
                        "--val-size", "0.15", "--test-size", "0.2"])

    for classe in ["glass", "organic"]:
        conj = {s: {p.name for p in (dest / s / classe).iterdir()} for s in ["train", "val", "test"]}
        assert (len(conj["train"]), len(conj["val"]), len(conj["test"])) == (13, 3, 4)
        assert not (conj["train"] & conj["val"] or conj["train"] & conj["test"] or conj["val"] & conj["test"])
        assert len(conj["train"] | conj["val"] | conj["test"]) == 20


def test_split_sem_val_mantem_comportamento_antigo(tmp_path):
    raw = tmp_path / "raw"
    for i in range(10):
        _img(raw / "metal" / f"{i}.jpg")
    dest = tmp_path / "dataset"
    split_dataset.main(["--source", str(raw), "--dest", str(dest), "--test-size", "0.2"])
    assert not (dest / "val").exists()
    assert len(list((dest / "train" / "metal").iterdir())) == 8
    assert len(list((dest / "test" / "metal").iterdir())) == 2


def test_trash_prioriza_real_e_divide_resto_entre_clothes_e_shoes(tmp_path):
    g12 = tmp_path / "g12"
    for pasta, n in [("trash", 50), ("clothes", 500), ("shoes", 200)]:
        for i in range(n):
            _img(g12 / pasta / f"{i}.jpg")
    relatorio = {}
    contagem = prep.preparar({"garbage12": g12}, tmp_path / "raw", max_por_classe=120, relatorio=relatorio)
    origem = relatorio["por_origem"]["trash"]
    assert contagem["trash"] == 120
    assert origem["garbage12/trash"] == 50       # trash real inteiro
    assert origem["garbage12/clothes"] == 35     # resto dividido igualmente
    assert origem["garbage12/shoes"] == 35


def test_cotas_redistribuem_sobra():
    cotas = prep.alocar_cotas({"a": 10, "b": 500, "c": 500}, 100)
    assert cotas == {"a": 10, "b": 45, "c": 45}


def test_deduplicacao_por_conteudo_entre_fontes(tmp_path, capsys):
    a, b = tmp_path / "g12", tmp_path / "g6"
    _img(a / "metal" / "x.jpg", conteudo=7)
    _img(b / "metal" / "y.jpg", conteudo=7)   # cópia exata em outra fonte
    _img(b / "metal" / "z.jpg", conteudo=9)
    relatorio = {}
    contagem = prep.preparar({"garbage12": a, "garbage6": b}, tmp_path / "raw", relatorio=relatorio)
    assert contagem["metal"] == 2
    assert relatorio["duplicadas"]["metal"] == 1
    assert "se sobrepõem" in capsys.readouterr().out
