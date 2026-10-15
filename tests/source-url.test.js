import test from "node:test";
import assert from "node:assert/strict";
import { extractPlaceId, isGoogleMapsUrl } from "../app/lib/extractPlaceId.js";
import { buildGoogleMapsActorInput } from "../app/lib/apify.js";
import { isGoogleMapsShortUrl, resolveGoogleMapsShortUrl } from "../app/lib/googleMapsShortUrl.js";
import { extractTrustpilotDomain } from "../app/lib/trustpilot.js";

test("Google Maps source parser accepts Maps place links and rejects general Google searches", () => {
  const mapsUrl = "https://www.google.com/maps/place/Shop/@38.46,27.10/data=!3m1!1e3!4m8!3m7!1s0x14bbd9d06e5197c1:0x6ba191251552411e!8m2!3d38.46!4d27.10!16s/g/11bv6psxb7";
  assert.equal(isGoogleMapsUrl(mapsUrl), true);
  assert.equal(extractPlaceId(mapsUrl), "0x14bbd9d06e5197c1:0x6ba191251552411e");
  assert.equal(isGoogleMapsUrl("https://www.google.com/search?q=restaurant+reviews"), false);
  assert.equal(extractPlaceId("https://www.google.com/search?q=restaurant+reviews"), null);
});

test("Google Maps short share links resolve to an allowed Maps listing URL", async () => {
  const shortUrl = "https://maps.app.goo.gl/ipj9aHNcB55RUx5g9";
  const mapsUrl = "https://www.google.com/maps/place/%C3%87orbac%C4%B1+Mehmet+Efendi/@38.4670582,27.0982121,682m/data=!3m1!1e3!4m8!3m7!1s0x14bbd9d06e5197c1:0x6ba191251552411e!8m2!3d38.4670582!4d27.100787!9m1!1b1!16s%2Fg%2F11bv6psxb7";
  const calls = [];

  assert.equal(isGoogleMapsShortUrl(shortUrl), true);
  assert.equal(isGoogleMapsShortUrl("https://maps.app.goo.gl.evil.example/abc"), false);

  const resolvedUrl = await resolveGoogleMapsShortUrl(shortUrl, async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 302, headers: { location: mapsUrl } });
  });

  assert.equal(resolvedUrl, mapsUrl);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(isGoogleMapsUrl(resolvedUrl), true);
  assert.equal(extractPlaceId(resolvedUrl), "0x14bbd9d06e5197c1:0x6ba191251552411e");
  assert.deepEqual(buildGoogleMapsActorInput(extractPlaceId(resolvedUrl), resolvedUrl), {
    startUrls: [{ url: resolvedUrl }],
  });
});

test("Google Maps short-link resolver rejects redirects away from Google", async () => {
  await assert.rejects(
    resolveGoogleMapsShortUrl("https://maps.app.goo.gl/ipj9aHNcB55RUx5g9", async () =>
      new Response(null, { status: 302, headers: { location: "https://example.com/maps/place/store" } }),
    ),
    /redirected outside Google Maps/,
  );
});

test("Trustpilot parser accepts company profile URLs and rejects lookalike hosts", () => {
  assert.equal(extractTrustpilotDomain("apple.com"), "apple.com");
  assert.equal(extractTrustpilotDomain("trustpilot.com/review/example.co.uk?utm_source=test"), "example.co.uk");
  assert.equal(extractTrustpilotDomain("https://eviltrustpilot.com/review/example.com"), null);
  assert.equal(extractTrustpilotDomain("not a domain"), null);
});
