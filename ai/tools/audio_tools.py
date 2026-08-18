"""Audio tools — transcribe and synthesize using OpenAI APIs."""

import base64
import os
import tempfile

import requests


def transcribe_audio(audio_base64: str, mime_type: str = "audio/webm") -> dict:
    """Transcribe audio using OpenAI Whisper API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"status": "error", "message": "OPENAI_API_KEY no configurado"}

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        return {"status": "error", "message": f"Error decodificando audio: {e}"}

    suffix = ".webm" if "webm" in mime_type else ".mp4" if "mp4" in mime_type else ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            resp = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": f},
                data={"model": "whisper-1"},
                timeout=60,
            )
        resp.raise_for_status()
        data = resp.json()
        return {"status": "ok", "text": data.get("text", ""), "language": data.get("language")}
    except Exception as e:
        return {"status": "error", "message": f"Error en transcripcion: {e}"}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def synthesize_speech(text: str, voice: str = "alloy", speed: float = 1.0) -> dict:
    """Synthesize text to speech using OpenAI TTS API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"status": "error", "message": "OPENAI_API_KEY no configurado"}

    try:
        resp = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": "tts-1", "input": text, "voice": voice, "speed": speed},
            timeout=60,
        )
        resp.raise_for_status()
        audio_b64 = base64.b64encode(resp.content).decode("utf-8")
        return {"status": "ok", "audio_base64": audio_b64, "mime_type": "audio/mpeg"}
    except Exception as e:
        return {"status": "error", "message": f"Error en sintesis: {e}"}
