from pathlib import Path

import torch
from flask import Flask, abort, jsonify, render_template, request, send_from_directory
from PIL import Image
from werkzeug.utils import safe_join
from torch import nn
from torchvision import models, transforms

import rvm

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "reciclaai.pth"
# Saída do `npm run build`; os testes apontam para uma pasta temporária.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# Limite de upload: acima disso o servidor responde 413 em JSON.
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Informações de exibição de cada classe. "bin" é a cor da lixeira (CONAMA 275);
# nao_residuo não é um material: não tem lixeira.
_ORGANICO = {"label": "Orgânico", "bin": "marrom", "color": "#8a5a36",
             "tip": "Restos de comida e cascas vão na lixeira marrom ou na composteira."}
MATERIALS = {
    "plastic": {"label": "Plástico", "bin": "vermelha", "color": "#c8453a",
                "tip": "Esvazie e enxágue a embalagem antes de descartar."},
    "metal": {"label": "Metal", "bin": "amarela", "color": "#c99700",
              "tip": "Latas e tampas vão na lixeira amarela; amasse para ocupar menos espaço."},
    "glass": {"label": "Vidro", "bin": "verde", "color": "#2e8b57",
              "tip": "Embale cacos com cuidado. Vidro quebrado também é reciclável."},
    "paper": {"label": "Papel", "bin": "azul", "color": "#2f6db5",
              "tip": "Mantenha o papel limpo e seco; papel engordurado não recicla."},
    "cardboard": {"label": "Papelão", "bin": "azul", "color": "#2f6db5",
                  "tip": "Desmonte as caixas e mantenha o papelão seco."},
    "organic": _ORGANICO,
    "biological": _ORGANICO,
    "trash": {"label": "Rejeito", "bin": "cinza", "color": "#6b6f6a",
              "tip": "Item que não recicla: vai no lixo comum."},
    "nao_residuo": {"label": "Não é resíduo", "bin": None, "color": "#9a9a94",
                    "tip": "Fotografe uma única embalagem, em primeiro plano e com boa luz."},
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

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
    info = MATERIALS.get(cls, {})
    return {
        "label": info.get("label", cls),
        "bin": info.get("bin"),
        "color": info.get("color", "#888888"),
    }


class BadImage(Exception):
    pass


def classify_upload() -> list[dict]:
    """Lê a imagem do request e devolve o ranking de classes (maior confiança primeiro)."""
    file = request.files.get("image")
    if file is None or file.filename == "":
        raise BadImage("Nenhuma imagem enviada. Envie um arquivo no campo 'image'.")

    try:
        image = Image.open(file.stream).convert("RGB")
    except Exception:
        raise BadImage(
            "Não consegui ler o arquivo como imagem. Envie JPG, PNG ou WEBP "
            "(fotos HEIC do iPhone não são suportadas: converta para JPG)."
        )

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


@app.errorhandler(413)
def handle_too_large(err):
    return jsonify({
        "error": "A imagem passa de 5 MB. Reduza o tamanho da foto (ou envie em JPG) e tente de novo."
    }), 413


@app.errorhandler(rvm.SessionError)
def handle_session_error(err: rvm.SessionError):
    return jsonify({"error": str(err)}), 409


@app.before_request
def ensure_model():
    if _model is None and request.endpoint in {"predict", "insert"}:
        return jsonify({
            "error": "O modelo ainda não foi treinado neste servidor. Rode 'python treino.py' e reinicie."
        }), 503


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


@app.route("/fotos/<path:nome>")
def fotos(nome):
    return send_from_directory(Path(FRONTEND_DIST) / "fotos", nome)


@app.route("/<path:nome>")
def arquivo_publico(nome):
    """Arquivos de frontend/public copiados para a raiz do dist (favicon etc.).

    Só serve arquivo que exista dentro do dist; o resto é 404 (nunca vira o SPA).
    send_from_directory bloqueia path traversal.
    """
    dist = Path(FRONTEND_DIST)
    destino = safe_join(str(dist), nome)
    if destino is None or not Path(destino).is_file():
        abort(404)
    return send_from_directory(dist, nome)


@app.route("/maquina")
def maquina():
    accepted = [
        {"class": cls, **display(cls), "value": cfg["value"]}
        for cls, cfg in rvm.ACCEPTED.items()
    ]
    return render_template("maquina.html", accepted=accepted, min_confidence=rvm.MIN_CONFIDENCE)


@app.route("/admin")
def admin():
    return render_template("admin.html", labels={k: v["label"] for k, v in MATERIALS.items()})


# ---------------------------------------------------- classificador puro

@app.route("/predict", methods=["POST"])
def predict():
    """Classifica a foto e diz o que a máquina faria. Nunca grava nada no banco."""
    ranked = classify_upload()
    top = ranked[0]
    low_confidence = top["confidence"] < rvm.MIN_CONFIDENCE
    nao_reconhecido = rvm.nao_reconhecido(top["class"], top["confidence"])
    decision = rvm.decide(top["class"], top["confidence"], bin_full=False)
    machine = {"accepted": decision.accepted, "value": decision.value, "reason": decision.reason}

    return jsonify({
        "prediction": top,
        "ranking": ranked[:3],
        "machine": machine,
        "low_confidence": low_confidence,
        "nao_reconhecido": nao_reconhecido,
    })


@app.route("/api/status")
def status():
    return jsonify({"model_ready": _model is not None, "classes": list(_classes)})


# ----------------------------------------------------------- máquina RVM

@app.route("/api/session", methods=["POST"])
def start_session():
    return jsonify({"session_id": rvm.start_session()})


@app.route("/api/session/<session_id>/insert", methods=["POST"], endpoint="insert")
def insert(session_id: str):
    ranked = classify_upload()
    top = ranked[0]
    result = rvm.insert_item(session_id, top["class"], top["confidence"])
    return jsonify({
        "prediction": top,
        "ranking": ranked,
        "nao_reconhecido": rvm.nao_reconhecido(top["class"], top["confidence"]),
        **result,
    })


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
    try:
        load_model()
    except FileNotFoundError as erro:
        print(f"AVISO: {erro} O servidor sobe sem modelo; /predict responderá 503.")
    app.run(debug=True, host="0.0.0.0", port=5000)
