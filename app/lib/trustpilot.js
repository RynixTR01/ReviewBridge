/**
 * Extracts a clean company domain from various Trustpilot URL formats.
 *
 * Accepts:
 *   - "apple.com"
 *   - "https://www.trustpilot.com/review/apple.com"
 *   - "trustpilot.com/review/apple.com"
 *
 * Returns: "apple.com" or null if the input can't be parsed.
 */
export function extractTrustpilotDomain(input) {
  if (typeof input !== "string" || !input.trim()) return null;
  const value = input.trim();
  const validDomain = (domain) => /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);

  if (!value.includes("/") && !value.includes("://")) {
    const domain = value.replace(/^www\./i, "").toLowerCase();
    return validDomain(domain) ? domain : null;
  }

  try {
    const url = new URL(value.includes("://") ? value : "https://" + value);
    if (!/(^|\.)trustpilot\.com$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/review\/([^/]+)\/?$/i);
    const domain = match?.[1]?.toLowerCase();
    return domain && validDomain(domain) ? domain : null;
  } catch {
    return null;
  }
}
