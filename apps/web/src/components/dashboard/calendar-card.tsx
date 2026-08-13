'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getIntlLocale } from '@/lib/i18n-runtime';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from '@/hooks/use-appointments';
import type { Appointment } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Mail, Trash2 } from 'lucide-react';

/* ----------------------------- date helpers ----------------------------- */

const pad = (n: number) => String(n).padStart(2, '0');
/** month is 0-based (JS convention). Returns "YYYY-MM-DD". */
const toISODate = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;
const todayISO = () => {
  const n = new Date();
  return toISODate(n.getFullYear(), n.getMonth(), n.getDate());
};

interface DayCell {
  key: string;
  day: number;
  /** ISO date for in-month cells; null for leading/trailing padding cells. */
  iso: string | null;
  muted: boolean;
}

/** Monday-first month grid, padded up to `minCells` (42 = 6 rows, stable height). */
function buildMonthGrid(year: number, month: number, minCells: number): DayCell[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: DayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({ key: `p${d}`, day: d, iso: null, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `c${d}`, day: d, iso: toISODate(year, month, d), muted: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0 || cells.length < minCells) {
    cells.push({ key: `n${next}`, day: next, iso: null, muted: true });
    next++;
  }
  return cells;
}

/* ------------------------------ component -------------------------------- */

export function CalendarCard({ className }: { className?: string }) {
  const t = useTranslations('dashboard');
  const locale = getIntlLocale();
  const { data: appointments = [] } = useAppointments();

  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const isSaving = createAppointment.isPending || updateAppointment.isPending;

  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTime, setFormTime] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formRemind, setFormRemind] = useState(true);

  const today = todayISO();

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [appointments]);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.date >= today).slice(0, 3),
    [appointments, today]
  );

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // 2024-01-01 was a Monday → gives a Monday-first week.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)).toUpperCase());
  }, [locale]);

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1)
      ),
    [locale, viewYear, viewMonth]
  );

  const formatDayMonth = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
      new Date(`${iso}T00:00:00`)
    );

  const previewGrid = useMemo(
    () => buildMonthGrid(now.getFullYear(), now.getMonth(), 42),
    // Preview always shows the real current month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const modalGrid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, 42),
    [viewYear, viewMonth]
  );

  /* ------------------------------ actions ------------------------------- */

  const resetForm = (iso: string, appt?: Appointment) => {
    setSelectedDate(iso);
    if (appt) {
      setEditingId(appt.id);
      setFormTime(appt.startTime ?? '');
      setFormNote(appt.note);
      setFormRemind(appt.emailReminder);
    } else {
      setEditingId(null);
      setFormTime('');
      setFormNote('');
      setFormRemind(true);
    }
  };

  const selectDay = (iso: string) => {
    resetForm(iso, (byDate.get(iso) ?? [])[0]);
  };

  const editAppointment = (a: Appointment) => {
    const [y, m] = a.date.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    resetForm(a.date, a);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleSave = () => {
    const note = formNote.trim();
    if (!note) return;
    const payload = {
      date: selectedDate,
      startTime: formTime || undefined,
      note,
      emailReminder: formRemind,
    };
    if (editingId) {
      updateAppointment.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => resetForm(selectedDate) }
      );
    } else {
      createAppointment.mutate(payload, { onSuccess: () => resetForm(selectedDate) });
    }
  };

  const handleDelete = (id: string) => {
    deleteAppointment.mutate(id);
    if (id === editingId) resetForm(selectedDate);
  };

  const openModal = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    selectDay(today);
    setOpen(true);
  };

  /* ------------------------------- render ------------------------------- */

  return (
    <>
      {/* Card-as-button: a <div> rather than a <section>, because ARIA in HTML
          does not allow role="button" on <section> (axe: aria-allowed-role).
          The explicit aria-label keeps the announced name short — name-from-
          content would read the whole card. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t('page.calendar.openAria')}
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
        className={cn(
          'group flex cursor-pointer flex-col overflow-hidden rounded-[4px] border border-[#33456b] bg-card outline-none ring-brand/40 transition-colors hover:bg-muted/50 focus-visible:ring-2',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#33456b] bg-[#1B2A49] px-4 py-2.5">
          <div>
            <h2 className="font-heading text-base font-bold tracking-[-.01em] text-white">
              {t('page.calendar.title')}
            </h2>
            <p className="mt-2 text-[12.5px] text-white/60">
              {t('page.calendar.subtitle', { month: monthTitle, count: appointments.length })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-white bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-[#1B2A49]">
            {t('page.calendar.open')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex flex-1 flex-wrap items-start gap-6 px-4 py-3">
          {/* Mini month preview */}
          <div className="flex flex-none flex-col gap-0.5">
            <div className="mb-0.5 grid grid-cols-7 gap-px">
              {weekdays.map((wd, i) => (
                <span
                  key={i}
                  className="text-center font-mono text-[9px] font-semibold text-muted-foreground"
                  style={{ width: 22 }}
                >
                  {wd.slice(0, 2)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {previewGrid.map((cell) => {
                const hasAppt = cell.iso ? byDate.has(cell.iso) : false;
                const isToday = cell.iso === today;
                return (
                  <div
                    key={cell.key}
                    className={`relative flex items-center justify-center border font-mono text-[10px] font-semibold ${
                      cell.muted
                        ? 'border-[#1B2A49]/25 bg-[#1B2A49]/15 text-[#1B2A49]'
                        : isToday
                          ? 'border-brand text-foreground'
                          : 'border-border text-foreground'
                    } ${cell.muted ? '' : hasAppt ? 'bg-brand/10' : 'bg-card'}`}
                    style={{ width: 22, height: 22 }}
                  >
                    {cell.day}
                    {hasAppt && (
                      <span className="absolute -right-0.5 -top-0.5 h-[8px] w-[8px] rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming list */}
          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <SectionLabel className="text-[10px] tracking-[.1em] text-muted-foreground">
              {t('page.calendar.upcoming')}
            </SectionLabel>
            {upcoming.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">{t('page.calendar.noUpcoming')}</p>
            ) : (
              upcoming.map((a) => (
                <div key={a.id}>
                  <p className="text-[12.5px] font-semibold text-brand">
                    {formatDayMonth(a.date)}
                    {a.startTime ? ` · ${a.startTime}` : ''}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{a.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          <DialogHeader className="space-y-0 border-b px-5 py-4 text-left">
            <DialogTitle className="font-heading text-lg font-bold tracking-[-.01em]">
              {t('page.calendar.modalTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px]">{monthTitle}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-6 p-5">
            {/* Calendar grid + month nav */}
            <div className="min-w-[260px] flex-1">
              <div className="mb-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-[3px]"
                  aria-label={t('page.calendar.prevMonth')}
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                  {monthTitle}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-[3px]"
                  aria-label={t('page.calendar.nextMonth')}
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-1.5 grid grid-cols-7 gap-1">
                {weekdays.map((wd, i) => (
                  <span
                    key={i}
                    className="text-center font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-muted-foreground"
                  >
                    {wd}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {modalGrid.map((cell) => {
                  if (cell.muted || !cell.iso) {
                    return (
                      <div
                        key={cell.key}
                        className="flex aspect-square items-center justify-center rounded-[3px] border border-[#1B2A49]/25 bg-[#1B2A49]/15 font-mono text-xs font-semibold text-[#1B2A49]"
                      >
                        {cell.day}
                      </div>
                    );
                  }
                  const iso = cell.iso;
                  const hasAppt = byDate.has(iso);
                  const isToday = iso === today;
                  const isSelected = iso === selectedDate;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => selectDay(iso)}
                      className={`relative flex aspect-square items-center justify-center rounded-[3px] border font-mono text-xs font-semibold transition-colors hover:bg-muted ${
                        isSelected
                          ? 'border-primary ring-1 ring-primary'
                          : isToday
                            ? 'border-brand'
                            : 'border-border'
                      } ${hasAppt ? 'bg-brand/10 text-foreground' : 'bg-card text-foreground'}`}
                    >
                      {cell.day}
                      {hasAppt && (
                        <span className="absolute -right-1 -top-1">
                          <ApptMarker />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form + list */}
            <div className="flex w-full flex-col gap-4 sm:w-[230px]">
              <div className="flex flex-col gap-2.5">
                <SectionLabel className="text-[11px] tracking-[.08em] text-brand">
                  {t('page.calendar.appointmentOn', { date: formatDayMonth(selectedDate) })}
                </SectionLabel>

                <label className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
                  {t('page.calendar.time')}
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="rounded-[3px] border border-border bg-background p-2 text-[13.5px] text-foreground"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
                  {t('page.calendar.note')}
                  <textarea
                    rows={4}
                    value={formNote}
                    maxLength={500}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder={t('page.calendar.notePlaceholder')}
                    className="resize-y rounded-[3px] border border-border bg-background p-2 text-[13px] leading-relaxed text-foreground"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formRemind}
                    onChange={() => setFormRemind((v) => !v)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  {t('page.calendar.emailReminder')}
                </label>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!formNote.trim() || isSaving}
                  className="rounded-[3px] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingId ? t('page.calendar.update') : t('page.calendar.save')}
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-t pt-3">
                <SectionLabel className="text-[10px] tracking-[.1em] text-muted-foreground">
                  {t('page.calendar.allAppointments')}
                </SectionLabel>
                {appointments.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">{t('page.calendar.empty')}</p>
                ) : (
                  appointments.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => editAppointment(a)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-[12.5px] font-semibold text-foreground">
                          {formatDayMonth(a.date)}
                          {a.startTime ? ` · ${a.startTime}` : ''}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {a.note}
                        </p>
                        {a.emailReminder && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand">
                            <Mail className="h-3 w-3" />
                            {t('page.calendar.emailReminderActive')}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        aria-label={t('page.calendar.deleteAria', { name: a.note })}
                        className="flex-none text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tiny Applo-head marker (with antennas) on days that have an appointment.
 *  The viewBox reserves space above the head (negative y) for the two
 *  antennas, mirroring the full mascot in applo-rig.tsx. */
function ApptMarker() {
  return (
    <span className="block h-[18px] w-[18px] drop-shadow-sm">
      <svg viewBox="0 -6 48 48" width="18" height="18" aria-hidden>
        {/* Antennas — short + close to the head, scaled from the real mascot's
            proportions (ball ~26% of head height up, ~43% of half-width out). */}
        <path d="M21 10 Q18.5 4 16 1" fill="none" stroke="#15233f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="0.5" r="2.6" fill="#15233f" />
        <path d="M27 10 Q29.5 4 32 1" fill="none" stroke="#15233f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="0.5" r="2.6" fill="#15233f" />
        {/* Head + inset screen face — rounder, matching the full mascot */}
        <rect x="5" y="8" width="38" height="32" rx="11" fill="#15233f" />
        <rect x="11" y="14" width="26" height="19" rx="6" fill="#eef3fb" />
        {/* Cheeks */}
        <ellipse cx="16.5" cy="27" rx="2" ry="1.3" fill="#40639C" opacity="0.2" />
        <ellipse cx="31.5" cy="27" rx="2" ry="1.3" fill="#40639C" opacity="0.2" />
        {/* Eyes — vertical ellipses with a highlight, like the mascot */}
        <ellipse cx="19.5" cy="22" rx="2.1" ry="2.7" fill="#15233f" />
        <ellipse cx="28.5" cy="22" rx="2.1" ry="2.7" fill="#15233f" />
        <circle cx="20.3" cy="20.9" r="0.85" fill="#fff" />
        <circle cx="29.3" cy="20.9" r="0.85" fill="#fff" />
        {/* Gentle smile */}
        <path d="M19.5 27.5 Q24 31 28.5 27.5" fill="none" stroke="#15233f" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}
