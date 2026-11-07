"""Fixtures compartilhadas pelos testes."""

import pytest

import rvm


@pytest.fixture
def db_temporario(tmp_path, monkeypatch):
    """Aponta rvm.DB_PATH para um arquivo temporário e cria as tabelas.

    Cada teste recebe um banco novo; o rvm.db real nunca é tocado.
    """
    caminho = tmp_path / "teste.db"
    monkeypatch.setattr(rvm, "DB_PATH", caminho)
    rvm.init_db()
    return caminho
