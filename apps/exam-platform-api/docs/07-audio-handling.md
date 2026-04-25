# 07 — Audio Handling

## Capture (browser)
```js
// exam-platform-web: features/exam-runner/audio-recorder.ts
const stream = await navigator.mediaDevices.getUserMedia({audio: true});
const mr = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 64000,
});
mr.ondataavailable = (e) => chunks.push(e.data);
mr.onstop = async () => {
  const blob = new Blob(chunks, {type: 'audio/webm'});
  const presign = await fetch('/exam/v1/uploads/audio/presign?...').then(r => r.json());
  await fetch(presign.url, {method: 'PUT', body: blob, headers: presign.required_headers});
  await submitResponse({audio_s3_key: presign.s3_key});
};
```

### Browser support
- Chrome, Firefox, Edge: native (webm/opus)
- Safari: requires polyfill (`audio/mp4` fallback) — Phase 2; for thesis demo pin Chrome
- Mobile: works on Android Chrome, iOS Safari has restrictions (need user gesture)

## Upload
- Direct browser → S3/MinIO via presigned PUT (server doesn't proxy)
- Max size: 50 MB (~10 min @ 64kbps)
- Phase 2: tus.io resumable for >5min recordings

## Server-side normalization (arq job)
```python
# adapters/audio/normalize.py
import subprocess
async def normalize_to_wav(input_path: str) -> str:
    output = input_path.replace('.webm', '.wav')
    proc = await asyncio.create_subprocess_exec(
        'ffmpeg', '-i', input_path,
        '-ac', '1',           # mono
        '-ar', '16000',       # 16 kHz
        '-acodec', 'pcm_s16le',
        '-y', output,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return output
```

## Audio metadata extraction
```python
# adapters/audio/metadata.py — pure Python, no extra deps
import wave, contextlib

def extract(wav_path: str) -> AudioMeta:
    with contextlib.closing(wave.open(wav_path)) as f:
        duration = f.getnframes() / f.getframerate()
    # word count comes from STT later
    # pause_ratio computed via webrtcvad after VAD pass (optional, Phase 2)
    return AudioMeta(duration_seconds=duration, ...)
```

## Sending to Gemini (multimodal)
```python
# adapters/llm/speaking.py
from openai import AsyncOpenAI
import base64

async def score_speaking_audio(client, wav_bytes, rubric, target_band):
    audio_b64 = base64.b64encode(wav_bytes).decode()
    response = await client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[
            {"role": "system", "content": "You are an IELTS Speaking examiner..."},
            {"role": "user", "content": [
                {"type": "text", "text": f"Rubric: {rubric}\nTarget band: {target_band}"},
                {"type": "input_audio", "input_audio": {"data": audio_b64, "format": "wav"}},
            ]},
        ],
        response_format={"type": "json_schema", "json_schema": {...}},
    )
    return SpeakingScore.model_validate_json(response.choices[0].message.content)
```

## Storage policy
- Bucket: `S3://audio-recordings/{attempt_id}/{response_id}.webm`
- Retention: 90 days, then auto-delete (S3 lifecycle policy) unless user opted in to research donation
- Encryption: SSE-S3 (server-side AES-256)
- ACL: private; access only via presigned URLs (1h GET TTL)

## Files
- `adapters/audio/normalize.py` — ffmpeg
- `adapters/audio/metadata.py` — wave inspection
- `adapters/audio/upload.py` — presign generator (`POST /uploads/audio/presign`)
- `adapters/storage/s3.py` — boto3-compatible client (works with MinIO)

## Acceptance
- [ ] Browser → S3 upload works in Chrome dev tools
- [ ] ffmpeg normalization completes <2s for 5min audio
- [ ] Gemini multimodal call accepts WAV bytes and returns valid `SpeakingScore`
- [ ] S3 lifecycle deletes 90-day-old audio
