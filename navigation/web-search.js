const providers = {
  baidu: {label:'百度', action:'https://www.baidu.com/s', query:'wd'},
  bing: {label:'必应', action:'https://www.bing.com/search', query:'q'},
  google: {label:'谷歌', action:'https://www.google.com/search', query:'q'},
};
export function mountWebSearch() {
  const form=document.querySelector('.site-search');
  const query=form.querySelector('input[type="search"]');
  const choices=[...form.querySelectorAll('[name="engine"]')];
  const saved=(()=>{try{return localStorage.getItem('li-search-engine');}catch{return null;}})();
  function select(id) {
    const provider=providers[id] || providers.baidu;
    form.action=provider.action;
    query.name=provider.query;
    query.placeholder=`用${provider.label}搜索网页`;
    form.querySelector('button[type="submit"]').setAttribute('aria-label',`使用${provider.label}搜索`);
    for(const choice of choices) choice.checked=choice.value===id;
  }
  select(Object.hasOwn(providers,saved)?saved:'baidu');
  form.addEventListener('change',event=>{
    if(event.target.name!=='engine')return;
    select(event.target.value);
    try{localStorage.setItem('li-search-engine',event.target.value);}catch{}
  });
  form.addEventListener('submit',event=>{
    query.value=query.value.trim();
    if(!query.value){event.preventDefault();query.focus();}
  });
  // Use a normal browser GET submission, with only the provider's query parameter.
  form.addEventListener('formdata',event=>event.formData.delete('engine'));
}
