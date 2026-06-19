'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, PhoneOff, Loader2, AlertTriangle, Clock, Keyboard } from 'lucide-react';
import type { InterviewSessionDetail, VoiceTranscriptTurn } from '@/types';
import { useStartVoiceSession, useSubmitVoiceTranscript } from '@/hooks/use-voice-interview';
import { Applo, type ApploState } from './applo';
import { toast } from 'sonner';

type Phase = 'idle' | 'connecting' | 'live' | 'ending' | 'ended';
type VoiceError = 'mic' | 'unsupported' | 'connect' | null;

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<VoiceTranscriptTurn[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    dcRef.current = null;
    pcRef.current = null;
    micStreamRef.current = null;
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

  const start = useCallback(async () => {
    setError(null);

    if (typeof RTCPeerConnection === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      return;
    }

    setPhase('connecting');
    finalizedRef.current = false;
    turnsRef.current = [];
    setCaptions([]);
    setHeardSpeech(false);

    let descriptor;
    try {
      descriptor = await startMutation.mutateAsync({});
    } catch {
      setPhase('idle');
      return;
    }

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (audioRef.current) audioRef.current.srcObject = event.streams[0];
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
          // Trigger the interviewer's opening greeting + first question.
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
      setPhase('live');
      endTimerRef.current = setTimeout(() => {
        toast.info('Das Zeitlimit für dieses Gespräch wurde erreicht.');
        void stop();
      }, descriptor.maxSessionSeconds * 1000);
    } catch (err) {
      cleanupConnection();
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'NotFoundError');
      setError(denied ? 'mic' : 'connect');
      setPhase('idle');
    }
  }, [startMutation, handleRealtimeEvent, stop, cleanupConnection]);

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

  const maxSessionSeconds = maxSessionMinutes * 60;
  const remaining = Math.max(0, maxSessionSeconds - elapsed);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {session.jobTitle ? `Sprach-Interview · ${session.jobTitle}` : 'Sprach-Interview'}
          </CardTitle>
          {phase === 'live' && (
            <Badge variant="outline" className="gap-1 font-mono">
              <Clock className="h-3 w-3" />
              {formatTime(elapsed)} / {formatTime(maxSessionSeconds)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-32 w-32">
            <Applo state={apploState} />
          </div>
          {phase === 'idle' && error === null && (
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Führe ein realistisches Gespräch mit deinem KI-Interviewer. Sprich frei – am Ende
              erhältst du eine vollständige Auswertung. Du brauchst ein Mikrofon und eine ruhige
              Umgebung.
            </p>
          )}
          {phase === 'connecting' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verbindung wird hergestellt …
            </p>
          )}
          {phase === 'live' && (
            <p className="text-sm font-medium text-muted-foreground">
              {interviewerSpeaking
                ? 'Interviewer spricht …'
                : candidateSpeaking
                  ? 'Du sprichst …'
                  : 'Sprich, wenn du bereit bist.'}
            </p>
          )}
          {phase === 'ending' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Auswertung wird erstellt …
            </p>
          )}
        </div>

        {phase === 'live' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mic className="h-3.5 w-3.5" />
              <span>Mikrofon</span>
              {heardSpeech ? (
                <span className="ml-auto font-medium text-green-600">✓ Stimme erkannt</span>
              ) : (
                <span className="ml-auto">Sprich, damit der Interviewer reagiert …</span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-75"
                style={{ width: `${Math.round(micLevel * 100)}%` }}
              />
            </div>
          </div>
        )}

        {error !== null && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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

        {captions.length > 0 && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            {captions.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className="text-sm">
                <span
                  className={
                    turn.role === 'interviewer'
                      ? 'font-semibold text-primary'
                      : 'font-semibold text-foreground'
                  }
                >
                  {turn.role === 'interviewer' ? 'Interviewer' : 'Du'}:
                </span>{' '}
                <span className="text-muted-foreground">{turn.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Remote interviewer audio. */}
        <audio ref={audioRef} autoPlay className="hidden" />
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        {phase === 'idle' && (
          <>
            <Button onClick={() => void start()} disabled={startMutation.isPending} className="gap-2">
              <Mic className="h-4 w-4" />
              Gespräch starten
            </Button>
            <div className="flex items-center gap-3">
              {remainingMinutes >= 0 && (
                <span className="text-xs text-muted-foreground">
                  Verbleibendes Kontingent: {remainingMinutes} Min.
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={switchToText} className="gap-2">
                <Keyboard className="h-4 w-4" />
                Zum Text-Chat
              </Button>
            </div>
          </>
        )}

        {phase === 'live' && (
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleMute} className="gap-2">
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? 'Stumm' : 'Mikrofon an'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Noch {formatTime(remaining)}
              </span>
            </div>
            <Button variant="destructive" onClick={() => void stop()} className="gap-2">
              <PhoneOff className="h-4 w-4" />
              Gespräch beenden
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
