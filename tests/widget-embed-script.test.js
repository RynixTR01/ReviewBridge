import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildWidgetEmbedScript } from "../lib/widget-embed-script.js";

test("floating embed builds a valid dismissible, mobile-safe fixed review banner", () => {
  const script = buildWidgetEmbedScript({
    token: "safe-widget-token",
    widgetId: "reviewbridge-embed-safe-widget-token",
    wrapperBackground: "#ffffff",
    wrapperPadding: "20px",
    textColor: "#111827",
    fontFamily: "system-ui,sans-serif",
    widgetLocale: "auto",
    layout: "floating",
    htmlByLocale: {
      en: '<button type="button" data-rb-dismiss aria-label="Dismiss review banner">×</button>',
      tr: '<button type="button" data-rb-dismiss aria-label="Yorum bandını kapat">×</button>',
    },
  });

  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /position:fixed/);
  assert.match(script, /safe-area-inset/);
  assert.match(script, /data-rb-dismiss/);
  assert.match(script, /wrapper\.remove\(\)/);
});
