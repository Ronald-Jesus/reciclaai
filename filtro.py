"""
Etapa 1 da IA do ReciclaAI: filtro "é resíduo/embalagem?" com CLIP zero-shot.

O classificador ResNet18 (etapa 2) só conhece materiais e chama qualquer foto de
algum material (uma selfie virava "papel" com 97%). O CLIP compara a foto com
frases em inglês; a soma das probabilidades das frases de resíduo (POS) é o
p_residuo. Abaixo de LIMIAR_FILTRO a foto é "não reconhecida".

Modelo: ViT-B-32 com pesos laion2b_s34b_b79k (OpenCLIP). Os pesos (~600 MB) são
baixados na primeira execução e ficam no cache do Hugging Face.
"""

from __future__ import annotations

MODELO = "ViT-B-32"
PESOS = "laion2b_s34b_b79k"
LIMIAR_FILTRO = 0.5
NAO_RESIDUO = "nao_residuo"

# Textos do experimento de 13/11/2026 (16 fotos do autor + validação). Não mude sem medir de novo.
POS = ["a photo of a plastic bottle", "a photo of an aluminum can", "a photo of a glass bottle",
       "a photo of a cardboard box", "a photo of paper", "a photo of a plastic bag or snack wrapper",
       "a photo of garbage", "a photo of food scraps", "a photo of a fruit or vegetable", "a photo of an egg",
       "a photo of a food package", "a photo of old clothes or shoes"]
NEG = ["a selfie of a person", "a photo of a person's face", "a photo of a room interior", "a photo of furniture",
       "a photo of an animal", "a photo of a car or vehicle", "a photo of a hand", "a photo of an electronic device",
       "a photo of a landscape", "a photo of a building"]


class FiltroClip:
    """CLIP carregado uma vez; p_residuo(imagem PIL RGB) devolve um número de 0 a 1."""

    def __init__(self, device=None):
        import open_clip
        import torch

        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.modelo, _, self.preprocess = open_clip.create_model_and_transforms(
            MODELO, pretrained=PESOS, device=self.device)
        self.modelo.eval()
        tokens = open_clip.get_tokenizer(MODELO)(POS + NEG).to(self.device)
        with torch.no_grad():
            texto = self.modelo.encode_text(tokens)
        self.texto = texto / texto.norm(dim=-1, keepdim=True)

    def p_residuo(self, imagem) -> float:
        import torch

        x = self.preprocess(imagem.convert("RGB")).unsqueeze(0).to(self.device)
        with torch.no_grad():
            v = self.modelo.encode_image(x)
            v = v / v.norm(dim=-1, keepdim=True)
            p = (100 * v @ self.texto.T).softmax(-1)[0]
        return p[:len(POS)].sum().item()


def carregar(device=None) -> FiltroClip | None:
    """Carrega o filtro; sem open_clip ou sem os pesos, avisa e devolve None (app segue sem filtro)."""
    try:
        f = FiltroClip(device)
    except Exception as erro:  # ImportError, falha de download, cache corrompido
        print(f"AVISO: filtro CLIP indisponível ({erro}). Classificando sem a etapa 1.")
        return None
    print(f"Filtro CLIP carregado ({MODELO}, {PESOS}). Limiar: {LIMIAR_FILTRO}")
    return f


def combinar(probabilidades: dict[str, float], p: float | None) -> dict[str, float]:
    """Regra única das 2 etapas, usada por app.py e scripts/teste_externo.py.

    - p None (sem filtro): devolve as probabilidades do classificador como estão.
    - p < LIMIAR_FILTRO: a foto não é resíduo, {"nao_residuo": 1 - p}.
    - senão: tira nao_residuo e renormaliza entre os materiais.
    """
    if p is None:
        return probabilidades
    if p < LIMIAR_FILTRO:
        return {NAO_RESIDUO: 1 - p}
    materiais = {c: v for c, v in probabilidades.items() if c != NAO_RESIDUO}
    total = sum(materiais.values()) or 1.0
    return {c: v / total for c, v in materiais.items()}
