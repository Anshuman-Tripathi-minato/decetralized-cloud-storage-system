function toUtcDate(input) {
  if (!input) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Treat naive backend UTC strings as UTC instead of browser-local time.
    const normalized = /z$|[+-]\d{2}:?\d{2}$/i.test(trimmed) ? trimmed : `${trimmed}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcTimestamp(input, options = {}) {
  const date = toUtcDate(input);
  if (!date) return 'Unknown';

  const formatter = new Intl.DateTimeFormat(options.locale || undefined, {
    year: options.year || 'numeric',
    month: options.month || 'numeric',
    day: options.day || 'numeric',
    hour: options.hour || 'numeric',
    minute: options.minute || '2-digit',
    second: options.second || '2-digit',
    hour12: options.hour12 ?? true,
    timeZone: 'UTC',
    ...(options.formatOptions || {}),
  });

  return formatter.format(date);
}

export function formatUtcDate(input) {
  const date = toUtcDate(input);
  if (!date) return 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
