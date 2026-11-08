"""
Treino do classificador do ReciclaAI (ResNet18 com transfer learning).

Ajusta layer4 + fc (o resto fica congelado), escolhe a melhor época pela
acurácia de VALIDAÇÃO e usa o conjunto de teste só no relatório final.

Uso:
    python treino.py --dataset dataset --epochs 15
"""

from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # sem janela: salva a figura e segue
import matplotlib.pyplot as plt  # noqa: E402
import torch  # noqa: E402
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix, precision_recall_fscore_support  # noqa: E402
from torch import nn, optim  # noqa: E402
from torch.amp import GradScaler, autocast  # noqa: E402
from torch.utils.data import DataLoader  # noqa: E402
from torchvision import datasets, models, transforms  # noqa: E402


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "reciclaai.pth"

BATCH_SIZE = 32
EPOCHS = 15
LR_FC = 1e-3        # camada final (nova)
LR_LAYER4 = 1e-4    # layer4 (já pré-treinada)
PATIENCE = 3        # épocas sem melhora na validação antes de parar
NUM_WORKERS = 0 if os.name == "nt" else 4  # multiprocessing do DataLoader é problemático no Windows

MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def get_device() -> torch.device:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True
    return device


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])
    return train_transform, eval_transform


def _loader(dataset, shuffle: bool, batch_size: int, num_workers: int, pin_memory: bool) -> DataLoader:
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=num_workers > 0,
    )


def load_data(
    device: torch.device,
    dataset_dir: Path = DATASET_DIR,
    batch_size: int = BATCH_SIZE,
    num_workers: int = NUM_WORKERS,
) -> tuple[DataLoader, DataLoader, DataLoader, list[str], bool]:
    """Devolve (train, val, test, classes). Sem pasta val/, a validação usa o teste (com aviso).

    O 5º valor indica se a validação é igual ao teste (acurácia de teste otimista).
    """
    train_tf, eval_tf = build_transforms()
    pin = device.type == "cuda"

    train_ds = datasets.ImageFolder(dataset_dir / "train", transform=train_tf)
    test_ds = datasets.ImageFolder(dataset_dir / "test", transform=eval_tf)
    val_igual_teste = not (dataset_dir / "val").is_dir()
    if not val_igual_teste:
        val_ds = datasets.ImageFolder(dataset_dir / "val", transform=eval_tf)
    else:
        print("Aviso: pasta val/ não encontrada; usando test/ para escolher a melhor época "
              "(rode split_dataset.py com --val-size para uma avaliação honesta).")
        val_ds = test_ds

    return (
        _loader(train_ds, True, batch_size, num_workers, pin),
        _loader(val_ds, False, batch_size, num_workers, pin),
        _loader(test_ds, False, batch_size, num_workers, pin),
        train_ds.classes,
        val_igual_teste,
    )


def build_model(class_count: int, pretrained: bool = True) -> nn.Module:
    """ResNet18 com tudo congelado, exceto layer4 e a nova camada fc."""
    weights = models.ResNet18_Weights.DEFAULT if pretrained else None
    model = models.resnet18(weights=weights)

    for param in model.parameters():
        param.requires_grad = False
    for param in model.layer4.parameters():
        param.requires_grad = True

    model.fc = nn.Linear(model.fc.in_features, class_count)
    return model


def build_optimizer(model: nn.Module, lr_fc: float = LR_FC, lr_layer4: float = LR_LAYER4) -> optim.Optimizer:
    return optim.Adam([
        {"params": model.layer4.parameters(), "lr": lr_layer4},
        {"params": model.fc.parameters(), "lr": lr_fc},
    ])


def set_train_mode(model: nn.Module) -> None:
    """Treino só em layer4/fc; as camadas congeladas mantêm as estatísticas do BatchNorm."""
    model.eval()
    model.layer4.train()
    model.fc.train()


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
    scaler: GradScaler | None,
) -> tuple[float, float]:
    set_train_mode(model)

    total_loss = 0.0
    correct = 0
    total = 0
    use_amp = scaler is not None

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        if use_amp:
            with autocast(device_type=device.type, dtype=torch.float16):
                outputs = model(images)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        total_loss += loss.item()
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)

    return total_loss / len(loader), correct / total


