# Trustpilot source setup

ReviewBridge currently collects Trustpilot reviews through the configured Apify Trustpilot actor. The actor and its input adapter are defined in `app/lib/apify.js`.

> **Access and permission check required:** Trustpilot's [consumer terms effective 1 October 2026](https://corporate.trustpilot.com/legal/for-reviewers/terms-of-use-for-consumers/oct-2026) prohibit automated collection and web scraping without express permission. Apify's [Actor Terms](https://docs.apify.com/legal/actor-terms-and-conditions) also require compliance with the relevant third-party terms and rights. Do not treat this connector as authorized until the account owner has verified written permission or a suitable official API agreement with qualified legal review.

## Add a source

1. Open the company's Trustpilot profile, such as `https://www.trustpilot.com/review/example.com`.
2. Add the profile link from ReviewBridge's dashboard. A general search URL is not a supported source.
3. Check that the company domain and name shown in the dashboard are correct before publishing its widget.
4. If the source reports an error, check the latest sync history and retry after fixing the profile URL or provider setup.

## Production configuration

Set `APIFY_API_TOKEN`, `APIFY_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET` in the Vercel Production environment. The callback URL must be publicly reachable over HTTPS. Redeploy after changing environment values.

## Troubleshooting

- **No reviews appear:** confirm the URL is a Trustpilot company review profile and inspect the latest Apify run.
- **The sync stays pending:** confirm the signed callback can reach the production URL; inspect Vercel function logs and Apify run status.
- **The sync fails repeatedly:** check the profile URL, actor output, and Apify account limits. Automatic retries are bounded.

ReviewBridge displays source attribution and the last-sync time. This is technical setup guidance, not a legal determination that a provider's terms permit a particular use.

