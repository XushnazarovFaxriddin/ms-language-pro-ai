// Anti-cheat telemetry — collects browser-side suspicious events and batches
// them to the backend. Designed to be privacy-respecting: we never send the
// page contents, just event types + timestamps.
//
// Usage:
//   const tracker = createAntiCheatTracker(attemptId);
//   tracker.start();
//   // ... when leaving the page:
//   tracker.flush();
//   tracker.stop();
//
// All POSTs include credentials so cookies travel; CSRF token attached
// automatically via the global fetch wrapper in api.ts.

import { api } from "./api";

export type AntiCheatEvent = {
  attempt_id: string;
  event_type:
    | "focus_loss"
    | "focus_gain"
    | "paste_blocked"
    | "copy_blocked"
    | "devtools_open"
    | "tab_visibility_hidden"
    | "tab_visibility_visible"
    | "fullscreen_exit"
    | "right_click_blocked"
    | "audio_replay_attempt";
  section_index?: number;
  item_id?: string;
  payload?: Record<string, unknown>;
};

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 50;

export function createAntiCheatTracker(attemptId: string) {
  let buffer: AntiCheatEvent[] = [];
  let timer: number | null = null;
  let isStarted = false;

  function record(event: Omit<AntiCheatEvent, "attempt_id">) {
    buffer.push({ ...event, attempt_id: attemptId });
    if (buffer.length >= MAX_BATCH) {
      void flush();
    }
  }

  async function flush() {
    if (buffer.length === 0) return;
    const events = buffer;
    buffer = [];
    try {
      await (api.exam as any).recordAntiCheat(events);
    } catch {
      // On failure, push back and try again later (capped to 200 to avoid memory leak).
      buffer = [...events.slice(-200), ...buffer];
    }
  }

  function onVisibility() {
    record({
      event_type: document.hidden ? "tab_visibility_hidden" : "tab_visibility_visible",
      payload: { ts: Date.now() },
    });
  }

  function onBlur() {
    record({ event_type: "focus_loss", payload: { ts: Date.now() } });
  }
  function onFocus() {
    record({ event_type: "focus_gain", payload: { ts: Date.now() } });
  }
  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    record({ event_type: "right_click_blocked", payload: { x: e.clientX, y: e.clientY } });
  }
  function onCopy(e: ClipboardEvent) {
    e.preventDefault();
    record({ event_type: "copy_blocked", payload: { ts: Date.now() } });
  }

  // DevTools detection: heuristic — comparing inner vs outer dimensions.
  // It's not perfect (no detection is on modern browsers) but it's a soft
  // tripwire that surfaces obvious cases.
  let devtoolsLogged = false;
  function checkDevtools() {
    if (devtoolsLogged) return;
    const heightDiff = window.outerHeight - window.innerHeight;
    const widthDiff = window.outerWidth - window.innerWidth;
    if (heightDiff > 200 || widthDiff > 200) {
      devtoolsLogged = true;
      record({ event_type: "devtools_open", payload: { heightDiff, widthDiff } });
    }
  }

  return {
    start() {
      if (isStarted) return;
      isStarted = true;
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);
      document.addEventListener("contextmenu", onContextMenu);
      document.addEventListener("copy", onCopy);
      const id = window.setInterval(checkDevtools, 2000);
      timer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
      // Stash devtools poll handle on the tracker scope by closing it from stop()
      stopDevtools = () => window.clearInterval(id);
    },
    stop() {
      if (!isStarted) return;
      isStarted = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      stopDevtools?.();
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      void flush();
    },
    flush,
    record,
  };

  // Hoisted late so closure captures it
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let stopDevtools: (() => void) | undefined;
}
