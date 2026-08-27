export const HUNGARIAN_TIME_ZONE = 'Europe/Budapest';

const hungarianDateFormatter = new Intl.DateTimeFormat('hu-HU', {
  dateStyle: 'medium',
  timeZone: HUNGARIAN_TIME_ZONE,
});

const hungarianDateTimeFormatter = new Intl.DateTimeFormat('hu-HU', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: HUNGARIAN_TIME_ZONE,
});

const hungarianMonthDayFormatter = new Intl.DateTimeFormat('hu-HU', {
  month: 'short',
  day: 'numeric',
  timeZone: HUNGARIAN_TIME_ZONE,
});

const hungarianDatePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: HUNGARIAN_TIME_ZONE,
});

export function formatHungarianDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return hungarianDateFormatter.format(new Date(value));
}

export function formatHungarianDateTime(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return hungarianDateTimeFormatter.format(new Date(value));
}

export function formatHungarianMonthDay(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return hungarianMonthDayFormatter.format(new Date(value));
}

export function getHungarianDateKey(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = hungarianDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('A magyar dátumkulcs nem állítható elő.');
  }

  return `${year}-${month}-${day}`;
}
