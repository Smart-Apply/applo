import { format, formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { de, enUS } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { getActiveLocale } from './i18n-runtime';

/** Per-UI-language date formatting conventions. */
const DATE_LOCALE_CONFIG = {
  de: {
    dateFns: de as DateFnsLocale,
    dateTime: 'dd.MM.yyyy HH:mm',
    date: 'dd.MM.yyyy',
    dayMonthTime: "dd. MMM 'um' HH:mm",
    tooltip: 'dd. MMMM yyyy, HH:mm:ss',
    time: 'HH:mm',
    todayAt: (time: string) => `Heute um ${time}`,
    yesterdayAt: (time: string) => `Gestern um ${time}`,
  },
  en: {
    dateFns: enUS as DateFnsLocale,
    dateTime: 'MM/dd/yyyy h:mm a',
    date: 'MM/dd/yyyy',
    dayMonthTime: "MMM dd 'at' h:mm a",
    tooltip: 'MMMM dd, yyyy, h:mm:ss a',
    time: 'h:mm a',
    todayAt: (time: string) => `Today at ${time}`,
    yesterdayAt: (time: string) => `Yesterday at ${time}`,
  },
} as const;

function dateConfig() {
  return DATE_LOCALE_CONFIG[getActiveLocale()];
}

/**
 * Formats a date string or Date object in the active UI language with
 * timezone awareness.
 * @param date - Date string (UTC) or Date object to format
 * @param formatStr - Optional date-fns format string (defaults to the
 *   locale's date-time convention)
 * @returns Formatted date string in user's timezone
 */
export function formatDate(date: string | Date, formatStr?: string): string {
  const config = dateConfig();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zonedDate = toZonedTime(new Date(date), userTimezone);
  return format(zonedDate, formatStr ?? config.dateTime, { locale: config.dateFns });
}

/**
 * Formats a date as relative time (e.g., "vor 2 Stunden" / "2 hours ago")
 * @param date - Date string (UTC) or Date object to format
 * @returns Relative time string in the active UI language
 */
export function formatRelativeTime(date: string | Date): string {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zonedDate = toZonedTime(new Date(date), userTimezone);
  return formatDistanceToNow(zonedDate, { addSuffix: true, locale: dateConfig().dateFns });
}

/**
 * Smart date formatting with progressive granularity:
 * - < 1 hour: "vor 5 Minuten" / "5 minutes ago"
 * - Today: "Heute um 14:30" / "Today at 2:30 PM"
 * - Yesterday: "Gestern um 14:30" / "Yesterday at 2:30 PM"
 * - This year: "15. Jan um 14:30" / "Jan 15 at 2:30 PM"
 * - Older: "15.01.2023" / "01/15/2023"
 *
 * @param date - Date string (UTC) or Date object to format
 * @returns Smart formatted string in the active UI language
 */
export function formatDateSmart(date: string | Date): string {
  const config = dateConfig();
  const targetDate = new Date(date);
  const now = new Date();
  
  // Less than 1 hour: relative time (e.g., "vor 5 Minuten" / "5 minutes ago")
  const diffHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
  if (diffHours < 1 && diffHours >= 0) {
    return formatRelativeTime(date);
  }
  
  // Convert to user's timezone for accurate day comparisons
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zonedDate = toZonedTime(targetDate, userTimezone);
  const zonedNow = toZonedTime(now, userTimezone);
  
  // Manual today/yesterday check to ensure timezone-aware comparison
  const targetDay = zonedDate.getDate();
  const targetMonth = zonedDate.getMonth();
  const targetYear = zonedDate.getFullYear();
  const nowDay = zonedNow.getDate();
  const nowMonth = zonedNow.getMonth();
  const nowYear = zonedNow.getFullYear();
  
  if (targetYear === nowYear && targetMonth === nowMonth && targetDay === nowDay) {
    return config.todayAt(format(zonedDate, config.time, { locale: config.dateFns }));
  }
  
  // Calculate yesterday using timezone-aware dates for DST/boundary safety
  const yesterdayMs = zonedNow.getTime() - (24 * 60 * 60 * 1000);
  const yesterdayDate = toZonedTime(new Date(yesterdayMs), userTimezone);
  if (targetYear === yesterdayDate.getFullYear() && 
      targetMonth === yesterdayDate.getMonth() && 
      targetDay === yesterdayDate.getDate()) {
    return config.yesterdayAt(format(zonedDate, config.time, { locale: config.dateFns }));
  }
  
  // This year: "15. Jan um 14:30" / "Jan 15 at 2:30 PM"
  if (targetYear === nowYear) {
    return format(zonedDate, config.dayMonthTime, { locale: config.dateFns });
  }
  
  // Older: "15.01.2023" / "01/15/2023"
  return format(zonedDate, config.date, { locale: config.dateFns });
}

/**
 * Formats a date with full timestamp for tooltips and detailed displays
 * @param date - Date string (UTC) or Date object to format
 * @returns Full timestamp in the active UI language
 */
export function formatDateFull(date: string | Date): string {
  return formatDate(date);
}

/**
 * Formats a date for display with full timestamp including time
 * Backwards compatible wrapper for formatDateFull
 * @param date - Date string (UTC) or Date object to format
 * @returns Full timestamp in the active UI language
 */
export function formatFullTimestamp(date: string | Date): string {
  return formatDateFull(date);
}

/**
 * Formats a date for tooltips with detailed timestamp
 * @param date - Date string (UTC) or Date object to format
 * @returns Full timestamp with seconds for tooltips
 */
export function formatTooltipTimestamp(date: string | Date): string {
  return formatDate(date, dateConfig().tooltip);
}

/**
 * Formats a date for short display (just date, no time)
 * @param date - Date string (UTC) or Date object to format
 * @returns Short date string in the active UI language
 */
export function formatShortDate(date: string | Date): string {
  return formatDate(date, dateConfig().date);
}
