"""
Organiza o dataset bruto (pastas por classe: cardboard, glass, metal, organic,
paper, plastic, trash, nao_residuo) na estrutura que o treino.py espera:

    dataset/
        train/<classe>/...
        test/<classe>/...
        val/<classe>/...      (somente com --val-size)

Uso:
    python split_dataset.py --source caminho/para/dataset_bruto --dest dataset --test-size 0.2
    python split_dataset.py --source dataset_raw --dest dataset --val-size 0.15 --test-size 0.15
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Divide o dataset em train/test (e opcionalmente val).")
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Pasta com as subpastas de classe.",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("dataset"),
        help="Pasta de destino onde train/ e test/ serão criadas (default: ./dataset).",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fração das imagens de cada classe reservada para teste (default: 0.2).",
    )
    parser.add_argument(
        "--val-size",
        type=float,
        default=0.0,
        help="Fração reservada para validação (default: 0 = sem pasta val/).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Seed para tornar a divisão reprodutível.",
    )
    parser.add_argument(
        "--move",
        action="store_true",
        help="Move os arquivos em vez de copiar (mais rápido, mas remove do source).",
    )
    return parser.parse_args(argv)


def split_class(
    class_dir: Path,
    train_dir: Path,
    test_dir: Path,
    test_size: float,
    move: bool,
    val_dir: Path | None = None,
    val_size: float = 0.0,
    rng: random.Random | None = None,
) -> tuple[int, ...]:
    """Divide uma classe. Sem val_dir devolve (train, test); com val_dir, (train, val, test)."""
    rng = rng or random
    images = sorted(p for p in class_dir.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)
    rng.shuffle(images)

    cut_test = int(len(images) * test_size)
    cut_val = int(len(images) * val_size) if val_dir is not None else 0
    test_images = images[:cut_test]
    val_images = images[cut_test:cut_test + cut_val]
    train_images = images[cut_test + cut_val:]

    transfer = shutil.move if move else shutil.copy2
    grupos = [(train_dir, train_images), (test_dir, test_images)]
    if val_dir is not None:
        grupos.append((val_dir, val_images))
    for base, imgs in grupos:
        destino = base / class_dir.name
        destino.mkdir(parents=True, exist_ok=True)
        for img in imgs:
            transfer(str(img), str(destino / img.name))

    if val_dir is not None:
        return len(train_images), len(val_images), len(test_images)
    return len(train_images), len(test_images)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    rng = random.Random(args.seed)

    if not args.source.exists():
        raise SystemExit(f"Pasta de origem não encontrada: {args.source}")
    if args.test_size + args.val_size >= 1:
        raise SystemExit("test-size + val-size deve ser menor que 1.")

    class_dirs = sorted(p for p in args.source.iterdir() if p.is_dir())
    if not class_dirs:
        raise SystemExit(f"Nenhuma subpasta de classe encontrada em: {args.source}")

    train_dir = args.dest / "train"
    test_dir = args.dest / "test"
    val_dir = args.dest / "val" if args.val_size > 0 else None

    print(f"Origem: {args.source}")
    print(f"Destino: {args.dest}")
    print(f"Classes encontradas: {[d.name for d in class_dirs]}\n")

    total_train = total_val = total_test = 0
    for class_dir in class_dirs:
        r = split_class(class_dir, train_dir, test_dir, args.test_size, args.move, val_dir, args.val_size, rng)
        if val_dir is None:
            n_train, n_test = r
            n_val = 0
            print(f"{class_dir.name:12s} -> train: {n_train:4d} | test: {n_test:4d}")
        else:
            n_train, n_val, n_test = r
            print(f"{class_dir.name:12s} -> train: {n_train:4d} | val: {n_val:4d} | test: {n_test:4d}")
        total_train += n_train
        total_val += n_val
        total_test += n_test

    if val_dir is None:
        print(f"\nTotal -> train: {total_train} | test: {total_test}")
    else:
        print(f"\nTotal -> train: {total_train} | val: {total_val} | test: {total_test}")
    print(f"Estrutura final pronta em: {args.dest.resolve()}")


if __name__ == "__main__":
    main()
