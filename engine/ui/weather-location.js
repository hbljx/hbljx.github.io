import { validLocation } from '../location.js';

const messages = {
  'location-required':'选择城市，或点击“使用当前位置”获取当地天气。',
  locating:'正在获取位置…',
  denied:'定位权限未开启。可在浏览器的网站权限中允许定位，或直接选择城市。',
  'location-timeout':'获取位置超时，可重试或选择城市。',
  'location-unavailable':'设备暂时无法提供位置，可重试或选择城市。',
  'location-insecure':'当前连接不支持定位，请使用 HTTPS 打开，或选择城市。',
  'location-unsupported':'当前浏览器不支持定位，请选择城市。',
  unavailable:'天气服务暂时无法连接，请稍后刷新天气。',
  stale:'暂时显示上次天气，可稍后刷新。',
};

export function mountWeatherLocation(menu,weather,onSelected=()=>{}) {
  const root=document.createElement('section');root.className='weather-location';
  root.setAttribute('aria-label','天气位置');
  root.innerHTML=`<p class="location-source"></p><p class="location-message" role="status"></p>
    <div class="location-actions"><button type="button" id="weatherLocate">使用当前位置</button><button type="button" id="weatherRefresh" hidden>刷新天气</button></div>
    <form class="city-search"><label for="weatherCity">选择城市</label><div><input type="search" id="weatherCity" placeholder="城市名，如北京 / Shanghai" required minlength="2" maxlength="80" autocomplete="off"><button type="submit">查找</button></div></form>
    <p class="city-status" role="status"></p><div class="city-results" aria-label="匹配的城市"></div>`;
  menu.querySelector('.now').after(root);
  const locate=root.querySelector('#weatherLocate'),refresh=root.querySelector('#weatherRefresh');
  const form=root.querySelector('form'),input=root.querySelector('input'),results=root.querySelector('.city-results'),status=root.querySelector('.city-status');
  let searchId=0,controller;
  locate.addEventListener('click',async()=>{await weather.requestLocation();if(weather.state.location)onSelected();});
  refresh.addEventListener('click',()=>weather.refresh({force:true}));
  input.addEventListener('input',()=>{++searchId;controller?.abort();results.replaceChildren();status.textContent='';form.querySelector('button').disabled=false;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const name=input.value.trim();if(name.length<2){input.focus();return;}
    controller?.abort();controller=new AbortController();const current=++searchId,abort=controller;
    results.replaceChildren();status.textContent='正在查找城市…';form.querySelector('button').disabled=true;
    const timeout=setTimeout(()=>abort.abort(),8000);
    try{
      const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:'6',language:'zh',format:'json'}),{signal:abort.signal,credentials:'omit'});
      if(!response.ok)throw Error('City lookup failed');
      const json=await response.json();if(current!==searchId)return;
      const cities=(json.results||[]).filter(validLocation);
      status.textContent=cities.length?'请选择匹配的城市。':'未找到城市，请尝试完整城市名或英文名。';
      for(const city of cities){
        const button=document.createElement('button');button.type='button';
        button.textContent=[city.name,city.admin1,city.country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');
        button.addEventListener('click',async()=>{
          ++searchId;results.replaceChildren();status.textContent='';
          await weather.setLocation({...city,city:city.name});onSelected();
        });results.append(button);
      }
    }catch{if(current===searchId)status.textContent='城市查询暂时无法连接，请稍后重试，或使用当前位置。';}
    finally{clearTimeout(timeout);if(current===searchId)form.querySelector('button').disabled=false;}
  });
  return {
    update({status,data,location}){
      root.querySelector('.location-source').textContent=location?(location.city?`天气城市：${location.city}`:'天气位置：设备当前位置'):'';
      root.querySelector('.location-message').textContent=messages[status] || (status==='loading'?'正在获取天气…':'');
      locate.disabled=status==='locating';locate.textContent=locate.disabled?'正在定位…':'使用当前位置';
      refresh.hidden=!location;refresh.disabled=status==='loading'||status==='locating';
      root.dataset.hasWeather=String(!!data);
    },
  };
}
