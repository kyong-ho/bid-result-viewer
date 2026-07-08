export function formatAmount(value: number | null): string {
  return value == null ? "-" : value.toLocaleString("ko-KR");
}

/** "2026-01-08 15:34:16" → "2026-01-08 15:34" */
export function formatDateTime(value: string): string {
  const trimmed = value.trim();
  return trimmed === "" ? "-" : trimmed.slice(0, 16);
}

export function formatRate(value: number | null): string {
  return value == null ? "-" : String(value);
}

export function textOrDash(value: string): string {
  const trimmed = value.trim();
  return trimmed === "" ? "-" : trimmed;
}
