from pathlib import Path

import torch
from flask import Flask, jsonify, render_template, request, send_from_directory
from PIL import Image
from torch import nn
from torchvision import models, transforms

import rvm

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "reciclaai.pth"
# Saída do `npm run build`; os testes apontam para uma pasta temporária.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# Rótulos e cores de exibição em português para cada classe do dataset
DISPLAY_INFO = {
    "cardboard": {"label": "Papelão", "color": "#b08968"},
    "glass": {"label": "Vidro", "color": "#2a9d8f"},
    "metal": {"label": "Metal", "color": "#6c757d"},
    "paper": {"label": "Papel", "color": "#457b9d"},
    "plastic": {"label": "Plástico", "color": "#e07a5f"},
    "trash": {"label": "Rejeito", "color": "#3d3d3d"},
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = Flask(__name__)

_model: nn.Module | None = None
_classes: list[str] = []

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def load_model() -> None:
    global _model, _classes

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Modelo não encontrado em {MODEL_PATH}. Rode 'python treino.py' primeiro."
        )

    checkpoint = torch.load(MODEL_PATH, map_location=device)
    _classes = checkpoint["classes"]

    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(_classes))
    model.load_state_dict(checkpoint["model_state"])
    model.to(device)
    model.eval()

    _model = model
    print(f"Modelo carregado ({device}). Classes: {_classes}")


def display(cls: str) -> dict:
    info = DISPLAY_INFO.get(cls, {})
    return {"label": info.get("label", cls), "color": info.get("color", "#888888")}


class BadImage(Exception):
    pass


def classify_upload() -> list[dict]:
    """Lê a imagem do request e devolve o ranking de classes (maior confiança primeiro)."""
    file = request.files.get("image")
    if file is None or file.filename == "":
        raise BadImage("Nenhuma imagem enviada.")

    try:
        image = Image.open(file.stream).convert("RGB")
    except Exception:
        raise BadImage("Arquivo de imagem inválido.")

    tensor = _transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = _model(tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    return sorted(
        (
            {"class": cls, **display(cls), "confidence": round(prob.item() * 100, 1)}
            for cls, prob in zip(_classes, probabilities)
        ),
        key=lambda item: item["confidence"],
        reverse=True,
    )


@app.errorhandler(BadImage)
def handle_bad_image(err: BadImage):
    return jsonify({"error": str(err)}), 400


@app.errorhandler(rvm.SessionError)
def handle_session_error(err: rvm.SessionError):
    return jsonify({"error": str(err)}), 409


@app.before_request
def ensure_model():
    if _model is None and request.endpoint in {"predict", "insert"}:
        return jsonify({"error": "Modelo não carregado no servidor."}), 500


# ---------------------------------------------------------------- telas

def serve_react():
    """Entrega o index.html do React; o roteamento interno fica por conta dele."""
    index = Path(FRONTEND_DIST) / "index.html"
    if not index.exists():
        aviso = (
            "<!doctype html><html lang='pt-BR'><meta charset='utf-8'>"
            "<title>Front-end não compilado</title>"
            "<h1>Front-end não compilado</h1>"
            "<p>Entre na pasta <code>frontend/</code> e rode <code>npm install</code> "
            "seguido de <code>npm run build</code>. Depois recarregue esta página.</p></html>"
        )
        return aviso, 503
    return send_from_directory(FRONTEND_DIST, "index.html")


@app.route("/")
def index():
    return serve_react()


@app.route("/lixeira")
def lixeira():
    return serve_react()


@app.route("/assets/<path:nome>")
def assets(nome):
    return send_from_directory(Path(FRONTEND_DIST) / "assets", nome)


@app.route("/maquina")
def maquina():
    accepted = [
        {"class": cls, **display(cls), "value": cfg["value"]}
        for cls, cfg in rvm.ACCEPTED.items()
    ]
    return render_template("maquina.html", accepted=accepted, min_confidence=rvm.MIN_CONFIDENCE)


@app.route("/admin")
def admin():
    return render_template("admin.html", labels={k: v["label"] for k, v in DISPLAY_INFO.items()})


# ---------------------------------------------------- classificador puro

@app.route("/predict", methods=["POST"])
def predict():
    ranked = classify_upload()
    return jsonify({"prediction": ranked[0], "ranking": ranked})


# ----------------------------------------------------------- máquina RVM

@app.route("/api/session", methods=["POST"])
def start_session():
    return jsonify({"session_id": rvm.start_session()})


@app.route("/api/session/<session_id>/insert", methods=["POST"], endpoint="insert")
def insert(session_id: str):
    ranked = classify_upload()
    top = ranked[0]
    result = rvm.insert_item(session_id, top["class"], top["confidence"])
    return jsonify({"prediction": top, "ranking": ranked, **result})


@app.route("/api/session/<session_id>/finish", methods=["POST"])
def finish_session(session_id: str):
    result = rvm.finish_session(session_id)
    result["items"] = [
        {"class": cls, **display(cls), "count": n} for cls, n in result["items"].items()
    ]
    return jsonify(result)


# ------------------------------------------------------------- operador

@app.route("/api/admin/status")
def admin_status():
    return jsonify({"bins": rvm.bin_status(), "stats": rvm.stats()})


@app.route("/api/admin/bins/<material>/empty", methods=["POST"])
def admin_empty_bin(material: str):
    if not rvm.empty_bin(material):
        return jsonify({"error": "Compartimento inexistente."}), 404
    return jsonify({"ok": True})


@app.route("/api/vouchers/<code>/redeem", methods=["POST"])
def redeem(code: str):
    result = rvm.redeem_voucher(code)
    return jsonify(result), (200 if result["ok"] else 400)


if __name__ == "__main__":
    rvm.init_db()
    load_model()
    app.run(debug=True, host="0.0.0.0", port=5000)
