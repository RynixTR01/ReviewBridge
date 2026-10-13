export function buildWidgetEmbedScript({
  token,
  widgetId,
  wrapperBackground,
  wrapperPadding,
  textColor,
  fontFamily,
  widgetLocale,
  htmlByLocale,
}) {
  return `(function(){
  var token=${JSON.stringify(token)};
  var id=${JSON.stringify(widgetId)};
  var current=document.currentScript;
  var target=document.getElementById('reviewbridge-embed')||(current&&current.parentNode)||document.body;
  if(document.getElementById(id))return;
  var wrapper=document.createElement('div');
  wrapper.id=id;
  wrapper.setAttribute('role','region');
  wrapper.setAttribute('aria-label','Customer reviews');
  wrapper.style.cssText=${JSON.stringify(`width:100%;max-width:720px;margin:0 auto;background:${wrapperBackground};border-radius:16px;padding:${wrapperPadding};box-sizing:border-box;color:${textColor};font-family:${fontFamily}`)};
  wrapper.innerHTML=${JSON.stringify(htmlByLocale.en)};
  var style=document.createElement('style');
  style.textContent='#'+id+' .rb-rating-summary{width:max-content;margin:0 auto 14px;border-radius:999px;background:#fffbeb;color:#92400e;padding:8px 14px;font:600 14px '+${JSON.stringify(fontFamily)}+'}#'+id+' .rb-layout-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#'+id+' .rb-layout-list{display:grid;grid-template-columns:1fr;gap:12px}#'+id+' .rb-layout-masonry{columns:2;column-gap:12px}#'+id+' .rb-layout-masonry .rb-card{break-inside:avoid;margin:0 0 12px}#'+id+' .rb-layout-carousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}#'+id+' .rb-layout-carousel .rb-card{flex:0 0 min(85%,380px);scroll-snap-align:start}@media(max-width:520px){#'+id+' .rb-layout-grid{grid-template-columns:1fr}#'+id+' .rb-layout-masonry{columns:1}}@media(prefers-reduced-motion:reduce){#'+id+' *,#'+id+' *::before,#'+id+' *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}#'+id+' .rb-layout-carousel{scroll-snap-type:none}}';
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
  wrapper.addEventListener('click',function(event){var link=event.target.closest('[data-rb-event]');if(link)sendMetric(link.getAttribute('data-rb-event'));});
})();`;
}

