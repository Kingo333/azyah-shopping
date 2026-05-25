"""
FashionCLIP worker — FastAPI service that analyzes a single garment image
using Marqo/marqo-fashionSigLIP and returns category-aware metadata plus a
short prompt_hint to feed into the Live Cam try-on prompt.

Deploy externally (RunPod / Render / Fly / Modal). Not run by Lovable.

Endpoints:
  GET  /healthz
  POST /analyze   body: { image_url, category?, name?, brand? }
                  headers: X-Worker-Token: <FASHIONCLIP_WORKER_TOKEN>

Security:
  - Validates X-Worker-Token against env FASHIONCLIP_WORKER_TOKEN.
  - Image fetch is allowlisted to ALLOWED_IMAGE_HOSTS (Supabase Storage by default).
  - Does not log image bytes, tokens, or raw URLs (only host + path length).
"""

from __future__ import annotations

import io
import os
import time
import logging
from typing import Optional
from urllib.parse import urlparse

import httpx
import torch
from fastapi import FastAPI, Header, HTTPException
from PIL import Image
from pydantic import BaseModel, Field
from transformers import AutoModel, AutoProcessor

# -------------------- config --------------------

MODEL_ID = os.environ.get("FASHIONCLIP_MODEL", "Marqo/marqo-fashionSigLIP")
WORKER_TOKEN = os.environ.get("FASHIONCLIP_WORKER_TOKEN", "")
ALLOWED_IMAGE_HOSTS = {
    h.strip().lower()
    for h in os.environ.get(
        "ALLOWED_IMAGE_HOSTS",
        "klwolsopucgswhtdlsps.supabase.co",
    ).split(",")
    if h.strip()
}
IMAGE_FETCH_TIMEOUT_S = float(os.environ.get("IMAGE_FETCH_TIMEOUT_S", "30"))
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(15 * 1024 * 1024)))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fashionclip-worker")

# -------------------- label banks --------------------
# Short, domain-targeted prompts. FashionSigLIP scores by cosine similarity.

CATEGORY_LABELS = [
    "a photo of a top",
    "a photo of a t-shirt",
    "a photo of a shirt",
    "a photo of a blouse",
    "a photo of a sweater",
    "a photo of a hoodie",
    "a photo of a dress",
    "a photo of a skirt",
    "a photo of pants",
    "a photo of jeans",
    "a photo of shorts",
    "a photo of a jacket",
    "a photo of a coat",
    "a photo of shoes",
    "a photo of sneakers",
    "a photo of boots",
    "a photo of a bag",
    "a photo of an accessory",
]

SLEEVE_LABELS = [
    "a sleeveless garment",
    "a garment with short sleeves",
    "a garment with three quarter sleeves",
    "a garment with long sleeves",
]

PATTERN_LABELS = [
    "a solid color garment with no pattern",
    "a striped garment",
    "a plaid garment",
    "a floral print garment",
    "a graphic print garment",
    "a polka dot garment",
    "a checkered garment",
    "a logo print garment",
]

MATERIAL_LABELS = [
    "a cotton garment",
    "a denim garment",
    "a knit garment",
    "a leather garment",
    "a silk or satin garment",
    "a wool garment",
    "a linen garment",
    "a nylon or polyester garment",
]

FIT_LABELS = [
    "a tight fitted garment",
    "a regular fit garment",
    "a loose oversized garment",
]

NECKLINE_LABELS = [
    "a crew neckline",
    "a v neckline",
    "a scoop neckline",
    "a turtleneck",
    "a collared neckline",
    "a halter neckline",
    "an off shoulder neckline",
]

LENGTH_LABELS_DRESS = [
    "a mini length dress",
    "a knee length dress",
    "a midi length dress",
    "a maxi length dress",
]

# -------------------- model --------------------

device = "cuda" if torch.cuda.is_available() else "cpu"
log.info("loading model %s on %s", MODEL_ID, device)
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModel.from_pretrained(MODEL_ID, trust_remote_code=True).to(device).eval()
log.info("model ready")

# Pre-encode label banks
def _encode_texts(texts: list[str]) -> torch.Tensor:
    inputs = processor(text=texts, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        feats = model.get_text_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats

LABEL_BANKS: dict[str, tuple[list[str], torch.Tensor]] = {
    "category": (CATEGORY_LABELS, _encode_texts(CATEGORY_LABELS)),
    "sleeves": (SLEEVE_LABELS, _encode_texts(SLEEVE_LABELS)),
    "pattern": (PATTERN_LABELS, _encode_texts(PATTERN_LABELS)),
    "material": (MATERIAL_LABELS, _encode_texts(MATERIAL_LABELS)),
    "fit": (FIT_LABELS, _encode_texts(FIT_LABELS)),
    "neckline": (NECKLINE_LABELS, _encode_texts(NECKLINE_LABELS)),
    "dress_length": (LENGTH_LABELS_DRESS, _encode_texts(LENGTH_LABELS_DRESS)),
}

# -------------------- api --------------------

class AnalyzeBody(BaseModel):
    image_url: str = Field(..., min_length=8, max_length=2048)
    category: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None


app = FastAPI(title="FashionCLIP Worker", version="1.0.0")


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True, "model": MODEL_ID, "device": device}


