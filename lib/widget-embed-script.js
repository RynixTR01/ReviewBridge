export function buildWidgetEmbedScript({
  token,
  widgetId,
  wrapperBackground,
  wrapperPadding,
  textColor,
  fontFamily,
  widgetLocale,
  htmlByLocale,
  layout = "list",
}) {
  const isFloating = layout === "floating";
  const wrapperStyle = [
    "box-sizing:border-box",
    `background:${wrapperBackground}`,
    `color:${textColor}`,
    `font-family:${fontFamily}`,
    isFloating
      ? "position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;width:min(400px,calc(100vw - 24px));max-width:400px;max-height:60vh;overflow:auto;margin:0;padding:14px;border-radius:16px;box-shadow:0 12px 40px rgba(15,23,42,.24)"
      : `width:100%;max-width:720px;margin:0 auto;padding:${wrapperPadding};border-radius:16px`,
  ].join(";");

  return `(function(){
  var token=${JSON.stringify(token)};
  var id=${JSON.stringify(widgetId)};
  var layout=${JSON.stringify(layout)};
  var current=document.currentScript;
  var target=layout==='floating'?(document.body||document.documentElement):(document.getElementById('reviewbridge-embed')||(current&&current.parentNode)||document.body);
  if(document.getElementById(id))return;
  var wrapper=document.createElement('div');
  wrapper.id=id;
  wrapper.setAttribute('role','region');
  wrapper.setAttribute('aria-label','Customer reviews');
  wrapper.style.cssText=${JSON.stringify(wrapperStyle)};
  if(layout==='floating')wrapper.className='rb-floating-widget';
  wrapper.innerHTML=${JSON.stringify(htmlByLocale.en)};
  var style=document.createElement('style');
  style.textContent='#'+id+' .rb-rating-summary{width:max-content;margin:0 auto 14px;border-radius:999px;background:#fffbeb;color:#92400e;padding:8px 14px;font:600 14px '+${JSON.stringify(fontFamily)}+'}#'+id+' .rb-layout-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#'+id+' .rb-layout-list{display:grid;grid-template-columns:1fr;gap:12px}#'+id+' .rb-layout-masonry{columns:2;column-gap:12px}#'+id+' .rb-layout-masonry .rb-card{break-inside:avoid;margin:0 0 12px}#'+id+' .rb-layout-carousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}#'+id+' .rb-layout-carousel .rb-card{flex:0 0 min(85%,380px);scroll-snap-align:start}#'+id+' .rb-layout-floating{display:block}#'+id+' .rb-layout-floating .rb-card:not(:first-child){display:none!important}#'+id+' .rb-layout-floating .rb-review-body{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}#'+id+' .rb-floating-dismiss{position:absolute;top:8px;right:8px;display:flex;width:28px;height:28px;align-items:center;justify-content:center;border:1px solid rgba(15,23,42,.12);border-radius:999px;background:rgba(255,255,255,.92);color:#334155;font:20px/1 system-ui,sans-serif;cursor:pointer}#'+id+' .rb-floating-dismiss:focus-visible{outline:3px solid #4f46e5;outline-offset:2px}@media(max-width:520px){#'+id+' .rb-layout-grid{grid-template-columns:1fr}#'+id+' .rb-layout-masonry{columns:1}#'+id+'.rb-floating-widget{right:max(8px,env(safe-area-inset-right));left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));width:auto;max-width:none;max-height:55vh}}@media(prefers-reduced-motion:reduce){#'+id+' *,#'+id+' *::before,#'+id+' *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}#'+id+' .rb-layout-carousel{scroll-snap-type:none}}';
  (document.head||document.documentElement).appendChild(style);
  target.appendChild(wrapper);
  var language=${JSON.stringify(widgetLocale || "auto")}==='auto'?((navigator.language||'en').toLowerCase().startsWith('tr')?'tr':'en'):${JSON.stringify(widgetLocale === "tr" ? "tr" : "en")};
  wrapper.setAttribute('aria-label',language==='tr'?'Müşteri yorumları':'Customer reviews');
  var html=${JSON.stringify(htmlByLocale)};
  wrapper.innerHTML=html[language]||html.en;
  wrapper.querySelectorAll('.rb-date').forEach(function(el){var date=new Date(el.getAttribute('data-date'));if(!Number.isNaN(date.getTime()))el.textContent=date.toLocaleDateString(language==='tr'?'tr-TR':'en-US',{year:'numeric',month:'short',day:'numeric'});});
  var metricUrl=new URL('/api/widget-events/'+token,current&&current.src?current.src:location.href).href;
  var sendMetric=function(event){try{var body=JSON.stringify({event:event});if(navigator.sendBeacon){navigator.sendBeacon(metricUrl,new Blob([body],{type:'text/plain;charset=UTF-8'}));}else{fetch(metricUrl,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:body});}}catch(_error){}};
  sendMetric('view');
  wrapper.addEventListener('click',function(event){var dismiss=event.target.closest('[data-rb-dismiss]');if(dismiss){wrapper.remove();return;}var link=event.target.closest('[data-rb-event]');if(link)sendMetric(link.getAttribute('data-rb-event'));});
})();`;
}
