export function isHoneypotFilled(formData) {
  return String(formData?.get("website") || "").trim().length > 0;
}
