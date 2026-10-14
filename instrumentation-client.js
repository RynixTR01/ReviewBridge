import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/collect/*", method: "POST", advancedOptions: { checkLevel: "basic" } },
    { path: "/survey/*", method: "POST", advancedOptions: { checkLevel: "basic" } },
  ],
});
