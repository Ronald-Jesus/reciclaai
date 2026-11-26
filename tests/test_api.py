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
    assert dados == {"model_ready": True, "classes": CLASSES, "filtro_ready": False}
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


# --- IA em 2 etapas: filtro CLIP falso (o CLIP real não é baixado nos testes) ---

class FiltroFalso:
    def __init__(self, p: float):
        self.p = p

    def p_residuo(self, imagem) -> float:
        return self.p


def test_sem_filtro_resposta_tem_filtro_nulo(com_modelo):
    cliente, _ = com_modelo
    assert enviar(cliente).get_json()["filtro"] is None


def test_filtro_reprova_vira_nao_reconhecido(com_modelo, monkeypatch):
    cliente, definir = com_modelo
    definir("paper")  # o v1 diria "papel" com confiança alta, como na selfie
    monkeypatch.setattr(app_module, "_filtro", FiltroFalso(0.1))
    dados = enviar(cliente).get_json()
    assert dados["prediction"]["class"] == "nao_residuo"
    assert dados["prediction"]["confidence"] == 90.0
    assert dados["nao_reconhecido"] is True
    assert dados["machine"]["accepted"] is False
    assert dados["machine"]["reason"] == rvm.NAO_RECONHECIDO
    assert dados["filtro"] == {"p_residuo": 0.1, "aprovado": False}


def test_filtro_aprova_e_v1_escolhe_entre_materiais(com_modelo, monkeypatch):
    cliente, definir = com_modelo
    logits = torch.zeros(len(CLASSES))
    logits[CLASSES.index("nao_residuo")] = 12.0
    logits[CLASSES.index("plastic")] = 8.0
    definir("plastic")
    app_module._model.logits = logits
    monkeypatch.setattr(app_module, "_filtro", FiltroFalso(0.95))
    dados = enviar(cliente).get_json()
    assert dados["prediction"]["class"] == "plastic"
    assert dados["prediction"]["confidence"] > 95
    assert all(r["class"] != "nao_residuo" for r in dados["ranking"])
    assert dados["nao_reconhecido"] is False
    assert dados["machine"]["accepted"] is True
    assert dados["filtro"] == {"p_residuo": 0.95, "aprovado": True}


def test_filtro_aprova_mas_confianca_baixa_continua_nao_reconhecido(com_modelo, monkeypatch):
    cliente, definir = com_modelo
    definir("plastic", destaque=1.0)
    monkeypatch.setattr(app_module, "_filtro", FiltroFalso(0.9))
    dados = enviar(cliente).get_json()
    assert dados["low_confidence"] is True
    assert dados["nao_reconhecido"] is True
    assert dados["machine"]["accepted"] is False


def test_insert_com_filtro_reprovado_nao_credita(com_modelo, monkeypatch):
    cliente, _ = com_modelo
    monkeypatch.setattr(app_module, "_filtro", FiltroFalso(0.0))
    dados = inserir(cliente)[1].get_json()
    assert dados["prediction"]["class"] == "nao_residuo"
    assert dados["nao_reconhecido"] is True
    assert dados["accepted"] is False and dados["balance"] == 0
    assert dados["filtro"]["aprovado"] is False


def test_status_informa_filtro(com_modelo, monkeypatch):
    cliente, _ = com_modelo
    monkeypatch.setattr(app_module, "_filtro", FiltroFalso(1.0))
    assert cliente.get("/api/status").get_json()["filtro_ready"] is True


def test_foto_de_celular_e_girada_pelo_exif(com_modelo, monkeypatch):
    # Celular grava a foto deitada e marca a rotação no EXIF; a IA precisa ver em pé.
    cliente, definir = com_modelo
    definir("plastic")
    tamanhos = []
    original = app_module._transform
    monkeypatch.setattr(app_module, "_transform", lambda img: (tamanhos.append(img.size), original(img))[1])
    buffer = io.BytesIO()
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: girar 90°
    Image.new("RGB", (40, 20), "white").save(buffer, "JPEG", exif=exif)
    buffer.seek(0)
    assert enviar(cliente, buffer, "celular.jpg").status_code == 200
    assert tamanhos == [(20, 40)]


# --- máquina: sessões, vouchers e painel do operador ---

def test_insert_em_sessao_inexistente_da_409(com_modelo):
    cliente, _ = com_modelo
    resposta = cliente.post("/api/session/nao-existe/insert", data={"image": (foto(), "foto.png")},
                            content_type="multipart/form-data")
    assert resposta.status_code == 409
    assert resposta.get_json()["error"] == "Sessão inexistente."


def test_finish_em_sessao_inexistente_da_409(com_modelo):
    cliente, _ = com_modelo
    resposta = cliente.post("/api/session/nao-existe/finish")
    assert resposta.status_code == 409
    assert resposta.get_json()["error"] == "Sessão inexistente."


