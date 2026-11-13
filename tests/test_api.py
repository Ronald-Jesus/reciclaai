"""Testes da API do classificador (/predict e /api/status) com modelo simulado."""

import io

import pytest
import torch
from PIL import Image
from torch import nn

import app as app_module
import rvm

CLASSES = ["cardboard", "glass", "metal", "nao_residuo", "organic", "paper", "plastic", "trash"]


class ModeloFalso(nn.Module):
    """Devolve sempre os mesmos logits, com destaque para a classe escolhida."""

    def __init__(self, classe: str | None, destaque: float = 12.0):
        super().__init__()
        self.logits = torch.zeros(len(CLASSES))
        if classe is not None:
            self.logits[CLASSES.index(classe)] = destaque

    def forward(self, x):
        return self.logits.unsqueeze(0).repeat(x.shape[0], 1).to(x.device)


@pytest.fixture
def com_modelo(monkeypatch, db_temporario):
    """Instala um modelo falso; devolve (cliente, função para trocar a classe)."""

    def definir(classe, destaque=12.0):
        monkeypatch.setattr(app_module, "_model", ModeloFalso(classe, destaque))

    monkeypatch.setattr(app_module, "_classes", CLASSES)
    definir("plastic")
    return app_module.app.test_client(), definir


def foto(formato="PNG") -> io.BytesIO:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, formato)
    buffer.seek(0)
    return buffer


def enviar(cliente, arquivo=None, nome="foto.png"):
    return cliente.post("/predict", data={"image": (arquivo or foto(), nome)},
                        content_type="multipart/form-data")


def contar_itens() -> int:
    with rvm.db() as conn:
        return conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]


def test_predict_diz_valor_na_maquina(com_modelo):
    cliente, _ = com_modelo
    resposta = enviar(cliente)
    assert resposta.status_code == 200
    dados = resposta.get_json()
    assert dados["prediction"]["class"] == "plastic"
    assert dados["prediction"]["bin"] == "vermelha"
    assert dados["prediction"]["color"] == "#c8453a"
    assert len(dados["ranking"]) == 3
    assert dados["machine"]["accepted"] is True
    assert dados["machine"]["value"] == rvm.ACCEPTED["plastic"]["value"]
    assert dados["low_confidence"] is False
    assert dados["nao_reconhecido"] is False


def test_predict_nao_gera_credito(com_modelo):
    cliente, _ = com_modelo
    antes = contar_itens()
    assert enviar(cliente).status_code == 200
    assert contar_itens() == antes


def test_upload_acima_de_5mb_da_413(com_modelo):
    cliente, _ = com_modelo
    grande = io.BytesIO(b"0" * (5 * 1024 * 1024 + 1024))
    resposta = enviar(cliente, grande, "grande.jpg")
    assert resposta.status_code == 413
    assert "5 MB" in resposta.get_json()["error"]


def test_arquivo_que_nao_e_imagem_da_400(com_modelo):
    cliente, _ = com_modelo
    resposta = enviar(cliente, io.BytesIO(b"isto nao e uma imagem"), "texto.txt")
    assert resposta.status_code == 400
    assert "JPG" in resposta.get_json()["error"]


def test_sem_arquivo_da_400(com_modelo):
    cliente, _ = com_modelo
    resposta = cliente.post("/predict", data={}, content_type="multipart/form-data")
    assert resposta.status_code == 400
    assert "error" in resposta.get_json()


def test_sem_modelo_da_503_com_mensagem(monkeypatch, db_temporario):
    monkeypatch.setattr(app_module, "_model", None)
    resposta = enviar(app_module.app.test_client())
    assert resposta.status_code == 503
    assert "treino.py" in resposta.get_json()["error"]


def test_organico_vai_para_lixeira_marrom(com_modelo):
    cliente, definir = com_modelo
    definir("organic")
    dados = enviar(cliente).get_json()
    assert dados["prediction"]["bin"] == "marrom"
    assert dados["nao_reconhecido"] is False
    assert dados["machine"]["accepted"] is False
    assert "lixeira marrom" in dados["machine"]["reason"]


def test_nao_residuo_nao_vira_material(com_modelo):
    cliente, definir = com_modelo
    definir("nao_residuo")
    dados = enviar(cliente).get_json()
    assert dados["nao_reconhecido"] is True
    assert dados["prediction"]["bin"] is None
    assert dados["machine"]["accepted"] is False
    assert dados["machine"]["value"] == 0
    assert dados["machine"]["reason"] == "Não reconheci uma embalagem nesta foto."


