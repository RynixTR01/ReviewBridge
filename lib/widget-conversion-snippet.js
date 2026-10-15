import { widgetExperimentStorageKey } from "./widget-experiments.js";

const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{12,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildWidgetConversionSnippet({ token, widgetId, experimentId, appUrl }) {
  if (!TOKEN_PATTERN.test(String(token || "")) || !UUID_PATTERN.test(String(widgetId || "")) || !UUID_PATTERN.test(String(experimentId || ""))) {
    throw new Error("A valid widget and experiment are required.");
  }
  const origin = new URL(appUrl || "https://review-bridge.vercel.app").origin;
  return `(function(){
  var token=${JSON.stringify(token)};
  var experimentId=${JSON.stringify(experimentId)};
  var key=${JSON.stringify(widgetExperimentStorageKey(token, experimentId))};
  var variant;
  try{variant=localStorage.getItem(key);}catch(_error){return;}
  if(variant!=='A'&&variant!=='B')return;
  var url=${JSON.stringify(origin)}+'/api/widget-events/'+encodeURIComponent(token);
  var body=JSON.stringify({event:'goal',variant:variant,experimentId:experimentId});
  try{if(!navigator.sendBeacon||!navigator.sendBeacon(url,new Blob([body],{type:'text/plain;charset=UTF-8'}))){fetch(url,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:body}).catch(function(){});}}catch(_error){}
})();`;
}
