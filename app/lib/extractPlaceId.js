export function extractPlaceId(input) {
  if (!input) return null;
  
  input = input.trim();
  
  // Already a clean Place ID or Trustpilot URL
  if (!input.includes('google.com/maps')) {
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
