# FashionCLIP Worker

Stateless FastAPI service that analyzes a single garment image with
`Marqo/marqo-fashionSigLIP` and returns structured metadata plus a short
`prompt_hint` consumed by the Live Cam try-on pipeline.

This service is **not** built or run by Lovable. Deploy it externally
(RunPod, Render, Fly, Modal, etc.) and point the Edge Function at it via
the `FASHIONCLIP_WORKER_URL` and `FASHIONCLIP_WORKER_TOKEN` secrets.

## Endpoints

- `GET /healthz` — liveness probe.
- `POST /analyze` — body `{ image_url, category?, name?, brand? }`,
  header `X-Worker-Token: <FASHIONCLIP_WORKER_TOKEN>`.

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `FASHIONCLIP_WORKER_TOKEN` | Shared secret. Required. | — |
| `FASHIONCLIP_MODEL` | HF model id. | `Marqo/marqo-fashionSigLIP` |
| `ALLOWED_IMAGE_HOSTS` | Comma-separated allowlist of image hosts. | `klwolsopucgswhtdlsps.supabase.co` |
| `IMAGE_FETCH_TIMEOUT_S` | Image download timeout. | `30` |
| `MAX_IMAGE_BYTES` | Max image size. | `15728640` (15 MB) |

## Local run

```bash
pip install -r requirements.txt
export FASHIONCLIP_WORKER_TOKEN=dev-token
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Docker

```bash
docker build -t fashionclip-worker .
docker run -p 8000:8000 -e FASHIONCLIP_WORKER_TOKEN=dev-token fashionclip-worker
```

## Response shape

```json
{
  "metadata": {
    "category":   { "label": "...", "confidence": 0.0 },
    "sleeves":    { "label": "...", "confidence": 0.0 },
    "pattern":    { "label": "...", "confidence": 0.0 },
    "material":   { "label": "...", "confidence": 0.0 },
    "fit":        { "label": "...", "confidence": 0.0 },
    "neckline":   { "label": "...", "confidence": 0.0 },
    "dress_length": { "label": "...", "confidence": 0.0 }
  },
  "prompt_hint": "The selected item has short sleeves; keep the sleeves short. ...",
  "confidence": 0.0,
  "model": "Marqo/marqo-fashionSigLIP"
}
```

## Versioning

Bump `analysis_version` in the Edge Function (`ANALYSIS_VERSION`) whenever
label banks, thresholds, the prompt hint format, or the model change. The
Edge Function re-runs analysis when the stored version differs from the
current one even if the image hash is unchanged.
