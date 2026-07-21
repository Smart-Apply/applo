'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';

interface ApplicationLoadingProps {
  message?: string;
}

export function ApplicationLoading({ message }: ApplicationLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6 text-center">
            {/* Animated Icons */}
            <div className="relative">
              <div className="flex items-center justify-center space-x-4">
                <FileText className="h-12 w-12 text-brand animate-pulse" />
                <Sparkles className="h-12 w-12 text-warning animate-bounce" />
              </div>

              {/* Loading Spinner Overlay */}
              <div className="absolute -inset-4 flex items-center justify-center">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-border border-t-brand" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {message || 'Bewerbung wird erstellt...'}
              </h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center justify-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse bg-brand" />
                  Lebenslauf wird vorbereitet
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse bg-brand [animation-delay:200ms]" />
                  Anschreiben wird mit KI generiert
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse bg-brand [animation-delay:400ms]" />
                  Dokumente werden gespeichert
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="h-2 w-full overflow-hidden bg-primary-soft dark:bg-slate-700">
                <div className="h-full animate-progress bg-brand" />
              </div>
              <p className="text-xs text-muted-foreground">
                Dies kann bis zu 30 Sekunden dauern...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
            transform: translateX(0);
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }
        
        .animate-progress {
          animation: progress 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
