'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  MessageSquare,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import type { InterviewSessionDetail } from '@/types';

interface InterviewFeedbackDisplayProps {
  session: InterviewSessionDetail;
}

export function InterviewFeedbackDisplay({ session }: InterviewFeedbackDisplayProps) {
  if (session.status !== 'COMPLETED' || !session.feedback) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2" />
          Keine Bewertung verfügbar. Schließe zuerst das Interview ab.
        </CardContent>
      </Card>
    );
  }

  const feedback = session.feedback;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-[#A16207] dark:text-amber-300';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  // Build category scores array
  const categoryScores = [
    { name: 'Kommunikation', score: feedback.communicationScore, icon: <MessageSquare className="h-4 w-4" /> },
    { name: 'Präsentation', score: feedback.presentationScore, icon: <Target className="h-4 w-4" /> },
  ];
  
  if (feedback.technicalScore !== undefined && feedback.technicalScore > 0) {
    categoryScores.push({ name: 'Fachkompetenz', score: feedback.technicalScore, icon: <Lightbulb className="h-4 w-4" /> });
  }
  if (feedback.problemSolvingScore !== undefined && feedback.problemSolvingScore > 0) {
    categoryScores.push({ name: 'Problemlösung', score: feedback.problemSolvingScore, icon: <Target className="h-4 w-4" /> });
  }
  if (feedback.cultureFitScore !== undefined && feedback.cultureFitScore > 0) {
    categoryScores.push({ name: 'Kulturfit', score: feedback.cultureFitScore, icon: <Award className="h-4 w-4" /> });
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Gesamtbewertung
            </CardTitle>
            <Badge
              variant={getScoreBadgeVariant(feedback.overallScore)}
              className="px-4 py-1 font-mono text-lg tabular-nums"
            >
              {feedback.overallScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={feedback.overallScore} className="h-3 mb-4" />
          {feedback.recommendations && feedback.recommendations.length > 0 && (
            <p className="text-muted-foreground">{feedback.recommendations[0]}</p>
          )}
        </CardContent>
      </Card>

      {/* Category Scores Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoryScores.map((category) => (
          <CategoryScoreCard
            key={category.name}
            title={category.name}
            score={category.score}
            icon={category.icon}
            getScoreColor={getScoreColor}
            getScoreBg={getScoreBg}
          />
        ))}
      </div>

      {/* Strengths and Improvements */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-success">
              <TrendingUp className="h-5 w-5" />
              Stärken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Improvements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-[#A16207] dark:text-amber-300">
              <TrendingDown className="h-5 w-5" />
              Verbesserungspotenzial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 text-[#A16207] dark:text-amber-300 flex-shrink-0" />
                  <span className="text-sm">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frage-für-Frage Analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.questions
            .filter((q) => q.answeredAt && q.feedback)
            .map((question, index) => (
              <div key={question.id}>
                {index > 0 && <Separator className="my-4" />}
                <QuestionFeedbackItem
                  questionNumber={index + 1}
                  question={question.questionText}
                  answer={question.userAnswer || null}
                  score={question.score}
                  feedback={question.feedback || ''}
                  getScoreColor={getScoreColor}
                  getScoreBadgeVariant={getScoreBadgeVariant}
                />
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper components
interface CategoryScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  getScoreColor: (score: number) => string;
  getScoreBg: (score: number) => string;
}

function CategoryScoreCard({
  title,
  score,
  icon,
  getScoreColor,
  getScoreBg,
}: CategoryScoreCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </div>
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
        <Progress
          value={score}
          className="h-2"
          // Use CSS variable to color the progress
          style={
            {
              '--progress-bg': getScoreBg(score).replace('bg-', ''),
            } as React.CSSProperties
          }
        />
      </CardContent>
    </Card>
  );
}

interface QuestionFeedbackItemProps {
  questionNumber: number;
  question: string;
  answer: string | null;
  score?: number;
  feedback: string;
  getScoreColor: (score: number) => string;
  getScoreBadgeVariant: (score: number) => 'default' | 'secondary' | 'destructive';
}

function QuestionFeedbackItem({
  questionNumber,
  question,
  answer,
  score,
  feedback,
  getScoreBadgeVariant,
}: QuestionFeedbackItemProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-sm">
            <span className="text-muted-foreground">Frage {questionNumber}:</span> {question}
          </p>
          {answer && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              Deine Antwort: &ldquo;{answer.length > 200 ? `${answer.slice(0, 200)}...` : answer}
              &rdquo;
            </p>
          )}
        </div>
        {score !== undefined && (
          <Badge variant={getScoreBadgeVariant(score)}>
            {score}/100
          </Badge>
        )}
      </div>
      <p className="text-sm bg-muted/50 rounded-[3px] p-3">{feedback}</p>
    </div>
  );
}
