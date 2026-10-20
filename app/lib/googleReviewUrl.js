import { extractPlaceId } from "./extractPlaceId.js";

const PLACE_ID = /^(?:ChIJ|GhIJ)[A-Za-z0-9_-]+$/;
const HEX_FEATURE_ID = /^0x[0-9a-f]+:0x[0-9a-f]+$/i;

export function buildGoogleReviewUrl(value) {
  const placeId = extractPlaceId(value);
  if (!placeId) return null;

  if (HEX_FEATURE_ID.test(placeId)) {
    // Google Maps FIDs/CIDs are not Places API Place IDs. Use Maps' review action URL.
    return `https://www.google.com/maps/place//data=!4m3!3m2!1s${placeId}!12e1`;
  }

  if (PLACE_ID.test(placeId)) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  return null;
}
