'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewSessionDetail, InterviewQuestion } from '@/types';
import {
  useSubmitAnswer,
  useGetNextQuestion,
  useCompleteInterview,
  useAbandonInterview,
} from '@/hooks/use-interviews';
import { usePromptUsage } from '@/hooks/use-prompt-usage';
import { PromptUsageMeter } from '@/components/ui/prompt-usage-meter';
import { toast } from 'sonner';

interface InterviewChatProps {
  session: InterviewSessionDetail;
  onComplete: () => void;
  onAbandon: () => void;
}

type ChatMessage = {
  id: string;
  type: 'question' | 'answer' | 'feedback' | 'system';
  content: string;
  timestamp: Date;
  question?: InterviewQuestion;
  score?: number;
};

const questionTypeLabel = (type: InterviewQuestion['questionType']) =>
  ({
    BEHAVIORAL: 'Verhalten',
    TECHNICAL: 'Technisch',
    SITUATIONAL: 'Situativ',
    OPEN: 'Offen',
    FOLLOW_UP: 'Nachfrage',
  })[type] ?? 'Frage';

export function InterviewChat({ session, onComplete, onAbandon }: InterviewChatProps) {
  // Find first unanswered question for initialization
  const initialQuestion = session.questions.find((q) => !q.answeredAt) || null;

  const [answer, setAnswer] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!initialQuestion) return [];
    return [
      {
        id: 'welcome',
        type: 'system',
        content: `Willkommen zum Interview! Du beantwortest ${session.maxQuestions} Fragen. Nimm dir Zeit für durchdachte Antworten.`,
        timestamp: new Date(),
      },
      {
        id: `question-${initialQuestion.id}`,
        type: 'question',
        content: initialQuestion.questionText,
        timestamp: new Date(),
        question: initialQuestion,
      },
    ];
  });
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(initialQuestion);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(!!initialQuestion);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pass sessionId to hooks
  const submitAnswerMutation = useSubmitAnswer(session.id);
  const getNextQuestionMutation = useGetNextQuestion(session.id);
  const completeMutation = useCompleteInterview(session.id);
  const abandonMutation = useAbandonInterview(session.id);

  // Live character/token guardrail for the answer input (issue #520).
  const usage = usePromptUsage(answer, 'interviewChat');

  // Calculate progress
  const totalQuestions = session.maxQuestions;
  const answeredQuestions = session.answeredCount;
  const progress = (answeredQuestions / totalQuestions) * 100;
  const currentIndex = answeredQuestions + (currentQuestion ? 1 : 0);
  const isLastQuestion = answeredQuestions === totalQuestions - 1 && currentQuestion;

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim() || !currentQuestion || usage.isOverLimit) return;

    const answerContent = answer.trim();
    setAnswer('');

    // Add user's answer to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `answer-${currentQuestion.id}`,
        type: 'answer',
        content: answerContent,
        timestamp: new Date(),
      },
    ]);

    try {
      // Submit answer and get feedback
      const response = await submitAnswerMutation.mutateAsync({
        questionId: currentQuestion.id,
        data: { answer: answerContent, answerDuration: timer },
      });

      // Add feedback message if available
      if (response.question.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `feedback-${currentQuestion.id}`,
            type: 'feedback',
            content: response.question.feedback || 'Feedback wird generiert...',
            timestamp: new Date(),
            score: response.question.score,
          },
        ]);
      }

      // Check if this was the last question
      if (!response.hasMoreQuestions || isLastQuestion) {
        setIsTimerRunning(false);
        setCurrentQuestion(null);
        setMessages((prev) => [
          ...prev,
          {
            id: 'complete',
            type: 'system',
            content:
              'Alle Fragen beantwortet! Klicke auf "Interview abschließen", um deine Gesamtbewertung zu sehen.',
            timestamp: new Date(),
          },
        ]);
      } else {
        // Get next question
        const nextResponse = await getNextQuestionMutation.mutateAsync();
        if (nextResponse?.question) {
          setCurrentQuestion(nextResponse.question);
          setMessages((prev) => [
            ...prev,
            {
              id: `question-${nextResponse.question.id}`,
              type: 'question',
              content: nextResponse.question.questionText,
              timestamp: new Date(),
              question: nextResponse.question,
            },
          ]);
        }
      }
    } catch {
      toast.error('Fehler beim Senden der Antwort');
      // Restore the answer
      setAnswer(answerContent);
    }
  }, [
    answer,
    currentQuestion,
    timer,
    isLastQuestion,
    usage.isOverLimit,
    submitAnswerMutation,
    getNextQuestionMutation,
  ]);

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync();
      toast.success('Interview abgeschlossen!');
      onComplete();
    } catch {
      toast.error('Fehler beim Abschließen des Interviews');
    }
  };

  const handleAbandon = async () => {
    try {
      await abandonMutation.mutateAsync();
      toast.success('Interview abgebrochen');
      onAbandon();
    } catch {
      toast.error('Fehler beim Abbrechen des Interviews');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const isLoading = submitAnswerMutation.isPending || getNextQuestionMutation.isPending;
  const allQuestionsAnswered = !currentQuestion && answeredQuestions >= totalQuestions;

  return (
    <>
      <Card className="flex h-[calc(100vh-16rem)] max-h-[760px] min-h-[520px] flex-col overflow-hidden p-0">
        {/* ---- Header: title + timer + prominent progress ---- */}
        <div className="flex-shrink-0 border-b px-6 py-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[17px] font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
                <Bot className="h-[18px] w-[18px]" />
              </span>
              Interview-Simulation
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-muted px-3 font-mono text-sm tabular-nums">
                <Clock className="h-[15px] w-[15px] text-muted-foreground" />
                {formatTime(timer)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAbandonDialog(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Abbrechen
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span className="font-semibold">
              Frage {Math.min(currentIndex, totalQuestions)} von {totalQuestions}
            </span>
            <span className="font-medium text-muted-foreground">
              {Math.round(progress)}&nbsp;% abgeschlossen
            </span>
          </div>
          <div className="relative h-2.5 overflow-hidden bg-muted">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Per-question step dots */}
          <div className="mt-2.5 flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1',
                  i < answeredQuestions
                    ? 'bg-accent'
                    : i === answeredQuestions && currentQuestion
                      ? 'bg-accent/40'
                      : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>

        {/* ---- Messages ---- */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          {messages.map((message) => {
            if (message.type === 'system') {
              return (
                <div
                  key={message.id}
                  className="mx-auto flex max-w-[90%] items-center gap-2.5 rounded-[4px] border border-primary-soft bg-primary-soft/40 px-4 py-2.5 text-[13.5px] italic text-foreground dark:border-slate-600 dark:bg-slate-800/60"
                >
                  <Info className="h-[17px] w-[17px] shrink-0 text-brand" />
                  {message.content}
                </div>
              );
            }
            if (message.type === 'feedback') {
              return (
                <div key={message.id} className="flex max-w-[82%] gap-3 self-start">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-[#BFE9CC] bg-[#ECFAF0] text-success dark:border-green-400/30 dark:bg-green-400/10">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="rounded-[4px] rounded-tl-[2px] border border-[#BFE9CC] bg-[#ECFAF0] px-4 py-3 text-[15px] leading-relaxed text-[#3D7A55] dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-200/80">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.score !== undefined && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                        <span>Score:</span>
                        <span
                          className={cn(
                            'rounded-[2px] border px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums tracking-[.05em]',
                            message.score >= 80
                              ? 'border-[#BFE9CC] bg-[#ECFAF0] text-success dark:border-green-400/30 dark:bg-green-400/10'
                              : message.score >= 60
                                ? 'border-[#F3E3B3] bg-[#FDF6E7] text-[#A16207] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                                : 'border-[#F3C9C9] bg-[#FDEEEE] text-destructive dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300',
                          )}
                        >
                          {message.score}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            const isAnswer = message.type === 'answer';
            return (
              <div
                key={message.id}
                className={cn('flex max-w-[82%] gap-3', isAnswer ? 'flex-row-reverse self-end' : 'self-start')}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px]',
                    isAnswer ? 'border border-primary-soft bg-primary-soft/40 text-brand dark:border-slate-600 dark:bg-slate-800/60' : 'bg-primary text-primary-foreground',
                  )}
                >
                  {isAnswer ? <User className="h-5 w-5" /> : <Bot className="h-[21px] w-[21px]" />}
                </span>
                <div
                  className={cn(
                    'rounded-[4px] px-4 py-3 text-[15px] leading-relaxed',
                    isAnswer
                      ? 'rounded-tr-[2px] bg-primary text-primary-foreground'
                      : 'rounded-tl-[2px] bg-muted text-foreground',
                  )}
                >
                  {message.type === 'question' && message.question && (
                    <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-[2px] border bg-card px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.05em] text-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {questionTypeLabel(message.question.questionType)}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ---- Composer ---- */}
        <div className="flex-shrink-0 border-t px-5 pb-4 pt-4">
          {allQuestionsAnswered ? (
            <div className="flex w-full flex-col items-center gap-4 py-1">
              <p className="text-center text-sm text-muted-foreground">
                Du hast alle Fragen beantwortet. Schließe das Interview ab, um deine Gesamtbewertung
                zu erhalten.
              </p>
              <Button size="lg" onClick={handleComplete} loading={completeMutation.isPending}>
                {!completeMutation.isPending && <CheckCircle2 className="h-4 w-4" />}
                Interview abschließen
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-end gap-3">
              <div className="flex-1 space-y-2">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Deine Antwort eingeben…  (Enter zum Senden · Shift+Enter für Zeilenumbruch)"
                  className="max-h-[200px] min-h-[84px] w-full resize-none rounded-[3px] text-[15px]"
                  disabled={isLoading || !currentQuestion}
                  aria-invalid={usage.isOverLimit}
                />
                <PromptUsageMeter usage={usage} />
              </div>
              <Button
                size="lg"
                className="h-[52px] rounded-[3px] px-6"
                onClick={handleSubmitAnswer}
                disabled={!answer.trim() || isLoading || !currentQuestion || usage.isOverLimit}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Senden
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Abandon confirmation dialog */}
      <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview abbrechen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du das Interview abbrechen möchtest? Dein Fortschritt geht
              verloren und du erhältst keine Gesamtbewertung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter machen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAbandon}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {abandonMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Abbrechen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
