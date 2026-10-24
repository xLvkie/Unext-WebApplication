export function toDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const year = Number(value[0]);
    const month = Number(value[1]);
    const day = Number(value[2]);
    const hour = Number(value[3] ?? 0);
    const minute = Number(value[4] ?? 0);
    const second = Number(value[5] ?? 0);
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return null;
}

export function formatMoney(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSalaryRange(min?: number | null, max?: number | null): string {
  const from = formatMoney(min);
  const to = formatMoney(max);
  if (from && to) {
    return `${from} – ${to}`;
  }
  if (from) {
    return `Desde ${from}`;
  }
  if (to) {
    return `Hasta ${to}`;
  }
  return 'Salario no publicado';
}

export function formatPosted(value: unknown): string {
  const date = toDate(value);
  if (!date) {
    return 'Fecha no disponible';
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) {
    return 'Publicado hoy';
  }
  if (diff === 1) {
    return 'Publicado ayer';
  }
  if (diff < 30) {
    return `Publicado hace ${diff} días`;
  }
  return `Publicado el ${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function formatClock(value: unknown): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLabel(value: unknown): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) {
    return 'Hoy';
  }
  if (diff === 1) {
    return 'Ayer';
  }
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return letters || '?';
}
