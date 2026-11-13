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
    # 6 pastas (fruit/flower excluídas) = 18, mas o limite é 1,5x a média das outras (33/7)
    assert contagem["nao_residuo"] == 7
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
    assert all(v <= 4 for c, v in c1.items() if c != "nao_residuo")
    assert c1["glass"] == 4 and c1["nao_residuo"] == 6   # 1,5x a média (4) das outras
    nomes_a = sorted(p.name for p in (tmp_path / "a" / "glass").iterdir())
    nomes_b = sorted(p.name for p in (tmp_path / "b" / "glass").iterdir())
    assert nomes_a == nomes_b


def test_cli_preparar(tmp_path, capsys, monkeypatch):
    monkeypatch.setattr(prep, "DATASETS_DIR", tmp_path / "sem-downloads")
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


def _imagem_suave(semente: int, tam: int = 96) -> Image.Image:
    """Imagem com formas grandes: o dHash sobrevive a redimensionar e recomprimir."""
    from PIL import ImageDraw
    rng = random.Random(semente)
    img = Image.new("RGB", (tam, tam), tuple(rng.randrange(256) for _ in range(3)))
    desenho = ImageDraw.Draw(img)
    for _ in range(8):
        x0, y0 = rng.randrange(tam), rng.randrange(tam)
        x1, y1 = x0 + rng.randrange(10, tam // 2), y0 + rng.randrange(10, tam // 2)
        desenho.ellipse((x0, y0, x1, y1), fill=tuple(rng.randrange(256) for _ in range(3)))
    return img


def test_quase_duplicata_entre_fontes_removida_por_dhash(tmp_path):
    a, b = tmp_path / "g12", tmp_path / "g6"
    (a / "metal").mkdir(parents=True)
    (b / "metal").mkdir(parents=True)
    _imagem_suave(1).save(a / "metal" / "x.png")
    _imagem_suave(1).resize((80, 80)).save(b / "metal" / "y.jpg", quality=70)  # quase igual
    _imagem_suave(2).save(b / "metal" / "z.png")
    relatorio = {}
    contagem = prep.preparar({"garbage12": a, "garbage6": b}, tmp_path / "raw", relatorio=relatorio)
    assert contagem["metal"] == 2
    assert relatorio["quase_duplicadas"]["metal"] == 1
    assert relatorio["duplicadas"]["metal"] == 0


def _criar_extras(base: Path, n: int = 4) -> dict[str, Path]:
    rooms = base / "rooms" / "House_Room_Dataset"
    for pasta in ["Bathroom", "Bedroom", "Dinning", "Kitchen", "Livingroom"]:
        for i in range(n):
            _img(rooms / pasta / f"{i}.jpg")
    food = base / "food11"
    for split in ["training", "validation", "evaluation"]:
        for pasta in ["Egg", "Vegetable-Fruit", "Bread"]:
            for i in range(n):
                _img(food / split / pasta / f"{i}.jpg")
    oi = base / "openimages"
    for i in range(n):
        _img(oi / f"oi_{i}.jpg")
    (oi / "CREDITOS.json").write_text("{}", encoding="utf-8")
    return {"rooms": base / "rooms", "food11": food, "openimages": oi}


def test_fontes_extras_de_nao_residuo_com_cotas(tmp_path, monkeypatch):
    monkeypatch.setattr(prep, "COTAS_FIXAS", {
        **{f"rooms/{c}": 2 for c in ["bathroom", "bedroom", "dinning", "kitchen", "livingroom"]},
        "food11/egg": 5, "food11/vegetable-fruit": 3,
    })
    relatorio = {}
    contagem = prep.preparar(_criar_extras(tmp_path / "src"), tmp_path / "raw",
                             fator_nao_residuo=0, relatorio=relatorio)
    origem = relatorio["por_origem"]["nao_residuo"]
    assert origem["rooms/kitchen"] == 2 and origem["rooms/bathroom"] == 2
    assert origem["food11/egg"] == 5               # 8 imagens (training + evaluation), cota 5
    assert origem["food11/vegetable-fruit"] == 3
    assert origem["openimages/todas"] == 4         # todas; CREDITOS.json não é imagem
    assert not any("bread" in k for k in origem)
    nomes = " ".join(p.name for p in (tmp_path / "raw" / "nao_residuo").iterdir())
    assert "validation" not in nomes               # só training e evaluation
    assert contagem["nao_residuo"] == 10 + 5 + 3 + 4


def test_nao_residuo_limitado_pela_media_e_prioriza_fontes_novas(tmp_path):
    fontes = _criar_fontes(tmp_path / "src")   # outras classes: média 33/7 -> limite 7
    oi = tmp_path / "src" / "openimages"
    for i in range(4):
        _img(oi / f"{i}.jpg")
    relatorio = {}
    contagem = prep.preparar({**fontes, "openimages": oi}, tmp_path / "raw", relatorio=relatorio)
    origem = relatorio["por_origem"]["nao_residuo"]
    assert contagem["nao_residuo"] == 7
    assert origem["openimages/todas"] == 4                                  # fonte nova inteira
    assert sum(v for k, v in origem.items() if k.startswith("natural/")) == 3


def test_fonte_opcional_ausente_avisa_e_segue(tmp_path, capsys, monkeypatch):
    monkeypatch.setattr(prep, "DATASETS_DIR", tmp_path / "sem-downloads")
    fontes = _criar_fontes(tmp_path / "src")
    prep.main(["--garbage12", str(fontes["garbage12"]), "--dest", str(tmp_path / "raw")])
    saida = capsys.readouterr().out
    assert "rooms" in saida and "não encontrada" in saida
    assert "food11" in saida and "openimages" in saida


def test_quase_duplicata_dentro_da_mesma_fonte_removida(tmp_path):
    g12 = tmp_path / "g12"
    (g12 / "metal").mkdir(parents=True)
    _imagem_suave(3).save(g12 / "metal" / "a.png")
    _imagem_suave(3).resize((80, 80)).save(g12 / "metal" / "b.jpg", quality=70)  # quase igual
    _imagem_suave(4).save(g12 / "metal" / "c.png")
    relatorio = {}
    contagem = prep.preparar({"garbage12": g12}, tmp_path / "raw", relatorio=relatorio)
    assert contagem["metal"] == 2
    assert relatorio["quase_duplicadas"]["metal"] == 1


def test_fontes_extras_lidas_antes_do_natural(tmp_path):
    nat = tmp_path / "natural" / "person"
    nat.mkdir(parents=True)
    _imagem_suave(5).save(nat / "p.png")
    oi = tmp_path / "openimages"
    oi.mkdir()
    _imagem_suave(5).resize((80, 80)).save(oi / "p.jpg", quality=70)  # mesma foto, outra fonte
    relatorio = {}
    # natural vem primeiro no dict, mas a cópia do Open Images é a que fica
    prep.preparar({"natural": tmp_path / "natural", "openimages": oi}, tmp_path / "raw",
                  relatorio=relatorio)
    assert relatorio["por_origem"]["nao_residuo"] == {"openimages/todas": 1, "natural/person": 0}


def test_cota_fixa_do_open_images():
    assert prep.COTAS_FIXAS["openimages/todas"] == 450


def test_food11_sem_splits_usa_a_raiz(tmp_path):
    food = tmp_path / "food11"
    for i in range(2):
        _img(food / "Egg" / f"{i}.jpg")
    relatorio = {}
    prep.preparar({"food11": food}, tmp_path / "raw", relatorio=relatorio)
    assert relatorio["por_origem"]["nao_residuo"] == {"food11/egg": 2}


def test_caminho_explicito_inexistente_da_erro(tmp_path, monkeypatch):
    import pytest
    monkeypatch.setattr(prep, "DATASETS_DIR", tmp_path / "sem-downloads")
    fontes = _criar_fontes(tmp_path / "src")
    with pytest.raises(SystemExit, match="--rooms"):
        prep.main(["--garbage12", str(fontes["garbage12"]), "--dest", str(tmp_path / "raw"),
                   "--rooms", str(tmp_path / "nao-existe")])
