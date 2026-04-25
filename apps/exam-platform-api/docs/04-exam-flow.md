# 04 — Exam Flow

## Sequence (full IELTS Academic attempt)

```
[T=0]   Student → POST /v1/attempts {blueprint_id: "ielts-academic-full"}
        Backend:
          - fetch blueprint from data-engine
          - INSERT exam_attempts (state=in_progress, blueprint_snapshot=...)
          - INSERT attempt_sections × 4 (listening, reading, writing, speaking)
          - return {attempt_id, current_section: listening, time_limit: 1800}

[T=0]   Student → /attempt/:id/section/0 (Listening)
        Loop: 40 questions × 10 per part × 4 parts
          - GET /next-item → {item, audio_url}
          - Browser: ListeningPlayer plays audio ONCE (no seek)
          - Student picks answer → POST /responses
          - Backend grades + updates theta
        End of section → POST /sections/0/finish

[T=1800] Student auto-advanced to Reading (3 passages × ~13 q each)
         Same loop pattern, no audio.

[T=5400] Reading → Writing
         POST /next-item → {prompt, word_limit_min: 250}
         Student writes in TipTap editor (paste blocked, focus tracked)
         POST /responses {essay, time_ms}
         Backend: enqueue score_writing job (async)
         Section finishes after BOTH tasks submitted (Task 1 + Task 2)

[T=9000] Writing → Speaking
         3 parts, 11-14 min total
         For each item:
           POST /next-item → {prompt}
           Browser: MediaRecorder.start() (audio/webm;codecs=opus)
           Student speaks
           MediaRecorder.stop()
           GET /uploads/audio/presign?attempt_id=&item_id= → {url, s3_key}
           PUT audio to S3 directly
           POST /responses {audio_s3_key, time_ms}
           Backend: enqueue score_speaking job

[T=12000] POST /attempts/:id/finish
          Backend: state=completed, render certificate (after all async jobs done)

[T=12000+] SSE /scoring/events: scoring_done events stream
           Frontend updates results page in real-time

[T=12120] GET /attempts/:id/results
          → {overall_band: 7.0, sections: [...], certificate_url}
```

## State machine

```
in_progress ──finish──→ scoring (waiting for async jobs)
              │
              ├──abandoned (user closes & doesn't return in 24h)
              │
              └──expires_at reached → invalidated

scoring ──all_jobs_done──→ completed
```

## Resilience
- Browser crash mid-attempt: `sessionStorage` snapshot of `ExamRunner` Zustand store. On reload, fetch `/attempts/:id` → resume.
- Server restart: idempotent `POST /responses` via `Idempotency-Key`.
- Network drop during audio upload: tus.io resumable (Phase 2); MVP retries presigned PUT 3× with backoff.

## Time enforcement
- Section timer: `attempt_sections.started_at + time_limit_seconds`. Server enforces — submitting after expiry returns 410 Gone.
- Total attempt timeout: `expires_at = started_at + 4h`. If exceeded, state → `invalidated`.
