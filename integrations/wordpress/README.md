# ReviewBridge WordPress shortcode

Install `reviewbridge.php` as a single-file plugin, activate it, and add this shortcode to a page or post:

```text
[reviewbridge token="WIDGET_TOKEN"]
```

Copy `WIDGET_TOKEN` from the widget's embed URL in the ReviewBridge dashboard (`/api/widget/` followed by 32 hexadecimal characters). The plugin loads the widget at the shortcode's location. The floating layout follows its fixed-position setting. Keep the allowed-domain setting in ReviewBridge aligned with the WordPress site's host.

This plugin has not been submitted to the WordPress plugin directory. WordPress installation and theme compatibility still require a smoke test on the target site.
