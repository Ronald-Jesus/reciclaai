import json

import pytest
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
    assert set(ckpt) == {"model_state", "classes", "temperatura"}
    assert isinstance(ckpt["temperatura"], float) and ckpt["temperatura"] > 0
    assert ckpt["classes"] == CLASSES and len(ckpt["classes"]) == 8
    assert (saida / "confusion_matrix.png").exists()

    salvo = json.loads((saida / "metricas.json").read_text(encoding="utf-8"))
    assert salvo["validacao_igual_teste"] is False
    assert set(salvo["por_classe"]) == set(CLASSES)
    assert {"precisao", "recall", "acuracia"} <= set(salvo["por_classe"]["glass"])
    assert 0.0 <= metricas["acuracia_teste"] <= 1.0
    assert salvo["temperatura"] == ckpt["temperatura"]
    assert salvo["temperatura_calibrada"] is True and salvo["temperatura"] >= 1.0
    for k in ["ece_validacao_antes", "ece_validacao_depois", "ece_teste_antes", "ece_teste_depois"]:
        assert 0.0 <= salvo[k] <= 1.0


def test_val_igual_teste_marcado_e_epochs_zero_falha(tmp_path):
    import pytest

    dataset = tmp_path / "dataset"
    _criar_dataset(dataset)
    import shutil
    shutil.rmtree(dataset / "val")
    metricas = treino.main(dataset_dir=dataset, model_dir=tmp_path / "m", epochs=1,
                           pretrained=False, batch_size=8, num_workers=0)
    assert metricas["validacao_igual_teste"] is True
    assert metricas["temperatura"] == 1.0 and metricas["temperatura_calibrada"] is False
    with pytest.raises(ValueError):
        treino.main(dataset_dir=dataset, model_dir=tmp_path / "m2", epochs=0,
                    pretrained=False, batch_size=8, num_workers=0)


def test_aumento_forte_so_no_treino():
    treino_tf, eval_tf = treino.build_transforms()
    tipos = {type(t).__name__ for t in treino_tf.transforms}
    assert {"RandomResizedCrop", "ColorJitter", "RandomPerspective", "RandomHorizontalFlip"} <= tipos
    crop = next(t for t in treino_tf.transforms if type(t).__name__ == "RandomResizedCrop")
    assert crop.scale == (0.3, 1.0)
    assert "GaussianBlur" in repr(treino_tf)
    assert [type(t).__name__ for t in eval_tf.transforms] == ["Resize", "ToTensor", "Normalize"]


def _logits_confiantes_demais(n=600, seed=0):
    """Logits muito confiantes que acertam só ~60%: modelo descalibrado."""
    g = torch.Generator().manual_seed(seed)
    labels = torch.randint(0, 8, (n,), generator=g)
    errado = torch.rand(n, generator=g) > 0.6
    pred = torch.where(errado, (labels + 1) % 8, labels)
    logits = torch.randn(n, 8, generator=g)
    logits[torch.arange(n), pred] += 10.0
    return logits, labels


def test_temperatura_reduz_ece():
    logits, labels = _logits_confiantes_demais()
    t = treino.calibrar_temperatura(logits, labels)
    assert t > 1.0
    antes, depois = treino.ece(logits, labels), treino.ece(logits, labels, t)
    assert depois < antes
    assert antes > 0.3 and depois < 0.1


def test_ece_zero_quando_confianca_bate_com_acerto():
    logits = torch.full((4, 8), -100.0)
    logits[torch.arange(4), torch.arange(4)] = 100.0
    assert treino.ece(logits, torch.arange(4)) == pytest.approx(0.0, abs=1e-6)


def test_temperatura_nunca_abaixo_de_1(capsys):
    """Logits pouco confiantes (acertam sempre): o ótimo seria T < 1, mas fica 1.0."""
    labels = torch.arange(8).repeat(20)
    logits = torch.zeros(160, 8)
    logits[torch.arange(160), labels] = 0.5
    assert treino.calibrar_temperatura(logits, labels) == 1.0
    assert "< 1" in capsys.readouterr().out
