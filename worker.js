/* Optional Cloudflare Worker for the Routes 91 and 6 PWA.
   Bind ALLOWED_ORIGIN to your HTTPS site's origin, e.g. https://example.pages.dev
   Secrets TFL_KEY and TOMTOM_KEY are optional. */
export default {
 async fetch(req,env){
  const origin=req.headers.get('Origin')||'';
  const allowed=env.ALLOWED_ORIGIN||'';
  const cors={
   'access-control-allow-origin':allowed||'*',
   'access-control-allow-methods':'GET, OPTIONS',
   'access-control-allow-headers':'Content-Type',
   'vary':'Origin'
  };
  if(allowed&&origin&&origin!==allowed)return new Response('Origin not allowed',{status:403});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:cors});
  const u=new URL(req.url),m=u.pathname.match(/^\/(tfl|bt|traffic)(\/.*)$/);
  if(!m)return new Response('Not found',{status:404,headers:cors});
  try{
   if(m[1]==='traffic'){
    if(!env.TOMTOM_KEY)return new Response(JSON.stringify({error:'TomTom traffic key not configured'}),{status:503,headers:{...cors,'content-type':'application/json'}});
    const f=u.searchParams.get('from'),t=u.searchParams.get('to');
    if(!/^-?\d{1,2}\.\d+,-?\d{1,3}\.\d+$/.test(f||'')||! /-?\d{1,2}\.\d+,-?\d{1,3}\.\d+/.test(t||''))return new Response('Invalid route',{status:400,headers:cors});
    const target='https://api.tomtom.com/routing/1/calculateRoute/'+encodeURIComponent(f)+':'+encodeURIComponent(t)+'/json?traffic=true&key='+encodeURIComponent(env.TOMTOM_KEY);
    const r=await fetch(target,{headers:{'accept':'application/json'}});
    if(!r.ok)return new Response('Traffic provider unavailable',{status:r.status,headers:cors});
    const j=await r.json(),v=j.routes?.[0]?.summary;
    if(!v||!Number.isFinite(v.trafficDelayInSeconds)||!Number.isFinite(v.travelTimeInSeconds))return new Response('Invalid traffic response',{status:502,headers:cors});
    return new Response(JSON.stringify({trafficDelaySec:v.trafficDelayInSeconds,travelTimeSec:v.travelTimeInSeconds,provider:'TomTom routing · nearby driving segment'}),{headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
   }
   if(m[1]==='tfl'&&env.TFL_KEY)u.searchParams.set('app_key',env.TFL_KEY);
   const dest=(m[1]==='tfl'?'https://api.tfl.gov.uk':'https://bustimes.org')+m[2]+u.search;
   const html=m[1]==='bt'&&/^\/(?:stops\/[^/]+\/departures\/?|vehicles\/[^/]+\/?|trips\/\d+\/block\/?)$/.test(m[2]);
   const r=await fetch(dest,{headers:{accept:html?'text/html':'application/json'}});
   return new Response(r.body,{status:r.status,headers:{...cors,'content-type':r.headers.get('content-type')||(html?'text/html':'application/json'),'cache-control':'no-store'}});
  }catch{return new Response('Upstream unavailable',{status:502,headers:cors})}
 }
};
