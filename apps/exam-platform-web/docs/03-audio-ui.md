# 03 — Audio UI

## ListeningPlayer (single-play enforcement)

```tsx
// features/exam-runner/listening-player.tsx
function ListeningPlayer({ audioUrl, itemId }) {
  const audioPlayed = useExamStore(s => s.audioPlayed.has(itemId));
  const markPlayed = useExamStore(s => s.markPlayed);
  const ref = useRef<HTMLAudioElement>(null);

  if (audioPlayed) {
    return <Badge>Audio already played</Badge>;
  }

  return (
    <audio
      ref={ref}
      src={audioUrl}
      autoPlay
      controls={false}            // hide native controls (no seek)
      onEnded={() => markPlayed(itemId)}
      onPlay={() => /* hide play button after start */ null}
    />
  );
}
```

Server-side enforcement: if user calls `/items/next` with same `item_id` again in same section, server returns 409.

## AudioRecorder (Speaking)

```tsx
// features/exam-runner/audio-recorder.tsx
function AudioRecorder({ itemId, attemptId, onUploaded }) {
  const [state, setState] = useState<'idle' | 'preparing' | 'recording' | 'uploading'>('idle');
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks: Blob[] = [];

  async function start() {
    setState('preparing');
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    const mr = new MediaRecorder(stream, {mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 64000});
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = async () => {
      setState('uploading');
      const blob = new Blob(chunks, {type: 'audio/webm'});
      const presign = await api.presignAudio({attemptId, itemId, durationHint: 120});
      await fetch(presign.url, {method: 'PUT', body: blob, headers: presign.required_headers});
      onUploaded(presign.s3_key);
      setState('idle');
    };
    mr.start();
    setState('recording');
    mrRef.current = mr;
  }

  function stop() {
    mrRef.current?.stop();
    mrRef.current?.stream.getTracks().forEach(t => t.stop());
  }

  return (
    <div>
      <WaveformVisualizer stream={...} />
      {state === 'idle' && <Button onClick={start}>Start recording</Button>}
      {state === 'recording' && <Button onClick={stop} variant="destructive">Stop</Button>}
      {state === 'uploading' && <Spinner>Uploading...</Spinner>}
    </div>
  );
}
```

## Mikrofon permission UX
- Pre-flight (`/exams/[id]/start`) sahifasida — "Test mikrofon" tugmasi → 3-sekundli yozuv + playback
- Permission denied → instructions: "Sozlamalardan ruxsat bering"
- Browser hint banner agar Safari/iOS — "Use Chrome for best results"

## WaveformVisualizer (optional MVP)
- Live amplitude bars (Web Audio AnalyserNode) — vizual feedback "siz gapiryapsiz"
- ~20 bars, updated 30 fps

## File size validation (browser-side)
- Stop early if recording > 5 minutes (file too big — IELTS Speaking Part 2 = 2 min max)
- Show countdown for cue card prep (1 min) and speaking (2 min)

## Failure handling
- Upload failure → retry 3× (exponential), then show "Try again" button
- Network drop mid-upload → tus.io resumable (Phase 2; MVP retries from start)
- Mikrofon disconnect mid-recording → auto-stop + warning

## Acceptance
- [ ] Listening audio plays exactly once per item
- [ ] Speaking record/stop/upload happy path works on Chrome
- [ ] Permission denial shows helpful message
- [ ] Upload failure retries gracefully
- [ ] Waveform visualizer works without lag
