// One permission request for the whole world. Sky and weather share the selected location.
let pending = null, provider = null, selected = null;
const listeners = new Set();
export function validLocation(value) {
  return Number.isFinite(value?.latitude) && Math.abs(value.latitude)<=90
    && Number.isFinite(value?.longitude) && Math.abs(value.longitude)<=180;
}
export function publishLocation(value) {
  if (!validLocation(value)) return;
  selected = value;
  for (const listener of listeners) listener(value);
}
export function onLocation(listener) {
  listeners.add(listener);
  if (selected) listener(selected);
  return () => listeners.delete(listener);
}
export function requestBrowserLocation(geolocation = globalThis.navigator?.geolocation) {
  if (globalThis.isSecureContext === false) return Promise.reject({code:'insecure'});
  if (!geolocation) return Promise.reject({code:'unsupported'});
  if (pending && provider === geolocation) return pending;
  provider = geolocation;
  const request = new Promise((resolve,reject) => {
    let settled=false;
    const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);callback(value);};
    // Also bounds a permission prompt left unanswered, which the native timeout may exclude.
    const timer=setTimeout(()=>finish(reject,{code:3}),15000);
    try {
      geolocation.getCurrentPosition(({coords})=>{
        const result={latitude:Math.round(coords.latitude*1000)/1000,longitude:Math.round(coords.longitude*1000)/1000};
        finish(validLocation(result)?resolve:reject,validLocation(result)?result:{code:2});
      },error=>finish(reject,error),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
    } catch { finish(reject,{code:2}); }
  });
  pending=request.finally(()=>{if(provider===geolocation){pending=null;provider=null;}});
  return pending;
}
