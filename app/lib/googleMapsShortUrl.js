import { isGoogleMapsUrl } from "./extractPlaceId.js";

const GOOGLE_SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const MAX_REDIRECTS = 5;

function parseGoogleShortUrl(input) {
  if (typeof input !== "string") return null;

  try {
    const url = new URL(input.trim());
    if (
      url.protocol !== "https:" ||
      !GOOGLE_SHORT_HOSTS.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port ||
      (url.hostname.toLowerCase() === "goo.gl" && !url.pathname.startsWith("/maps/")) ||
      url.pathname === "/"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function isAllowedGoogleRedirect(url) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "maps.app.goo.gl" ||
    (hostname === "goo.gl" && url.pathname.startsWith("/maps/")) ||
    /^(?:(?:www|maps)\.)?google\.(?:[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/.test(hostname)
  );
}

export function isGoogleMapsShortUrl(input) {
  return parseGoogleShortUrl(input) !== null;
}

export async function resolveGoogleMapsShortUrl(input, fetchImpl = fetch) {
  let currentUrl = parseGoogleShortUrl(input);
  if (!currentUrl) {
    throw new Error("Unsupported Google Maps short link");
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetchImpl(currentUrl.href, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "text/html" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Google Maps short link did not provide a redirect");

      const nextUrl = new URL(location, currentUrl);
      if (
        nextUrl.protocol !== "https:" ||
        nextUrl.username ||
        nextUrl.password ||
        nextUrl.port ||
        !isAllowedGoogleRedirect(nextUrl)
      ) {
        throw new Error("Google Maps short link redirected outside Google Maps");
      }

      if (isGoogleMapsUrl(nextUrl.href)) return nextUrl.href;
      currentUrl = nextUrl;
      continue;
    }

    if (response.ok && isGoogleMapsUrl(currentUrl.href)) return currentUrl.href;
    throw new Error("Google Maps short link could not be resolved");
  }

  throw new Error("Google Maps short link redirected too many times");
}