def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    model.eval()

    total_loss = 0.0
    correct = 0
    total = 0

    if len(loader) == 0:
        return 0.0, 0.0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            with autocast(device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"):
                outputs = model(images)
                loss = criterion(outputs, labels)

            total_loss += loss.item()
            correct += (outputs.argmax(1) == labels).sum().item()
            total += labels.size(0)

    return total_loss / len(loader), correct / total


def predict(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[list[int], list[int]]:
    model.eval()
    y_true: list[int] = []
    y_pred: list[int] = []
    with torch.no_grad():
        for images, labels in loader:
            outputs = model(images.to(device, non_blocking=True))
            y_pred.extend(outputs.argmax(1).cpu().tolist())
            y_true.extend(labels.tolist())
    return y_true, y_pred


def save_report(
    y_true: list[int],
    y_pred: list[int],
    classes: list[str],
    model_dir: Path,
    test_accuracy: float,
    best_epoch: int,
    best_val_accuracy: float,
    validacao_igual_teste: bool = False,
) -> dict:
    """Salva metricas.json (precisão, recall e acurácia por classe) e confusion_matrix.png."""
    labels = list(range(len(classes)))
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    matrix = confusion_matrix(y_true, y_pred, labels=labels)

    # acurácia por classe = acertos da classe / total de imagens reais da classe
    por_classe = {
        cls: {
            "precisao": float(precision[i]),
            "recall": float(recall[i]),
            "f1": float(f1[i]),
            "acuracia": float(matrix[i, i] / support[i]) if support[i] else 0.0,
            "amostras": int(support[i]),
        }
        for i, cls in enumerate(classes)
    }
    metricas = {
        "acuracia_teste": test_accuracy,
        "melhor_epoca": best_epoch,
        "melhor_acuracia_validacao": best_val_accuracy,
        "validacao_igual_teste": validacao_igual_teste,
        "classes": classes,
        "por_classe": por_classe,
        "matriz_confusao": matrix.tolist(),
    }
    (model_dir / "metricas.json").write_text(
        json.dumps(metricas, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    fig, ax = plt.subplots(figsize=(9, 8))
    ConfusionMatrixDisplay(confusion_matrix=matrix, display_labels=classes).plot(
        ax=ax, xticks_rotation=45
    )
    fig.tight_layout()
    fig.savefig(model_dir / "confusion_matrix.png", dpi=150)
    plt.close(fig)
    return metricas


def main(
    dataset_dir: Path = DATASET_DIR,
    model_dir: Path = MODEL_DIR,
    epochs: int = EPOCHS,
    pretrained: bool = True,
    batch_size: int = BATCH_SIZE,
    num_workers: int = NUM_WORKERS,
    patience: int = PATIENCE,
) -> dict:
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / MODEL_PATH.name

    device = get_device()
    train_loader, val_loader, test_loader, classes, val_igual_teste = load_data(device, dataset_dir, batch_size, num_workers)

    model = build_model(len(classes), pretrained=pretrained).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = build_optimizer(model)
    scaler = GradScaler(device.type) if device.type == "cuda" else None

    print(f"Device: {device}")
    print(f"Classes: {classes}")

    best_acc = -1.0
    best_epoch = 0
    best_state = None
    sem_melhora = 0

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        print(
            f"Epoch {epoch}/{epochs} | "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2%} | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2%}"
        )

        if val_acc > best_acc:
            best_acc, best_epoch = val_acc, epoch
            best_state = copy.deepcopy(model.state_dict())
            torch.save({"model_state": best_state, "classes": classes}, model_path)
            sem_melhora = 0
        else:
            sem_melhora += 1
            if sem_melhora >= patience:
                print(f"Early stopping: {patience} épocas sem melhora na validação.")
                break

    if best_state is None:
        raise ValueError("Nenhuma época foi treinada (epochs deve ser >= 1).")
    model.load_state_dict(best_state)  # relatório final com a melhor época
    _, test_acc = evaluate(model, test_loader, criterion, device)
    y_true, y_pred = predict(model, test_loader, device)
    metricas = save_report(y_true, y_pred, classes, model_dir, test_acc, best_epoch, best_acc, val_igual_teste)

    print(f"\nMelhor época: {best_epoch} (Val Acc: {best_acc:.2%})")
    print(f"Acurácia no teste: {test_acc:.2%}")
    if val_igual_teste:
        print("ATENÇÃO: sem pasta val/, o teste também escolheu a melhor época; "
              "a acurácia de teste é otimista.")
    for cls, m in metricas["por_classe"].items():
        print(f"  {cls:12s} precisão {m['precisao']:.2%} | recall {m['recall']:.2%}")
    print(f"Modelo salvo em: {model_path}")
    print(f"Métricas em: {model_dir / 'metricas.json'}")
    return metricas


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Treina o classificador do ReciclaAI.")
    p.add_argument("--dataset", type=Path, default=DATASET_DIR, help="Pasta com train/, val/ e test/.")
    p.add_argument("--epochs", type=int, default=EPOCHS, help=f"Máximo de épocas (default: {EPOCHS}).")
    p.add_argument("--sem-pretreino", action="store_true", help="Não baixa pesos pré-treinados (só para testes).")
    return p.parse_args(argv)


if __name__ == "__main__":
    args = parse_args()
    main(dataset_dir=args.dataset, epochs=args.epochs, pretrained=not args.sem_pretreino)
