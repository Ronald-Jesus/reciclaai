"""Testes do teste externo (issue #17): dHash, pastas, deduplicação e métricas.

Rodam sem o modelo real e sem o dataset: as imagens são geradas no tmp_path e
o modelo é um nn.Module falso com logits fixos (mesmo padrão de test_api.py).
"""

import json
import random

import numpy as np
import pytest
import torch
from PIL import Image, ImageDraw
from torch import nn

from scripts import teste_externo as te

CLASSES = ["cardboard", "glass", "metal", "nao_residuo", "organic", "paper", "plastic", "trash"]


def _imagem(semente: int, tam: int = 128) -> Image.Image:
    """Imagem com formas aleatórias: estrutura de baixa frequência, como uma foto."""
    rng = random.Random(semente)
    img = Image.new("RGB", (tam, tam), tuple(rng.randrange(256) for _ in range(3)))
    desenho = ImageDraw.Draw(img)
    for _ in range(12):
        x0, y0 = rng.randrange(tam), rng.randrange(tam)
        x1, y1 = x0 + rng.randrange(10, tam // 2), y0 + rng.randrange(10, tam // 2)
        desenho.ellipse((x0, y0, x1, y1), fill=tuple(rng.randrange(256) for _ in range(3)))
    return img


def _salvar(img: Image.Image, caminho, **kw):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    img.save(caminho, **kw)
    return caminho


# --- dHash e Hamming ------------------------------------------------------

def test_dhash_imagem_identica_da_zero():
    img = _imagem(1)
    assert te.hamming(te.dhash(img), te.dhash(img.copy())) == 0


def test_dhash_tem_64_bits():
    assert 0 <= te.dhash(_imagem(2)) < 2 ** 64


def test_dhash_redimensionada_e_recomprimida_fica_perto(tmp_path):
    img = _imagem(3, 256)
    caminho = _salvar(img.resize((180, 180)), tmp_path / "menor.jpg", quality=60)
    with Image.open(caminho) as copia:
        assert te.hamming(te.dhash(img), te.dhash(copia)) <= 6


def test_dhash_imagens_diferentes_ficam_longe():
    distancias = [te.hamming(te.dhash(_imagem(10 + i)), te.dhash(_imagem(50 + i))) for i in range(10)]
    assert min(distancias) > 6
    assert np.mean(distancias) > 20


def test_popcount_vetorizado_bate_com_hamming():
    valores = [0, 1, 2 ** 64 - 1, 0xF0F0F0F0F0F0F0F0, 12345678901234567]
    arr = np.array(valores, dtype=np.uint64)
    assert te.popcount64(arr).tolist() == [bin(v).count("1") for v in valores]


# --- Pastas e nomes --------------------------------------------------------

@pytest.mark.parametrize("nome,esperado", [
    ("cardboard", "cardboard"),
    ("Cardboard", "cardboard"),
    (" GLASS ", "glass"),
    ("Papelão", "cardboard"),
    ("plástico", "plastic"),
    ("plastics", "plastic"),
    ("não-resíduo", "nao_residuo"),
    ("nao residuo", "nao_residuo"),
    ("battery", None),
])
def test_normalizar_nome(nome, esperado):
    assert te.normalizar_nome(nome) == esperado


def test_localizar_classes_em_pasta_aninhada(tmp_path):
    raiz = tmp_path / "Garbage classification" / "Garbage classification"
    for c in ["cardboard", "glass", "metal", "paper", "plastic", "trash"]:
        (raiz / c).mkdir(parents=True)
    (tmp_path / "outra").mkdir()
    mapa = te.localizar_classes(tmp_path)
    assert sorted(mapa) == ["cardboard", "glass", "metal", "paper", "plastic", "trash"]
    assert mapa["glass"] == raiz / "glass"


def test_coletar_imagens_erros_claros(tmp_path):
    with pytest.raises(SystemExit, match="não encontrada"):
        te.coletar_imagens(tmp_path / "nao-existe")
    (tmp_path / "vazia" / "qualquer").mkdir(parents=True)
    with pytest.raises(SystemExit, match="nenhuma subpasta de classe"):
        te.coletar_imagens(tmp_path / "vazia")


def test_main_sem_modelo_da_erro_claro(tmp_path):
    with pytest.raises(SystemExit, match="modelo não encontrado"):
        te.main(["--externo", str(tmp_path), "--modelo", str(tmp_path / "x.pth")])


# --- Deduplicação ----------------------------------------------------------

@pytest.fixture
def cenario(tmp_path):
    """Dataset interno com 3 imagens e um externo com cópia exata, quase cópia e novas."""
    interno = tmp_path / "dataset"
    a = _salvar(_imagem(100, 256), interno / "train" / "glass" / "a.png")
    b = _salvar(_imagem(101, 256), interno / "test" / "metal" / "b.png")
    _salvar(_imagem(102, 256), interno / "val" / "paper" / "c.png")

    externo = tmp_path / "externo" / "Garbage classification" / "Garbage classification"
    (externo / "glass").mkdir(parents=True)
    (externo / "glass" / "copia.png").write_bytes(a.read_bytes())          # SHA-1 igual
    with Image.open(b) as img:                                               # quase igual
        _salvar(img.resize((200, 200)), externo / "metal" / "quase.jpg", quality=70)
    _salvar(_imagem(200), externo / "metal" / "nova1.png")
    _salvar(_imagem(201), externo / "plastic" / "nova2.png")
    _salvar(_imagem(202), externo / "plastic" / "nova3.png")
    return tmp_path, interno


def test_deduplicacao_remove_exata_e_quase_igual(cenario):
    tmp_path, interno = cenario
    ref, info = te.carregar_referencia([interno], tmp_path / "cache.json", base=tmp_path)
    assert info["unicos"] == 3
    itens = te.coletar_imagens(tmp_path / "externo")
    mantidas, removidas = te.deduplicar(itens, ref, limiar=6)
    motivos = {r["motivo"] for r in removidas}
    assert motivos == {"sha1", "dhash"}
    assert sorted(p.name for p, _ in mantidas) == ["nova1.png", "nova2.png", "nova3.png"]


def test_cache_de_hashes_e_reaproveitado(cenario):
    tmp_path, interno = cenario
    cache = tmp_path / "cache" / "hashes.json"
    _, info1 = te.carregar_referencia([interno], cache, base=tmp_path)
    assert info1["calculados"] == 3 and cache.exists()
    _, info2 = te.carregar_referencia([interno, tmp_path / "nao-existe"], cache, base=tmp_path)
    assert info2["calculados"] == 0 and info2["unicos"] == 3


def test_referencia_conta_copias_uma_vez(cenario):
    tmp_path, interno = cenario
    raw = tmp_path / "dataset_raw"
    for img in interno.rglob("*.png"):
        destino = raw / img.parent.name / img.name
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(img.read_bytes())
    _, info = te.carregar_referencia([interno, raw], None, base=tmp_path)
    assert info["arquivos"] == 6 and info["unicos"] == 3


# --- Avaliação com modelo falso --------------------------------------------

class ModeloFalso(nn.Module):
    """Devolve sempre os mesmos logits, com destaque para a classe escolhida."""

    def __init__(self, classe: str, destaque: float = 12.0):
        super().__init__()
        self.logits = torch.zeros(len(CLASSES))
        self.logits[CLASSES.index(classe)] = destaque

    def forward(self, x):
        return self.logits.unsqueeze(0).repeat(x.shape[0], 1).to(x.device)


def test_calcular_metricas_numeros_esperados():
    prev = [
        {"arquivo": "1", "real": "glass", "previsto": "glass", "confianca": 95.0},
        {"arquivo": "2", "real": "glass", "previsto": "plastic", "confianca": 90.0},
        {"arquivo": "3", "real": "plastic", "previsto": "plastic", "confianca": 60.0},
        {"arquivo": "4", "real": "metal", "previsto": "nao_residuo", "confianca": 99.0},
    ]
    m = te.calcular_metricas(prev, CLASSES)
    assert m["n"] == 4 and m["acertos"] == 2
    assert m["acuracia"] == 0.5
    assert m["nao_reconhecido"] == 2              # confiança 60 e classe nao_residuo
    assert m["acuracia_aceitando_nao_reconhecido"] == 0.75
    assert m["acuracia_entre_reconhecidos"] == 0.5
    assert m["erros_confiantes"] == 1
    assert m["por_classe"]["plastic"] == {"n": 1, "previstos": 2, "precisao": 0.5,
                                          "recall": 1.0, "nao_reconhecido": 1}
    assert m["por_classe"]["nao_residuo"]["n"] == 0
    assert m["confusao"]["linhas_reais"] == ["glass", "metal", "plastic"]
    assert m["confusao"]["valores"][0] == [0, 1, 0, 0, 0, 0, 1, 0]
    assert [p["arquivo"] for p in m["piores_erros"]] == ["4", "2"]


def test_executar_gera_saidas_com_modelo_falso(cenario):
    tmp_path, interno = cenario
    saida = tmp_path / "saida"
    r = te.executar(tmp_path / "externo", saida, limiar=6, model=ModeloFalso("plastic"),
                    classes=CLASSES, referencias=[interno], cache=None,
                    device=torch.device("cpu"), batch=2)

    dados = json.loads((saida / "metricas.json").read_text(encoding="utf-8"))
    assert dados == json.loads(json.dumps(r, ensure_ascii=False))
    ext = dados["externo"]
    assert ext["dedup"] == {"total": 5, "removidas": 2, "mantidas": 3, "limiar": 6,
                            "por_motivo": {"sha1": 1, "dhash": 1}}
    m = ext["metricas"]
    assert m["n"] == 3 and m["acertos"] == 2
    assert m["acuracia"] == pytest.approx(2 / 3)
    assert m["nao_reconhecido"] == 0
    assert m["por_classe"]["plastic"]["precisao"] == pytest.approx(2 / 3)
    assert m["por_classe"]["metal"]["recall"] == 0.0
    assert len(m["piores_erros"]) == 1 and m["piores_erros"][0]["previsto"] == "plastic"

    for nome in ["confusao.csv", "duplicatas.csv", "resultados.md"]:
        assert (saida / nome).exists()
    md = (saida / "resultados.md").read_text(encoding="utf-8")
    assert "66,67%" in md
    assert "conferir licença na página do Kaggle" in md
    assert "Removidas por duplicata: 2" in md


def test_executar_com_fotos_proprias(cenario):
    tmp_path, interno = cenario
    fotos = tmp_path / "fotos"
    _salvar(_imagem(300), fotos / "vidro" / "f1.png")
    r = te.executar(tmp_path / "externo", tmp_path / "saida", fotos_proprias=fotos,
                    model=ModeloFalso("glass"), classes=CLASSES, referencias=[interno],
                    cache=None, device=torch.device("cpu"))
    assert r["fotos_proprias"]["metricas"]["acuracia"] == 1.0
    assert (tmp_path / "saida" / "confusao_fotos_proprias.csv").exists()


def test_executar_com_tudo_duplicado_nao_quebra(tmp_path):
    interno = tmp_path / "dataset"
    a = _salvar(_imagem(400, 256), interno / "test" / "glass" / "a.png")
    externo = tmp_path / "externo" / "glass"
    externo.mkdir(parents=True)
    (externo / "a.png").write_bytes(a.read_bytes())
    r = te.executar(tmp_path / "externo", tmp_path / "saida", model=ModeloFalso("glass"),
                    classes=CLASSES, referencias=[interno], cache=None, device=torch.device("cpu"))
    assert r["externo"]["dedup"]["removidas"] == 1
    assert r["externo"]["metricas"]["n"] == 0
    assert "Nenhuma imagem sobrou" in (tmp_path / "saida" / "resultados.md").read_text(encoding="utf-8")


def test_deduplicacao_pega_imagem_espelhada(tmp_path):
    interno = tmp_path / "dataset"
    original = _imagem(500, 256)
    _salvar(original, interno / "train" / "glass" / "a.png")
    externo = tmp_path / "externo"
    espelhada = original.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    _salvar(espelhada, externo / "glass" / "espelhada.png")
    _salvar(_imagem(501), externo / "glass" / "nova.png")

    assert te.hamming(te.dhash(original), te.dhash(espelhada)) > 6  # sem espelhar, passaria
    ref, _ = te.carregar_referencia([interno], None, base=tmp_path)
    mantidas, removidas = te.deduplicar(te.coletar_imagens(externo), ref, limiar=6)
    assert [p.name for p, _ in mantidas] == ["nova.png"]
    assert len(removidas) == 1
    assert removidas[0]["motivo"] == "dhash_espelhada"
    assert removidas[0]["distancia"] == 0


# --- Temperatura -------------------------------------------------------------

def test_carregar_modelo_sem_temperatura_usa_1(tmp_path):
    from torchvision import models
    modelo = models.resnet18(weights=None)
    modelo.fc = nn.Linear(modelo.fc.in_features, len(CLASSES))
    torch.save({"model_state": modelo.state_dict(), "classes": CLASSES}, tmp_path / "a.pth")
    torch.save({"model_state": modelo.state_dict(), "classes": CLASSES, "temperatura": 1.7}, tmp_path / "b.pth")
    _, classes, t = te.carregar_modelo(tmp_path / "a.pth", torch.device("cpu"))
    assert classes == CLASSES and t == 1.0
    assert te.carregar_modelo(tmp_path / "b.pth", torch.device("cpu"))[2] == 1.7


def test_prever_com_temperatura_2_baixa_a_confianca(tmp_path):
    itens = [(_salvar(_imagem(500), tmp_path / "x.png"), "plastic")]
    modelo = ModeloFalso("plastic", destaque=4.0)
    normal = te.prever(modelo, CLASSES, itens)[0]
    calibrada = te.prever(modelo, CLASSES, itens, temperatura=2.0)[0]
    assert normal["previsto"] == calibrada["previsto"] == "plastic"
    assert normal["confianca"] == pytest.approx(88.6, abs=0.1)
    assert calibrada["confianca"] == pytest.approx(51.3, abs=0.1)


# --- IA em 2 etapas (--filtro) ------------------------------------------------

class FiltroFalso:
    """p_residuo fixo pelo conteúdo: imagens em `reprova` têm 0,02; o resto passa com 0,97."""

    def __init__(self, reprova=()):
        self.reprova = {Image.open(c).convert("RGB").tobytes() for c in reprova}

    def p_residuo(self, imagem) -> float:
        return 0.02 if imagem.convert("RGB").tobytes() in self.reprova else 0.97


def test_prever_com_filtro_usa_a_regra_compartilhada(tmp_path):
    itens = [(_salvar(_imagem(500), tmp_path / "selfie.png"), "nao_residuo"),
             (_salvar(_imagem(501), tmp_path / "garrafa.png"), "plastic")]
    modelo = ModeloFalso("nao_residuo")  # v1 diria nao_residuo para tudo
    modelo.logits[CLASSES.index("plastic")] = 8.0
    selfie, garrafa = te.prever(modelo, CLASSES, itens, filtro_clip=FiltroFalso(reprova=[itens[0][0]]))
    assert selfie["previsto"] == "nao_residuo" and selfie["confianca"] == pytest.approx(98.0)
    assert selfie["p_residuo"] == pytest.approx(0.02)
    assert garrafa["previsto"] == "plastic" and garrafa["confianca"] > 95


def test_executar_com_filtro_registra_no_resultado(cenario):
    tmp_path, interno = cenario
    r = te.executar(tmp_path / "externo", tmp_path / "saida", model=ModeloFalso("plastic"),
                    classes=CLASSES, referencias=[interno], cache=None,
                    device=torch.device("cpu"), filtro_clip=FiltroFalso())
    assert r["filtro"] == {"modelo": "ViT-B-32", "pesos": "laion2b_s34b_b79k", "limiar": 0.5}
    assert "2 etapas" in (tmp_path / "saida" / "resultados.md").read_text(encoding="utf-8")


def test_main_filtro_indisponivel_da_erro_claro(tmp_path, monkeypatch):
    import filtro
    monkeypatch.setattr(filtro, "carregar", lambda device=None: None)
    modelo = tmp_path / "m.pth"
    modelo.write_bytes(b"x")
    with pytest.raises(SystemExit, match="filtro"):
        te.main(["--externo", str(tmp_path), "--modelo", str(modelo), "--filtro"])