def test_confianca_baixa_vira_nao_reconhecido(com_modelo):
    cliente, definir = com_modelo
    definir("plastic", destaque=1.0)  # softmax quase uniforme
    dados = enviar(cliente).get_json()
    assert dados["prediction"]["confidence"] < 70
    assert dados["low_confidence"] is True
    assert dados["nao_reconhecido"] is True
    assert dados["machine"]["accepted"] is False
    assert dados["machine"]["reason"] == "Não reconheci uma embalagem nesta foto."


def test_status_informa_modelo(monkeypatch, com_modelo):
    cliente, _ = com_modelo
    dados = cliente.get("/api/status").get_json()
    assert dados == {"model_ready": True, "classes": CLASSES}
    monkeypatch.setattr(app_module, "_model", None)
    monkeypatch.setattr(app_module, "_classes", [])
    assert cliente.get("/api/status").get_json()["model_ready"] is False


def inserir(cliente, arquivo=None, nome="foto.png"):
    sessao = cliente.post("/api/session").get_json()["session_id"]
    return sessao, cliente.post(f"/api/session/{sessao}/insert",
                                data={"image": (arquivo or foto(), nome)},
                                content_type="multipart/form-data")


def test_insert_nao_residuo_nao_credita(com_modelo):
    cliente, definir = com_modelo
    definir("nao_residuo")
    _, resposta = inserir(cliente)
    dados = resposta.get_json()
    assert dados["nao_reconhecido"] is True
    assert dados["accepted"] is False
    assert dados["balance"] == 0
    assert dados["reason"] == "Não reconheci uma embalagem nesta foto."


def test_insert_aceito_tem_nao_reconhecido_falso(com_modelo):
    cliente, _ = com_modelo
    dados = inserir(cliente)[1].get_json()
    assert dados["nao_reconhecido"] is False
    assert dados["accepted"] is True


def test_insert_acima_de_5mb_da_413(com_modelo):
    cliente, _ = com_modelo
    _, resposta = inserir(cliente, io.BytesIO(b"0" * (5 * 1024 * 1024 + 1024)), "g.jpg")
    assert resposta.status_code == 413


def test_insert_sem_modelo_da_503(monkeypatch, db_temporario):
    monkeypatch.setattr(app_module, "_model", None)
    cliente = app_module.app.test_client()
    _, resposta = inserir(cliente)
    assert resposta.status_code == 503
    assert "treino.py" in resposta.get_json()["error"]


def _checkpoint_real(caminho, **extra):
    from torchvision import models
    modelo = models.resnet18(weights=None)
    modelo.fc = nn.Linear(modelo.fc.in_features, len(CLASSES))
    torch.save({"model_state": modelo.state_dict(), "classes": CLASSES, **extra}, caminho)


def test_checkpoint_sem_temperatura_usa_1(monkeypatch, tmp_path):
    caminho = tmp_path / "antigo.pth"
    _checkpoint_real(caminho)
    for nome, valor in [("MODEL_PATH", caminho), ("_model", None), ("_classes", []), ("_temperatura", 9.0)]:
        monkeypatch.setattr(app_module, nome, valor)
    app_module.load_model()
    assert app_module._temperatura == 1.0
    assert app_module._classes == CLASSES


def test_checkpoint_com_temperatura_e_lido(monkeypatch, tmp_path):
    caminho = tmp_path / "novo.pth"
    _checkpoint_real(caminho, temperatura=2.5)
    for nome, valor in [("MODEL_PATH", caminho), ("_model", None), ("_classes", []), ("_temperatura", 1.0)]:
        monkeypatch.setattr(app_module, nome, valor)
    app_module.load_model()
    assert app_module._temperatura == 2.5


def test_temperatura_2_baixa_a_confianca(com_modelo, monkeypatch):
    cliente, definir = com_modelo
    definir("plastic", destaque=4.0)
    normal = enviar(cliente).get_json()["prediction"]["confidence"]
    monkeypatch.setattr(app_module, "_temperatura", 2.0)
    calibrada = enviar(cliente).get_json()["prediction"]
    assert calibrada["class"] == "plastic"
    assert calibrada["confidence"] < normal
    assert normal == pytest.approx(88.6, abs=0.1) and calibrada["confidence"] == pytest.approx(51.35, abs=0.1)
