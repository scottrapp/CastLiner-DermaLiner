export const c = {
  bg: "#141b23",
  card: "#1f2a36",
  line: "#2e3b49",
  text: "#eef2f6",
  soft: "#9fb0c0",
  accent: "#63d5ea",
  ok: "#23874d",
  high: "#c8213a",
  low: "#2477ba",
  none: "#4b5a69",
};

export const LOCATIONS = [
  "Short arm cast - left", "Short arm cast - right", "Long arm cast - left", "Long arm cast - right",
  "Short leg cast - left", "Short leg cast - right", "Long leg cast - left", "Long leg cast - right",
  "Sacrum", "Occiput", "Heel - left", "Heel - right", "Other",
];

export function statusColor(v: number | null, th?: { min: number; max: number }) {
  if (v == null) return c.none;
  const t = th ?? { min: 0, max: 30 };
  return v > t.max ? c.high : v < t.min ? c.low : c.ok;
}
