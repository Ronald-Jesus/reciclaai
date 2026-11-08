"""Testes das rotas de telas: React em / e /lixeira, máquina em /maquina."""

import pytest

import app as app_module


@pytest.fixture
def cliente(tmp_path, monkeypatch, db_temporario):
    """Cliente Flask com um 'dist' falso, para não depender do Node."""
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(
        '<!doctype html><div id="root"></div><script src="/assets/app.js"></script>',
        encoding="utf-8",
    )
    (dist / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")
    monkeypatch.setattr(app_module, "FRONTEND_DIST", dist)
    return app_module.app.test_client()


def test_raiz_serve_o_react(cliente):
    resposta = cliente.get("/")
    assert resposta.status_code == 200
    assert b'<div id="root">' in resposta.data


def test_lixeira_serve_o_react(cliente):
    resposta = cliente.get("/lixeira")
    assert resposta.status_code == 200
    assert b'<div id="root">' in resposta.data


def test_assets_do_react_sao_servidos(cliente):
    resposta = cliente.get("/assets/app.js")
    assert resposta.status_code == 200
    assert b"console.log" in resposta.data


def test_sem_build_devolve_503_com_instrucao(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "FRONTEND_DIST", tmp_path / "inexistente")
    resposta = app_module.app.test_client().get("/")
    assert resposta.status_code == 503
    assert "npm run build" in resposta.get_data(as_text=True)


def test_maquina_continua_funcionando(cliente):
    assert cliente.get("/maquina").status_code == 200


def test_admin_continua_funcionando(cliente):
    resposta = cliente.get("/admin")
    assert resposta.status_code == 200
    assert b'href="/maquina"' in resposta.data
