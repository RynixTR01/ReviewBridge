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
  if (!input) return null;
  input = input.trim();

  // If it contains trustpilot.com/review/, extract domain after it
  const tpMatch = input.match(/trustpilot\.com\/review\/([^/?#]+)/);
  if (tpMatch) return tpMatch[1];

  // If it looks like a plain domain (has a dot, no spaces, no slashes)
  if (input.includes('.') && !input.includes(' ') && !input.includes('/')) {
    return input.replace(/^https?:\/\//, '').replace(/^www\./, '');
  }

  return null;
}
