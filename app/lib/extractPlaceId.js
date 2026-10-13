export function isGoogleMapsUrl(input) {
  if (typeof input !== "string" || !input.trim()) return false;
  return /^(?:https?:\/\/)?(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps(?:\/|[?#]|$)/i.test(input.trim());
}

export function extractPlaceId(input) {
  if (!input) return null;
  
  input = input.trim();

  const looksLikeUrl = /^(?:https?:\/\/|www\.)/i.test(input) || /^[\w-]+\.[a-z]{2,}(?:\/|$)/i.test(input);
  const isMapsUrl = isGoogleMapsUrl(input);

  // Do not mistake Google Search results (or unrelated URLs) for Place IDs.
  if (looksLikeUrl && !isMapsUrl) return null;
  
  // Already a clean Place ID
  if (!isMapsUrl) {
    return input;
  }
  
  // Try to extract ChIJ format first
  const chijMatch = input.match(/ChIJ[a-zA-Z0-9_-]+/);
  if (chijMatch) return chijMatch[0];
  
  // Try hex format
  const hexMatch = input.match(/!1s([^!]+)!/);
  if (hexMatch) return decodeURIComponent(hexMatch[1]);
  
  return null;
}
