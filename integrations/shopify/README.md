# Shopify Custom Liquid install

1. Copy `reviewbridge.liquid` into a Shopify theme editor's **Custom Liquid** block, or copy its contents into a theme snippet.
2. Replace `WIDGET_TOKEN` with the 32-character embed token shown in ReviewBridge.
3. Save the theme, then add the storefront's host (for example, `shop.example.com`) to that widget's allowed domains.
4. Open the published page in a private browser window and confirm the reviews load.

This is a theme-code install, not a Shopify App Store application. It does not request Shopify account access or change the store's data. A native app still requires a Shopify Partner account, OAuth app registration, review, and store-level testing.