def test_sessao_finalizada_da_409_no_insert_e_no_finish(com_modelo):
    cliente, _ = com_modelo
    sessao, _ = inserir(cliente)
    assert cliente.post(f"/api/session/{sessao}/finish").status_code == 200
    de_novo = cliente.post(f"/api/session/{sessao}/finish")
    assert de_novo.status_code == 409
    assert de_novo.get_json()["error"] == "Sessão já finalizada."
    insert = cliente.post(f"/api/session/{sessao}/insert", data={"image": (foto(), "foto.png")},
                          content_type="multipart/form-data")
    assert insert.status_code == 409


def test_finish_devolve_voucher_e_itens(com_modelo):
    cliente, _ = com_modelo
    sessao, _ = inserir(cliente)
    dados = cliente.post(f"/api/session/{sessao}/finish").get_json()
    assert dados["voucher"].startswith("RVM-")
    assert dados["items"] == [{"class": "plastic", "label": "Plástico", "bin": "vermelha",
                               "color": "#c8453a", "count": 1}]


def test_voucher_inexistente_da_400(com_modelo):
    cliente, _ = com_modelo
    resposta = cliente.post("/api/vouchers/RVM-000000-000000/redeem")
    assert resposta.status_code == 400
    assert resposta.get_json() == {"ok": False, "error": "Voucher não encontrado."}


def test_voucher_resgatado_duas_vezes_falha_na_segunda(com_modelo):
    cliente, _ = com_modelo
    sessao, _ = inserir(cliente)
    codigo = cliente.post(f"/api/session/{sessao}/finish").get_json()["voucher"]
    primeiro = cliente.post(f"/api/vouchers/{codigo.lower()}/redeem")  # aceita minúsculas
    assert primeiro.status_code == 200
    assert primeiro.get_json() == {"ok": True, "amount": rvm.ACCEPTED["plastic"]["value"]}
    segundo = cliente.post(f"/api/vouchers/{codigo}/redeem")
    assert segundo.status_code == 400
    assert "já resgatado" in segundo.get_json()["error"]


def test_cancel_encerra_sem_voucher_e_devolve_o_espaco(com_modelo):
    cliente, _ = com_modelo
    sessao, _ = inserir(cliente)
    resposta = cliente.post(f"/api/session/{sessao}/cancel")
    assert resposta.status_code == 200
    assert resposta.get_json() == {"ok": True}
    bins = {b["material"]: b["count"] for b in cliente.get("/api/admin/status").get_json()["bins"]}
    assert bins["plastic"] == 0
    assert cliente.post(f"/api/session/{sessao}/finish").status_code == 409
    assert cliente.post(f"/api/session/{sessao}/cancel").status_code == 409
    assert cliente.post("/api/session/nao-existe/cancel").status_code == 409


def test_admin_status_mostra_compartimentos_e_estatisticas(com_modelo):
    cliente, definir = com_modelo
    inserir(cliente)
    definir("paper")
    inserir(cliente)
    dados = cliente.get("/api/admin/status").get_json()
    assert [b["material"] for b in dados["bins"]] == sorted(rvm.ACCEPTED)
    plastico = next(b for b in dados["bins"] if b["material"] == "plastic")
    assert plastico == {"material": "plastic", "count": 1, "capacity": rvm.ACCEPTED["plastic"]["capacity"],
                        "percent": 0.5, "warning": False, "full": False}
    stats = dados["stats"]
    assert stats["items_total"] == 2 and stats["items_accepted"] == 1 and stats["items_rejected"] == 1
    assert stats["credits_paid"] == rvm.ACCEPTED["plastic"]["value"]
    assert stats["sessions"] == 2
    assert {m["material"] for m in stats["by_material"]} == {"paper", "plastic"}
    assert len(stats["recent"]) == 2


def test_admin_status_avisa_compartimento_quase_cheio(com_modelo, monkeypatch):
    cliente, definir = com_modelo
    definir("glass")
    with rvm.db() as conn:
        conn.execute("UPDATE bins SET count = capacity WHERE material = 'glass'")
    vidro = next(b for b in cliente.get("/api/admin/status").get_json()["bins"] if b["material"] == "glass")
    assert vidro["warning"] is True and vidro["full"] is True
    dados = inserir(cliente)[1].get_json()
    assert dados["accepted"] is False and "cheio" in dados["reason"]


def test_admin_esvazia_compartimento(com_modelo):
    cliente, _ = com_modelo
    inserir(cliente)
    resposta = cliente.post("/api/admin/bins/plastic/empty")
    assert resposta.status_code == 200
    assert resposta.get_json() == {"ok": True}
    bins = {b["material"]: b["count"] for b in cliente.get("/api/admin/status").get_json()["bins"]}
    assert bins["plastic"] == 0


def test_admin_esvaziar_material_inexistente_da_404(com_modelo):
    cliente, _ = com_modelo
    resposta = cliente.post("/api/admin/bins/isopor/empty")
    assert resposta.status_code == 404
    assert resposta.get_json()["error"] == "Compartimento inexistente."
