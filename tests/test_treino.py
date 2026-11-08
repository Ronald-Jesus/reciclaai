import json

import torch
from PIL import Image

import treino

CLASSES = ["cardboard", "glass", "metal", "nao_residuo", "organic", "paper", "plastic", "trash"]


def _criar_dataset(base, por_classe=4):
    for split in ["train", "val", "test"]:
        for k, classe in enumerate(CLASSES):
            pasta = base / split / classe
            pasta.mkdir(parents=True)
            for i in range(por_classe):
                Image.new("RGB", (40, 40), (k * 30, 255 - k * 30, i * 20)).save(pasta / f"{i}.png")


def test_build_model_sem_pretreino_congela_o_resto():
    modelo = treino.build_model(8, pretrained=False)
    assert modelo.fc.out_features == 8
    treinaveis = {n.split(".")[0] for n, p in modelo.named_parameters() if p.requires_grad}
    assert treinaveis == {"layer4", "fc"}


def test_treino_smoke(tmp_path):
    dataset = tmp_path / "dataset"
    _criar_dataset(dataset)
    saida = tmp_path / "model"

    metricas = treino.main(dataset_dir=dataset, model_dir=saida, epochs=1,
                           pretrained=False, batch_size=8, num_workers=0)

    ckpt = torch.load(saida / "reciclaai.pth", map_location="cpu")
    assert set(ckpt) == {"model_state", "classes"}
    assert ckpt["classes"] == CLASSES and len(ckpt["classes"]) == 8
    assert (saida / "confusion_matrix.png").exists()

    salvo = json.loads((saida / "metricas.json").read_text(encoding="utf-8"))
    assert salvo["validacao_igual_teste"] is False
    assert set(salvo["por_classe"]) == set(CLASSES)
    assert {"precisao", "recall", "acuracia"} <= set(salvo["por_classe"]["glass"])
    assert 0.0 <= metricas["acuracia_teste"] <= 1.0


def test_val_igual_teste_marcado_e_epochs_zero_falha(tmp_path):
    import pytest

    dataset = tmp_path / "dataset"
    _criar_dataset(dataset)
    import shutil
    shutil.rmtree(dataset / "val")
    metricas = treino.main(dataset_dir=dataset, model_dir=tmp_path / "m", epochs=1,
                           pretrained=False, batch_size=8, num_workers=0)
    assert metricas["validacao_igual_teste"] is True
    with pytest.raises(ValueError):
        treino.main(dataset_dir=dataset, model_dir=tmp_path / "m2", epochs=0,
                    pretrained=False, batch_size=8, num_workers=0)
