// Open-Meteo conditions for a selected city or a consented device location.
// Automatic refresh is bounded to 30 minutes; an explicit retry bypasses the cache.
// Location failures preserve any existing city and offer a manual alternative.
import { config } from './config.js';
import { requestBrowserLocation, validLocation, publishLocation } from './location.js';

export const WEATHER_CITY = config.weather || null;
export function weatherUrl(location){return 'https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:location.latitude,longitude:location.longitude,timezone:'auto',current:'temperature_2m,weather_code,rain,showers,cloud_cover,wind_speed_10m',timeformat:'unixtime',forecast_days:1,daily:'sunrise,sunset'});}
export const WEATHER_URL = WEATHER_CITY && !WEATHER_CITY.geolocate ? weatherUrl(WEATHER_CITY) : null;
const INTERVAL = 30 * 60 * 1000, MAX_AGE = 6 * 60 * 60 * 1000;
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function weatherCondition(data) {
  const code = data.code;
  const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const thunder = code >= 95, fog = code === 45 || code === 48;
  const rain = !snow && (thunder || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || data.rain > 0);
  const overcast = rain || snow || fog || code === 3 || data.cloud >= 75;
  const kind = thunder ? 'thunder' : snow ? 'snow' : rain ? 'rain' : fog ? 'fog' : overcast ? 'overcast' : 'clear';
  const description = thunder ? ['雷暴', 'Thunderstorm'] : snow ? ['雪', 'Snow'] : rain ? ['雨', 'Rain'] : fog ? ['雾', 'Fog'] : code === 3 ? ['阴', 'Overcast'] : code === 2 ? ['多云', 'Cloudy'] : ['晴', 'Clear'];
  return { kind, rain, snow, thunder, description, overcast, params: weatherParams(data) };
}

// What the weather looks like is a few amounts from 0 to 1: cloud, rain, snow,
// fog, haze, wind and storm. Live data sets them from the cloud cover, the WMO
// code's intensity (drizzle, rain, showers, snow), the rain the model reports
// and the wind; so a drizzle and a downpour, or a few clouds and a grey deck,
// look different. The menu's previews are fixed points in the same space.
const clamp01 = v => Math.max(0, Math.min(1, v));
const FALLING = {
  51: ['rain', .25], 53: ['rain', .35], 55: ['rain', .45], 56: ['rain', .3], 57: ['rain', .45],
  61: ['rain', .45], 63: ['rain', .7], 65: ['rain', 1], 66: ['rain', .5], 67: ['rain', .9],
  80: ['rain', .55], 81: ['rain', .8], 82: ['rain', 1],
  71: ['snow', .4], 73: ['snow', .7], 75: ['snow', 1], 77: ['snow', .35], 85: ['snow', .6], 86: ['snow', 1],
};
export function weatherParams(data) {
  const code = data.code, wind = finite(data.wind) ? data.wind : 12;
  const p = { cloud: clamp01((data.cloud || 0) / 100), rain: 0, snow: 0, fog: 0, haze: 0, wind: clamp01(wind / 40), storm: 0 };
  const [kind, amount] = FALLING[code] || [];
  if (kind) p[kind] = amount;
  if (code >= 95) { p.rain = code === 95 ? .85 : 1; p.storm = 1; }
  if (code === 45 || code === 48) p.fog = 1;
  // Millimetres in the last hour can say more than the code.
  if (data.rain > 0 && !p.snow) p.rain = Math.max(p.rain, clamp01(.3 + data.rain / 6));
  if (p.rain || p.snow || p.fog || code === 3) p.cloud = Math.max(p.cloud, .97);
  else if (code === 2) p.cloud = Math.max(p.cloud, .5);
  return p;
}

export const WEATHER_PRESETS = {
  clear: { cloud: .22, wind: .2 },
  overcast: { cloud: 1, wind: .35 },
  rain: { cloud: 1, rain: .7, wind: .45 },
  fog: { cloud: .9, fog: 1, wind: .05 },
  haze: { cloud: .55, haze: 1, wind: .08 },
  snow: { cloud: 1, snow: .75, wind: .25 },
  thunder: { cloud: 1, rain: 1, storm: 1, wind: .8 },
};

// Words shown for the weather are [Chinese, English] pairs (lang.js t).
const city = WEATHER_CITY?.geolocate?'当前位置':WEATHER_CITY?.city || '', cityEn = WEATHER_CITY?.cityEn || city;
export const WEATHER_LABELS = { auto: city ? [`${city}实时`, `${cityEn}, live`] : ['晴天', 'Clear'], clear: ['晴天', 'Clear'], overcast: ['阴天', 'Overcast'], rain: ['下雨', 'Rain'], fog: ['薄雾', 'Mist'], haze: ['雾霾', 'Haze'], snow: ['下雪', 'Snow'], thunder: ['雷雨', 'Storm'] };
export const TIME_LABELS = { auto: city ? [`${city}时间`, `${cityEn} time`] : ['本地时间', 'Local time'], dawn: ['清晨', 'Dawn'], morning: ['上午', 'Morning'], day: ['白天', 'Day'], dusk: ['黄昏', 'Dusk'], night: ['夜晚', 'Night'] };
const zone = WEATHER_CITY?.timezone ? { timeZone: WEATHER_CITY.timezone } : {};
const cityDate = new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' });
const cityClock = new Intl.DateTimeFormat('en-GB', { ...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// Evaluated once per minute. Solar times move the dawn/dusk boundaries with
// the seasons; offline or old caches fall back to 06:00/18:00 in the city.
export function timeOfDay(date = new Date(), solar = null) {
  const minute = value => { const parts = cityClock.formatToParts(value); return Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value); };
  let sunrise = 360, sunset = 1080;
  if (finite(solar?.sunrise) && finite(solar?.sunset)) {
    const rise = new Date(solar.sunrise * 1000), set = new Date(solar.sunset * 1000);
    if (cityDate.format(rise) === cityDate.format(date) && cityDate.format(set) === cityDate.format(date) && solar.sunset > solar.sunrise) {
      sunrise = minute(rise); sunset = minute(set);
    }
  }
  const now = minute(date);
  return now < sunrise - 45 || now >= sunset + 45 ? 'night' : now < sunrise + 45 ? 'dawn' : now < sunrise + 180 ? 'morning' : now < sunset - 60 ? 'day' : 'dusk';
}

function valid(data) {
  return data && ['temperature', 'code', 'rain', 'cloud', 'time', 'savedAt'].every(key => finite(data[key]))
    && data.code >= 0 && data.code <= 99 && data.temperature > -80 && data.temperature < 65;
}

export function createWeather({onChange,fetcher=fetch,storage,now=Date.now,geolocation=globalThis.navigator?.geolocation}={}){
  if(!storage)try{storage=localStorage;}catch{}
  let data=null,status='loading',location=WEATHER_CITY?.geolocate?null:WEATHER_CITY,pending=null,timer,disposed=false,lastAttempt=-Infinity,abort;
  const emit=next=>{status=next;if(!disposed)onChange?.({data,status,location,condition:data?weatherCondition(data):null});};
  async function refresh({force=false}={}){
    if(disposed||pending||!location||(!force&&now()-lastAttempt<INTERVAL))return pending;
    lastAttempt=now();const key=`homecraft-weather-${location.latitude},${location.longitude}-v1`;
    if(!data)try{const c=JSON.parse(storage?.getItem(key));if(valid(c)&&now()-c.savedAt>=0&&now()-c.savedAt<MAX_AGE&&Math.abs(now()-c.time*1000)<MAX_AGE)data=c;}catch{}
    if(!force&&data&&now()-data.savedAt<INTERVAL){emit('cached');return;}
    abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),8000);
    pending=(async()=>{
      try{
        const response=await fetcher(weatherUrl(location),{signal:abort.signal,credentials:'omit'});if(!response.ok)throw Error('Weather response failed');
        const json=await response.json(),c=json.current;
        const next={temperature:c?.temperature_2m,code:c?.weather_code,rain:(c?.rain??0)+(c?.showers??0),cloud:c?.cloud_cover,wind:c?.wind_speed_10m,time:c?.time,savedAt:now()};
        if(!valid(next)||Math.abs(now()-next.time*1000)>MAX_AGE)throw Error('Weather data is stale');
        const sunrise=json.daily?.sunrise?.[0],sunset=json.daily?.sunset?.[0];if(finite(sunrise)&&finite(sunset))Object.assign(next,{sunrise,sunset});
        if(disposed)return;data=next;try{storage?.setItem(key,JSON.stringify(data));}catch{}emit('live');
      }catch{if(data&&(now()-data.savedAt>=MAX_AGE||now()-data.time*1000>=MAX_AGE))data=null;emit(data?'stale':'unavailable');}
      finally{clearTimeout(timeout);pending=null;}
    })();return pending;
  }
  let locating=false, requestId=0, started=false;
  const selectedKey='homecraft-weather-city-v1';
  async function useLocation(next,id){
    if(pending){abort?.abort();await pending;}
    if(disposed||id!==requestId)return;
    data=null;location=next;lastAttempt=-Infinity;publishLocation(next);emit('loading');await refresh();
  }
  async function setLocation(next){
    if(!validLocation(next)||disposed)return false;
    const id=++requestId;locating=false;
    const city={latitude:next.latitude,longitude:next.longitude,city:String(next.city||next.name||'所选城市').slice(0,100)};
    try{storage?.setItem(selectedKey,JSON.stringify(city));}catch{}
    await useLocation(city,id);return true;
  }
  async function requestLocation(){
    if(locating||disposed)return;locating=true;const id=++requestId;
    if(pending){abort?.abort();await pending;}
    if(disposed||id!==requestId)return;
    emit('locating');
    try{
      const next=await requestBrowserLocation(geolocation);if(disposed||id!==requestId)return;
      try{storage?.removeItem(selectedKey);}catch{}
      await useLocation(next,id);
    }catch(error){
      if(!disposed&&id===requestId)emit(error.code===1?'denied':error.code===3?'location-timeout':error.code==='insecure'?'location-insecure':error.code==='unsupported'?'location-unsupported':'location-unavailable');
    }finally{if(id===requestId)locating=false;}
  }
  const visible=()=>{if(!document.hidden)refresh();};
  return{start(){
    if(started||disposed)return;started=true;
    if(WEATHER_CITY?.geolocate){
      try{const saved=JSON.parse(storage?.getItem(selectedKey));if(validLocation(saved))location=saved;}catch{}
      if(location){publishLocation(location);emit('loading');refresh();}
      else{
        emit('location-required');const initialRequest=requestId;
        // Only reuse permission that was already granted. New permission is requested by a click.
        globalThis.navigator?.permissions?.query({name:'geolocation'}).then(result=>{
          if(result.state==='granted'&&!disposed&&requestId===initialRequest)requestLocation();
        }).catch(()=>{});
      }
    }else if(location){publishLocation(location);emit('loading');refresh();}else emit('off');
    timer=setInterval(visible,INTERVAL);document.addEventListener('visibilitychange',visible);
  },refresh,requestLocation,setLocation,
    dispose(){disposed=true;++requestId;abort?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);},
    get state(){return{data,status,location,condition:data?weatherCondition(data):null};}};
}
