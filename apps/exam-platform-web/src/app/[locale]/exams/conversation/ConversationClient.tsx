"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, ConversationSessionOut, ConversationTurnOut } from "@/lib/api";
import { Mic, Square, Loader2, PlayCircle, StopCircle, CheckCircle, AlertTriangle, Volume2 } from "lucide-react";

export function ConversationClient() {
  const t = useTranslations("Conversation");
  const locale = (useLocale() === "en" ? "en" : "uz") as "en" | "uz";
  const [session, setSession] = useState<ConversationSessionOut | null>(null);
  const [turns, setTurns] = useState<ConversationTurnOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speakingTurn, setSpeakingTurn] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioSamples = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Pre-warm voices: browsers return [] from getVoices() until they finish
  // loading. Listen for voiceschanged once on mount so the click handler can
  // call speak() synchronously (preserves the user-gesture context).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    voicesRef.current = synth.getVoices();
    const onVoices = () => {
      voicesRef.current = synth.getVoices();
    };
    synth.addEventListener("voiceschanged", onVoices);
    // Some Chromium builds need a kick to populate voices
    if (voicesRef.current.length === 0) {
      try {
        synth.getVoices();
      } catch {
        /* noop */
      }
    }
    return () => synth.removeEventListener("voiceschanged", onVoices);
  }, []);

  function speakAgentResponse(text: string, turnIdx: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
      setError(t("errors.ttsUnsupported"));
      return;
    }
    const synth = window.speechSynthesis;
    // Must run synchronously inside the click handler — no awaits before speak().
    synth.cancel();
    if (synth.paused) synth.resume();

    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("en") &&
          /natural|google|samantha|daniel|aria|jenny/i.test(v.name),
      ) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
      null;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = englishVoice?.lang ?? "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onstart = () => setSpeakingTurn(turnIdx);
    utterance.onend = () => setSpeakingTurn((cur) => (cur === turnIdx ? null : cur));
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      setSpeakingTurn((cur) => (cur === turnIdx ? null : cur));
      // "interrupted" / "canceled" are expected when user clicks again
      if (e.error !== "interrupted" && e.error !== "canceled") {
        setError(`${t("errors.ttsFailed")} (${e.error})`);
      }
    };

    // Chrome bug: long utterances stop ~15s in. Re-poke the synth periodically.
    const keepAlive = window.setInterval(() => {
      if (!synth.speaking) {
        window.clearInterval(keepAlive);
        return;
      }
      synth.pause();
      synth.resume();
    }, 12_000);
    utterance.addEventListener("end", () => window.clearInterval(keepAlive));
    utterance.addEventListener("error", () => window.clearInterval(keepAlive));

    synth.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingTurn(null);
  }

  const cleanupRecorder = async () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current?.state !== "closed") {
      await audioContextRef.current?.close().catch(() => undefined);
    }
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      window.speechSynthesis?.cancel();
      void cleanupRecorder();
    };
  }, []);

  // Restore the most recent active session + its turns so history persists
  // across reloads. Runs once on mount; if there's no active session we just
  // show the "Start a new conversation" card as before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const restored = await api.conversation.getActiveSession();
        if (cancelled || !restored) return;
        setSession(restored.session);
        setTurns(restored.turns);
      } catch {
        // ignore — first-time users have no active session
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  const startSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const s = await api.conversation.startSession({
        topic: formData.get("topic") as string,
        cefr_level: formData.get("cefr_level") as string,
      });
      setSession(s);
    } catch (err: any) {
      setError(err.message || t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    try {
      await api.conversation.endSession(session.id);
      window.speechSynthesis?.cancel();
      setSession(null);
      setTurns([]);
    } catch (err: any) {
      setError(err.message || t("errors.endSession"));
    }
  };

  const startRecording = async () => {
    try {
      window.speechSynthesis?.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser");
      }

      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      audioSamples.current = [];
      sampleRateRef.current = audioContext.sampleRate;
      isRecordingRef.current = true;
      processor.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        audioSamples.current.push(new Float32Array(input));
        event.outputBuffer.getChannelData(0).fill(0);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      setIsRecording(true);
    } catch (err) {
      setError(t("errors.microphone"));
      await cleanupRecorder();
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current || loading) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    const samples = audioSamples.current;
    const sampleRate = sampleRateRef.current;
    await cleanupRecorder();
    if (samples.length === 0) {
      setError(t("errors.noAudio"));
      return;
    }
    const audioBlob = encodeWav(samples, sampleRate);
    await handleAudioSubmission(audioBlob, "wav");
  };

  const handleAudioSubmission = async (blob: Blob, audioFormat: "wav" | "mp3") => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const base64data = await blobToBase64(blob);
      const turn = await api.conversation.submitTurn(session.id, {
        audio_base64: base64data,
        audio_format: audioFormat,
        user_locale: locale,
      });
      setTurns((prev) => {
        const nextTurns = [...prev, turn];
        // Auto-play the agent response. Browsers usually allow this because
        // the call chain originates from the user's "Stop recording" gesture,
        // but if it gets blocked the user can hit the Play button.
        speakAgentResponse(turn.agent_response_text, nextTurns.length - 1);
        return nextTurns;
      });
    } catch (err: any) {
      setError(err.message || t("errors.submitAudio"));
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 max-w-xl mx-auto shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-center">{t("startCard.title")}</h2>
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        <form onSubmit={startSession} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">{t("startCard.topicLabel")}</label>
            <input required name="topic" defaultValue={t("startCard.defaultTopic")} className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">{t("startCard.cefrLabel")}</label>
            <select name="cefr_level" defaultValue="B2" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none">
              <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option>
              <option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
            </select>
          </div>
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
            {t("actions.start")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]/50 bg-[var(--color-muted)]/10">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">{session.topic} ({session.cefr_level})</span>
        </div>
        <button onClick={endSession} className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all">
          <Square className="h-4 w-4" /> {t("actions.end")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {turns.length === 0 && !loading && (
          <div className="text-center text-[var(--color-muted-fg)] py-10">
            {t("empty")}
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-6">
            {/* User Message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--color-primary)] text-white p-4 shadow-md">
                <p className="text-sm">{turn.user_transcript}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                  {t("labels.fluency")}: {turn.feedback.fluency_band_estimate}
                  </span>
                  {(turn.feedback.grammar_issues?.length ?? 0) === 0 ? (
                    <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                      <CheckCircle className="h-3 w-3" /> {t("labels.noGrammarIssues")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-orange-400/80 px-2 py-0.5 text-[10px] font-bold uppercase">
                      <AlertTriangle className="h-3 w-3" /> {t("labels.grammarIssues", { count: turn.feedback.grammar_issues?.length ?? 0 })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Message */}
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 p-4 shadow-sm">
                <p className="text-sm font-medium leading-relaxed text-[var(--color-fg)]">
                  {turn.agent_response_text}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    speakingTurn === i
                      ? stopSpeaking()
                      : speakAgentResponse(turn.agent_response_text, i)
                  }
                  className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    speakingTurn === i
                      ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)]/50 text-[var(--color-muted-fg)] hover:bg-[var(--color-muted)]/30 hover:text-[var(--color-fg)]"
                  }`}
                >
                  {speakingTurn === i ? (
                    <>
                      <StopCircle className="h-3.5 w-3.5" />
                      {t("actions.stopAnswer")}
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      {t("actions.playAnswer")}
                    </>
                  )}
                </button>
                <div className="mt-4 border-t border-[var(--color-border)]/50 pt-3">
                  <p className="text-xs font-bold text-[var(--color-primary)]">{t("labels.suggestion")}</p>
                  <p className="text-xs text-[var(--color-muted-fg)] mt-1">
                    {locale === "en"
                      ? (turn.feedback.encouragement_en ?? turn.feedback.encouragement_uz)
                      : (turn.feedback.encouragement_uz ?? turn.feedback.encouragement_en)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-[var(--color-muted-fg)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            <span>{t("status.thinking")}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--color-border)]/50 bg-[var(--color-bg)] flex justify-center">
        {isRecording ? (
          <button onClick={stopRecording} className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-4 font-bold text-white transition-all hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/20">
            <StopCircle className="h-6 w-6" />
            {t("actions.stopRecording")}
          </button>
        ) : (
          <button onClick={startRecording} disabled={loading} className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/20">
            <Mic className="h-6 w-6" />
            {t("actions.record")}
          </button>
        )}
      </div>
    </div>
  );
}

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const samples = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let sampleOffset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(sampleOffset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    sampleOffset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read audio"));
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}
