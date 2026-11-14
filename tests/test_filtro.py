"""Testes da regra das 2 etapas (filtro.combinar) e do carregamento sem CLIP."""

import builtins

import pytest

import filtro

PROBS = {"cardboard": 0.05, "nao_residuo": 0.50, "paper": 0.30, "plastic": 0.15}


def test_sem_filtro_nao_muda_nada():
    assert filtro.combinar(PROBS, None) == PROBS


def test_reprovado_vira_nao_residuo_com_1_menos_p():
    assert filtro.combinar(PROBS, 0.2) == {"nao_residuo": pytest.approx(0.8)}


def test_aprovado_tira_nao_residuo_e_renormaliza():
    saida = filtro.combinar(PROBS, 0.9)
    assert "nao_residuo" not in saida
    assert saida == pytest.approx({"cardboard": 0.1, "paper": 0.6, "plastic": 0.3})


def test_limiar_exato_aprova():
    assert "nao_residuo" not in filtro.combinar(PROBS, filtro.LIMIAR_FILTRO)


def test_textos_sao_os_do_experimento():
    assert len(filtro.POS) == 12 and len(filtro.NEG) == 10
    assert "a selfie of a person" in filtro.NEG
    assert "a photo of a plastic bottle" in filtro.POS


def test_sem_open_clip_devolve_none(monkeypatch, capsys):
    importar = builtins.__import__

    def falso(nome, *args, **kw):
        if nome == "open_clip":
            raise ImportError("sem open_clip")
        return importar(nome, *args, **kw)

    monkeypatch.setattr(builtins, "__import__", falso)
    assert filtro.carregar() is None
    assert "AVISO" in capsys.readouterr().out
