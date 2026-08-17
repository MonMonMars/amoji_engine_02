#!/usr/bin/env python3
"""
Amoji Voice Worker — SenseVoice ASR + CosyVoice TTS (Cantonese-first).

Install (GPU recommended):
  pip install funasr modelscope torch torchaudio soundfile fastapi uvicorn

CosyVoice: follow https://github.com/FunAudioLLM/CosyVoice
  export AMOJI_COSYVOICE_PATH=/path/to/CosyVoice

Run:
  python scripts/voice_bridge_server.py --port 7890

Endpoints:
  GET  /health
  POST /asr         { audioPath? audioBase64? text? language: "yue" }
  POST /tts         { text, language: "yue", emotion?, instruct?, streaming? }
  POST /tts/stream  NDJSON stream of meta + chunk lines
"""

from __future__ import annotations

import argparse
import base64
import io
import os
import re
import sys
import tempfile
import time
import traceback
from typing import Any, Iterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI(title="amoji-voice-worker", version="0.2.0")

_asr_model = None
_tts_model = None
_tts_ready = False
_tts_error = None


class AsrRequest(BaseModel):
    audioPath: str | None = None
    audioBase64: str | None = None
    text: str | None = None
    language: str = "yue"
    model: str = "iic/SenseVoiceSmall"


class TtsRequest(BaseModel):
    text: str
    language: str = "yue"
    emotion: str = "neutral"
    intensity: float = 0.7
    instruct: str | None = "用粤语说这句话"
    langTag: str | None = "<|yue|>"
    streaming: bool = True
    chunkDelayMs: float = 0
    speed: float = 1.0
    pauseMs: float = 180
    pitch: float = 0.0


def _parse_sensevoice(text: str) -> dict[str, Any]:
    tags = re.findall(r"<\|([^|>]+)\|>", text or "")
    clean = re.sub(r"<\|[^|>]+\|>", "", text or "").strip()
    emo_map = {
        "HAPPY": "happy",
        "SAD": "sad",
        "ANGRY": "angry",
        "NEUTRAL": "neutral",
        "FEARFUL": "fear",
        "DISGUSTED": "disgust",
        "SURPRISED": "surprised",
    }
    language = None
    ser = None
    event = None
    for t in tags:
        tl = t.lower()
        tu = t.upper()
        if tl in {"yue", "zh", "en", "ja", "ko", "auto"}:
            language = tl
        elif tu in emo_map:
            ser = emo_map[tu]
        elif tu in {"SPEECH", "BGM", "APPLAUSE", "LAUGHTER", "CRY"}:
            event = tl
    return {
        "text": clean,
        "raw": text,
        "language": language,
        "serEmotion": ser,
        "audioEvent": event,
        "tags": tags,
    }


def get_asr():
    global _asr_model
    if _asr_model is not None:
        return _asr_model
    from funasr import AutoModel

    model_id = os.environ.get("AMOJI_SENSEVOICE_MODEL", "iic/SenseVoiceSmall")
    _asr_model = AutoModel(model=model_id, disable_update=True)
    return _asr_model


def try_load_cosyvoice():
    """
    Optional CosyVoice loader — tries CosyVoice3 then CosyVoice2 / CosyVoice2-Yue.
    Never fails the worker if missing; returns None and keeps mock-wav.
    """
    global _tts_model, _tts_ready, _tts_error
    if _tts_ready and _tts_model is not None:
        return _tts_model

    cosy_path = os.environ.get("AMOJI_COSYVOICE_PATH")
    if cosy_path and cosy_path not in sys.path:
        sys.path.insert(0, cosy_path)
        match_path = os.path.join(cosy_path, "third_party", "Matcha-TTS")
        if os.path.isdir(match_path) and match_path not in sys.path:
            sys.path.insert(0, match_path)

    model_id = os.environ.get(
        "AMOJI_COSYVOICE_MODEL",
        os.environ.get("AMOJI_COSYVOICE3_MODEL", "Fun-CosyVoice3-0.5B"),
    )
    errors: list[str] = []

    # CosyVoice3
    try:
        from cosyvoice.cli.cosyvoice import CosyVoice3  # type: ignore

        _tts_model = CosyVoice3(model_id)
        _tts_ready = True
        _tts_error = None
        _tts_model._amoji_kind = "cosyvoice3"
        return _tts_model
    except Exception as e:
        errors.append(f"CosyVoice3: {e}")

    # CosyVoice2 / CosyVoice2-Yue
    try:
        from cosyvoice.cli.cosyvoice import CosyVoice2  # type: ignore

        yue_id = os.environ.get("AMOJI_COSYVOICE2_YUE_MODEL", model_id)
        _tts_model = CosyVoice2(yue_id)
        _tts_ready = True
        _tts_error = None
        _tts_model._amoji_kind = "cosyvoice2"
        return _tts_model
    except Exception as e:
        errors.append(f"CosyVoice2: {e}")

    # Legacy CosyVoice
    try:
        from cosyvoice.cli.cosyvoice import CosyVoice  # type: ignore

        _tts_model = CosyVoice(model_id)
        _tts_ready = True
        _tts_error = None
        _tts_model._amoji_kind = "cosyvoice"
        return _tts_model
    except Exception as e:
        errors.append(f"CosyVoice: {e}")

    _tts_error = " | ".join(errors) if errors else "CosyVoice not installed"
    _tts_ready = False
    _tts_model = None
    return None


