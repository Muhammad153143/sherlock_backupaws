import os
import io
import re
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Try to import pytesseract, but make it optional
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not installed. OCR functionality will be limited.")

app = Flask(__name__)
CORS(app)

model = None

# PREPROCESS
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


# LOAD MODEL ONLY WHEN USED
def load_model():
    global model

    if model is None:

        print("Loading MobileNetV2...")

        weights = models.MobileNet_V2_Weights.DEFAULT
        model_instance = models.mobilenet_v2(weights=weights)

        class Identity(nn.Module):
            def forward(self, x):
                return x

        model_instance.classifier = Identity()

        model_instance.eval()

        model = model_instance

        print("Model loaded successfully")


# ROOT ROUTE (REQUIRED FOR RENDER)
@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "ok",
        "service": "Sherlock AI Service Running"
    }), 200


# HEALTH ROUTE (CRITICAL)
@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy"
    }), 200


# EMBEDDING ROUTE
@app.route("/embed", methods=["POST"])
def embed():

    if "image" not in request.files:

        return jsonify({"error": "No image"}), 400

    try:

        load_model()

        image = Image.open(request.files["image"])

        if image.mode != "RGB":
            image = image.convert("RGB")

        tensor = preprocess(image)

        tensor = tensor.unsqueeze(0)

        with torch.no_grad():

            embedding = model(tensor)

        return jsonify({
            "embedding": embedding[0].tolist()
        })

    except Exception as e:

        print(e)

        return jsonify({"error": str(e)}), 500


# SIMILARITY ROUTE
@app.route("/similarity", methods=["POST"])
def similarity():

    data = request.json

    target = torch.tensor(data["target"])
    candidates = torch.tensor(data["candidates"])

    if target.dim() == 1:
        target = target.unsqueeze(0)

    scores = torch.nn.functional.cosine_similarity(
        target,
        candidates,
        dim=1
    )

    return jsonify({
        "scores": scores.tolist()
    })


# OCR FEATURE START: OCR ROUTE
@app.route("/ocr", methods=["POST"])
def ocr():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400

    try:
        image = Image.open(request.files["image"])
        
        if not TESSERACT_AVAILABLE:
            return jsonify({
                "text": "",
                "normalizedText": "",
                "words": [],
                "hasText": False
            })

        # Extract text using pytesseract
        text = pytesseract.image_to_string(image)
        
        # Normalize text
        normalized_text = re.sub(r'\s+', ' ', text.strip()).lower()
        
        # Extract words (at least 2 characters)
        words = list(set([word for word in re.findall(r'\b[a-zA-Z0-9]{2,}\b', normalized_text)]))
        
        has_text = len(normalized_text) > 0

        return jsonify({
            "text": text,
            "normalizedText": normalized_text,
            "words": words,
            "hasText": has_text
        })

    except Exception as e:
        print(f"OCR error: {e}")
        return jsonify({
            "text": "",
            "normalizedText": "",
            "words": [],
            "hasText": False
        })
# OCR FEATURE END


# IMPORTANT FOR RENDER
if __name__ == "__main__":

    port = int(os.environ.get("PORT", 10000))

    print("Starting Sherlock AI Service...")

    app.run(
        host="0.0.0.0",
        port=port
    )
