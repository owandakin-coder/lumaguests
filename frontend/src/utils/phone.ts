export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-\(\)\.]/g, '');
  if (p.startsWith('+972')) p = '0' + p.slice(4);
  else if (p.startsWith('972') && p.length >= 12) p = '0' + p.slice(3);
  // 9-digit Israeli number missing leading 0 (e.g. 501234567 → 0501234567)
  else if (/^[2-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}
