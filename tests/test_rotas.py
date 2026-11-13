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


def test_arquivo_publico_do_dist_e_servido(cliente):
    import app as m
    (m.FRONTEND_DIST / "fotos").mkdir()
    (m.FRONTEND_DIST / "fotos" / "x.jpg").write_bytes(bytes([0xFF, 0xD8, 0xFF]))
    (m.FRONTEND_DIST / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    r = cliente.get("/fotos/x.jpg")
    assert r.status_code == 200
    assert r.mimetype == "image/jpeg"
    assert cliente.get("/favicon.svg").status_code == 200


def test_quadro_webp_sai_como_imagem(cliente):
    # O Python do Windows não conhece .webp; sem isso a máquina animada cairia no SVG.
    import app as m
    (m.FRONTEND_DIST / "maquina" / "frames").mkdir(parents=True)
    (m.FRONTEND_DIST / "maquina" / "frames" / "frame_0001.webp").write_bytes(b"RIFF0000WEBP")
    r = cliente.head("/maquina/frames/frame_0001.webp")
    assert r.status_code == 200
    assert r.mimetype == "image/webp"


def test_path_traversal_nao_vaza_arquivos(cliente):
    for caminho in ("/fotos/../../app.py", "/fotos/%2e%2e/%2e%2e/app.py", "/..%2fapp.py", "/%2e%2e/app.py"):
        r = cliente.get(caminho)
        assert r.status_code in (301, 308, 404)
        assert b"load_model" not in r.data


def test_desconhecidos_e_api_nao_viram_spa(cliente):
    assert cliente.get("/api/inexistente").status_code == 404
    assert cliente.get("/nao-existe.png").status_code == 404
    assert cliente.get("/api/status").status_code == 200
    assert cliente.post("/predict").status_code != 404
