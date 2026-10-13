import test from "node:test";
import assert from "node:assert/strict";
import { extractPlaceId, isGoogleMapsUrl } from "../app/lib/extractPlaceId.js";
import { extractTrustpilotDomain } from "../app/lib/trustpilot.js";

test("Google Maps source parser accepts Maps place links and rejects general Google searches", () => {
  const mapsUrl = "https://www.google.com/maps/place/Shop/@38.46,27.10/data=!3m1!1e3!4m8!3m7!1s0x14bbd9d06e5197c1:0x6ba191251552411e!8m2!3d38.46!4d27.10!16s/g/11bv6psxb7";
  assert.equal(isGoogleMapsUrl(mapsUrl), true);
  assert.equal(extractPlaceId(mapsUrl), "0x14bbd9d06e5197c1:0x6ba191251552411e");
  assert.equal(isGoogleMapsUrl("https://www.google.com/search?q=restaurant+reviews"), false);
  assert.equal(extractPlaceId("https://www.google.com/search?q=restaurant+reviews"), null);
});

test("Trustpilot parser accepts company profile URLs and rejects lookalike hosts", () => {
  assert.equal(extractTrustpilotDomain("apple.com"), "apple.com");
  assert.equal(extractTrustpilotDomain("trustpilot.com/review/example.co.uk?utm_source=test"), "example.co.uk");
  assert.equal(extractTrustpilotDomain("https://eviltrustpilot.com/review/example.com"), null);
  assert.equal(extractTrustpilotDomain("not a domain"), null);
});
