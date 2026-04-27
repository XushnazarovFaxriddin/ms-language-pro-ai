"use client";

import { useState, useRef, useEffect } from "react";
import { api, ConversationSessionOut, ConversationTurnOut } from "@/lib/api";
import { Mic, Square, Loader2, PlayCircle, StopCircle, RefreshCcw, CheckCircle, AlertTriangle } from "lucide-react";

export function ConversationClient() {
  const [session, setSession] = useState<ConversationSessionOut | null>(null);
  const [turns, setTurns] = useState<ConversationTurnOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

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
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    try {
      await api.conversation.endSession(session.id);
      setSession(null);
      setTurns([]);
    } catch (err: any) {
      setError(err.message || "Sessiyani tugatib bo'lmadi");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        await handleAudioSubmission(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      setError("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmission = async (blob: Blob) => {
    if (!session) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string)?.split(',')[1] ?? "";
        const turn = await api.conversation.submitTurn(session.id, {
          audio_base64: base64data,
          audio_format: "webm",
        });
        setTurns(prev => [...prev, turn]);
      };
    } catch (err: any) {
      setError(err.message || "Audioni yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 max-w-xl mx-auto shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Yangi suhbat boshlash</h2>
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        <form onSubmit={startSession} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">Suhbat mavzusi</label>
            <input required name="topic" defaultValue="University life" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">CEFR darajasi</label>
            <select name="cefr_level" defaultValue="B2" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none">
              <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option>
              <option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
            </select>
          </div>
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
            Boshlash
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
          <Square className="h-4 w-4" /> Yakunlash
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {turns.length === 0 && !loading && (
          <div className="text-center text-[var(--color-muted-fg)] py-10">
            Mikrofonni bosib gapirishni boshlang. AI sizga javob qaytaradi.
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
                    Fluency: {turn.feedback.fluency_band_estimate}
                  </span>
                  {turn.feedback.grammar_issues.length === 0 ? (
                    <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                      <CheckCircle className="h-3 w-3" /> No Grammar Issues
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-orange-400/80 px-2 py-0.5 text-[10px] font-bold uppercase">
                      <AlertTriangle className="h-3 w-3" /> {turn.feedback.grammar_issues.length} Grammar Issues
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
                <div className="mt-4 border-t border-[var(--color-border)]/50 pt-3">
                  <p className="text-xs font-bold text-[var(--color-primary)]">Tavsiya:</p>
                  <p className="text-xs text-[var(--color-muted-fg)] mt-1">{turn.feedback.encouragement_uz}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--color-border)]/50 bg-[var(--color-bg)] flex justify-center">
        {isRecording ? (
          <button onClick={stopRecording} className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-4 font-bold text-white transition-all hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/20">
            <StopCircle className="h-6 w-6" />
            Yozishni to'xtatish
          </button>
        ) : (
          <button onClick={startRecording} disabled={loading} className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/20">
            <Mic className="h-6 w-6" />
            Gapirish uchun bosing
          </button>
        )}
      </div>
    </div>
  );
}
