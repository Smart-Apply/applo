'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  AlertTriangle,
  Clock,
  Keyboard,
  Check,
  Headphones,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewSessionDetail, VoiceTranscriptTurn } from '@/types';
import { useStartVoiceSession, useSubmitVoiceTranscript } from '@/hooks/use-voice-interview';
import { Applo, type ApploState } from './applo';
import { toast } from 'sonner';

type Phase = 'idle' | 'connecting' | 'live' | 'ending' | 'ended';
type VoiceError = 'mic' | 'unsupported' | 'connect' | null;

const DURATION_OPTIONS = [5, 10, 15] as const;
type VoiceDurationMinutes = (typeof DURATION_OPTIONS)[number];

// The interviewer has no wall-clock: the model is nudged over the data channel
// ~1 minute before the end and again at time-up, then gets a short grace period
// to speak its closing before the transcript is finalized.
const WARN_LEAD_SECONDS = 60;
const MIN_SECONDS_FOR_WARN = WARN_LEAD_SECONDS + 30;
const CLOSING_GRACE_MS = 9000;
const BACKSTOP_GRACE_MS = 15000;

interface InterviewVoiceProps {
  session: InterviewSessionDetail;
  maxSessionMinutes: number;
  remainingMinutes: number;
  onComplete: () => void;
  onSwitchToText: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function InterviewVoice({
  session,
  maxSessionMinutes,
  remainingMinutes,
  onComplete,
  onSwitchToText,
}: InterviewVoiceProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<VoiceError>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState<VoiceTranscriptTurn[]>([]);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [heardSpeech, setHeardSpeech] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<VoiceDurationMinutes>(10);
  const [mintedSeconds, setMintedSeconds] = useState<number | null>(null);
  const [wrapUpHint, setWrapUpHint] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const turnsRef = useRef<VoiceTranscriptTurn[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapUpSentRef = useRef(false);
  const closingSentRef = useRef(false);
  const finalizedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef<number | null>(null);

  const startMutation = useStartVoiceSession(session.id);
  const submitMutation = useSubmitVoiceTranscript(session.id);

  const cleanupConnection = useCallback(() => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    try {
      dcRef.current?.close();
    } catch {
      // already closed
    }
    try {
      pcRef.current?.close();
    } catch {
      // already closed
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    try {
      void audioContextRef.current?.close();
    } catch {
      // already closed
    }
    audioContextRef.current = null;
    setMicLevel(0);
    if (audioRef.current) audioRef.current.srcObject = null;
    remoteStreamRef.current = null;
    dcRef.current = null;
    pcRef.current = null;
    micStreamRef.current = null;
  }, []);

  // Inject a time cue as a system message and ask the model to react to it —
  // the same data-channel pattern as the session.update/response.create on open.
  const sendTimeCue = useCallback((text: string): boolean => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return false;
    try {
      dc.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [{ type: 'input_text', text }],
          },
        }),
      );
      dc.send(JSON.stringify({ type: 'response.create' }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const addTurn = useCallback((role: VoiceTranscriptTurn['role'], text: string) => {
    const atSeconds = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : undefined;
    const turn: VoiceTranscriptTurn = { role, text, atSeconds };
    turnsRef.current = [...turnsRef.current, turn];
    setCaptions((prev) => [...prev, turn].slice(-6));
  }, []);

  const handleRealtimeEvent = useCallback(
    (raw: string) => {
      let event: { type?: string; transcript?: string };
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[voice] event:', event.type);
      }

      switch (event.type) {
        case 'input_audio_buffer.speech_started':
          setHeardSpeech(true);
          setCandidateSpeaking(true);
          break;
        case 'input_audio_buffer.speech_stopped':
          setCandidateSpeaking(false);
          break;
        case 'output_audio_buffer.started':
          setInterviewerSpeaking(true);
          break;
        case 'output_audio_buffer.stopped':
          setInterviewerSpeaking(false);
          break;
        case 'conversation.item.input_audio_transcription.completed':
          if (event.transcript?.trim()) addTurn('candidate', event.transcript.trim());
          break;
        case 'response.output_audio_transcript.done':
          if (event.transcript?.trim()) addTurn('interviewer', event.transcript.trim());
          break;
        default:
          break;
      }
    },
    [addTurn],
  );

  const stop = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const durationSeconds = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;
    const turns = turnsRef.current;
    cleanupConnection();

    const hasAnswer = turns.some((turn) => turn.role === 'candidate');
    if (!hasAnswer) {
      setPhase('ended');
      toast.info('Es wurde keine Antwort aufgezeichnet.');
      onComplete();
      return;
    }

    setPhase('ending');
    try {
      await submitMutation.mutateAsync({ durationSeconds, turns });
    } finally {
      setPhase('ended');
      onComplete();
    }
  }, [cleanupConnection, submitMutation, onComplete]);

  const allowedMaxMinutes =
    remainingMinutes >= 0 ? Math.min(maxSessionMinutes, remainingMinutes) : maxSessionMinutes;
  const enabledOptions = DURATION_OPTIONS.filter((option) => option <= allowedMaxMinutes);
  const effectiveMinutes: VoiceDurationMinutes = enabledOptions.includes(selectedMinutes)
    ? selectedMinutes
    : (enabledOptions[enabledOptions.length - 1] ?? DURATION_OPTIONS[0]);
  const cueIsGerman = session.language !== 'en';

  const start = useCallback(async () => {
    setError(null);

    if (typeof RTCPeerConnection === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      return;
    }

    setPhase('connecting');
    finalizedRef.current = false;
    wrapUpSentRef.current = false;
    closingSentRef.current = false;
    turnsRef.current = [];
    setCaptions([]);
    setHeardSpeech(false);
    setWrapUpHint(false);

    let descriptor;
    try {
      descriptor = await startMutation.mutateAsync({ durationMinutes: effectiveMinutes });
    } catch {
      setPhase('idle');
      return;
    }

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        // Persist the remote interviewer audio so we can re-bind it after the
        // component swaps from the pre-call <audio> element to the live one.
        remoteStreamRef.current = event.streams[0];
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          void audioRef.current.play().catch(() => {
            // Autoplay can still be blocked by browser policy on some devices.
            // The phase→live effect retries play() once the live element mounts.
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[voice] connection:', pc.connectionState);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[voice] ice:', pc.iceConnectionState);
        }
      };

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((track) => pc.addTrack(track, mic));

      const micTrack = mic.getAudioTracks()[0];
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[voice] mic track:', {
          label: micTrack?.label,
          enabled: micTrack?.enabled,
          muted: micTrack?.muted,
          readyState: micTrack?.readyState,
        });
      }

      // Local mic-level meter so the user can confirm the microphone is live
      // (independent of whether audio reaches Azure).
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        void audioContext.resume();
        const sourceNode = audioContext.createMediaStreamSource(mic);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        sourceNode.connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const measure = () => {
          analyser.getByteTimeDomainData(samples);
          let sumSquares = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const deviation = (samples[i] - 128) / 128;
            sumSquares += deviation * deviation;
          }
          const rms = Math.sqrt(sumSquares / samples.length);
          setMicLevel(Math.min(1, rms * 3));
          levelRafRef.current = requestAnimationFrame(measure);
        };
        levelRafRef.current = requestAnimationFrame(measure);
      } catch {
        // Web Audio unavailable — the meter is a nicety, not required.
      }

      const dc = pc.createDataChannel('realtime-channel');
      dcRef.current = dc;
      dc.addEventListener('open', () => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[voice] data channel open');
        }
        try {
          // Re-assert input config so the model auto-responds when you stop
          // speaking (server VAD) and transcribes your answers.
          dc.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                type: 'realtime',
                audio: {
                  input: {
                    turn_detection: {
                      type: 'server_vad',
                      threshold: 0.5,
                      prefix_padding_ms: 300,
                      silence_duration_ms: 500,
                      create_response: true,
                      interrupt_response: true,
                    },
                    transcription: { model: 'whisper-1' },
                  },
                },
              },
            }),
          );
          // Trigger the interviewer's opening greeting + first question. The
          // session was already configured for audio output at mint time, so a
          // plain response.create produces spoken audio.
          dc.send(JSON.stringify({ type: 'response.create' }));
        } catch {
          // channel closed before we could configure/greet
        }
      });
      dc.addEventListener('message', (event) => handleRealtimeEvent(event.data));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Direct WebRTC SDP handshake with Azure (not our API) using the
      // short-lived ephemeral token. This must be a raw fetch — it's the
      // realtime negotiation, not an application API call.
      const sdpResponse = await fetch(descriptor.webrtcUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${descriptor.token}`,
          'Content-Type': 'application/sdp',
        },
      });
      if (!sdpResponse.ok) throw new Error(`SDP exchange failed: ${sdpResponse.status}`);

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      startedAtRef.current = Date.now();
      setElapsed(0);
      setMintedSeconds(descriptor.maxSessionSeconds);
      setPhase('live');

      const totalMs = descriptor.maxSessionSeconds * 1000;
      if (descriptor.maxSessionSeconds > MIN_SECONDS_FOR_WARN) {
        warnTimerRef.current = setTimeout(() => {
          if (wrapUpSentRef.current) return;
          wrapUpSentRef.current = true;
          setWrapUpHint(true);
          sendTimeCue(
            cueIsGerman
              ? 'Zeithinweis: Es verbleibt noch etwa eine Minute. Schließe das aktuelle Thema ab und stelle höchstens EINE letzte Frage.'
              : 'Time note: About one minute remains. Finish the current topic and ask at most ONE final question.',
          );
        }, totalMs - WARN_LEAD_SECONDS * 1000);
      }
      closeTimerRef.current = setTimeout(() => {
        if (closingSentRef.current) return;
        closingSentRef.current = true;
        toast.info('Die Zeit ist um – Applo verabschiedet sich.');
        const sent = sendTimeCue(
          cueIsGerman
            ? 'Die Zeit ist um. Bedanke dich jetzt kurz und warm, verabschiede dich und beende das Gespräch – stelle keine weiteren Fragen.'
            : 'Time is up. Give brief, warm thanks, say goodbye, and end the interview now – ask no further questions.',
        );
        if (!sent) {
          void stop();
          return;
        }
        closeTimerRef.current = setTimeout(() => void stop(), CLOSING_GRACE_MS);
      }, totalMs);
      // Absolute backstop: the transcript must be submitted even if the model
      // keeps talking past its closing.
      endTimerRef.current = setTimeout(() => {
        void stop();
      }, totalMs + BACKSTOP_GRACE_MS);
    } catch (err) {
      cleanupConnection();
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'NotFoundError');
      setError(denied ? 'mic' : 'connect');
      setPhase('idle');
    }
  }, [startMutation, handleRealtimeEvent, stop, cleanupConnection, effectiveMinutes, cueIsGerman, sendTimeCue]);

  const toggleMute = useCallback(() => {
    const tracks = micStreamRef.current?.getAudioTracks() ?? [];
    setIsMuted((prev) => {
      const next = !prev;
      tracks.forEach((track) => (track.enabled = !next));
      return next;
    });
  }, []);

  const switchToText = useCallback(() => {
    cleanupConnection();
    onSwitchToText();
  }, [cleanupConnection, onSwitchToText]);

  // The pre-call and live phases render SEPARATE <audio> elements, so the
  // remote stream attached during 'connecting' is dropped when React swaps to
  // the live element. Re-bind (and retry autoplay) once the live element mounts.
  useEffect(() => {
    if (phase !== 'live') return;
    const audioEl = audioRef.current;
    const stream = remoteStreamRef.current;
    if (audioEl && stream) {
      audioEl.srcObject = stream;
      void audioEl.play().catch(() => {
        // Autoplay blocked — the "Gespräch starten" click is a user gesture that
        // normally satisfies policy; swallow to avoid an unhandled rejection.
      });
    }
  }, [phase]);

  // Elapsed-time ticker while live.
  useEffect(() => {
    if (phase !== 'live') return;
    const interval = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Tear down the connection if the component unmounts mid-call.
  useEffect(() => {
    return () => cleanupConnection();
  }, [cleanupConnection]);

  const apploState: ApploState =
    phase === 'connecting' || phase === 'ending'
      ? 'process'
      : phase === 'ended'
        ? 'success'
        : interviewerSpeaking
          ? 'process'
          : candidateSpeaking
            ? 'think'
            : phase === 'live'
              ? 'idle'
              : 'wave';

  const limitSeconds = mintedSeconds ?? effectiveMinutes * 60;
  const isSpeaking = interviewerSpeaking || candidateSpeaking;

  // ============================ PRE-CALL ============================
  if (phase === 'idle' || phase === 'connecting') {
    return (
      <Card className="overflow-hidden p-0">
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* Mascot panel — sits in its own column, never overlaps text */}
          <div className="flex items-center justify-center border-b bg-gradient-to-b from-[#EEF3FB] to-[#F6F9FE] p-8 md:border-b-0 md:border-r dark:from-[#1E293B] dark:to-[#0F172A]">
            <Applo state={phase === 'connecting' ? 'process' : 'wave'} size={200} />
          </div>

          {/* Content */}
          <div className="flex flex-col p-8 md:p-10">
            <h2 className="text-[23px] font-bold tracking-tight">
              Bereit für dein Sprach-Interview?
            </h2>
            <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Du führst ein realistisches Gespräch mit Applo, deinem KI-Interviewer. Sprich frei und
              natürlich — am Ende erhältst du eine vollständige Auswertung.
            </p>

            {error !== null && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {error === 'mic' &&
                    'Kein Mikrofonzugriff. Bitte erlaube den Mikrofonzugriff in deinem Browser und versuche es erneut – oder wechsle zum Text-Chat.'}
                  {error === 'unsupported' &&
                    'Dein Browser unterstützt keine Sprach-Interviews. Bitte nutze einen aktuellen Browser oder wechsle zum Text-Chat.'}
                  {error === 'connect' &&
                    'Die Sprachverbindung konnte nicht aufgebaut werden. Bitte versuche es erneut oder wechsle zum Text-Chat.'}
                </div>
              </div>
            )}

            {/* Readiness checklist */}
            <div className="mt-6 space-y-3">
              {[
                {
                  icon: <Mic className="h-[18px] w-[18px] text-primary" />,
                  title: 'Mikrofon bereit',
                  sub: 'Zugriff wird beim Start abgefragt',
                },
                {
                  icon: <Headphones className="h-[18px] w-[18px] text-primary" />,
                  title: 'Ruhige Umgebung',
                  sub: 'Kopfhörer empfohlen, um Echo zu vermeiden',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3.5 rounded-xl border bg-muted px-4 py-3.5"
                >
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border bg-card">
                    {item.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-[12.5px] text-muted-foreground">{item.sub}</div>
                  </div>
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
              ))}
            </div>

            {/* Duration selector */}
            <div className="mt-6">
              <div className="mb-2.5 text-sm font-semibold">Gesprächsdauer</div>
              <div className="flex gap-2.5">
                {DURATION_OPTIONS.map((minutes) => {
                  const disabled = !enabledOptions.includes(minutes);
                  const active = minutes === effectiveMinutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedMinutes(minutes)}
                      className={cn(
                        'h-[42px] rounded-xl border px-5 text-sm font-semibold transition-colors',
                        active
                          ? 'border-primary bg-[var(--primary-soft)] text-primary'
                          : 'bg-card text-secondary hover:border-primary/40',
                        disabled && 'pointer-events-none opacity-40',
                      )}
                    >
                      {minutes} Min.
                    </button>
                  );
                })}
              </div>
              {enabledOptions.length < DURATION_OPTIONS.length && (
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  Optionen über deinem verbleibenden Zeitkontingent sind deaktiviert.
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="h-[54px] rounded-xl px-7 text-base"
                onClick={() => void start()}
                loading={startMutation.isPending || phase === 'connecting'}
              >
                {!(startMutation.isPending || phase === 'connecting') && <Mic className="h-5 w-5" />}
                {phase === 'connecting' ? 'Verbindung wird hergestellt …' : 'Gespräch starten'}
              </Button>

              {remainingMinutes >= 0 && (
                <span className="inline-flex h-[38px] items-center gap-2 rounded-full bg-green-50 px-3.5 text-[13.5px] font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                  <Clock className="h-4 w-4" />
                  {remainingMinutes} Min. verbleibend
                </span>
              )}

              <Button
                variant="ghost"
                onClick={switchToText}
                className="ml-auto gap-2 text-secondary hover:text-primary"
              >
                <Keyboard className="h-[17px] w-[17px]" />
                Lieber tippen? Zum Text-Chat
              </Button>
            </div>
          </div>
        </div>
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      </Card>
    );
  }

  // ============================ LIVE / ENDING ============================
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-6 py-5">
        <div className="flex items-center gap-2.5 text-[17px] font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-primary">
            <Mic className="h-[18px] w-[18px]" />
          </span>
          {session.jobTitle ? `Sprach-Interview · ${session.jobTitle}` : 'Sprach-Interview'}
        </div>
        {phase === 'live' && (
          <Badge className="gap-1.5 bg-primary text-primary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Verbunden
          </Badge>
        )}
      </div>

      <div className="flex flex-col items-center px-6 py-9 md:px-10">
        {/* Mascot stage with animated rings */}
        <div className="relative grid place-items-center">
          {phase === 'live' && isSpeaking && (
            <>
              <span className="absolute h-[170px] w-[170px] animate-ping rounded-full border-2 border-accent/40 [animation-duration:2.4s]" />
              <span className="absolute h-[200px] w-[200px] rounded-full border-2 border-accent/20" />
            </>
          )}
          <div className="relative z-10 drop-shadow-[0_12px_22px_rgba(27,42,73,0.14)]">
            <Applo state={apploState} size={190} />
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-3 inline-flex h-[38px] items-center gap-2.5 rounded-full bg-blue-50 px-4 text-[14.5px] font-semibold text-[#28456f] dark:bg-blue-950/40 dark:text-blue-200">
          {phase === 'ending' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Auswertung wird erstellt …
            </>
          ) : interviewerSpeaking ? (
            <>
              <span className="flex h-[15px] items-end gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-sm bg-accent"
                    style={{
                      animation: 'voiceEq 1s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`,
                      height: '6px',
                    }}
                  />
                ))}
              </span>
              Applo spricht …
            </>
          ) : candidateSpeaking ? (
            'Du sprichst …'
          ) : (
            'Sprich, wenn du bereit bist.'
          )}
        </div>

        {/* Timer */}
        {phase === 'live' && (
          <div className="mt-5 inline-flex h-[38px] items-center gap-2 rounded-full border bg-muted px-4 font-mono text-[15px] tabular-nums">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatTime(elapsed)} <span className="text-muted-foreground">/</span>{' '}
            {formatTime(limitSeconds)}
          </div>
        )}

        {/* Wrap-up hint once the ~1-minute warning cue was sent */}
        {phase === 'live' && wrapUpHint && (
          <div className="mt-3 inline-flex h-[32px] items-center gap-2 rounded-full bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Clock className="h-3.5 w-3.5" />
            Noch etwa 1 Minute
          </div>
        )}

        {/* Mic level */}
        {phase === 'live' && (
          <div className="mt-6 w-full max-w-[520px]">
            <div className="mb-2 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>Dein Mikrofon</span>
              {heardSpeech ? (
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-green-600">
                  <Check className="h-[15px] w-[15px]" strokeWidth={3} />
                  Stimme erkannt
                </span>
              ) : (
                <span className="ml-auto">Sprich, damit der Interviewer reagiert …</span>
              )}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-75"
                style={{ width: `${Math.round(micLevel * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Captions */}
        {captions.length > 0 && (
          <div className="mt-6 w-full max-w-[560px] space-y-3 rounded-2xl border bg-muted p-5">
            {captions.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className="text-[14.5px] leading-relaxed">
                <span
                  className={cn(
                    'font-bold',
                    turn.role === 'interviewer' ? 'text-accent' : 'text-primary',
                  )}
                >
                  {turn.role === 'interviewer' ? 'Applo' : 'Du'}:
                </span>{' '}
                <span className="text-secondary">{turn.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        {phase === 'live' && (
          <div className="mt-8 flex items-center justify-center gap-3.5">
            <Button
              variant="outline"
              size="lg"
              onClick={toggleMute}
              className={cn(
                'h-[52px] rounded-xl px-6',
                isMuted &&
                  'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
              )}
            >
              {isMuted ? <MicOff className="h-[19px] w-[19px]" /> : <Mic className="h-[19px] w-[19px]" />}
              {isMuted ? 'Stumm' : 'Mikrofon an'}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => void stop()}
              className="h-[52px] rounded-xl px-6"
            >
              <PhoneOff className="h-[19px] w-[19px]" />
              Gespräch beenden
            </Button>
          </div>
        )}
      </div>

      {/* Remote interviewer audio. */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <style jsx>{`
        @keyframes voiceEq {
          0%,
          100% {
            height: 5px;
          }
          50% {
            height: 15px;
          }
        }
      `}</style>
    </Card>
  );
}
