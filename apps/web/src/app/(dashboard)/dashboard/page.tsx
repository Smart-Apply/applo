'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApplications } from '@/hooks/use-applications';
import { useJobPostings } from '@/hooks/use-job-postings';
import { useProfile } from '@/hooks/use-profile';
import { 
  FileText, 
  Briefcase, 
  User, 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send,
  Calendar,
  Building2,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ApplicationTrackingStatus } from '@/types';

// Status-Konfiguration
const STATUS_CONFIG: Record<ApplicationTrackingStatus, { label: string; color: string; bgColor: string }> = {
  CREATED: { label: 'Erstellt', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  APPLIED: { label: 'Beworben', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  INTERVIEW: { label: 'Interview', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  ACCEPTED: { label: 'Angenommen', color: 'text-green-600', bgColor: 'bg-green-100' },
  REJECTED: { label: 'Abgelehnt', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Profil-Vollständigkeit berechnen
function calculateProfileCompletion(profile: {
  summary?: string | null;
  skills?: unknown[];
  experiences?: unknown[];
  education?: unknown[];
  certificates?: unknown[];
  projects?: unknown[];
} | null | undefined): number {
  if (!profile) return 0;
  
  const fields = [
    !!profile.summary,
    (profile.skills?.length ?? 0) > 0,
    (profile.experiences?.length ?? 0) > 0,
    (profile.education?.length ?? 0) > 0,
  ];
  
  const bonusFields = [
    (profile.certificates?.length ?? 0) > 0,
    (profile.projects?.length ?? 0) > 0,
  ];
  
  const baseScore = fields.filter(Boolean).length / fields.length * 80;
  const bonusScore = bonusFields.filter(Boolean).length / bonusFields.length * 20;
  
  return Math.round(baseScore + bonusScore);
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: applications, isLoading: applicationsLoading } = useApplications({ includeJobPosting: true });
  const { data: jobPostings, isLoading: jobsLoading } = useJobPostings();

  // Berechne Status-Statistiken
  const statusCounts: Partial<Record<ApplicationTrackingStatus, number>> = applications?.reduce((acc, app) => {
    acc[app.applicationStatus] = (acc[app.applicationStatus] || 0) + 1;
    return acc;
  }, {} as Partial<Record<ApplicationTrackingStatus, number>>) || {};

  const totalApplications = applications?.length || 0;
  const acceptedCount = statusCounts.ACCEPTED || 0;
  const rejectedCount = statusCounts.REJECTED || 0;
  const activeCount = (statusCounts.APPLIED || 0) + (statusCounts.INTERVIEW || 0);
  const successRate = totalApplications > 0 && (acceptedCount + rejectedCount) > 0
    ? Math.round((acceptedCount / (acceptedCount + rejectedCount)) * 100)
    : null;

  const profileCompletion = calculateProfileCompletion(profile);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Willkommen zurück! Hier ist eine Übersicht deiner Bewerbungen.
          </p>
        </div>
        <Button onClick={() => router.push('/applications/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Bewerbung
        </Button>
      </div>

      {/* Haupt-Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/applications')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bewerbungen</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-gray-500 mt-1">
              {activeCount} aktiv · {statusCounts.CREATED || 0} in Bearbeitung
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/jobs')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stellenanzeigen</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsLoading ? '...' : jobPostings?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Gespeicherte Jobs
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/profile')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profil</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileLoading ? '...' : `${profileCompletion}%`}</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all" 
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgsquote</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {successRate !== null ? `${successRate}%` : '–'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedCount} angenommen · {rejectedCount} abgelehnt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bewerbungs-Pipeline</CardTitle>
          <CardDescription>Übersicht deiner Bewerbungen nach Status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.entries(STATUS_CONFIG) as [ApplicationTrackingStatus, typeof STATUS_CONFIG[ApplicationTrackingStatus]][]).map(([status, config]) => (
              <button
                key={status}
                onClick={() => router.push(`/applications?status=${status}`)}
                className={`${config.bgColor} rounded-lg p-4 text-center hover:opacity-80 transition-opacity`}
              >
                <div className={`text-2xl font-bold ${config.color}`}>
                  {statusCounts[status] || 0}
                </div>
                <div className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zwei-Spalten-Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Letzte Bewerbungen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Letzte Bewerbungen</CardTitle>
              <CardDescription>Deine neuesten Bewerbungen</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/applications')}>
              Alle anzeigen
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <div className="text-center text-gray-500 py-8">Lädt...</div>
            ) : applications && applications.length > 0 ? (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => {
                  const statusConfig = STATUS_CONFIG[app.applicationStatus];
                  return (
                    <button
                      key={app.id}
                      onClick={() => router.push(`/applications/${app.id}`)}
                      className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {app.jobPosting?.title || 'Unbekannte Stelle'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {app.jobPosting?.company || 'Unbekanntes Unternehmen'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Noch keine Bewerbungen erstellt.</p>
                <Button variant="outline" onClick={() => router.push('/applications/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Bewerbung erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Tipps */}
        <div className="space-y-6">
          {/* Profil-Hinweis wenn nicht vollständig */}
          {!profileLoading && profileCompletion < 100 && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profil vervollständigen
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Ein vollständiges Profil verbessert deine generierten Bewerbungen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-blue-700">Fortschritt</span>
                  <span className="text-sm font-medium text-blue-900">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={() => router.push('/profile/edit')}
                >
                  Profil bearbeiten
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Schnellzugriff</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/applications/new')}
              >
                <Plus className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Neue Bewerbung</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/jobs')}
              >
                <Briefcase className="h-5 w-5 text-purple-500" />
                <span className="text-xs">Jobs durchsuchen</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/profile/edit')}
              >
                <User className="h-5 w-5 text-green-500" />
                <span className="text-xs">Profil bearbeiten</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/applications?status=APPLIED')}
              >
                <Send className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Offene Bewerbungen</span>
              </Button>
            </CardContent>
          </Card>

          {/* Aktivitäts-Hinweis */}
          {applications && applications.length > 0 && (
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Letzte Aktivität: {new Date(applications[0].updatedAt || applications[0].createdAt).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