def _allowed_url(url: str) -> bool:
    try:
        u = urlparse(url)
        if u.scheme not in ("http", "https"):
            return False
        host = (u.hostname or "").lower()
        if not ALLOWED_IMAGE_HOSTS:
            return True
        return any(host == h or host.endswith("." + h) for h in ALLOWED_IMAGE_HOSTS)
    except Exception:
        return False


def _fetch_image(url: str) -> Image.Image:
    with httpx.Client(timeout=IMAGE_FETCH_TIMEOUT_S, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        if int(r.headers.get("content-length") or 0) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "image too large")
        data = r.content
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "image too large")
        return Image.open(io.BytesIO(data)).convert("RGB")


def _classify(image_feat: torch.Tensor, bank_name: str) -> tuple[str, float]:
    labels, text_feats = LABEL_BANKS[bank_name]
    sims = (image_feat @ text_feats.T).squeeze(0)
    probs = sims.softmax(dim=-1)
    idx = int(probs.argmax().item())
    return labels[idx], float(probs[idx].item())


def _build_prompt_hint(meta: dict) -> str:
    parts: list[str] = []
    sleeves = meta.get("sleeves", {}).get("label", "")
    if "sleeveless" in sleeves:
        parts.append("The selected item is sleeveless; keep it sleeveless.")
    elif "short" in sleeves:
        parts.append("The selected item has short sleeves; keep the sleeves short.")
    elif "three quarter" in sleeves:
        parts.append(
            "The selected item has three quarter sleeves; preserve that sleeve length."
        )
    elif "long" in sleeves:
        parts.append("The selected item has long sleeves; keep the sleeves full length.")

    pattern = meta.get("pattern", {}).get("label", "")
    if "solid" in pattern:
        parts.append("It is a solid color with no print; do not add patterns.")
    elif pattern:
        parts.append(f"Preserve the {pattern.replace('a ', '').replace(' garment', '')}.")

    material = meta.get("material", {}).get("label", "")
    if material:
        parts.append(
            f"Material appearance looks like {material.replace('a ', '').replace(' garment', '')}; preserve that fabric look."
        )

    fit = meta.get("fit", {}).get("label", "")
    if "loose" in fit:
        parts.append("Preserve the loose oversized fit.")
    elif "tight" in fit:
        parts.append("Preserve the fitted silhouette.")

    neckline = meta.get("neckline", {}).get("label", "")
    if neckline:
        parts.append(
            f"Preserve the {neckline.replace('a ', '').replace('an ', '')}."
        )

    dress_length = meta.get("dress_length", {}).get("label")
    if dress_length:
        parts.append(
            f"Preserve the {dress_length.replace('a ', '')} length."
        )

    return " ".join(parts).strip()


@app.post("/analyze")
def analyze(body: AnalyzeBody, x_worker_token: str = Header(default="")):
    if not WORKER_TOKEN or x_worker_token != WORKER_TOKEN:
        raise HTTPException(401, "unauthorized")
    if not _allowed_url(body.image_url):
        raise HTTPException(400, "image host not allowed")

    t0 = time.time()
    try:
        image = _fetch_image(body.image_url)
    except HTTPException:
        raise
    except Exception as e:
        log.warning("image fetch failed host=%s err=%s", urlparse(body.image_url).hostname, type(e).__name__)
        raise HTTPException(502, "image fetch failed")

    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        image_feat = model.get_image_features(**inputs)
    image_feat = image_feat / image_feat.norm(dim=-1, keepdim=True)

    category_label, category_conf = _classify(image_feat, "category")
    sleeves_label, sleeves_conf = _classify(image_feat, "sleeves")
    pattern_label, pattern_conf = _classify(image_feat, "pattern")
    material_label, material_conf = _classify(image_feat, "material")
    fit_label, fit_conf = _classify(image_feat, "fit")
    neckline_label, neckline_conf = _classify(image_feat, "neckline")

    is_dress = "dress" in category_label
    metadata: dict = {
        "category": {"label": category_label, "confidence": category_conf},
        "sleeves": {"label": sleeves_label, "confidence": sleeves_conf},
        "pattern": {"label": pattern_label, "confidence": pattern_conf},
        "material": {"label": material_label, "confidence": material_conf},
        "fit": {"label": fit_label, "confidence": fit_conf},
        "neckline": {"label": neckline_label, "confidence": neckline_conf},
    }
    if is_dress:
        dl_label, dl_conf = _classify(image_feat, "dress_length")
        metadata["dress_length"] = {"label": dl_label, "confidence": dl_conf}

    prompt_hint = _build_prompt_hint(metadata)
    overall_conf = min(
        category_conf, sleeves_conf, pattern_conf, material_conf, fit_conf
    )

    log.info(
        "analyze ok host=%s ms=%d cat=%s sleeves=%s pattern=%s",
        urlparse(body.image_url).hostname,
        int((time.time() - t0) * 1000),
        category_label,
        sleeves_label,
        pattern_label,
    )

    return {
        "metadata": metadata,
        "prompt_hint": prompt_hint,
        "confidence": overall_conf,
        "model": MODEL_ID,
    }