def _cosyvoice_infer_chunks(model: Any, req: "TtsRequest") -> list[dict[str, Any]] | None:
    """
    Best-effort CosyVoice instruct inference → WAV chunks.
    Returns None if the installed API shape is unfamiliar.
    """
    import numpy as np
    import wave

    text = (req.text or "").strip()
    instruct = req.instruct or "用粤语说这句话"
    kind = getattr(model, "_amoji_kind", "cosyvoice")
    speed = max(0.5, min(2.0, float(req.speed or 1.0)))

    try:
        # Prefer instruct APIs when present (CosyVoice2/3)
        if hasattr(model, "inference_instruct2"):
            gen = model.inference_instruct2(text, instruct, speed=speed)
        elif hasattr(model, "inference_instruct"):
            gen = model.inference_instruct(text, "中文女", instruct, speed=speed)
        elif hasattr(model, "inference_sft"):
            gen = model.inference_sft(text, "中文女", speed=speed)
        else:
            return None

        chunks: list[dict[str, Any]] = []
        sample_rate = getattr(model, "sample_rate", 22050)
        for i, out in enumerate(gen):
            # CosyVoice yields dicts with 'tts_speech' tensor
            speech = out.get("tts_speech") if isinstance(out, dict) else out
            if hasattr(speech, "detach"):
                arr = speech.detach().cpu().numpy().reshape(-1)
            else:
                arr = np.asarray(speech).reshape(-1)
            # float -1..1 → pcm16 wav
            pcm = (np.clip(arr, -1, 1) * 32767.0).astype(np.int16)
            buf = io.BytesIO()
            with wave.open(buf, "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(int(sample_rate))
                w.writeframes(pcm.tobytes())
            dur = len(arr) / float(sample_rate)
            chunks.append(
                {
                    "index": i,
                    "text": text if i == 0 else "",
                    "pcmBase64": base64.b64encode(buf.getvalue()).decode("ascii"),
                    "sampleRate": int(sample_rate),
                    "durationSec": dur,
                    "final": False,
                    "provider": kind,
                    "langTag": req.langTag or "<|yue|>",
                    "emotion": req.emotion,
                    "speed": speed,
                    "instruct": instruct,
                    "pauseMs": req.pauseMs,
                    "pitch": req.pitch,
                }
            )
        if chunks:
            chunks[-1]["final"] = True
        return chunks or None
    except Exception:
        traceback.print_exc()
        return None


@app.get("/health")
def health():
    kind = None
    if _tts_model is not None:
        kind = getattr(_tts_model, "_amoji_kind", "cosyvoice")
    return {
        "ok": True,
        "schema": "amoji.voiceWorker.v1",
        "defaultLanguage": "yue",
        "asr": "sensevoice" if _asr_model is not None else "lazy",
        "tts": kind if _tts_ready else ("unavailable" if _tts_error else "lazy"),
        "ttsError": _tts_error,
        "endpoints": ["/health", "/asr", "/asr/partial", "/tts", "/tts/stream"],
    }


def _write_audio_temp(audio_b64: str) -> str:
    raw = base64.b64decode(audio_b64)
    suffix = ".wav"
    if raw[:4] == b"OggS":
        suffix = ".ogg"
    elif raw[:3] == b"ID3" or raw[:2] == b"\xff\xfb":
        suffix = ".mp3"
    fd, path = tempfile.mkstemp(prefix="amoji-asr-", suffix=suffix)
    os.close(fd)
    with open(path, "wb") as f:
        f.write(raw)
    return path


@app.post("/asr")
def asr(req: AsrRequest):
    # Text passthrough for dry runs / browser stubs
    if req.text and not req.audioPath and not req.audioBase64:
        parsed = _parse_sensevoice(req.text)
        if not parsed["language"]:
            parsed["language"] = req.language
        return {"provider": "passthrough", **parsed}

    audio_path = req.audioPath
    tmp_path = None
    if not audio_path and req.audioBase64:
        try:
            tmp_path = _write_audio_temp(req.audioBase64)
            audio_path = tmp_path
        except Exception as e:
            return {
                "provider": "error",
                "error": f"bad audioBase64: {e}",
                "text": "",
                "language": req.language,
            }

    if not audio_path:
        return {
            "provider": "error",
            "error": "audioPath, audioBase64, or text required",
            "text": "",
            "language": req.language,
        }

    try:
        model = get_asr()
        lang = req.language or "yue"
        res = model.generate(input=audio_path, language=lang, use_itn=True)
        raw = ""
        if isinstance(res, list) and res:
            raw = res[0].get("text") or res[0].get("preds") or str(res[0])
        elif isinstance(res, dict):
            raw = res.get("text") or str(res)
        else:
            raw = str(res)
        parsed = _parse_sensevoice(raw)
        if not parsed["language"]:
            parsed["language"] = lang
        return {"provider": "sensevoice", "model": req.model, **parsed}
    except Exception as e:
        traceback.print_exc()
        return {
            "provider": "sensevoice",
            "error": str(e),
            "text": "",
            "language": req.language,
        }
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _mock_tts_chunks(
    text: str,
    language: str,
    emotion: str,
    speed: float = 1.0,
) -> list[dict[str, Any]]:
    import wave

    speed = max(0.5, min(2.0, float(speed or 1.0)))
    chunks = []
    step = max(1, len(text) // 4 or 1)
    for i in range(0, len(text), step):
        piece = text[i : i + step]
        buf = io.BytesIO()
        dur = max(0.12, len(piece) * 0.08) / speed
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(22050)
            frames = int(22050 * dur)
            w.writeframes(b"\x00\x00" * frames)
        lang_tag = "<|yue|>" if str(language).startswith("yue") else (
            "<|zh|>" if str(language).startswith("zh") else f"<|{language}|>"
        )
        chunks.append(
            {
                "index": len(chunks),
                "text": piece,
                "pcmBase64": base64.b64encode(buf.getvalue()).decode("ascii"),
                "sampleRate": 22050,
                "durationSec": dur,
                "final": i + step >= len(text),
                "provider": "mock-wav",
                "langTag": lang_tag,
                "emotion": emotion,
                "speed": speed,
            }
        )
    return chunks


def _synthesize_chunks(req: TtsRequest) -> tuple[str, list[dict[str, Any]], str | None]:
    """Returns (provider, chunks, warning)."""
    global _tts_ready, _tts_error
    text = (req.text or "").strip()
    if not text:
        return "error", [], "empty text"

    # Prefer CosyVoice3 / CosyVoice2-Yue instruct; fall back to mock-wav.
    model = try_load_cosyvoice()
    instruct = req.instruct or "用粤语说这句话"
    if model is not None:
        real = _cosyvoice_infer_chunks(model, req)
        if real:
            kind = getattr(model, "_amoji_kind", "cosyvoice")
            return kind, real, None
        # Model loaded but inference shape unknown — still mark ready, mock audio
        chunks = _mock_tts_chunks(text, req.language, req.emotion, req.speed)
        for c in chunks:
            c["provider"] = getattr(model, "_amoji_kind", "cosyvoice") + "-shim"
            c["instruct"] = instruct
            c["pauseMs"] = req.pauseMs
            c["pitch"] = req.pitch
        return chunks[0]["provider"], chunks, "cosyvoice loaded; using shim waveform"

    chunks = _mock_tts_chunks(text, req.language, req.emotion, req.speed)
    for c in chunks:
        c["instruct"] = instruct
        c["pauseMs"] = req.pauseMs
        c["pitch"] = req.pitch
    return "mock-wav", chunks, _tts_error


class PartialAsrRequest(BaseModel):
    audioBase64: str | None = None
    text: str | None = None
    language: str = "yue"
    interim: bool = True
    sequence: int = 0


@app.post("/asr/partial")
def asr_partial(req: PartialAsrRequest):
    """
    Interim transcript while the user is still speaking.
    Uses SenseVoice when audio is present; otherwise passthrough text.
    """
    if req.text and not req.audioBase64:
        parsed = _parse_sensevoice(req.text)
        if not parsed["language"]:
            parsed["language"] = req.language
        return {
            "provider": "passthrough",
            "interim": True,
            "sequence": req.sequence,
            **parsed,
        }

    # Reuse full /asr path on the accumulating buffer
    full = asr(
        AsrRequest(
            audioBase64=req.audioBase64,
            text=None,
            language=req.language,
        )
    )
    return {
        **full,
        "interim": True,
        "final": False,
        "sequence": req.sequence,
    }


@app.post("/tts")
def tts(req: TtsRequest):
    provider, chunks, warning = _synthesize_chunks(req)
    if provider == "error":
        return {"provider": "error", "error": warning or "empty text", "chunks": []}
    return {
        "provider": provider,
        "warning": warning,
        "language": req.language,
        "instruct": req.instruct,
        "chunkCount": len(chunks),
        "durationSec": sum(c["durationSec"] for c in chunks),
        "chunks": chunks,
    }


def _ndjson_tts(req: TtsRequest) -> Iterator[str]:
    import json

    provider, chunks, warning = _synthesize_chunks(req)
    meta = {
        "type": "meta",
        "provider": provider,
        "language": req.language,
        "instruct": req.instruct,
        "warning": warning,
        "chunkCount": len(chunks),
    }
    yield json.dumps(meta, ensure_ascii=False) + "\n"
    delay = max(0.0, float(req.chunkDelayMs or 0) / 1000.0)
    for c in chunks:
        yield json.dumps({"type": "chunk", "data": c}, ensure_ascii=False) + "\n"
        if delay:
            time.sleep(delay)
    yield json.dumps({"type": "done", "provider": provider}, ensure_ascii=False) + "\n"


@app.post("/tts/stream")
def tts_stream(req: TtsRequest):
    return StreamingResponse(
        _ndjson_tts(req),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7890)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
