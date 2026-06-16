export const AVATAR_PALETTE = [
  ['#FDE68A', '#92400E'],
  ['#BFDBFE', '#1E40AF'],
  ['#DDD6FE', '#5B21B6'],
  ['#A7F3D0', '#065F46'],
  ['#FBCFE8', '#9D174D'],
  ['#FED7AA', '#9A3412'],
] as const;

export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function avatarColors(name: string): readonly [string, string] {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
