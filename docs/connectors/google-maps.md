# Google Maps source setup

ReviewBridge currently collects Google Maps reviews through the configured Apify Google Maps actor. The actor and its input adapter are defined in `app/lib/apify.js`.

## Add a source

1. Open the Google Maps business profile itself, not a general Google search results URL.
2. Copy the Maps place link and add it from ReviewBridge's dashboard.
3. Confirm the business name and place shown by the dashboard before publishing its widget.
4. If the source reports an error, check the source link and the latest sync history. Retry after correcting the URL or provider configuration.

## Production configuration

Set `APIFY_API_TOKEN`, `APIFY_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET` in the Vercel Production environment. The callback URL must be publicly reachable over HTTPS. Redeploy after changing environment values.

## Troubleshooting

- **The source was added but no reviews appear:** open the latest sync history. A successful run with zero items may mean the wrong link was supplied or the actor could not read the business profile.
- **The sync stays pending:** the signed Apify callback may not reach the production URL. Check the callback URL and Vercel function logs; stale runs are cleaned up by the daily cron.
- **The sync fails repeatedly:** check the Apify run, input, and account limits. Automatic retries are bounded and do not replace fixing an invalid link or provider configuration.

ReviewBridge displays the source attribution and a last-sync timestamp. This guide describes the technical connector; it is not a legal determination that a provider's terms permit a particular use.
