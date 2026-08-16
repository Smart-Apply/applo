"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HairlineGrid } from "@/components/ui/hairline-grid"
import { cn } from "@/lib/utils"

/**
 * SkeletonScreen - the single live region for a loading area.
 *
 * <Skeleton> blocks are decorative (aria-hidden), so exactly one wrapper per
 * loading area carries `role="status"` and the localized label. That gives
 * assistive tech one clear "content is loading" announcement instead of one
 * per placeholder block.
 */
export function SkeletonScreen({
  children,
  label,
  className,
}: {
  children: React.ReactNode
  label?: string
  className?: string
}) {
  const t = useTranslations("common.loadingMessages")

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ?? t("content")}
      className={cn("motion-fade-enter", className)}
    >
      {children}
    </div>
  )
}

/**
 * PageHeaderSkeleton - title + subtitle + primary action of a dashboard page.
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-36" />
    </div>
  )
}

/**
 * ListPageSkeleton - header + filter row + list rows. Matches the shape of the
 * table-style pages (applications, jobs, sessions) so nothing jumps when the
 * real content arrives.
 */
export function ListPageSkeleton({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 flex-none" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-7 w-20 flex-none" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * AppShellSkeleton - the dashboard chrome (sidebar + content) while the auth
 * state hydrates. Showing the real shell silhouette instead of a centred
 * spinner means the layout is already in place when the session resolves, so
 * entering the dashboard is a fade rather than a jump.
 */
export function AppShellSkeleton({ message }: { message?: string }) {
  const t = useTranslations("common.loadingMessages")

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={message ?? t("page")}
      className="flex min-h-screen bg-muted/30"
    >
      <div className="hidden w-[290px] flex-none bg-[#1B2A49] md:block">
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          <Skeleton className="h-6 w-36 bg-white/10" />
        </div>
        <div className="space-y-2 px-4 py-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-white/10" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-border/50 px-4 md:hidden">
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="p-4 md:mx-auto md:w-full md:max-w-7xl md:p-8">
          {message && (
            <div className="mb-4 inline-flex items-center gap-2 border bg-card px-3 py-1.5 text-sm text-muted-foreground">
              {/* Decorative: the wrapper above already owns the live region and
                  this <span> already carries the text, so a <Spinner> here
                  (which renders its own role="status" + sr-only label) would
                  make assistive tech announce `message` three times. */}
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  )
}

/**
 * ProfileSkeleton - For profile sections
 */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("loading-in space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Profile Cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * ProfileCardSkeleton - For individual profile card sections
 */
export function ProfileCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("loading-in", className)}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * JobPostingCardSkeleton - For job posting cards
 */
export function JobPostingCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("loading-in", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ApplicationCardSkeleton - For application list items
 */
export function ApplicationCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("loading-in", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * FormFieldSkeleton - For form fields
 */
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/**
 * ListRowSkeleton - One row of a divided list (job postings, generic lists)
 */
export function ListRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-4 p-4", className)}>
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-1.5 pt-0.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  )
}

/**
 * ListCardSkeleton - Card wrapping a divided list of rows
 */
export function ListCardSkeleton({
  rows = 3,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <Card className={cn("loading-in", className)}>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * SessionCardSkeleton - For active-session cards
 */
export function SessionCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("loading-in", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-5 w-5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * DashboardSkeleton - For the dashboard home route
 *
 * Mirrors the loaded layout (hero band, four stat tiles, the 2/1 card grid)
 * so the swap to real content doesn't shift anything.
 */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("loading-in space-y-3", className)}>
      {/* Welcome hero */}
      <Skeleton className="h-[184px] w-full rounded-[4px]" />

      {/* Stats tiles — same hairline grid as the loaded strip */}
      <HairlineGrid className="grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start justify-between gap-2.5 bg-card p-3.5">
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-1 h-[26px] w-10" />
            </div>
            <Skeleton className="h-9 w-9 flex-none" />
          </div>
        ))}
      </HairlineGrid>

      {/* Recent applications + side cards */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Skeleton className="h-[248px] w-full rounded-[4px] lg:col-span-2 lg:row-start-1" />
        <Skeleton className="h-[248px] w-full rounded-[4px] lg:col-span-2 lg:row-start-2" />
        <Skeleton className="h-[248px] w-full rounded-[4px] lg:col-start-3 lg:row-start-1" />
        <Skeleton className="h-[248px] w-full rounded-[4px] lg:col-start-3 lg:row-start-2" />
      </div>
    </div>
  )
}

/**
 * TableSkeleton - For table rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * AvatarSkeleton - For user avatars
 */
export function AvatarSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />
}

/**
 * ButtonSkeleton - For buttons
 */
export function ButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-9 w-24 rounded-md", className)} />
}

/**
 * TextSkeleton - For text content
 */
export function TextSkeleton({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-4/6" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

/**
 * ImageSkeleton - For images
 */
export function ImageSkeleton({
  aspectRatio = "video",
  className,
}: {
  aspectRatio?: "square" | "video" | "portrait"
  className?: string
}) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  }

  return (
    <Skeleton
      className={cn("w-full", aspectClasses[aspectRatio], className)}
    />
  )
}
