export function safeAuthNextPath(value) {
  const path = String(value || "");
  return /^\/(?:dashboard\/brands\/accept|join\/brand)\/[a-f0-9]{48}$/.test(path) ? path : "/dashboard";
}
