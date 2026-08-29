/**
 * Central Date & Timestamp Utilities
 * Safely handles strings, ISO dates, timestamps (ms), Date objects,
 * and Firestore Timestamps ({ seconds, nanoseconds } or toDate() method).
 */

export function toDateSafe(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object') {
    // Firestore Timestamp with toDate()
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch {
        // ignore
      }
    }
    // Deserialized Firestore Timestamp object { seconds, nanoseconds }
    if (typeof val.seconds === 'number') {
      const ms = val.seconds * 1000 + (typeof val.nanoseconds === 'number' ? Math.floor(val.nanoseconds / 1000000) : 0);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    // Alternate format { _seconds, _nanoseconds }
    if (typeof val._seconds === 'number') {
      const ms = val._seconds * 1000 + (typeof val._nanoseconds === 'number' ? Math.floor(val._nanoseconds / 1000000) : 0);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function formatTimestamp(val: any, fallback = 'Just now'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const d = toDateSafe(val);
  if (d) {
    return d.toLocaleString();
  }
  if (typeof val === 'string') return val;
  return fallback;
}

export function formatDateSafe(val: any, fallback = 'N/A'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const d = toDateSafe(val);
  if (d) {
    return d.toLocaleDateString();
  }
  if (typeof val === 'string') return val;
  return fallback;
}

export function formatTimeSafe(val: any, fallback = '--:--'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const d = toDateSafe(val);
  if (d) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof val === 'string') return val;
  return fallback;
}
