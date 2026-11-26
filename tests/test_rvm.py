"""Testes das regras de negócio da máquina (rvm.py)."""

import pytest

import rvm


def test_decide_aceita_plastico_com_confianca():
    decisao = rvm.decide("plastic", 90, False)
    assert decisao.accepted is True
    assert decisao.value == pytest.approx(0.10)


def test_decide_recusa_abaixo_de_70():
    decisao = rvm.decide("plastic", 69.9, False)
    assert decisao.accepted is False
    assert decisao.value == 0.0


def test_decide_recusa_papel_com_orientacao():
    decisao = rvm.decide("paper", 95, False)
    assert decisao.accepted is False
    assert "azul" in decisao.reason


def test_decide_recusa_compartimento_cheio():
    decisao = rvm.decide("glass", 95, True)
    assert decisao.accepted is False
    assert "cheio" in decisao.reason


def test_insert_soma_saldo(db_temporario):
    sessao = rvm.start_session()
    primeiro = rvm.insert_item(sessao, "plastic", 90)
    segundo = rvm.insert_item(sessao, "glass", 90)
    assert primeiro["accepted"] is True
    assert primeiro["balance"] == pytest.approx(0.10)
    assert segundo["accepted"] is True
    assert segundo["balance"] == pytest.approx(0.35)


def test_finish_gera_voucher_so_com_saldo(db_temporario):
    vazia = rvm.start_session()
    rvm.insert_item(vazia, "paper", 95)  # recusado: não gera saldo
    resultado = rvm.finish_session(vazia)
    assert resultado["voucher"] is None
    assert resultado["amount"] == 0

    com_saldo = rvm.start_session()
    rvm.insert_item(com_saldo, "metal", 90)
    resultado = rvm.finish_session(com_saldo)
    assert resultado["voucher"].startswith("RVM-")
    assert resultado["amount"] == pytest.approx(0.15)


def test_voucher_so_resgata_uma_vez(db_temporario):
    sessao = rvm.start_session()
    rvm.insert_item(sessao, "glass", 90)
    codigo = rvm.finish_session(sessao)["voucher"]

    primeiro = rvm.redeem_voucher(codigo)
    assert primeiro["ok"] is True
    assert primeiro["amount"] == pytest.approx(0.25)

    segundo = rvm.redeem_voucher(codigo)
    assert segundo["ok"] is False
    assert "já resgatado" in segundo["error"]


def test_sessao_finalizada_recusa_insercao(db_temporario):
    sessao = rvm.start_session()
    rvm.finish_session(sessao)
    with pytest.raises(rvm.SessionError):
        rvm.insert_item(sessao, "plastic", 90)


def contagem(material):
    return next(b["count"] for b in rvm.bin_status() if b["material"] == material)


def test_cancel_desconta_compartimento_e_nao_gera_voucher(db_temporario):
    outra = rvm.start_session()
    rvm.insert_item(outra, "plastic", 90)  # de outra pessoa: continua contando
    sessao = rvm.start_session()
    rvm.insert_item(sessao, "plastic", 90)
    rvm.insert_item(sessao, "glass", 90)
    rvm.insert_item(sessao, "paper", 95)  # recusado: não estava no compartimento
    assert contagem("plastic") == 2 and contagem("glass") == 1

    rvm.cancel_session(sessao)

    assert contagem("plastic") == 1 and contagem("glass") == 0
    with rvm.db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM vouchers").fetchone()[0] == 0
    assert rvm.stats()["credits_paid"] == 0.10  # só o item da outra sessão


def test_cancel_nao_deixa_compartimento_negativo(db_temporario):
    sessao = rvm.start_session()
    rvm.insert_item(sessao, "metal", 90)
    rvm.empty_bin("metal")  # operador esvaziou no meio da sessão
    rvm.cancel_session(sessao)
    assert contagem("metal") == 0


def test_cancel_encerra_a_sessao(db_temporario):
    sessao = rvm.start_session()
    rvm.cancel_session(sessao)
    with pytest.raises(rvm.SessionError):
        rvm.insert_item(sessao, "plastic", 90)
    with pytest.raises(rvm.SessionError):
        rvm.finish_session(sessao)
    with pytest.raises(rvm.SessionError):
        rvm.cancel_session(sessao)
    with pytest.raises(rvm.SessionError):
        rvm.cancel_session("nao-existe")
