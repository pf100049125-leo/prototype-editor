
const $=s=>document.querySelector(s),frame=$('#frame'),box=$('#box'),gd=$('#gd'),props=$('#props');
let mode='design',sel=null,drag=null,rz=null,curKey=PROJECT.pages[0].key,hist={},histIdx={},fold=new Set(),gKey='';
const store={topNav:PROJECT.topNav,shellByType:{...PROJECT.shellByType},content:{...PROJECT.content}};
const routeByUrl={}; PROJECT.pages.forEach(p=>routeByUrl[p.url]=p.key); Object.assign(routeByUrl,PROJECT.topDefaults);
const pageByKey={}; PROJECT.pages.forEach(p=>pageByKey[p.key]=p);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function toast(m,ms){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',ms||1800)}

/* ---------- assembling / capturing page HTML ---------- */
function inject(shellHtml, contentHtml){
 const doc=new DOMParser().parseFromString(shellHtml,'text/html');
 const ph=doc.getElementById('sub_page_body'); if(ph) ph.innerHTML=contentHtml;
 return doc.body.innerHTML;
}
function buildDoc(key){
 const p=pageByKey[key], type=p.type;
 const inner=(type==='config'||type==='maintenance')?inject(store.shellByType[type],store.content[key]):store.content[key];
 return `<!doctype html><html><head><meta charset="utf-8"><style>${PROJECT.theme}${PROJECT.typeStyles[type]||''}
body{margin:0}
.design-mode [data-ed-id]:hover{outline:1px dashed #60a5fa;outline-offset:-1px}
.design-mode [data-rules]{outline:1px dotted #a855f7;outline-offset:-1px}
.rule-hide{display:none!important}.rule-dis,.is-dis{opacity:.4;filter:grayscale(1);pointer-events:none}
.ed-toggled-on{box-shadow:inset 0 0 0 2px #1e88e5}
</style></head><body class="${mode==='design'?'design-mode':''}"><div class="container">${store.topNav}<div class="page-body fixed" id="main_page_body"><div class="module-root">${inner}</div></div></div></body></html>`;
}
function ids(doc){let n=0;doc.querySelectorAll('[data-ed-id]').forEach(e=>{const m=/ed_(\d+)/.exec(e.dataset.edId);if(m)n=Math.max(n,+m[1])});
 doc.querySelectorAll('.container *').forEach(e=>{if(e.children.length===0&&!e.closest('script,style'))e.dataset.edLeaf='1';});
 doc.querySelectorAll('.container').forEach(root=>{root.querySelectorAll('*').forEach(e=>{if(!e.dataset.edId)e.dataset.edId='ed_'+String(++n).padStart(4,'0')})})}
function captureAll(doc){
 const p=pageByKey[curKey], type=p.type;
 const nav=doc.getElementById('index_head_menu'); if(nav) store.topNav=nav.outerHTML;
 if(type==='config'||type==='maintenance'){
   const root=doc.querySelector('.module-root > .container');
   if(root){const clone=root.cloneNode(true);const ph=clone.querySelector('#sub_page_body');const body=doc.querySelector('#sub_page_body');
     if(body) store.content[curKey]=body.innerHTML;
     if(ph) ph.innerHTML=''; store.shellByType[type]=clone.outerHTML;}
 } else { const root=doc.querySelector('.module-root'); if(root) store.content[curKey]=root.innerHTML; }
}

/* ---------- history (per page) ---------- */
function snap(){const doc=frame.contentDocument; if(!doc) return; captureAll(doc);
 const h=JSON.stringify(store); const arr=hist[curKey]||(hist[curKey]=[]); let i=histIdx[curKey]==null?-1:histIdx[curKey];
 if(arr[i]===h) return; hist[curKey]=arr.slice(0,i+1); hist[curKey].push(h); histIdx[curKey]=hist[curKey].length-1;}
function restore(dir){const arr=hist[curKey]; if(!arr) return; let i=(histIdx[curKey]||0)+dir; if(i<0||i>=arr.length) return;
 histIdx[curKey]=i; Object.assign(store, JSON.parse(arr[i])); load(curKey,true)}

/* ---------- page tree ---------- */
function tree(){const root={c:new Map()};PROJECT.pages.forEach(p=>{let n=root;p.path.forEach((s,i)=>{if(!n.c.has(s))n.c.set(s,{c:new Map(),page:null});n=n.c.get(s);if(i===p.path.length-1)n.page=p})});return root}
function renderTree(){const out=[];
 const walk=(n,pre,d)=>n.c.forEach((v,s)=>{const path=[...pre,s],key=path.join('|'),has=v.c.size>0,cl=fold.has(key);
  out.push(`<div class="tn${v.page&&v.page.key===curKey?' cur':''}${v.page?'':' fd'}" style="padding-left:${6+d*14}px" data-path='${esc(JSON.stringify(path))}' data-k="${esc(key)}"${v.page?` data-pg="${v.page.key}"`:''}><i class="tg" data-tg="1">${has?(cl?'▸':'▾'):''}</i>${v.page&&v.page.icon?`<i class="fa fa-${v.page.icon} ic"></i>`:''}${esc(s)}</div>`);
  if(has&&!cl)walk(v,path,d+1)});
 walk(tree(),[],0);$('#pgs').innerHTML=out.join('')}
$('#pgs').onclick=e=>{const n=e.target.closest('.tn'); if(!n) return; const k=n.dataset.k;
 if(e.target.dataset.tg||!n.dataset.pg){fold.has(k)?fold.delete(k):fold.add(k);renderTree();return}
 goPage(n.dataset.pg)};
const cm=$('#cm');
$('#pgs').oncontextmenu=e=>{const n=e.target.closest('.tn'); if(!n) return; e.preventDefault();
 const path=JSON.parse(n.dataset.path);
 cm.innerHTML='<div data-cm="copy">复制页面路径</div>'+(n.dataset.pg?'<div data-cm="go">进入页面</div>':'');
 cm.style.display='block';cm.style.left=Math.min(e.clientX,innerWidth-150)+'px';cm.style.top=Math.min(e.clientY,innerHeight-90)+'px';
 cm.onclick=ev=>{const a=ev.target.dataset.cm;cm.style.display='none';if(a==='copy')copyText('【'+path.join('】->【')+'】');else if(a==='go')goPage(n.dataset.pg)}};
document.addEventListener('click',e=>{if(!e.target.closest('#cm'))cm.style.display='none'});
function copyText(s){const ok=()=>toast('已复制: '+s,3000);
 const fb=()=>{const x=document.createElement('textarea');x.value=s;x.style.cssText='position:fixed;opacity:0';document.body.append(x);x.select();let r=false;try{r=document.execCommand('copy')}catch(_){}x.remove();r?ok():toast('浏览器拦截了复制,请手动复制: '+s,9000)};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(ok,fb);else fb()}

/* ---------- widget runtime (ported from the imported prototype's own logic) ---------- */
function setSidebarGroupOpen(doc,group,open){if(!group)return;group.classList.toggle('open',open);const t=group.querySelector(':scope > a.nav-toggle');if(t)t.classList.toggle('open',open);const sub=group.querySelector(':scope > .sub-menu');if(sub)sub.style.display=open?'block':'none';}
function updateRepeaterState(group){const max=parseInt(group.getAttribute('data-repeater-max')||'6',10),count=group.querySelectorAll('[data-repeater-item]').length,gid=group.getAttribute('data-repeater');
 group.ownerDocument.querySelectorAll('[data-repeater-add="'+gid+'"]').forEach(b=>b.classList.toggle('is-dis',count>=max))}
function initRepeaters(doc){doc.querySelectorAll('[data-repeater]').forEach(updateRepeaterState)}
function initRuntime(doc){
 doc.querySelectorAll('input[data-widget="selectbox"]').forEach(input=>{
  if(input.closest('.lavaui-combo-container')) return;
  const box=doc.createElement('span'); box.className='lavaui-combo-container'; input.parentNode.insertBefore(box,input); box.appendChild(input); input.readOnly=true;
  const panel=doc.createElement('div'); panel.className='lavaui-combo-panel list-group'; panel.style.cssText='width:'+Math.max(120,input.getBoundingClientRect().width||160)+'px;max-height:160px;overflow:auto';
  ['Off','On'].forEach((name,i)=>{const a=doc.createElement('a');a.href='#';a.className='list-group-item'+(i===0?' active':'');a.dataset.value=String(i);a.textContent=name;panel.appendChild(a)});
  box.appendChild(panel); const arrow=doc.createElement('span'); arrow.className='lavaui-combo-triangle'; box.appendChild(arrow);
 });
 doc.querySelectorAll('.lavaui-combo-container').forEach(box=>{const input=box.querySelector('input');const active=box.querySelector('.lavaui-combo-panel .list-group-item.active');if(input&&active&&!input.value)input.value=active.textContent.trim();});
}
function wireRuntime(doc){
 doc.addEventListener('click',e=>{
  if(mode==='design') return;
  const el=e.target;
  const navBtn=el.closest('.menu-button[data-url]'); if(navBtn){const k=routeByUrl[navBtn.getAttribute('data-url')]; if(k){goPage(k);} return;}
  const side=el.closest('.page-sidebar a'); if(side){e.preventDefault();const url=side.getAttribute('data-url');
   if(url&&routeByUrl[url]){goPage(routeByUrl[url]);return;}
   const li=side.closest('.page-sidebar-menu > .nav-item'); if(li){const next=!li.classList.contains('open');
    doc.querySelectorAll('.page-sidebar-menu > .nav-item').forEach(it=>setSidebarGroupOpen(doc,it,it===li&&next));}
   return;}
  const tab=el.closest('ul.tabs a[href^="#"],.tab'); if(tab && tab.parentElement){
   const list=[...tab.parentElement.children];
   if(tab.tagName==='A'&&tab.closest('ul.tabs')){e.preventDefault();[...tab.closest('ul.tabs').children].forEach(li=>li.classList.remove('active'));tab.parentElement.classList.add('active');
    const target=doc.querySelector(tab.getAttribute('href')); if(target){const wrap=target.parentElement; [...wrap.children].forEach(c=>c.classList.remove('active','in'));target.classList.add('active','in')}}
   return;}
  const input=el.closest('.lavaui-combo-container input[data-widget="selectbox"],.lavaui-combo-container input[data-widget="datetimebox"]'); if(input&&!input.disabled){e.preventDefault();
   const box=input.closest('.lavaui-combo-container'),panel=box.querySelector('.lavaui-combo-panel');
   doc.querySelectorAll('.lavaui-combo-panel').forEach(p=>{if(p!==panel)p.classList.remove('is-open')});
   panel&&panel.classList.toggle('is-open'); return;}
  const opt=el.closest('.lavaui-combo-panel .list-group-item'); if(opt){e.preventDefault();const box=opt.closest('.lavaui-combo-container');
   box.querySelectorAll('.list-group-item').forEach(x=>x.classList.remove('active')); opt.classList.add('active');
   const field=box.querySelector('input'); if(field) field.value=opt.textContent.trim();
   opt.closest('.lavaui-combo-panel').classList.remove('is-open'); applyRules(doc); return;}
  const cday=el.closest('.lava-calendar-table td[data-date]'); if(cday){const cal=cday.closest('.lava-calendar');
   cal.querySelectorAll('td').forEach(x=>x.classList.remove('active')); cday.classList.add('active');
   const box=cal.closest('.lavaui-combo-container'),field=box&&box.querySelector('input');
   if(field) field.value=cday.getAttribute('data-date').replaceAll('/','-');
   const panel=cal.closest('.lavaui-combo-panel')||cal; panel.classList.remove('is-open'); applyRules(doc); return;}
  const nav=el.closest('.lava-calendar-prevyear,.lava-calendar-nextyear,.lava-calendar-prevmonth,.lava-calendar-nextmonth'); if(nav){
   const cal=nav.closest('.lava-calendar'); let y=+cal.dataset.y,m=+cal.dataset.m;
   if(nav.classList.contains('lava-calendar-prevyear'))y--; else if(nav.classList.contains('lava-calendar-nextyear'))y++; else if(nav.classList.contains('lava-calendar-prevmonth')){m--;if(m<0){m=11;y--}} else {m++;if(m>11){m=0;y++}}
   const tmp=doc.createElement('div');tmp.innerHTML=calHtml(y,m);const fresh=tmp.firstElementChild;fresh.classList.add('lavaui-combo-panel','is-open');cal.replaceWith(fresh); return;}
  const ph=el.closest('.ed-panel-head'); if(ph){const p=ph.closest('.ed-panel'); p.classList.toggle('ed-collapsed'); const body=p.querySelector('.ed-panel-body'); if(body)body.style.display=p.classList.contains('ed-collapsed')?'none':''; return;}
  const all=el.closest('[data-ed-checkall]'); if(all){const grp=all.closest('.ed-checkbox-group')||all.closest('table')||doc; setTimeout(()=>{grp.querySelectorAll('input[type=checkbox]:not([data-ed-checkall])').forEach(c=>{c.checked=all.checked}); applyRules(doc)},0); return;}
  const mbtn=el.closest('[data-ed-modal]'); if(mbtn){const m=doc.getElementById(mbtn.getAttribute('data-ed-modal')); if(m)m.style.display='flex'; return;}
  const mclose=el.closest('[data-ed-modal-close]'); if(mclose){const m=mclose.closest('.modal'); if(m)m.style.display='none'; return;}
  const radd=el.closest('[data-repeater-add]'); if(radd){ if(radd.classList.contains('is-dis')) return;
   const gid=radd.getAttribute('data-repeater-add'), group=doc.querySelector('[data-repeater="'+gid+'"]'); if(!group) return;
   const items=[...group.querySelectorAll('[data-repeater-item]')], max=parseInt(group.getAttribute('data-repeater-max')||'6',10); if(!items.length||items.length>=max) return;
   const clone=items[0].cloneNode(true); clone.removeAttribute('data-ed-id'); clone.querySelectorAll('[data-ed-id]').forEach(x=>x.removeAttribute('data-ed-id'));
   const label=clone.querySelector('[data-repeater-label]');
   if(label){let maxNum=0; items.forEach(it=>{const lb=it.querySelector('[data-repeater-label]'); if(lb)(lb.textContent.match(/\d+/g)||[]).forEach(n=>{maxNum=Math.max(maxNum,+n)})}); const nn=maxNum+1;
    label.textContent=/\d+/.test(label.textContent)?label.textContent.replace(/\d+/,String(nn)):label.textContent.trim()+' '+nn;}
   const cb=clone.querySelector('[data-repeater-body]'); if(cb) cb.style.display='none'; clone.classList.remove('rp-open');
   items[items.length-1].after(clone); ids(doc); updateRepeaterState(group); snap(); return;}
  const rdel=el.closest('[data-repeater-del]'); if(rdel){const item=rdel.closest('[data-repeater-item]'); const group=item&&item.closest('[data-repeater]');
   if(item) item.remove(); if(group) updateRepeaterState(group); snap(); return;}
  const ritem=el.closest('[data-repeater-item]'); if(ritem&&!el.closest('input,select,textarea,.lavaui-combo-container,[data-ed-modal],[data-ed-modal-close]')){
   const body=ritem.querySelector('[data-repeater-body]'); if(body){const group=ritem.closest('[data-repeater]');
    const willOpen=body.style.display==='none'||!body.style.display;
    if(group) group.querySelectorAll('[data-repeater-item]').forEach(it=>{const b=it.querySelector('[data-repeater-body]'); if(b)b.style.display='none'; it.classList.remove('rp-open')});
    if(willOpen){body.style.display='block'; ritem.classList.add('rp-open')}
    return;}}
  const asBtn=el.closest('button'); if(asBtn&&!asBtn.closest('[data-ed-modal],[data-ed-modal-close]')){
   asBtn.dataset.edToggled=asBtn.dataset.edToggled==='1'?'0':'1'; asBtn.classList.toggle('ed-toggled-on',asBtn.dataset.edToggled==='1'); setTimeout(()=>applyRules(doc),0);
  }
  if(!el.closest('.lavaui-combo-container')) doc.querySelectorAll('.lavaui-combo-panel').forEach(p=>p.classList.remove('is-open'));
  if(el.type==='checkbox') setTimeout(()=>applyRules(doc),0);
 },true);
 doc.addEventListener('input',()=>{if(mode==='preview')applyRules(doc)});
 doc.addEventListener('change',()=>{if(mode==='preview')applyRules(doc)});
}

/* ---------- linkage rules (checkbox/input/select driven show/disable) ---------- */
function applyRules(doc){
 doc.querySelectorAll('[data-rules]').forEach(el=>{let rs;try{rs=JSON.parse(el.getAttribute('data-rules'))}catch(e){return}
  let dis=false,hide=false;
  rs.forEach(r=>{const s0=doc.querySelector(`[data-ed-id="${r.s}"]`); if(!s0) return;
   let val;
   if(s0.tagName==='BUTTON'){ val=s0.dataset.edToggled==='1'; }
   else{ const s=s0.matches('input')?s0:(s0.querySelector('input')||s0); val=s.type==='checkbox'?s.checked:(s.value||''); }
   let ok;
   if(r.op==='checked')ok=val===true; else if(r.op==='unchecked')ok=val===false; else if(r.op==='eq')ok=String(val)===r.v; else if(r.op==='neq')ok=String(val)!==r.v; else if(r.op==='empty')ok=!val; else ok=!!val;
   if(ok){ if(r.a==='hide') hide=true; else dis=true; }});
  el.classList.toggle('rule-dis',dis); el.classList.toggle('rule-hide',hide);});
}
const getRules=el=>{try{return JSON.parse(el.getAttribute('data-rules')||'[]')}catch(e){return[]}};
const saveRules=(el,a)=>a.length?el.setAttribute('data-rules',JSON.stringify(a)):el.removeAttribute('data-rules');

/* ---------- auto business linkage (ported from the imported prototype's own hard-coded rules) ---------- */
const autoLinked={};
function addRuleTo(target,sourceEl,op,val,action){
 const R=getRules(target); if(R.some(r=>r.s===sourceEl.dataset.edId&&r.a===action)) return;
 R.push({s:sourceEl.dataset.edId,op,v:val,a:action}); saveRules(target,R);
}
function autoLink(doc,key){
 if(autoLinked[key]) return; const root=doc.querySelector('.module-root')||doc.body;
 root.querySelectorAll('tbody tr').forEach(row=>{
  const controller=row.querySelector('input[type="checkbox"]:not([disabled])'); if(!controller) return;
  const name=controller.getAttribute('name')||'';
  if(!/enable|channel|remote|select|ftpenable/i.test(name)&&!controller.hasAttribute('data-param')&&!controller.hasAttribute('data-n-param')) return;
  const seen=new Set();
  [...row.querySelectorAll('input,button,textarea,.lavaui-combo-container')].forEach(t=>{
   if(t===controller||t.contains(controller)||controller.contains(t)) return;
   if(t.tagName==='INPUT'&&t.closest('.lavaui-combo-container')) return;
   if(seen.has(t)) return; seen.add(t); addRuleTo(t,controller,'unchecked','','disable');
  });
 });
 root.querySelectorAll('.lavaui-combo-container').forEach(box=>{
  const input=box.querySelector('input[data-widget="selectbox"]'); if(!input) return;
  const opts=[...box.querySelectorAll('.list-group-item')].map(o=>o.textContent.trim());
  const offOpt=opts.find(o=>/^(off|close|none|disable|disabled|0)$/i.test(o)); if(!offOpt) return;
  const row=box.closest('tr,.row,.form-group'); if(!row) return;
  if(row.querySelector('input[type="checkbox"]:not([disabled])')) return;
  const all=[...row.querySelectorAll('input,button,textarea,.lavaui-combo-container')]; const idx=all.indexOf(box); if(idx<0) return;
  const seen=new Set();
  all.slice(idx+1).forEach(t=>{ if(t.tagName==='INPUT'&&t.closest('.lavaui-combo-container')) return; if(seen.has(t)) return; seen.add(t); addRuleTo(t,box,'eq',offOpt,'disable'); });
 });
 autoLinked[key]=true;
}

/* ---------- load / navigate ---------- */
function load(key,keepHist){curKey=key; frame.srcdoc=buildDoc(key);
 frame.onload=()=>{const doc=frame.contentDocument; ids(doc); initRuntime(doc); wireRuntime(doc); applyRules(doc); select(null); if(!keepHist) snap(); renderTree();};}
function goPage(key){if(!pageByKey[key]||key===curKey){ if(pageByKey[key]) load(key); return;} const doc=frame.contentDocument; if(doc) captureAll(doc); load(key);}
function setMode(m){const doc=frame.contentDocument; if(doc) captureAll(doc); mode=m; $('#bd').classList.toggle('on',m==='design'); $('#bp').classList.toggle('on',m==='preview'); load(curKey,true)}
$('#bd').onclick=()=>setMode('design'); $('#bp').onclick=()=>setMode('preview');
$('#un').onclick=()=>restore(-1); $('#re').onclick=()=>restore(1);

/* ---------- selection / properties ---------- */
function select(el){sel=el; renderProps()}
function px(k){return parseFloat(sel.style[k])||0}
function pos(){if(getComputedStyle(sel).position==='static')sel.style.position='relative'}
function blk(){if(getComputedStyle(sel).display==='inline')sel.style.display='inline-block';sel.style.boxSizing='border-box'}
const hex=c=>{const m=c.match(/[\d.]+/g); if(!m||(m[3]!==undefined&&+m[3]===0)) return null; return '#'+m.slice(0,3).map(x=>Math.round(+x).toString(16).padStart(2,'0')).join('')};
const S4=[['Top','上'],['Right','右'],['Bottom','下'],['Left','左']];
function bdHtml(){const cs=getComputedStyle(sel); let w=1,st='solid',col='#0e3a5a';
 const on=S4.map(([k])=>{const a=parseFloat(cs['border'+k+'Width'])>0&&cs['border'+k+'Style']!=='none'; if(a){w=parseFloat(cs['border'+k+'Width']);st=cs['border'+k+'Style'];col=hex(cs['border'+k+'Color'])||col} return a});
 const bg=hex(cs.backgroundColor);
 return `<h4>边框与背景</h4><div style="display:flex;gap:12px;margin-bottom:6px">${S4.map(([k,n],i)=>`<label style="margin:0"><input type="checkbox" id="b_${k}"${on[i]?' checked':''} style="width:auto"> ${n}</label>`).join('')}</div>
 <div class="g"><label>边框颜色<input type="color" id="b_c" value="${col}" style="padding:1px;height:30px"></label><label>粗细<input type="number" min="0" id="b_w" value="${w}"></label><label>线型<select id="b_s">${['solid','dashed','dotted'].map(v=>`<option${v===st?' selected':''}>${v}</option>`).join('')}</select></label><label>圆角<input type="number" min="0" id="b_r" value="${parseFloat(cs.borderTopLeftRadius)||0}"></label></div>
 <div class="g"><label>背景色<input type="color" id="k_c" value="${bg||'#131d27'}" style="padding:1px;height:30px"></label><label><br><input type="checkbox" id="k_t"${bg?'':' checked'} style="width:auto"> 透明背景</label></div>`}
function bdSet(i){const w=+$('#b_w').value||0,s=$('#b_s').value,c=$('#b_c').value; S4.forEach(([k])=>{sel.style['border'+k]=$('#b_'+k).checked?`${w}px ${s} ${c}`:'none'}); if(i==='b_r')sel.style.borderRadius=($('#b_r').value||0)+'px'}
function bkSet(){sel.style.background=$('#k_t').checked?'transparent':$('#k_c').value}
const CN={Checkbox:'复选框',Input:'输入框',Select:'下拉框',Button:'按钮'};
const doc=()=>frame.contentDocument;
function srcs(){return [...doc().querySelectorAll('input[type=checkbox],input.form-control,input[data-widget],.lavaui-combo-container,button')].filter(x=>x!==sel&&!sel.contains(x)&&x.dataset&&x.dataset.edId)}
function srcLabel(x){if(x.tagName==='BUTTON') return `${CN.Button} · ${x.textContent.trim().slice(0,14)} (${x.dataset.edId})`;
 const isCombo=x.classList&&x.classList.contains('lavaui-combo-container');const input=isCombo?x.querySelector('input'):x;const ty=input.type==='checkbox'?'Checkbox':isCombo?'Select':'Input';
 const tx=ty==='Checkbox'?(input.closest('label')?input.closest('label').textContent.trim():''):(input.value||input.getAttribute('placeholder')||'');
 return `${CN[ty]} · ${tx.slice(0,14)} (${(isCombo?x:input).dataset.edId})`}
function rulesHtml(){const S=srcs(),R=getRules(sel);let h='<h4 style="margin-top:12px">联动规则</h4>';
 if(!S.length&&!R.length)return h+'<p class="hint">页面上还没有可作为条件的复选框/输入框/下拉框(需先被选中过一次,或在设计模式下点开该控件)。</p>';
 const mk=(i,k,opts,cur)=>`<select data-ri="${i}" data-rk="${k}">${opts.map(([v,n])=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(n)}</option>`).join('')}</select>`;
 R.forEach((r,i)=>{const s0=doc().querySelector(`[data-ed-id="${r.s}"]`); const isBtn=s0&&s0.tagName==='BUTTON'; const isCombo=s0&&!isBtn&&s0.classList.contains('lavaui-combo-container'); const input=s0&&!isBtn&&(isCombo?s0.querySelector('input'):s0);
  const ty=isBtn?'Button':input?(input.type==='checkbox'?'Checkbox':(isCombo?'Select':'Input')):'Checkbox';
  const ops=ty==='Button'?[['checked','点击后为"开"状态'],['unchecked','点击后为"关"状态']]:ty==='Checkbox'?[['checked','被勾选'],['unchecked','未勾选']]:ty==='Select'?[['eq','等于'],['neq','不等于']]:[['eq','等于'],['neq','不等于'],['empty','为空'],['filled','不为空']];
  let vh=''; if(r.op==='eq'||r.op==='neq') vh=(ty==='Select'&&s0)?mk(i,'v',[...s0.querySelectorAll('.list-group-item')].map(o=>[o.textContent.trim(),o.textContent.trim()]),r.v):`<input data-ri="${i}" data-rk="v" value="${esc(r.v||'')}" placeholder="值">`;
  h+=`<div class="rl"><div>当 ${mk(i,'s',S.map(x=>[x.dataset.edId,srcLabel(x)]),r.s)}</div><div>${mk(i,'op',ops,r.op)}${vh}</div><div>则本组件 ${mk(i,'a',[['disable','灰置不可选'],['hide','直接消失']],r.a)}</div><button data-act="rdel" data-i="${i}">删除此规则</button></div>`});
 return h+'<button data-act="radd">＋ 添加联动规则</button><p class="hint">条件成立时执行,不成立自动恢复。按钮作为触发条件时是“开关”:每点一次切换开/关状态(蓝色描边表示当前是开)。仅预览/导出后生效;设计模式紫色虚线表示已配置联动。</p>'}
function setRule(i,k,v){const R=getRules(sel),r=R[i]; if(!r) return; r[k]=v;
 if(k==='s'){const s0=doc().querySelector(`[data-ed-id="${v}"]`); const isBtn=s0&&s0.tagName==='BUTTON'; const isCombo=s0&&!isBtn&&s0.classList.contains('lavaui-combo-container'); const input=s0&&!isBtn&&(isCombo?s0.querySelector('input'):s0);
  r.op=isBtn?'checked':(input&&input.type==='checkbox')?'checked':'eq'; r.v=''; }
 if(k==='op'&&!/^(eq|neq)$/.test(v)) r.v='';
 saveRules(sel,R); if(k==='s'||k==='op') renderProps()}

function renderProps(){
 if(!sel){props.innerHTML='<p class="hint">在画布里点击任意元素进行编辑,也可以从左侧把组件拖进页面。侧边栏和顶部导航同样可以直接编辑。</p>';return}
 const isCombo=sel.classList&&sel.classList.contains('lavaui-combo-container');
 const isS=isCombo, isI=sel.tagName==='INPUT'&&sel.type!=='checkbox', isCk=sel.tagName==='INPUT'&&sel.type==='checkbox';
 const leaf=!isS&&!isI&&!isCk&&sel.children.length===0;
 let h=`<p><b>${esc(sel.tagName.toLowerCase())}${sel.className?'.'+esc((sel.className+'').split(' ')[0]):''}</b> <code>${sel.dataset.edId||''}</code></p>`;
 if(leaf) h+=`<label>文字<input id="f_t" value="${esc(sel.textContent)}"></label>`;
 if(isI) h+=`<label>默认值<input id="f_v" value="${esc(sel.getAttribute('value')||'')}"></label><label>占位提示<input id="f_ph" value="${esc(sel.getAttribute('placeholder')||'')}"></label>`;
 if(isCk){const lb=sel.closest('label'); h+=`<label>文字<input id="f_ct" value="${esc(lb?lb.textContent.trim():'')}"></label><label style="display:flex;gap:6px;align-items:center;color:var(--fg)"><input type="checkbox" id="f_cd" ${sel.hasAttribute('checked')?'checked':''} style="width:auto">默认勾选</label>`;}
 if(isS){const input=sel.querySelector('input');const opts=[...sel.querySelectorAll('.list-group-item')];
  h+=`<label>选项(逗号分隔)<input id="f_o" value="${esc(opts.map(o=>o.textContent.trim()).join(','))}"></label><label>默认选中项<select id="d_s">${opts.map((o,i)=>`<option value="${i}"${o.classList.contains('active')?' selected':''}>${esc(o.textContent.trim())}</option>`).join('')}</select></label>`;}
 h+=rulesHtml();
 if(sel.hasAttribute('data-repeater')) h+=`<h4 style="margin-top:12px">重复分组</h4><p class="hint">这是一个重复分组容器,组号 <code>${esc(sel.getAttribute('data-repeater'))}</code>。</p><label>最大数量<input type="number" id="rp_max" value="${sel.getAttribute('data-repeater-max')||6}"></label>`;
 if(sel.hasAttribute('data-repeater-item')) h+='<p class="hint" style="margin-top:8px">这是重复项模板,点“新增”时会复制这一整块。</p><div class="btns"><button data-act="unItem">取消“重复项模板”标记</button></div>';
 if(sel.hasAttribute('data-repeater-add')) h+=`<p class="hint" style="margin-top:8px">这是“新增”按钮,达到上限会自动变灰。</p><div class="btns"><button data-act="unAdd">取消“新增按钮”标记</button></div>`;
 if(sel.hasAttribute('data-repeater-del')) h+='<p class="hint" style="margin-top:8px">这是“删除本项”按钮。</p><div class="btns"><button data-act="unDel">取消“删除按钮”标记</button></div>';
 if(sel.hasAttribute('data-repeater-label')) h+='<p class="hint" style="margin-top:8px">这是编号文字,新增时会自动读取/累加这里的数字。</p><div class="btns"><button data-act="unLabel">取消“编号文字”标记</button></div>';
 if(sel.hasAttribute('data-repeater-body')) h+='<p class="hint" style="margin-top:8px">这是本项的详情内容,点标题展开/收起,删除本项时一起删除。</p><div class="btns"><button data-act="unBody">取消“详情内容”标记</button></div>';
 h+=`<div class="g"><label>X<input type="number" id="g_x" value="${px('left')}"></label><label>Y<input type="number" id="g_y" value="${px('top')}"></label><label>宽<input type="number" id="g_w" value="${Math.round(sel.offsetWidth)}"></label><label>高<input type="number" id="g_h" value="${Math.round(sel.offsetHeight)}"></label></div>
 <label>字号<input type="number" id="f_s" value="${parseFloat(getComputedStyle(sel).fontSize)}"></label>${bdHtml()}
 <label style="display:flex;gap:6px;align-items:center;color:var(--fg)"><input type="checkbox" id="x_d" ${sel.classList.contains('is-dis')?'checked':''} style="width:auto">灰置(不可选)</label>
 <div class="btns"><button data-act="dup">复制</button><button data-act="par">选中父级</button><button data-act="del">删除</button></div>
 <h4 style="margin-top:12px">重复分组标记(用于给现有的一组重复块接上增删逻辑)</h4>
 <div class="btns"><button data-act="mkItem">设为重复项模板</button><button data-act="mkAdd">设为新增按钮</button><button data-act="mkDel">设为删除按钮</button><button data-act="mkLabel">设为编号文字(可选)</button><button data-act="mkBody">设为详情内容(可选)</button></div>
 <p class="hint">先选中一整块“重复项”点“设为重复项模板”;选中加号按钮点“设为新增按钮”;删除按钮需在重复项内部,点“设为删除按钮”。“编号文字”“详情内容”是可选的:标了编号文字才会自动累加序号,标了详情内容才会支持点标题展开/收起、删除时一起消失。</p>`;
 props.innerHTML=h}
const M={g_x:v=>{pos();sel.style.left=v+'px'},g_y:v=>{pos();sel.style.top=v+'px'},g_w:v=>{blk();sel.style.width=v+'px'},g_h:v=>{blk();sel.style.height=v+'px'},f_s:v=>sel.style.fontSize=v+'px'};
props.oninput=e=>{const i=e.target.id,v=e.target.value; if(!sel) return;
 if(i==='rp_max'){sel.setAttribute('data-repeater-max',v||'6'); initRepeaters(doc()); return;}
 if(e.target.dataset.rk){setRule(+e.target.dataset.ri,e.target.dataset.rk,v);return}
 if(/^b_/.test(i))bdSet(i); else if(/^k_/.test(i))bkSet();
 else if(i==='x_d')sel.classList.toggle('is-dis',e.target.checked);
 else if(i==='f_t')sel.textContent=v;
 else if(i==='f_v'){sel.value=v;sel.setAttribute('value',v)}
 else if(i==='f_ph')sel.setAttribute('placeholder',v);
 else if(i==='f_ct'){const lb=sel.closest('label');if(lb){[...lb.childNodes].forEach(n=>{if(n.nodeType===3)n.remove()});lb.insertBefore(document.createTextNode(v),lb.querySelector('span'))} }
 else if(i==='f_cd'){e.target.checked?sel.setAttribute('checked',''):sel.removeAttribute('checked');sel.checked=e.target.checked}
 else if(i==='f_o'){const k=Math.max(0,[...sel.querySelectorAll('.list-group-item')].findIndex(o=>o.classList.contains('active')));const panel=sel.querySelector('.lavaui-combo-panel');
  panel.innerHTML=v.split(',').map((s,idx)=>`<a href="#" class="list-group-item${idx===k?' active':''}" data-value="${idx}">${esc(s.trim())}</a>`).join('');
  const d=$('#d_s'); if(d)d.innerHTML=[...panel.children].map((o,idx)=>`<option value="${idx}"${idx===k?' selected':''}>${esc(o.textContent)}</option>`).join('')}
 else if(i==='d_s'){const opts=[...sel.querySelectorAll('.list-group-item')];opts.forEach((o,idx)=>o.classList.toggle('active',idx===+v));const input=sel.querySelector('input');if(input&&opts[+v])input.value=opts[+v].textContent.trim()}
 else if(M[i]){if(v!=='')M[i](+v)}};
props.onchange=snap;
props.onclick=e=>{const a=e.target.dataset.act; if(!a||!sel) return;
 if(a==='mkItem'){const grp=sel.parentElement; let gid=grp&&grp.getAttribute('data-repeater');
  if(!gid){gid='rp_'+Math.random().toString(36).slice(2,8); if(grp){grp.setAttribute('data-repeater',gid); if(!grp.hasAttribute('data-repeater-max'))grp.setAttribute('data-repeater-max','6')} else {toast('这个元素需要有一个父容器,作为分组的边界');return}}
  sel.setAttribute('data-repeater-item',''); ids(doc()); snap(); toast('已设为重复项模板,组号 '+gid); renderProps(); return;}
 if(a==='unItem'){sel.removeAttribute('data-repeater-item'); snap(); renderProps(); return;}
 if(a==='mkAdd'){const item=doc().querySelector('[data-repeater-item]'); if(!item){toast('请先把某个元素设为“重复项模板”'); return}
  const gid=item.closest('[data-repeater]').getAttribute('data-repeater'); sel.setAttribute('data-repeater-add',gid); initRepeaters(doc()); snap(); toast('已设为新增按钮(组号 '+gid+')'); renderProps(); return;}
 if(a==='unAdd'){sel.removeAttribute('data-repeater-add'); snap(); renderProps(); return;}
 if(a==='mkDel'){if(!sel.closest('[data-repeater-item]')){toast('这个按钮需要放在“重复项模板”内部才能生效'); return} sel.setAttribute('data-repeater-del',''); snap(); toast('已设为删除按钮'); renderProps(); return;}
 if(a==='unDel'){sel.removeAttribute('data-repeater-del'); snap(); renderProps(); return;}
 if(a==='mkLabel'){if(!sel.closest('[data-repeater-item]')){toast('这个元素需要在“重复项模板”内部'); return} sel.setAttribute('data-repeater-label',''); snap(); toast('已设为编号文字'); renderProps(); return;}
 if(a==='unLabel'){sel.removeAttribute('data-repeater-label'); snap(); renderProps(); return;}
 if(a==='mkBody'){if(!sel.closest('[data-repeater-item]')){toast('这个元素需要在“重复项模板”内部'); return} sel.setAttribute('data-repeater-body',''); sel.style.display='none'; snap(); toast('已设为详情内容,默认收起'); renderProps(); return;}
 if(a==='unBody'){sel.removeAttribute('data-repeater-body'); sel.style.display=''; snap(); renderProps(); return;}
 if(a==='dup'){const c=copyTabPanel(sel,'oe_copy_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7));[c,...c.querySelectorAll('[data-ed-id]')].forEach(x=>x.removeAttribute('data-ed-id'));if(c.style.left)c.style.left=px('left')+16+'px',c.style.top=px('top')+16+'px';sel.after(c);ids(doc());snap();select(c)}
 else if(a==='par'){const p=sel.parentElement&&sel.parentElement.closest('[data-ed-id]'); if(p)select(p)}
 else if(a==='del'){const el=sel;select(null);el.remove();snap()}
 else if(a==='radd'){const S=srcs(); if(!S.length){toast('先在页面上点选一个复选框/输入框/下拉框/按钮');return} const s=S[0],R=getRules(sel);
  const isBtn=s.tagName==='BUTTON'; const isC=!isBtn&&s.classList&&s.classList.contains('lavaui-combo-container'); const input=isBtn?s:(isC?s.querySelector('input'):s);
  R.push({s:s.dataset.edId,op:(isBtn||input.type==='checkbox')?'checked':'eq',v:'',a:'disable'}); saveRules(sel,R); snap(); renderProps()}
 else if(a==='rdel'){const R=getRules(sel);R.splice(+e.target.dataset.i,1);saveRules(sel,R);snap();renderProps()}};

/* ---------- palette: add native-styled components ---------- */
const TPL={
 Button:'<button class="btn btn-default" style="width:110px;height:36px;padding:0">新按钮</button>',
 Input:'<input type="text" class="form-control" value="文本" style="width:170px;height:34px">',
 Select:'<span class="lavaui-combo-container" style="width:170px;display:inline-block"><input type="text" class="form-control" data-widget="selectbox" readonly value="选项1"><div class="lavaui-combo-panel list-group" style="width:170px"><a href="#" class="list-group-item active" data-value="0">选项1</a><a href="#" class="list-group-item" data-value="1">选项2</a></div><span class="lavaui-combo-triangle"></span></span>',
 Checkbox:'<label class="checkbox" style="display:inline-block"><input type="checkbox" data-widget="checkbox">新选项<span></span></label>',
 Text:'<div style="width:130px">新文本</div>',
 Box:'<div style="width:220px;height:130px;border:1px solid #0e3a5a"></div>',
 Table:'<table class="table table-bordered" style="width:360px"><tbody><tr><td>列1</td><td>列2</td></tr><tr><td>内容</td><td>内容</td></tr></tbody></table>',
 Password:'<input type="password" class="form-control" value="" placeholder="请输入密码" style="width:170px;height:34px">',
 Number:'<input type="number" class="form-control" value="0" style="width:110px;height:34px">',
 Textarea:'<textarea class="form-control" style="width:220px;height:80px">多行文本内容</textarea>',
 Time:'<span class="lavaui-combo-container" style="width:110px;display:inline-block"><input type="text" class="form-control" data-widget="selectbox" readonly value="08:00"><div class="lavaui-combo-panel list-group" style="width:110px;max-height:160px;overflow:auto"><a href="#" class="list-group-item active" data-value="0">08:00</a><a href="#" class="list-group-item" data-value="1">12:00</a><a href="#" class="list-group-item" data-value="2">18:00</a><a href="#" class="list-group-item" data-value="3">00:00</a></div><span class="lavaui-combo-triangle"></span></span>',
 Radio:'<div class="ed-radio-group" style="width:220px"><label class="radio" style="display:block"><input type="radio" name="ed_radio___ID__" checked><span></span>选项一</label><label class="radio" style="display:block"><input type="radio" name="ed_radio___ID__"><span></span>选项二</label><label class="radio" style="display:block"><input type="radio" name="ed_radio___ID__"><span></span>选项三</label></div>',
 CheckboxGroup:'<div class="ed-checkbox-group" style="width:220px"><label class="checkbox" style="display:block;font-weight:bold"><input type="checkbox" data-ed-checkall>全选<span></span></label><label class="checkbox" style="display:block"><input type="checkbox" checked data-widget="checkbox">选项一<span></span></label><label class="checkbox" style="display:block"><input type="checkbox" data-widget="checkbox">选项二<span></span></label><label class="checkbox" style="display:block"><input type="checkbox" data-widget="checkbox">选项三<span></span></label></div>',
 Slider:'<input type="range" min="0" max="100" value="50" style="width:200px">',
 Progress:'<div class="progress" style="width:220px;height:16px;background:#0e3a5a;border-radius:4px;overflow:hidden"><div class="progress-bar" style="width:60%;height:100%;background:#1e88e5"></div></div>',
 Help:'<span class="ed-help" title="这里是帮助说明文字" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1px solid currentColor;font-size:11px;cursor:help">?</span>',
 Panel:'<div class="ed-panel" style="width:320px;border:1px solid #0e3a5a"><div class="ed-panel-head" style="padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;background:rgba(255,255,255,.04)"><span>可折叠面板标题</span><i class="ed-panel-arrow">▾</i></div><div class="ed-panel-body" style="padding:10px 12px">面板内容,可以拖其他组件进来。</div></div>'
};
function calGrid(y,m){const first=new Date(y,m,1),dow=first.getDay(),days=new Date(y,m+1,0).getDate(),today=new Date().toDateString();
 let cells=[];for(let i=0;i<dow;i++)cells.push('<td></td>');
 for(let d=1;d<=days;d++){const dt=new Date(y,m,d),ds=y+'/'+(m+1)+'/'+d,cur=dt.toDateString()===today;cells.push('<td data-date="'+ds+'" class="lava-calendar-normal'+(cur?' active':'')+'" data-type="normal">'+d+'</td>')}
 let rows='';for(let i=0;i<cells.length;i+=7)rows+='<tr>'+cells.slice(i,i+7).join('')+'</tr>';return rows}
function calHtml(y,m){return '<div class="lava-calendar" data-y="'+y+'" data-m="'+m+'"><div class="lava-calendar-header"><div class="lava-calendar-prevyear">«</div><div class="lava-calendar-nextyear">»</div><div class="lava-calendar-prevmonth">&lt;</div><div class="lava-calendar-nextmonth">&gt;</div><span class="lava-calendar-text">'+y+'-'+String(m+1).padStart(2,'0')+'</span></div><table class="lava-calendar-table"><thead class="lava-calendar-thead"><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></thead><tbody class="lava-calendar-tbody">'+calGrid(y,m)+'</tbody></table></div>'}
function refreshCal(cal){const y=+cal.dataset.y,m=+cal.dataset.m,tmp=cal.ownerDocument.createElement('div');tmp.innerHTML=calHtml(y,m);cal.outerHTML=tmp.firstElementChild.outerHTML}
function addComp(type,cx,cy){if(mode!=='design'){toast('请先切换到设计模式添加组件');return;}const dd=doc(),placement=componentPlacement(cx,cy),host=placement.host,left=placement.left,top=placement.top;
 if(type==='Date'){const now=new Date(),id='ed_cal_'+Date.now();
  const html='<span class="lavaui-combo-container" style="width:150px;display:inline-block"><input type="text" class="form-control" data-widget="datetimebox" readonly value="">'+calHtml(now.getFullYear(),now.getMonth())+'<span class="lavaui-combo-triangle"></span></span>';
  const tmp=dd.createElement('div'); tmp.innerHTML=html; const el=tmp.firstElementChild; el.style.position='absolute'; el.style.left=left+'px'; el.style.top=top+'px';
  const panel=el.querySelector('.lava-calendar'); panel.classList.add('lavaui-combo-panel');
  host.appendChild(el); ids(dd); snap(); select(el); return;}
 if(type==='Repeater'){const gid='rp_'+Date.now();
  const html='<div data-repeater="'+gid+'" data-repeater-max="6" style="border:1px solid #163C51;width:280px">'+
   '<div data-repeater-item style="border-bottom:1px solid #163C51">'+
   '<div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">'+
   '<span data-repeater-label>Server 1</span><button class="btn btn-sm outline" data-repeater-del style="width:22px;height:22px;line-height:1;padding:0">×</button></div>'+
   '<div data-repeater-body style="display:none;padding:4px 10px 14px;color:var(--mu,#8b93a1)">点这一项的标题可以展开/收起;这里放这个 Server 自己的配置内容,删除本项时会一起删除。</div>'+
   '</div>'+
   '<div style="padding:8px 10px;text-align:right"><button data-repeater-add="'+gid+'" class="btn btn-default" style="width:30px;height:30px;padding:0">＋</button></div></div>';
  const tmp=dd.createElement('div'); tmp.innerHTML=html; const el=tmp.firstElementChild; el.style.position='absolute'; el.style.left=left+'px'; el.style.top=top+'px';
  host.appendChild(el); ids(dd); initRepeaters(dd); snap(); select(el); return;}
 if(type==='Modal'){const mid='ed_modal_'+Date.now();
  const btnTmp=dd.createElement('div'); btnTmp.innerHTML='<button class="btn btn-default" data-ed-modal="'+mid+'" style="width:120px;height:36px;padding:0">打开弹窗</button>'; const btn=btnTmp.firstElementChild;
  btn.style.position='absolute'; btn.style.left=left+'px'; btn.style.top=top+'px'; host.appendChild(btn);
  const mTmp=dd.createElement('div'); mTmp.innerHTML='<div id="'+mid+'" class="modal in ed-modal" style="display:none;background:rgba(0,0,0,.5)"><div class="modal-dialog modal-md" style="margin:80px auto"><div class="modal-header"><div class="modal-title">弹窗标题</div></div><div class="modal-body"><div class="form-group row"><div class="col-sm-4">字段名称</div><div class="col-sm-6"><input type="text" class="form-control"></div></div></div><div class="modal-footer"><button class="btn btn-default" data-ed-modal-close>Cancel</button><button class="btn btn-default-save" data-ed-modal-close>OK</button></div></div></div>';
  host.appendChild(mTmp.firstElementChild);
  ids(dd); snap(); select(btn); return;}
 const tmp=dd.createElement('div'); tmp.innerHTML=TPL[type].replaceAll('__ID__',String(Date.now())+Math.random().toString(36).slice(2)); let el=tmp.firstElementChild;
 el.style.position='absolute'; el.style.left=left+'px'; el.style.top=top+'px';
 if(type==='Radio'||type==='Time'){/*id placeholder not needed*/}
 host.appendChild(el); ids(dd); snap(); select(el)}
document.querySelectorAll('#lp [data-add]').forEach(b=>{b.onclick=()=>addComp(b.dataset.add); b.ondragstart=e=>e.dataTransfer.setData('text/plain',b.dataset.add)});

/* ---------- selection / drag / resize / snap wiring inside iframe ---------- */
function frameOffset(){return frame.getBoundingClientRect()}
function zoomVal(){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'))||1}
function cands(){return [...doc().querySelectorAll('[data-ed-id]')].filter(e=>e!==sel&&!sel.contains(e)&&!e.contains(sel)).map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)}
const TH=6;
const XT=c=>c.flatMap(k=>[[k.left,k],[k.left+k.width/2,k],[k.right,k]]),YT=c=>c.flatMap(k=>[[k.top,k],[k.top+k.height/2,k],[k.bottom,k]]);
function best(vals,tg){let b=null;vals.forEach(v=>tg.forEach(([t,r])=>{const d=t-v;if(Math.abs(d)<=TH&&(!b||Math.abs(d)<Math.abs(b.d)))b={d,t,r}}));return b}
const gs=l=>l.v?`left:${l.p}px;top:${l.a}px;height:${l.b-l.a}px;width:1px`:`top:${l.p}px;left:${l.a}px;width:${l.b-l.a}px;height:1px`;
function showG(g){const k=g.map(l=>l.v+':'+Math.round(l.p)).join('|');
 if(k!==gKey){gKey=k;gd.innerHTML=g.map(l=>`<div class="gl" style="${gs(l)}"></div>`).join('');if(g.length){box.classList.remove('snap');void box.offsetWidth;box.classList.add('snap')}}
 else [...gd.children].forEach((n,i)=>n.style.cssText=gs(g[i]))}
const clearG=()=>{gd.innerHTML='';gKey=''};
function mkG(off,bx,by,R){const z=zoomVal(),g=[]; if(bx)g.push({v:1,p:off.left+bx.t*z,a:Math.min(R.top,bx.r.top)*z+off.top,b:Math.max(R.bottom,bx.r.bottom)*z+off.top});
 if(by)g.push({v:0,p:off.top+by.t*z,a:Math.min(R.left,by.r.left)*z+off.left,b:Math.max(R.right,by.r.right)*z+off.left}); showG(g)}
function attachSelHandlers(doc){
 doc.addEventListener('mousedown',e=>{if(mode==='design')e.preventDefault()},true);
 doc.addEventListener('click',e=>{if(mode!=='design')return;e.preventDefault();e.stopPropagation();const t=smartPick(e.target);select(t)},true);
 doc.addEventListener('pointerdown',e=>{if(mode!=='design')return;const t=smartPick(e.target);select(t);if(t)drag={x:e.clientX,y:e.clientY,l:px('left'),t:px('top'),m:0,r:t.getBoundingClientRect(),c:cands()}},true);
 doc.addEventListener('pointermove',e=>{
  if(rz){let dx=e.clientX-rz.x,dy=e.clientY-rz.y;const r=rz.r,off=frameOffset();
   const bx=best([r.right+dx],XT(rz.c)),by=best([r.bottom+dy],YT(rz.c)); if(bx)dx+=bx.d; if(by)dy+=by.d; mkG(off,bx,by,{left:r.left,top:r.top,right:r.right+dx,bottom:r.bottom+dy});
   sel.style.width=Math.max(16,rz.w+dx)+'px'; sel.style.height=Math.max(16,rz.h+dy)+'px'}
  else if(drag&&sel){let dx=e.clientX-drag.x,dy=e.clientY-drag.y; if(!drag.m&&Math.abs(dx)+Math.abs(dy)<4)return; drag.m=1; const r=drag.r,off=frameOffset();
   const bx=best([r.left+dx,r.left+dx+r.width/2,r.right+dx],XT(drag.c)),by=best([r.top+dy,r.top+dy+r.height/2,r.bottom+dy],YT(drag.c)); if(bx)dx+=bx.d; if(by)dy+=by.d;
   mkG(off,bx,by,{left:r.left+dx,top:r.top+dy,right:r.right+dx,bottom:r.bottom+dy}); pos(); sel.style.left=drag.l+dx+'px'; sel.style.top=drag.t+dy+'px'}});
 doc.addEventListener('pointerup',()=>{if((drag&&drag.m)||rz){snap();renderProps()} drag=rz=null; clearG()});
 doc.addEventListener('dragover',e=>e.preventDefault());
 doc.addEventListener('drop',e=>{e.preventDefault();const t=e.dataTransfer.getData('text/plain'); if(TPL[t]||['Date','Modal','Repeater'].includes(t)) addComp(t,e.clientX,e.clientY)});
}
$('#hd').onpointerdown=e=>{e.preventDefault();e.stopPropagation();blk();rz={x:e.clientX,y:e.clientY,w:sel.offsetWidth,h:sel.offsetHeight,r:sel.getBoundingClientRect(),c:cands()}};
window.addEventListener('pointerup',()=>{if(rz){snap();renderProps()} rz=null;clearG()});
window.addEventListener('pointermove',e=>{if(!rz)return;const z=zoomVal();let dx=(e.clientX-rz.x)/z,dy=(e.clientY-rz.y)/z;const r=rz.r,off=frameOffset();
 const bx=best([r.right+dx],XT(rz.c)),by=best([r.bottom+dy],YT(rz.c)); if(bx)dx+=bx.d; if(by)dy+=by.d; mkG(off,bx,by,{left:r.left,top:r.top,right:r.right+dx,bottom:r.bottom+dy});
 sel.style.width=Math.max(16,rz.w+dx)+'px'; sel.style.height=Math.max(16,rz.h+dy)+'px'});
document.addEventListener('keydown',e=>{if(e.target.closest('[role=dialog]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key;
 if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();restore(-1)} else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();restore(1)}
 else if(sel&&k==='Delete'){e.preventDefault();deleteSelectedElement()}
 else if(sel&&k.startsWith('Arrow')){e.preventDefault();pos();const s=e.shiftKey?10:1;if(k==='ArrowLeft')sel.style.left=px('left')-s+'px';if(k==='ArrowRight')sel.style.left=px('left')+s+'px';if(k==='ArrowUp')sel.style.top=px('top')-s+'px';if(k==='ArrowDown')sel.style.top=px('top')+s+'px';snap();renderProps()}});
(function loop(){if(sel&&mode==='design'&&doc()&&doc().contains(sel)&&$('#modal').style.display!=='flex'){const r=sel.getBoundingClientRect(),off=frameOffset(),z=zoomVal();
 Object.assign(box.style,{display:'block',left:(off.left+r.left*z)+'px',top:(off.top+r.top*z)+'px',width:(r.width*z)+'px',height:(r.height*z)+'px'})} else box.style.display='none'; requestAnimationFrame(loop)})();

const _load=load;
function markActiveNav(d,key){const p=pageByKey[key]; if(!p) return;
 if(p.type==='config'||p.type==='maintenance'){
  const link=d.querySelector(`.page-sidebar a[data-url="${p.url}"]`);
  d.querySelectorAll('.page-sidebar a[data-url]').forEach(a=>a.classList.toggle('active',a===link));
  if(p.type==='config') d.querySelectorAll('.page-sidebar-menu>.nav-item').forEach(li=>setSidebarGroupOpen(d,li,!!link&&li.contains(link)));
 }
 d.querySelectorAll('.menu-button').forEach(x=>x.classList.remove('menu-active'));
 const idm={preview:'btn_livew',playback:'btn_playback',log:'btn_log',config:'btn_config',maintenance:'btn_maintenance'}[p.type];
 const direct=[...d.querySelectorAll('.menu-button[data-url]')].find(x=>x.getAttribute('data-url')===p.url),b=direct||(idm?d.getElementById(idm):null);if(b)b.classList.add('menu-active');}
load=function(key,keepHist){curKey=key; frame.srcdoc=buildDoc(key);
 frame.onload=()=>{const d=frame.contentDocument; ids(d); autoLink(d,key); markActiveNav(d,key); initRuntime(d); initRepeaters(d); wireRuntime(d); attachSelHandlers(d); applyRules(d); select(null); if(!keepHist) snap(); renderTree();};};

/* ---------- code tab ---------- */
document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const p=b.dataset.p;document.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('on',x===b));
 props.style.display=p==='props'?'':'none'; $('#codep').style.display=p==='code'?'':'none';
 if(p==='code'){const d=frame.contentDocument;captureAll(d);$('#code').value=store.content[curKey].replace(/></g,'>\n<')}});
$('#apply').onclick=()=>{store.content[curKey]=$('#code').value; load(curKey,true); toast('代码已应用')};

/* ---------- export ---------- */
function buildDocExport(key,theme,typeStyles,shellByType,content,topNav){
 const p=pageByKey[key],type=p.type;
 const inner=(type==='config'||type==='maintenance')?inject(shellByType[type],content[key]):content[key];
 return `<div class="container">${topNav}<div class="page-body fixed" id="main_page_body"><div class="module-root">${inner}</div></div></div>`;
}
function buildExport(){const d=frame.contentDocument; if(d) captureAll(d);
 const runtimeSrc = "const mode='preview';const snap=()=>{};const goPage=key=>go(key);\n"+[ids,calGrid,calHtml,refreshCal,updateRepeaterState,initRepeaters,setSidebarGroupOpen,markActiveNav,readDynamicTabsConfig,dynamicTabEntries,cloneDynamicTabPanel,updateDynamicTabsState,wireDynamicTabs,sliderLimits,sliderValue,paintPrototypeSlider,wireIoAlarm,wirePrototypeControls,wireRuntime,applyRules].map(f=>f.toString()).join('\n')+'\nconst getRules='+getRules.toString()+';\nconst saveRules='+saveRules.toString()+';';
 const routeJs=JSON.stringify(routeByUrl), pagesJs=JSON.stringify(PROJECT.pages), contentJs=JSON.stringify(store.content), shellJs=JSON.stringify(store.shellByType);
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>原型导出</title><style>${PROJECT.theme}
body{margin:0}
.rule-hide{display:none!important}.rule-dis,.is-dis{opacity:.4;filter:grayscale(1);pointer-events:none}
.ed-toggled-on{box-shadow:inset 0 0 0 2px #1e88e5}
</style><style id="module-css">${PROJECT.typeStyles[pageByKey[curKey].type]||''}</style></head><body>
${buildDocExport(curKey,PROJECT.theme,PROJECT.typeStyles,store.shellByType,store.content,store.topNav)}
<script>
const routeByUrl=${routeJs}, PAGES=${pagesJs}, pageByKey={}; PAGES.forEach(p=>pageByKey[p.key]=p);
const content=${contentJs}, shellByType=${shellJs}, topNav=${JSON.stringify(store.topNav)};
function inject(shellHtml,contentHtml){const doc=new DOMParser().parseFromString(shellHtml,'text/html');const ph=doc.getElementById('sub_page_body');if(ph)ph.innerHTML=contentHtml;return doc.body.innerHTML}
${runtimeSrc}
function render(key){const p=pageByKey[key]||pageByKey[Object.keys(pageByKey)[0]];const type=p.type;
 document.getElementById('module-css').textContent=(${JSON.stringify(PROJECT.typeStyles)})[type]||'';
 const inner=(type==='config'||type==='maintenance')?inject(shellByType[type],content[p.key]):content[p.key];
 document.querySelector('.module-root').innerHTML=inner; ids(document); markActiveNav(document,p.key);
 wireDynamicTabs(document,{design:false});wirePrototypeControls(document,{pageKey:p.key});initRepeaters(document); applyRules(document); go._k=p.key;}
function go(key){location.hash='#/'+key}
window.addEventListener('hashchange',()=>render(decodeURIComponent(location.hash.replace(/^#\\/?/,''))||'${curKey}'));
wireDynamicTabs(document,{design:false});wirePrototypeControls(document,{});wireRuntime(document); render('${curKey}');
<\/script></body></html>`;}
$('#ex').onclick=()=>{$('#out').value=buildExport(); $('#modal').style.display='flex'};
$('#cl').onclick=()=>$('#modal').style.display='none';
$('#dl').onclick=()=>{const u=URL.createObjectURL(new Blob([$('#out').value],{type:'text/html'})),a=document.createElement('a');a.href=u;a.download='prototype.html';document.body.append(a);a.click();a.remove();toast('请在弹出的窗口选择保存位置')};
$('#cp').onclick=()=>{$('#out').select();try{document.execCommand('copy');toast('已复制')}catch(e){toast('请手动 Ctrl+C 复制')}};

function initResize(){
 function drag(handle,cssVar,fromLeft){
  handle.addEventListener('pointerdown',e=>{e.preventDefault();handle.classList.add('drag');
   const startX=e.clientX,startW=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(cssVar));
   const move=ev=>{let d=ev.clientX-startX; if(!fromLeft)d=-d; let w=Math.max(160,Math.min(560,startW+d)); document.documentElement.style.setProperty(cssVar,w+'px')};
   const up=()=>{handle.classList.remove('drag');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
   window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  });
 }
 drag($('#rsz1'),'--lw',true); drag($('#rsz2'),'--rw',false);
}
initResize();
function setZoom(v){v=Math.max(0.25,Math.min(2,v)); document.documentElement.style.setProperty('--zoom',v); $('#zt').textContent=Math.round(v*100)+'%'}
$('#zi').onclick=()=>setZoom(zoomVal()+0.1); $('#zo').onclick=()=>setZoom(zoomVal()-0.1); $('#zr').onclick=()=>setZoom(1);
// Editing enhancements for the original 29-page prototype. No replacement pages or theme.
const originalSource=JSON.parse(JSON.stringify(PROJECT));
let editBaseline=null,previewData=null,viewChanges=new Map(),loadSerial=0,readyKey='',enhancedHistory={},enhancedIndex={},structureTimer=null,projectTitle='原型编辑器工程',previewVisited=new Set();
const cloneData=x=>JSON.parse(JSON.stringify(x)),activeData=()=>mode==='preview'&&previewData?previewData:store;
const safeJson=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const signature=()=>JSON.stringify({pages:PROJECT.pages,store});let savedSignature=signature();
function updateEditorStatus(){
 $('#oe-status').textContent=(signature()===savedSignature?'无未保存修改':'有修改，请保存')+' · '+PROJECT.pages.length+' 个页面';
 const n=enhancedIndex[curKey]||0,a=enhancedHistory[curKey]||[];$('#un').disabled=mode!=='design'||n===0;$('#re').disabled=mode!=='design'||n>=a.length;
 $('#oe-reset').disabled=mode!=='preview';
}
function downloadFile(name,text,mime){const u=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function rememberView(el){if(!viewChanges.has(el.dataset.edId))viewChanges.set(el.dataset.edId,{active:el.classList.contains('active'),in:el.classList.contains('in'),display:el.style.display,hidden:el.hidden,classAttr:el.getAttribute('class'),styleAttr:el.getAttribute('style')});}
function activateTab(anchor){const d=doc(),target=d.getElementById((anchor.getAttribute('href')||'').slice(1));if(!target)return;const list=anchor.closest('ul.tabs');
 [...list.children].forEach(li=>{if(mode==='design')rememberView(li);li.classList.toggle('active',li.contains(anchor));});
 [...target.parentElement.children].filter(e=>e.tagName==='DIV').forEach(panel=>{if(mode==='design')rememberView(panel);panel.classList.toggle('active',panel===target);panel.classList.toggle('in',panel===target);});
 renderViewTabs();renderStructure();
}
function revealElement(el){
 if(mode!=='design')return;
 const chain=[];let p=el;while(p&&p!==doc().body){chain.unshift(p);p=p.parentElement;}
 for(const node of chain){if(node.matches('.tabs-content>div[id]')){const link=[...doc().querySelectorAll('ul.tabs a')].find(a=>a.getAttribute('href')==='#'+node.id);if(link)activateTab(link);}if(getComputedStyle(node).display==='none'&&!node.matches('.lavaui-combo-panel')){rememberView(node);node.style.display=node.matches('.modal')?'flex':'block';node.hidden=false;}}
}
function cleanElement(node,serializeValues=false){
 const copy=node.cloneNode(true),a=[node,...node.querySelectorAll('*')],b=[copy,...copy.querySelectorAll('*')];
 a.forEach((source,i)=>{const target=b[i],view=mode==='design'?viewChanges.get(source.dataset.edId):null;
  if(view){target.classList.toggle('active',view.active);target.classList.toggle('in',view.in);target.style.display=view.display;target.hidden=view.hidden;if(view.classAttr===null&&!target.className)target.removeAttribute('class');if(view.styleAttr===null&&target.style.length===0)target.removeAttribute('style');}
  if(serializeValues&&source.matches('input,textarea,select')){if(source.tagName==='TEXTAREA')target.textContent=source.value;else if(source.tagName==='SELECT')[...target.options].forEach((o,k)=>o.toggleAttribute('selected',source.options[k].selected));else if(source.type==='checkbox'||source.type==='radio')target.toggleAttribute('checked',source.checked);else if(source.type!=='file')target.setAttribute('value',source.value);}
 });return copy;
}
function extractPage(d){
 const p=pageByKey[curKey],result={};if(!p||!d?.querySelector('.module-root'))return null;
 const nav=d.getElementById('index_head_menu');if(nav)result.topNav=cleanElement(nav,mode==='preview').outerHTML;
 if(p.type==='config'||p.type==='maintenance'){
  const root=d.querySelector('.module-root > .container'),body=d.getElementById('sub_page_body');if(root){const copy=cleanElement(root,mode==='preview'),ph=copy.querySelector('#sub_page_body');if(body)result.content=cleanElement(body,mode==='preview').innerHTML;if(ph)ph.innerHTML='';result.shell=copy.outerHTML;}
 }else result.content=cleanElement(d.querySelector('.module-root'),mode==='preview').innerHTML;
 return result;
}
function storageLocation(field,key=curKey){return field==='content'?[store.content,key]:field==='shell'?[store.shellByType,pageByKey[key].type]:[store,'topNav'];}
captureAll=function(d){
 if(mode==='design'){snap();return;}
 if(readyKey!==curKey)return;const next=extractPage(d);if(!next)return;const data=activeData();if(next.content!==undefined)data.content[curKey]=next.content;if(next.shell!==undefined)data.shellByType[pageByKey[curKey].type]=next.shell;if(next.topNav!==undefined)data.topNav=next.topNav;
};
snap=function(){
 if(mode!=='design'||readyKey!==curKey||!editBaseline)return;
 const next=extractPage(doc());if(!next)return;const changes=[];
 for(const field of Object.keys(next))if(next[field]!==editBaseline[field]){const [object,key]=storageLocation(field);changes.push({field,before:object[key],after:next[field]});object[key]=next[field];}
 if(changes.length){const index=enhancedIndex[curKey]||0,list=(enhancedHistory[curKey]||[]).slice(0,index);list.push(changes);if(list.length>50)list.shift();enhancedHistory[curKey]=list;enhancedIndex[curKey]=list.length;}
 editBaseline=next;updateEditorStatus();
};
restore=function(dir){
 if(mode!=='design')return;snap();const list=enhancedHistory[curKey]||[],i=enhancedIndex[curKey]||0;if((dir<0&&i===0)||(dir>0&&i>=list.length))return;
 const changes=list[dir<0?i-1:i];let skipped=0;for(const change of changes){const [object,key]=storageLocation(change.field),expected=dir<0?change.after:change.before;if(change.field!=='content'&&object[key]!==expected){skipped++;continue;}object[key]=dir<0?change.before:change.after;}
 enhancedIndex[curKey]=i+dir;load(curKey,true);if(skipped)toast('已保留其他页面对公共区域的后续修改');
};
buildDoc=function(key){const p=pageByKey[key],type=p.type,data=activeData(),inner=(type==='config'||type==='maintenance')?inject(data.shellByType[type],data.content[key]):data.content[key];
 return `<!doctype html><html><head><meta charset="utf-8"><style>${PROJECT.theme}${PROJECT.typeStyles[type]||''}
body{margin:0}
.design-mode [data-ed-id]:hover{outline:1px dashed #60a5fa;outline-offset:-1px}
.design-mode [data-rules]{outline:1px dotted #a855f7;outline-offset:-1px}
.rule-hide{display:none!important}.rule-dis,.is-dis{opacity:.4;filter:grayscale(1);pointer-events:none}
.ed-toggled-on{box-shadow:inset 0 0 0 2px #1e88e5}
</style></head><body data-oe-page="${esc(key)}" class="${mode==='design'?'design-mode':''}"><div class="container">${data.topNav}<div class="page-body fixed" id="main_page_body"><div class="module-root">${inner}</div></div></div></body></html>`;
};
function prototypeConfigRevision(key){let hash=2166136261;const text=store.content[key]||'';for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(36);}
function smartPick(target){if(!$('#oe-smart').checked)return target.closest('[data-ed-id]');const item=target.closest('ul.tabs>li'),action=item&&!item.querySelector(':scope>a[href^="#"]')?item.querySelector('button'):null;return action||target.closest('[data-oe-slider]')||target.closest('.dragbar')||target.closest('.lavaui-combo-container')||target.closest('button')||target.closest('input,textarea,select')||target.closest('label.checkbox,label.radio')?.querySelector('input')||target.closest('[data-ed-id]');}
function deleteSelectedElement(){
 if(mode!=='design'||!sel||!doc().contains(sel))return false;const d=doc(),element=sel,root=d.querySelector('.module-root'),body=d.getElementById('sub_page_body');
 if(element.matches('html,body,.module-root,#main_page_body,#sub_page_body,#index_head_menu')||(root&&element.contains(root))||(body&&element.contains(body))){toast('这是页面公共结构，不能直接删除；可选择里面的具体控件编辑');return false;}
 const inTabs=element.closest('ul.tabs'),item=element.closest('ul.tabs>li'),isHeaderAction=!!element.closest('button')||!!(element===item&&!item.querySelector(':scope>a[href^="#"]')&&item.querySelector('button'));
 if(element.matches('ul.tabs,.tabs-content,.tabs-content>div')||(inTabs&&!isHeaderAction)){toast('请通过「页签操作 → 管理页签」删除页签；交互按钮可以直接删除');return false;}
 select(null);element.remove();if(item&&d.contains(item)&&!item.querySelector('a,button,input')&&!item.textContent.trim())item.remove();snap();renderViewTabs();return true;
}
const originalSelect=select;
select=function(el){originalSelect(el);renderSelectionTools();scheduleStructure();};
function nodeName(el){if(!el)return '';if(el.matches('.lavaui-combo-container'))return '下拉/日期控件 '+(el.querySelector('input')?.getAttribute('data-param')||el.querySelector('input')?.id||'');if(el.matches('input'))return ({checkbox:'复选框',radio:'单选框',password:'密码框',number:'数字框',date:'日期',time:'时间'}[el.type]||'输入框')+' '+(el.getAttribute('data-param')||el.name||el.id||el.getAttribute('placeholder')||el.value||'').slice(0,28);if(el.matches('textarea'))return '多行文本';if(el.matches('select'))return '下拉框';if(el.matches('button'))return '按钮 '+el.textContent.trim().slice(0,25);if(el.matches('table'))return '表格';if(el.matches('.modal'))return '弹窗 '+(el.querySelector('.modal-title')?.textContent.trim()||el.id);return el.textContent.trim().replace(/\s+/g,' ').slice(0,32)||el.id||el.tagName.toLowerCase();}
function scheduleStructure(){clearTimeout(structureTimer);structureTimer=setTimeout(renderStructure,100);}
function renderStructure(){
 const root=doc()?.querySelector('.module-root');if(!root)return;const search=$('#oe-search').value.trim().toLowerCase(),items=[];
 function visit(node,depth){for(const el of node.children){if(el.matches('script,style'))continue;const match=el.matches('input,textarea,select,button,[data-oe-slider],.dragbar,.lavaui-combo-container,table,.modal,[data-repeater],.form-group,.tabs-content>div,.panel>.panel-body')&&!el.closest('.lavaui-combo-panel');if(match){const text=nodeName(el),hide=getComputedStyle(el).display==='none'||el.getBoundingClientRect().width===0;if(!search||text.toLowerCase().includes(search))items.push(`<button class="oe-node ${sel===el?'current':''}" data-node="${esc(el.dataset.edId)}" style="padding-left:${7+Math.min(depth,5)*10}px" title="${esc(text)}">${hide?'◌':'·'} ${esc(text)}</button>`);}if(!el.matches('.lavaui-combo-container,select,textarea'))visit(el,depth+(match?1:0));}}
 visit(root,0);$('#oe-structure').innerHTML=items.join('')||'<p class="hint">没有匹配的控件</p>';
}
function renderViewTabs(){const d=doc();if(!d)return;const lists=visibleTabLists(d);$('#oe-viewtabs').innerHTML=lists.length?lists.map(list=>`<span class="oe-tabset" data-tab-list="${esc(list.dataset.edId)}">${managedTabEntries(list).map(entry=>`<button data-view-tab="${esc(entry.panel.id)}" data-tab-entry="${esc(entry.id)}" draggable="${mode==='design'}" title="${mode==='design'?'拖动调整顺序；点击切换':'点击切换'}" class="${entry.anchor.parentElement.classList.contains('active')?'on':''}">${esc(entry.anchor.textContent.trim())}</button>`).join('')}<button class="oe-add-tab" data-new-tab="${esc(list.dataset.edId)}"${mode!=='design'?' disabled':''}>＋ 新增页签</button><button data-manage-tabs="${esc(list.dataset.edId)}"${mode!=='design'?' disabled':''}>管理页签</button><button data-dynamic-tabs="${esc(list.dataset.edId)}"${mode!=='design'?' disabled':''}>交互配置</button></span>`).join(''):`<span class="hint">当前页面没有可见页签</span> <button id="oe-create-tabgroup" class="oe-add-tab"${mode!=='design'?' disabled':''}>＋ 添加页签组</button>`;$('#oe-viewtabs').hidden=false;}
function renderSelectionTools(){const head=$('#oe-selection');if(!head)return;if(!sel){head.innerHTML='<span>选中原页面控件后，可编辑属性。隐藏内容也可从左侧结构定位。</span>';return;}const chain=[];let p=sel;while(p&&p.matches('[data-ed-id]')&&chain.length<5){chain.unshift(p);p=p.parentElement;}head.innerHTML=chain.map(e=>`<button data-crumb="${esc(e.dataset.edId)}" title="${esc(nodeName(e))}">${esc(e.tagName.toLowerCase())}${e.id?'#'+esc(e.id):''}</button>`).join('<span>›</span>');}
const baseRenderProps=renderProps;
renderProps=function(){
 baseRenderProps();if(!sel)return;
 const textTarget=sel.matches('.lavaui-combo-container')?(sel.querySelector('input')||sel):sel,textColor=hex(getComputedStyle(textTarget).color)||'#ffffff';
 props.insertAdjacentHTML('afterbegin',`<label>字体颜色<div class="oe-font-color"><input type="color" id="oe-text-color" value="${esc(textColor)}" aria-label="选择字体颜色"><input id="oe-text-color-hex" value="${esc(textColor)}" placeholder="#RRGGBB" aria-label="字体颜色色值" maxlength="7"></div></label>`);
 const options=sel.matches('.lavaui-combo-container')?[...sel.querySelectorAll('.list-group-item')]:sel.matches('select')?[...sel.options]:null;
 if(options){$('#f_o')?.closest('label')?.remove();const lines=options.map(o=>(o.getAttribute('data-value')??o.value??'')+' | '+o.textContent.trim()).join('\n');props.insertAdjacentHTML('afterbegin',`<details open class="oe-options"><summary>原控件选项（保留选项值）</summary><p class="hint">每行：值 | 显示文字。点击应用后才修改原控件。</p><textarea id="oe-options" rows="5">${esc(lines)}</textarea><button id="oe-apply-options">应用选项</button></details>`);}
 if(sel.matches('textarea'))props.insertAdjacentHTML('afterbegin',`<label>默认内容<textarea id="oe-textarea" rows="4">${esc(sel.defaultValue)}</textarea></label>`);
 if(sel.matches('input,textarea,select'))props.insertAdjacentHTML('afterbegin',`<label class="oe-inline"><input id="oe-native-disabled" type="checkbox"${sel.disabled?' checked':''}>原生禁用状态</label>`);
};
const basePropsInput=props.oninput;
props.oninput=function(e){if(!sel||mode!=='design')return;if(['oe-text-color','oe-text-color-hex'].includes(e.target.id)){let color=e.target.value;if(!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color))return;if(color.length===4)color='#'+[...color.slice(1)].map(x=>x+x).join('');const target=sel.matches('.lavaui-combo-container')?(sel.querySelector('input')||sel):sel;target.style.color=color;$('#oe-text-color').value=color;if(e.target.id==='oe-text-color')$('#oe-text-color-hex').value=color;snap();return;}if(e.target.id==='oe-textarea'){sel.value=e.target.value;sel.textContent=e.target.value;return;}if(e.target.id==='oe-native-disabled'){sel.disabled=e.target.checked;return;}basePropsInput(e);if(e.target.id==='d_s'){const input=sel.querySelector('input');if(input)input.setAttribute('value',input.value);}renderSelectionTools();};
const basePropsClick=props.onclick;
props.onclick=function(e){
 if(e.target.closest('[data-act="del"]')){deleteSelectedElement();return;}
 if(e.target.id==='oe-apply-options'&&sel){const lines=$('#oe-options').value.split('\n').filter(s=>s.trim()).map(s=>{const i=s.indexOf('|');return i<0?{v:s.trim(),t:s.trim()}:{v:s.slice(0,i).trim(),t:s.slice(i+1).trim()};});if(!lines.length||new Set(lines.map(x=>x.v)).size!==lines.length){toast('选项不能为空，且选项值不能重复');return;}
  if(sel.matches('select')){const value=sel.value;sel.replaceChildren(...lines.map(x=>{const o=doc().createElement('option');o.value=x.v;o.textContent=x.t;o.selected=x.v===value;return o;}));if(![...sel.options].some(o=>o.selected))sel.selectedIndex=0;[...sel.options].forEach(o=>o.toggleAttribute('selected',o.selected));}
  else{const panel=sel.querySelector('.lavaui-combo-panel'),old=panel.querySelector('.list-group-item.active')?.getAttribute('data-value'),example=panel.querySelector('.list-group-item');if(!example){toast('该控件没有可编辑的原始选项模板');return;}panel.replaceChildren(...lines.map((x,i)=>{const o=example.cloneNode(true);o.removeAttribute('data-ed-id');o.dataset.value=x.v;o.textContent=x.t;o.classList.toggle('active',x.v===old||(!lines.some(n=>n.v===old)&&i===0));return o;}));const input=sel.querySelector('input'),active=panel.querySelector('.active');if(input&&active){input.value=active.textContent;input.setAttribute('value',input.value);}}
  ids(doc());snap();renderProps();toast('已更新当前原控件的选项');return;
 }
 basePropsClick(e);scheduleStructure();renderSelectionTools();
};
load=function(key){
 if(!pageByKey[key])return;const serial=++loadSerial;curKey=key;readyKey='';sel=null;editBaseline=null;viewChanges=new Map();box.style.display='none';$('#oe-load-error').hidden=true;
 frame.onload=()=>{if(serial!==loadSerial)return;const d=doc();if(d.body?.dataset.oePage!==key)return;try{ids(d);markActiveNav(d,key);wireDynamicTabs(d,{design:mode==='design',changed:()=>{renderViewTabs();renderStructure();}});wirePrototypeControls(d,{design:mode==='design',pageKey:key,restore:!previewVisited.has(key),storage:{getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)},projectId:(window.prototypeDesktop?.projectKey||location.pathname)+':'+prototypeConfigRevision(key)});wireRuntime(d);if(mode==='preview'){previewVisited.add(key);initRepeaters(d);applyRules(d);}attachSelHandlers(d);readyKey=key;editBaseline=extractPage(d);select(null);renderTree();renderViewTabs();renderStructure();updateEditorStatus();
  d.addEventListener('keydown',e=>{if(mode!=='design')return;if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();restore(e.key.toLowerCase()==='z'?-1:1);}else if(e.key==='Delete'){e.preventDefault();deleteSelectedElement();}});
  d.addEventListener('click',e=>{if(mode==='preview'&&e.target.closest('ul.tabs a[href^="#"]'))renderViewTabs();});
 }catch(error){$('#oe-load-error').textContent='当前页初始化失败：'+error.message;$('#oe-load-error').hidden=false;}};
 frame.srcdoc=buildDoc(key);
};
goPage=function(key){if(!pageByKey[key]||key===curKey)return;captureAll(doc());load(key);};
setMode=function(next){if(next===mode)return;if(mode==='design'){snap();previewVisited=new Set();previewData=cloneData(store);}else previewData=null;mode=next;$('#bd').classList.toggle('on',mode==='design');$('#bp').classList.toggle('on',mode==='preview');load(curKey);};
$('#oe-reset').onclick=()=>{previewData=cloneData(store);previewVisited.add(curKey);load(curKey);toast('已恢复设计默认值；本地已保存配置保留');};
$('#oe-viewtabs').onclick=e=>{const button=e.target.closest('[data-view-tab]');if(!button)return;const list=tabListById(button.closest('[data-tab-list]')?.dataset.tabList),entry=list?managedTabEntries(list).find(x=>x.id===button.dataset.tabEntry):null;const a=entry?.anchor||[...doc().querySelectorAll('ul.tabs a')].find(a=>a.getAttribute('href')==='#'+button.dataset.viewTab);if(a)activateTab(a);};
$('#oe-structure').onclick=e=>{const button=e.target.closest('[data-node]');if(!button)return;const element=[...doc().querySelectorAll('[data-ed-id]')].find(x=>x.dataset.edId===button.dataset.node);if(element){revealElement(element);select(element);element.scrollIntoView({block:'nearest',inline:'nearest'});}};
$('#oe-selection').onclick=e=>{const button=e.target.closest('[data-crumb]');if(button)select([...doc().querySelectorAll('[data-ed-id]')].find(x=>x.dataset.edId===button.dataset.crumb));};
$('#oe-search').oninput=renderStructure;
// New pages reuse the imported page shell, stylesheet and runtime.
function newPageDefaults(){const source=pageByKey[$('#oe-page-source').value];if(!source)return;$('#oe-page-folder').value=source.path.slice(0,-1).join(' / ');$('#oe-page-title').value=source.title+' 副本';updatePageNavHint();}
function updatePageNavHint(){const source=pageByKey[$('#oe-page-source').value];if(!source)return;$('#oe-page-nav-hint').textContent=['config','maintenance'].includes(source.type)?'勾选后，在该模块原有侧边栏追加一个入口；其他目录会新建导航分组。':'勾选后，在原型顶部导航追加一个入口。';}
function closePageDialog(){const dialog=$('#oe-page-dialog');dialog.hidden=true;$('#oe-add-page').focus();}
$('#oe-add-page').onclick=()=>{snap();$('#oe-page-source').innerHTML=PROJECT.pages.map(p=>`<option value="${esc(p.key)}">${esc(p.path.join(' / '))}</option>`).join('');$('#oe-page-source').value=curKey;$('#oe-page-method').value='copy';$('#oe-page-nav').checked=true;$('#oe-page-error').textContent='';newPageDefaults();$('#oe-page-dialog').hidden=false;$('#oe-page-title').focus();$('#oe-page-title').select();};
$('#oe-page-source').onchange=newPageDefaults;
$('#oe-page-cancel').onclick=closePageDialog;
$('#oe-page-dialog').onclick=e=>{if(e.target===$('#oe-page-dialog'))closePageDialog();};
document.addEventListener('keydown',e=>{if($('#oe-page-dialog').hidden)return;if(e.key==='Escape'){e.preventDefault();closePageDialog();}if(e.key==='Tab'){const fields=[...$('#oe-page-form').querySelectorAll('input,select,button')].filter(x=>!x.disabled),first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function appendPageNavigation(page){
 const parser=new DOMParser(),isSide=['config','maintenance'].includes(page.type),d=parser.parseFromString(isSide?store.shellByType[page.type]:store.topNav,'text/html');
 if(isSide){const menu=d.querySelector('.page-sidebar-menu');if(!menu)throw Error('参考页面缺少侧边导航，请取消添加导航后重试');let host=menu;
  if(page.type==='config'){const groupName=page.path.at(-2)||'新增页面';let group=[...menu.children].find(li=>li.querySelector(':scope > a > .title')?.textContent.trim()===groupName);
   if(!group){group=d.createElement('li');group.className='nav-item';group.innerHTML='<a href="#" class="nav-link nav-toggle"><span class="title"></span></a><ul class="sub-menu"></ul>';group.querySelector('.title').textContent=groupName;menu.append(group);}host=group.querySelector(':scope > .sub-menu');}
  const item=d.createElement('li');item.className='nav-item';item.innerHTML='<a href="#" class="nav-link"><i class="fa fa-file-o" style="width:20px;text-align:center"></i><span class="title"></span></a>';item.querySelector('a').dataset.url=page.url;item.querySelector('.title').textContent=page.title;host.append(item);
  return {shell:d.body.innerHTML};
 }
 const nav=d.querySelector('#index_head_menu');if(!nav)throw Error('参考页面缺少顶部导航，请取消添加导航后重试');const group=d.createElement('div');group.className='btn-group menu-group-left';group.innerHTML='<div class="menu-button"><i class="fa fa-file-o menu-img-size"></i><div class="menu-font"><span></span></div></div>';group.querySelector('.menu-button').dataset.url=page.url;group.querySelector('span').textContent=page.title;nav.insertBefore(group,nav.querySelector(':scope > .menu-group-right'));return {topNav:nav.outerHTML};
}
function createOriginalPage({sourceKey,title,folder='',method='copy',navigation=true}){
 const source=pageByKey[sourceKey];title=title.trim();if(!source)throw Error('请选择参考页面');if(!title||title.length>60)throw Error('请输入 1–60 个字的页面名称');if(/[\/\\|]/.test(title))throw Error('页面名称不能包含 /、\\ 或 |');if(!['copy','blank'].includes(method))throw Error('创建方式无效');
 const directories=folder.split('/').map(x=>x.trim()).filter(Boolean);if(directories.some(x=>x.includes('|')||x.includes('\\')))throw Error('目录请使用 / 分隔，不能包含 | 或 \\');const path=[...directories,title];if(PROJECT.pages.some(p=>JSON.stringify(p.path)===JSON.stringify(path)))throw Error('该目录下已存在同名页面，请换一个名称');if(PROJECT.pages.some(p=>(p.path.length<path.length&&p.path.every((s,i)=>s===path[i]))||(path.length<p.path.length&&path.every((s,i)=>s===p.path[i]))))throw Error('目录与现有页面或分组重名，请选择其他目录');
 if(mode==='design')snap();const key='custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),page={key,title,type:source.type,path,icon:'file-o',url:'/prototype-custom/'+key+'.html'};
 const content=method==='copy'?store.content[sourceKey]:`<div class="panel"><div class="panel-body" style="min-height:240px"><div class="form form-horizontal"><div class="form-group"><div class="col-sm-10"><a class="bolder"><span>${esc(title)}</span></a></div></div></div></div></div>`;
 // Prepare navigation before mutating the project, so failed validation leaves it intact.
 const nav=navigation?appendPageNavigation(page):{};if(nav.shell!==undefined)store.shellByType[page.type]=nav.shell;if(nav.topNav!==undefined)store.topNav=nav.topNav;PROJECT.pages.push(page);store.content[key]=content;pageByKey[key]=page;routeByUrl[page.url]=key;
 mode='design';previewData=null;$('#bd').classList.add('on');$('#bp').classList.remove('on');path.forEach((_,i)=>fold.delete(path.slice(0,i+1).join('|')));load(key);return page;
}
$('#oe-page-form').onsubmit=e=>{e.preventDefault();try{const page=createOriginalPage({sourceKey:$('#oe-page-source').value,title:$('#oe-page-title').value,folder:$('#oe-page-folder').value,method:$('#oe-page-method').value,navigation:$('#oe-page-nav').checked});closePageDialog();toast('已新增「'+page.title+'」，编辑后请保存可编辑 HTML');}catch(error){$('#oe-page-error').textContent=error.message;}};
document.querySelectorAll('[data-oe-left]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-oe-left]').forEach(n=>n.classList.toggle('on',n===b));$('#oe-pages').hidden=b.dataset.oeLeft!=='pages';$('#oe-palette').hidden=b.dataset.oeLeft!=='components';$('#oe-tree').hidden=b.dataset.oeLeft!=='structure';if(b.dataset.oeLeft==='structure')renderStructure();});
$('#apply').onclick=()=>{if(mode!=='design'){toast('请在设计模式应用代码');return;}snap();const before=store.content[curKey],after=$('#code').value;if(before===after)return;store.content[curKey]=after;const i=enhancedIndex[curKey]||0,a=(enhancedHistory[curKey]||[]).slice(0,i);a.push([{field:'content',before,after}]);enhancedHistory[curKey]=a;enhancedIndex[curKey]=a.length;load(curKey);toast('代码已应用，可撤销');};
function exportProjectData(){if(mode==='design')snap();return{format:'original-prototype-editor',version:1,name:projectTitle,project:{...cloneData(PROJECT),...cloneData(store)},currentPage:curKey};}
$('#oe-save').onclick=()=>{const data=exportProjectData();downloadFile(projectTitle+'.json',JSON.stringify(data,null,2),'application/json');savedSignature=signature();updateEditorStatus();toast('工程文件已生成');};
$('#oe-save-html').onclick=()=>{snap();const root=document.documentElement.cloneNode(true),source=[...root.querySelectorAll('script')].find(s=>s.textContent.startsWith('const PROJECT='));source.textContent='const PROJECT='+safeJson({...cloneData(PROJECT),...cloneData(store),editorStartKey:curKey})+';';root.querySelector('#frame').removeAttribute('srcdoc');root.querySelector('#oe-status').textContent='';root.querySelector('#out').textContent='';downloadFile('原型编辑器-我的修改.html','<!doctype html>\n'+root.outerHTML,'text/html;charset=utf-8');toast('已生成包含当前修改的完整可编辑 HTML');};
function validateOriginalProject(data){const p=data?.project;if(data?.format!=='original-prototype-editor'||data.version!==1||!p||!Array.isArray(p.pages)||!p.pages.length||typeof p.theme!=='string'||!p.content||!p.shellByType||!p.typeStyles||typeof p.topNav!=='string')throw Error('请选择本版保存的工程文件');const keys=new Set();for(const page of p.pages){if(typeof page.key!=='string'||keys.has(page.key)||!Array.isArray(page.path)||typeof page.url!=='string'||typeof p.content[page.key]!=='string')throw Error('页面结构或内容不完整');keys.add(page.key);if(['config','maintenance'].includes(page.type)&&typeof p.shellByType[page.type]!=='string')throw Error('缺少原页面公共模板');}return data;}
function installOriginalProject(data){validateOriginalProject(data);Object.assign(PROJECT,cloneData(data.project));Object.assign(store,{topNav:PROJECT.topNav,shellByType:cloneData(PROJECT.shellByType),content:cloneData(PROJECT.content)});for(const map of [pageByKey,routeByUrl])Object.keys(map).forEach(k=>delete map[k]);PROJECT.pages.forEach(p=>{pageByKey[p.key]=p;routeByUrl[p.url]=p.key;});Object.assign(routeByUrl,PROJECT.topDefaults||{});mode='design';previewData=null;enhancedHistory={};enhancedIndex={};$('#bd').classList.add('on');$('#bp').classList.remove('on');projectTitle=data.name||'原型编辑器工程';savedSignature=signature();load(pageByKey[data.currentPage]?data.currentPage:PROJECT.pages[0].key);}
$('#oe-open').onclick=()=>$('#oe-file').click();$('#oe-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const data=validateOriginalProject(JSON.parse(await file.text()));if(signature()!==savedSignature&&!confirm('当前有未保存修改，仍要打开其他工程？'))return;installOriginalProject(data);toast('工程已打开');}catch(error){toast(error.message,5000);}finally{e.target.value='';}};
window.addEventListener('beforeunload',e=>{if(mode==='design')snap();if(signature()!==savedSignature){e.preventDefault();e.returnValue='';}});
// Correct the original export's missing runtime bindings; retain original rendering and controls.
const baselineExport=buildExport;
buildExport=function(){snap();let html=baselineExport();return html;};
$('#oe-fit').onclick=()=>{setZoom(Math.min(1,Math.max(.25,($('#cv').clientWidth-28)/1400)));};

// Add content tabs to an existing original page, without replacing its panels.
let tabDialogList=null;
function visibleTabLists(d){return [...d.querySelectorAll('.module-root ul.tabs')].filter(list=>{for(let node=list;node&&node!==d.body;node=node.parentElement)if(node.hidden||getComputedStyle(node).display==='none')return false;return [...list.querySelectorAll(':scope > li > a[href^="#"]')].some(a=>a.textContent.trim()&&d.getElementById(a.getAttribute('href').slice(1)));});}
function tabGroupPlan(){
 const d=doc(),root=d.querySelector('#sub_page_body')||d.querySelector('.module-root');if(!root)throw Error('当前页面尚未加载完成');const primary=[...root.children].find(x=>x.matches('.panel:not(.modal)')&&x.querySelector(':scope > .panel-body')),host=primary?.querySelector(':scope > .panel-body')||root;
 const hidden=[...host.children].find(x=>x.matches('ul.tabs')&&[...x.querySelectorAll(':scope > li > a[href^="#"]')].some(a=>d.getElementById(a.getAttribute('href').slice(1))));return {root,host,list:hidden||null};
}
function openGroupDialog(){if(mode!=='design'||readyKey!==curKey)return;snap();const plan=tabGroupPlan(),link=plan.list?.querySelector(':scope > li > a[href^="#"]');$('#oe-group-first').value=link?.textContent.trim()||'常规设置';$('#oe-group-second').value='高级设置';$('#oe-group-method').value='blank';$('#oe-group-error').textContent='';$('#oe-group-dialog').hidden=false;$('#oe-group-first').focus();$('#oe-group-first').select();}
function closeGroupDialog(){$('#oe-group-dialog').hidden=true;$('#oe-create-tabgroup')?.focus();}
$('#oe-viewtabs').addEventListener('click',e=>{if(e.target.closest('#oe-create-tabgroup'))openGroupDialog();});
$('#oe-group-cancel').onclick=closeGroupDialog;
$('#oe-group-dialog').onclick=e=>{if(e.target===$('#oe-group-dialog'))closeGroupDialog();};
document.addEventListener('keydown',e=>{if($('#oe-group-dialog').hidden)return;if(e.key==='Escape'){e.preventDefault();closeGroupDialog();}else if(e.key==='Tab'){const fields=[...$('#oe-group-form').querySelectorAll('input,select,button')],first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function createOriginalTabGroup({firstTitle,secondTitle,method='blank'}){
 if(mode!=='design'||readyKey!==curKey)throw Error('请先在设计模式打开页面');firstTitle=firstTitle.trim();secondTitle=secondTitle.trim();if(!firstTitle||!secondTitle||firstTitle.length>40||secondTitle.length>40)throw Error('每个页签名称需要 1–40 个字');if(firstTitle===secondTitle)throw Error('两个页签名称不能相同');if(!['blank','copy'].includes(method))throw Error('内容来源无效');if(visibleTabLists(doc()).length)throw Error('当前页面已有页签，请使用「新增页签」');
 const {host,list:existing}=tabGroupPlan(),d=doc(),prefix='oe_group_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);snap();let list=existing,first;
 if(list){const links=[...list.querySelectorAll(':scope > li > a[href^="#"]')],link=links.find(a=>a.parentElement.classList.contains('active'))||links[0];first=d.getElementById(link.getAttribute('href').slice(1));link.textContent=firstTitle;list.hidden=false;list.style.removeProperty('display');if(!list.getAttribute('style'))list.removeAttribute('style');}
 else{list=d.createElement('ul');list.className='tabs';const content=d.createElement('div');content.className='tabs-content';first=d.createElement('div');first.id=prefix+'_first';first.className='panel-body active';first.style.padding='0';const item=d.createElement('li');item.className='active';const link=d.createElement('a');link.href='#'+first.id;link.textContent=firstTitle;item.append(link);list.append(item);
  // Keep top-level dialogs and script/style nodes outside switchable content.
  const nodes=[...host.childNodes].filter(x=>x.nodeType!==1||!x.matches('.modal,.trigger_modal,script,style'));if(host.classList.contains('module-root')){const height=Math.max(300,Math.round(host.getBoundingClientRect().height)||650);first.style.height=height+'px';first.style.position='relative';content.style.minHeight=height+'px';}
  host.prepend(list);content.append(first);list.after(content);nodes.forEach(x=>first.append(x));}
 ids(d);const second=method==='copy'?copyTabPanel(first,prefix+'_second'):d.createElement('div');second.id=prefix+'_second';second.removeAttribute('data-ed-id');second.classList.add('panel-body');second.classList.remove('active','in');second.hidden=false;second.style.removeProperty('display');if(method==='blank'){second.style.cssText='position:relative;min-height:260px;padding:0';second.innerHTML='<div class="form form-horizontal" style="min-height:240px"></div>';}
 const item=d.createElement('li'),link=d.createElement('a');link.href='#'+second.id;link.textContent=secondTitle;item.append(link);list.append(item);first.parentElement.append(second);ids(d);snap();activateTab(link);select(second);renderViewTabs();renderStructure();return {firstId:first.id,secondId:second.id};
}
$('#oe-group-form').onsubmit=e=>{e.preventDefault();try{createOriginalTabGroup({firstTitle:$('#oe-group-first').value,secondTitle:$('#oe-group-second').value,method:$('#oe-group-method').value});closeGroupDialog();toast('已添加页签组，现有内容保留在第一个页签');}catch(error){$('#oe-group-error').textContent=error.message;}};
function tabEntries(list){return [...list.querySelectorAll(':scope > li > a[href^="#"]')].map(anchor=>({anchor,panel:doc().getElementById(anchor.getAttribute('href').slice(1))})).filter(x=>x.panel&&x.anchor.textContent.trim());}
function openTabDialog(list){
 if(mode!=='design'||!list||readyKey!==curKey)return;snap();tabDialogList=list;const entries=tabEntries(list);if(!entries.length){toast('当前页签组没有可用的内容区域');return;}
 $('#oe-tab-source').innerHTML=entries.map(x=>`<option value="${esc(x.panel.id)}">${esc(x.anchor.textContent.trim())}</option>`).join('');const current=entries.find(x=>x.anchor.parentElement.classList.contains('active'))||entries[0];$('#oe-tab-source').value=current.panel.id;$('#oe-tab-method').value='copy';$('#oe-tab-source').hidden=false;$('#oe-tab-source-label').hidden=false;$('#oe-tab-title').value='新页签';$('#oe-tab-error').textContent='';$('#oe-tab-dialog').hidden=false;$('#oe-tab-title').focus();$('#oe-tab-title').select();
}
function closeTabDialog(){const key=tabDialogList?.dataset.edId;$('#oe-tab-dialog').hidden=true;tabDialogList=null;[...document.querySelectorAll('[data-new-tab]')].find(x=>x.dataset.newTab===key)?.focus();}
$('#oe-viewtabs').addEventListener('click',e=>{const button=e.target.closest('[data-new-tab]');if(button)openTabDialog([...doc().querySelectorAll('ul.tabs')].find(x=>x.dataset.edId===button.dataset.newTab));});
$('#oe-tab-method').onchange=()=>{$('#oe-tab-source').hidden=$('#oe-tab-source-label').hidden=$('#oe-tab-method').value==='blank';};
$('#oe-tab-cancel').onclick=closeTabDialog;
$('#oe-tab-dialog').onclick=e=>{if(e.target===$('#oe-tab-dialog'))closeTabDialog();};
document.addEventListener('keydown',e=>{if($('#oe-tab-dialog').hidden)return;if(e.key==='Escape'){e.preventDefault();closeTabDialog();}else if(e.key==='Tab'){const fields=[...$('#oe-tab-form').querySelectorAll('input,select,button')].filter(x=>!x.disabled&&!x.hidden),first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function copyTabPanel(source,prefix){
 const copy=cleanElement(source),nodes=[copy,...copy.querySelectorAll('*')],htmlIds=new Map(),editIds=new Map(),groups=new Map();
 nodes.forEach((el,i)=>{if(el.id){htmlIds.set(el.id,prefix+'_id_'+i);el.id=htmlIds.get(el.id);}if(el.dataset.edId){editIds.set(el.dataset.edId,prefix+'_ed_'+i);el.dataset.edId=editIds.get(el.dataset.edId);}if(el.hasAttribute('data-repeater'))groups.set(el.getAttribute('data-repeater'),prefix+'_group_'+i);});
 nodes.forEach(el=>{for(const attr of ['href','data-target']){const v=el.getAttribute(attr);if(v?.startsWith('#')&&htmlIds.has(v.slice(1)))el.setAttribute(attr,'#'+htmlIds.get(v.slice(1)));}for(const attr of ['for','aria-controls','aria-labelledby','aria-describedby','headers']){if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).split(/\s+/).map(x=>htmlIds.get(x)||x).join(' '));}for(const attr of ['data-ed-modal','data-repeater','data-repeater-add','data-repeater-del']){const value=el.getAttribute(attr);if(htmlIds.has(value))el.setAttribute(attr,htmlIds.get(value));else if(groups.has(value))el.setAttribute(attr,groups.get(value));}
  if(el.matches('input[type=radio][name]'))el.name=prefix+'_'+el.name;if(el.hasAttribute('data-rules')){const rules=getRules(el);rules.forEach(r=>{if(editIds.has(r.s))r.s=editIds.get(r.s);});saveRules(el,rules);}
 });return copy;
}
function createOriginalTab({list,title,sourceId,method='copy'}){
 if(mode!=='design'||readyKey!==curKey||!list||!doc().contains(list))throw Error('请在设计模式打开当前页面的页签组');title=title.trim();if(!title||title.length>40)throw Error('请输入 1–40 个字的页签名称');const entries=tabEntries(list),source=entries.find(x=>x.panel.id===sourceId)||entries[0];if(!source)throw Error('找不到参考页签');if(entries.some(x=>x.anchor.textContent.trim()===title))throw Error('当前页签组已存在同名页签');if(!['copy','blank'].includes(method))throw Error('内容来源无效');
 const dynamic=readDynamicTabsConfig(list);if(dynamic&&entries.length>=dynamic.max)throw Error('当前页签组最多 '+dynamic.max+' 项');snap();const prefix='oe_tab_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),panel=method==='copy'?copyTabPanel(source.panel,prefix):cleanElement(source.panel).cloneNode(false);
 panel.id=prefix;panel.removeAttribute('data-ed-id');panel.classList.remove('active','in');panel.hidden=false;if(panel.style.display==='none')panel.style.removeProperty('display');
 if(method==='blank'){panel.innerHTML='<div class="form form-horizontal" style="min-height:240px"></div>';panel.style.minHeight='260px';panel.style.position='relative';}
 const item=cleanElement(source.anchor.parentElement).cloneNode(false);item.removeAttribute('data-ed-id');item.classList.remove('active');const anchor=doc().createElement('a');anchor.href='#'+prefix;const text=doc().createElement('span');text.textContent=title;anchor.append(text);item.append(anchor);list.append(item);source.panel.parentElement.append(panel);if(dynamic){const used=new Set(entries.map(x=>+x.anchor.getAttribute('data-oe-dynamic-slot')));let slot=1;while(used.has(slot))slot++;anchor.setAttribute('data-oe-dynamic-slot',slot);}ids(doc());updateDynamicTabsState(list);snap();activateTab(anchor);select(panel);renderViewTabs();renderStructure();return panel.id;
}
$('#oe-tab-form').onsubmit=e=>{e.preventDefault();try{createOriginalTab({list:tabDialogList,title:$('#oe-tab-title').value,sourceId:$('#oe-tab-source').value,method:$('#oe-tab-method').value});closeTabDialog();toast('页签已添加，编辑后请保存可编辑 HTML');}catch(error){$('#oe-tab-error').textContent=error.message;}};
function componentPlacement(cx,cy){
 if(mode!=='design')throw Error('请先切换到设计模式添加组件');const d=doc();let target=cx!=null&&cy!=null?d.elementFromPoint?.(cx,cy):null;
 const visible=x=>x&&!x.hidden&&getComputedStyle(x).display!=='none'&&!x.closest('.tabs-content>div:not(.active)');let panel=target?.closest('.tabs-content>div.active');if(!visible(panel))panel=null;if(!panel&&sel){const candidate=sel.closest('.tabs-content>div.active');if(visible(candidate))panel=candidate;}if(!panel)panel=[...d.querySelectorAll('.tabs-content>div.active')].filter(visible).at(-1);
 const host=panel||d.querySelector('#sub_page_body')||d.querySelector('.module-root');if(panel){if(getComputedStyle(panel).position==='static')panel.style.position='relative';const rect=panel.getBoundingClientRect();return {host,left:cx==null?24:Math.max(0,Math.round(cx-rect.left)),top:cy==null?24:Math.max(0,Math.round(cy-rect.top))};}return {host,left:cx==null?40:Math.max(0,Math.round(cx)),top:cy==null?40:Math.max(0,Math.round(cy))};
}

// Tab order and removal are content edits; the original shared shell stays intact.
let tabManager=null,tabDrag=null,tabPointerDrag=null;
function tabListById(id){return [...doc().querySelectorAll('ul.tabs')].find(x=>x.dataset.edId===id);}
function managedTabEntries(list){const entries=tabEntries(list),counts=new Map();entries.forEach(x=>counts.set(x.panel.id,(counts.get(x.panel.id)||0)+1));return entries.map(x=>({...x,id:counts.get(x.panel.id)===1?x.panel.id:x.anchor.dataset.edId}));}
function assertEditableTabs(list){if(mode!=='design'||readyKey!==curKey||!list||!doc().contains(list))throw Error('请在设计模式编辑当前页面的页签');}
function applyTabOrder(list,order){
 assertEditableTabs(list);const entries=managedTabEntries(list),byId=new Map(entries.map(x=>[x.id,x]));if(!Array.isArray(order)||!order.length)throw Error('至少保留一个页签');const min=readDynamicTabsConfig(list)?.min||1;if(order.length<min)throw Error('至少保留 '+min+' 个页签');if(new Set(order).size!==order.length||order.some(id=>!byId.has(id)))throw Error('页签顺序无效，请重新打开管理页签');const container=entries[0]?.panel.parentElement;if(entries.some(x=>x.panel.parentElement!==container))throw Error('该页签组结构不一致，不能调整');if(order.length===entries.length&&entries.every((x,i)=>x.id===order[i]))return false;
 snap();const originalDefault=entries.find(x=>cleanElement(x.anchor.parentElement).classList.contains('active'))||entries[0],viewed=entries.find(x=>x.anchor.parentElement.classList.contains('active'))||originalDefault,removed=entries.filter(x=>!order.includes(x.id)),chosenDefault=order.includes(originalDefault.id)?originalDefault:byId.get(order[0]),chosenView=order.includes(viewed.id)?viewed:chosenDefault,survivingPanels=new Set(order.map(id=>byId.get(id).panel));
 select(null);for(const entry of removed){entry.anchor.parentElement.remove();if(!survivingPanels.has(entry.panel))entry.panel.remove();}
 const movedPanels=new Set();for(const id of order){const entry=byId.get(id);list.append(entry.anchor.parentElement);if(!movedPanels.has(entry.panel)){container.append(entry.panel);movedPanels.add(entry.panel);}}
 // A view-only selection must not resurrect the deleted default when snap cleans it.
 if(chosenDefault!==originalDefault){const useIn=cleanElement(originalDefault.panel).classList.contains('in');for(const id of order){const entry=byId.get(id);for(const node of [entry.anchor.parentElement,entry.panel]){const isDefault=node===entry.panel?entry.panel===chosenDefault.panel:entry===chosenDefault,view=viewChanges.get(node.dataset.edId);if(view){view.active=isDefault;if(node===entry.panel)view.in=isDefault&&useIn;}node.classList.toggle('active',isDefault);if(node===entry.panel)node.classList.toggle('in',isDefault&&useIn);}}}
 updateDynamicTabsState(list);snap();activateTab(chosenView.anchor);renderSelectionTools();renderStructure();return true;
}
function openTabManager(list){assertEditableTabs(list);snap();tabManager={list,key:curKey,rows:managedTabEntries(list).map(x=>({id:x.id,title:x.anchor.textContent.trim(),deleted:false}))};$('#oe-manage-error').textContent='';renderTabManager();$('#oe-manage-dialog').hidden=false;$('#oe-manage-cancel').focus();}
function closeTabManager(){const id=tabManager?.list.dataset.edId;$('#oe-manage-dialog').hidden=true;$('#oe-manage-list').innerHTML='';tabManager=null;tabDrag=null;tabPointerDrag=null;[...document.querySelectorAll('[data-manage-tabs]')].find(x=>x.dataset.manageTabs===id)?.focus();}
function renderTabManager(){if(!tabManager)return;const remaining=tabManager.rows.filter(x=>!x.deleted);$('#oe-manage-list').innerHTML=tabManager.rows.map(row=>{const i=remaining.indexOf(row);return `<div class="oe-manage-row ${row.deleted?'is-deleted':''}" draggable="${!row.deleted}" data-manage-id="${esc(row.id)}">${row.deleted?'<span aria-hidden="true">≡</span>':`<button class="oe-drag-handle" draggable="false" aria-label="拖动排序 ${esc(row.title)}">≡</button>`}<span class="oe-manage-name">${esc(row.title)}</span>${row.deleted?'<button data-tab-action="restore">恢复</button>':`<button data-tab-action="up" aria-label="上移 ${esc(row.title)}"${i===0?' disabled':''}>↑</button><button data-tab-action="down" aria-label="下移 ${esc(row.title)}"${i===remaining.length-1?' disabled':''}>↓</button><button class="oe-danger" data-tab-action="delete" aria-label="删除 ${esc(row.title)}"${remaining.length<=(readDynamicTabsConfig(tabManager.list)?.min||1)?' disabled':''}>删除</button>`}</div>`;}).join('');}
function placeTabId(order,source,target,after){if(source===target)return order.slice();const next=order.filter(x=>x!==source),index=next.indexOf(target);if(index<0||!order.includes(source))return order.slice();next.splice(index+(after?1:0),0,source);return next;}
function moveManagerTab(source,target,after){if(!tabManager)return;const active=tabManager.rows.filter(x=>!x.deleted),next=placeTabId(active.map(x=>x.id),source,target,after),byId=new Map(active.map(x=>[x.id,x]));tabManager.rows=[...next.map(id=>byId.get(id)),...tabManager.rows.filter(x=>x.deleted)];renderTabManager();}
$('#oe-viewtabs').addEventListener('click',e=>{const button=e.target.closest('[data-manage-tabs]');if(button){try{openTabManager(tabListById(button.dataset.manageTabs));}catch(error){toast(error.message);}}});
$('#oe-manage-list').onclick=e=>{const button=e.target.closest('[data-tab-action]'),row=button?.closest('[data-manage-id]');if(!row||!tabManager)return;const item=tabManager.rows.find(x=>x.id===row.dataset.manageId),active=tabManager.rows.filter(x=>!x.deleted),i=active.indexOf(item);switch(button.dataset.tabAction){case'delete':if(active.length<=(readDynamicTabsConfig(tabManager.list)?.min||1))return;item.deleted=true;renderTabManager();break;case'restore':item.deleted=false;renderTabManager();break;case'up':if(i>0)moveManagerTab(item.id,active[i-1].id,false);break;case'down':if(i>=0&&i<active.length-1)moveManagerTab(item.id,active[i+1].id,true);break;}};
$('#oe-manage-cancel').onclick=closeTabManager;
$('#oe-manage-apply').onclick=()=>{try{if(!tabManager||tabManager.key!==curKey)throw Error('当前页面已变化，请重新打开管理页签');const changed=applyTabOrder(tabManager.list,tabManager.rows.filter(x=>!x.deleted).map(x=>x.id));closeTabManager();if(changed)toast('页签已更新，可撤销；完成后请保存可编辑 HTML');}catch(error){$('#oe-manage-error').textContent=error.message;}};
$('#oe-manage-dialog').onclick=e=>{if(e.target===$('#oe-manage-dialog'))closeTabManager();};
document.addEventListener('keydown',e=>{if($('#oe-manage-dialog').hidden)return;if(e.key==='Escape'){e.preventDefault();closeTabManager();}if(e.key==='Tab'){const fields=[...$('#oe-manage-dialog').querySelectorAll('button:not(:disabled)')],first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function clearTabDrag(){document.querySelectorAll('.oe-dragging,.oe-drop-before,.oe-drop-after').forEach(x=>x.classList.remove('oe-dragging','oe-drop-before','oe-drop-after'));tabDrag=null;tabPointerDrag=null;}
$('#oe-manage-list').addEventListener('pointerdown',e=>{const handle=e.target.closest('.oe-drag-handle'),row=handle?.closest('[data-manage-id]');if(!row||!tabManager||e.button!==0)return;e.preventDefault();tabPointerDrag={id:row.dataset.manageId,key:curKey};row.classList.add('oe-dragging');});
function managerDropTarget(e){const element=document.elementFromPoint?.(e.clientX,e.clientY)||e.target;return element.closest?.('#oe-manage-list [data-manage-id]:not(.is-deleted)');}
document.addEventListener('pointermove',e=>{if(!tabPointerDrag||!tabManager||tabPointerDrag.key!==curKey)return;const row=managerDropTarget(e);$('#oe-manage-list').querySelectorAll('.oe-drop-before,.oe-drop-after').forEach(x=>x.classList.remove('oe-drop-before','oe-drop-after'));if(row){const r=row.getBoundingClientRect();row.classList.add(e.clientY>r.top+r.height/2?'oe-drop-after':'oe-drop-before');}});
document.addEventListener('pointerup',e=>{if(!tabPointerDrag)return;const drag=tabPointerDrag,row=managerDropTarget(e);if(row&&tabManager&&drag.key===curKey){const r=row.getBoundingClientRect();moveManagerTab(drag.id,row.dataset.manageId,e.clientY>r.top+r.height/2);}clearTabDrag();});
function wireTabDrag(area,manager){
 const selector=manager?'[data-manage-id]':'[data-view-tab]';
 area.addEventListener('dragstart',e=>{const element=e.target.closest(selector);if(!element||mode!=='design'||element.draggable!==true||e.target.closest('[data-tab-action]')){e.preventDefault();return;}const listId=manager?tabManager?.list.dataset.edId:element.closest('[data-tab-list]')?.dataset.tabList;if(!listId)return;e.stopPropagation();tabDrag={key:curKey,listId,id:manager?element.dataset.manageId:element.dataset.tabEntry,manager};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-oe-tab',tabDrag.id);element.classList.add('oe-dragging');});
 area.addEventListener('dragover',e=>{const element=e.target.closest(selector);if(!element||!tabDrag||tabDrag.key!==curKey||tabDrag.manager!==manager||element.draggable!==true)return;const listId=manager?tabManager?.list.dataset.edId:element.closest('[data-tab-list]')?.dataset.tabList;if(listId!==tabDrag.listId)return;e.preventDefault();e.dataTransfer.dropEffect='move';const rect=element.getBoundingClientRect(),after=manager?e.clientY>rect.top+rect.height/2:e.clientX>rect.left+rect.width/2;area.querySelectorAll('.oe-drop-before,.oe-drop-after').forEach(x=>x.classList.remove('oe-drop-before','oe-drop-after'));element.classList.add(after?'oe-drop-after':'oe-drop-before');});
 area.addEventListener('drop',e=>{const element=e.target.closest(selector),drag=tabDrag;if(!element||!drag||drag.key!==curKey||drag.manager!==manager)return;const listId=manager?tabManager?.list.dataset.edId:element.closest('[data-tab-list]')?.dataset.tabList;if(listId!==drag.listId||element.draggable!==true){clearTabDrag();return;}e.preventDefault();e.stopPropagation();const rect=element.getBoundingClientRect(),after=manager?e.clientY>rect.top+rect.height/2:e.clientX>rect.left+rect.width/2,target=manager?element.dataset.manageId:element.dataset.tabEntry;try{if(manager)moveManagerTab(drag.id,target,after);else{const list=tabListById(listId);if(applyTabOrder(list,placeTabId(managedTabEntries(list).map(x=>x.id),drag.id,target,after)))toast('页签顺序已调整，可撤销');}}catch(error){toast(error.message);}finally{clearTabDrag();}});
 area.addEventListener('dragend',clearTabDrag);
}
wireTabDrag($('#oe-viewtabs'),false);wireTabDrag($('#oe-manage-list'),true);

// Self-contained runtime: the same code runs in the editor preview and exported HTML.
function readDynamicTabsConfig(list){try{const c=JSON.parse(list.getAttribute('data-oe-dynamic-tabs')||'null');return c&&c.version===1&&Number.isInteger(c.min)&&Number.isInteger(c.max)&&c.min>=1&&c.max>=c.min&&c.max<=30&&typeof c.prefix==='string'&&typeof c.templateId==='string'?c:null;}catch(_){return null;}}
function dynamicTabEntries(list){const d=list.ownerDocument;return [...list.children].flatMap(li=>[...li.children].filter(a=>a.matches('a[href^="#"]')).map(anchor=>({anchor,panel:d.getElementById(anchor.getAttribute('href').slice(1))}))).filter(x=>x.panel&&x.anchor.textContent.trim());}
function cloneDynamicTabPanel(source,prefix){
 const copy=source.cloneNode(true),nodes=[copy,...copy.querySelectorAll('*')],htmlIds=new Map(),editIds=new Map(),groups=new Map();
 nodes.forEach((el,i)=>{if(el.id){const old=el.id;htmlIds.set(old,prefix+'_id_'+i);el.id=htmlIds.get(old);}if(el.dataset.edId){const old=el.dataset.edId;editIds.set(old,prefix+'_ed_'+i);el.dataset.edId=editIds.get(old);}if(el.hasAttribute('data-repeater'))groups.set(el.getAttribute('data-repeater'),prefix+'_group_'+i);});
 nodes.forEach(el=>{for(const attr of ['href','data-target']){const v=el.getAttribute(attr);if(v?.startsWith('#')&&htmlIds.has(v.slice(1)))el.setAttribute(attr,'#'+htmlIds.get(v.slice(1)));}for(const attr of ['for','aria-controls','aria-labelledby','aria-describedby','headers']){if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).split(/\s+/).map(x=>htmlIds.get(x)||x).join(' '));}for(const attr of ['data-ed-modal','data-repeater','data-repeater-add','data-repeater-del']){const value=el.getAttribute(attr);if(htmlIds.has(value))el.setAttribute(attr,htmlIds.get(value));else if(groups.has(value))el.setAttribute(attr,groups.get(value));}if(el.matches('input[type=radio][name]'))el.name=prefix+'_'+el.name;if(el.hasAttribute('data-rules')){try{const rules=JSON.parse(el.getAttribute('data-rules'));rules.forEach(r=>{if(editIds.has(r.s))r.s=editIds.get(r.s);});el.setAttribute('data-rules',JSON.stringify(rules));}catch(_){}}});return copy;
}
function updateDynamicTabsState(list){
 const cfg=readDynamicTabsConfig(list);if(!cfg)return;const count=dynamicTabEntries(list).length,d=list.ownerDocument;
 d.querySelectorAll('[data-oe-dynamic-owner]').forEach(button=>{if(button.getAttribute('data-oe-dynamic-owner')!==list.id)return;const add=button.getAttribute('data-oe-dynamic-action')==='add',disabled=add?count>=cfg.max:count<=cfg.min;button.disabled=disabled;button.classList.toggle('is-dis',disabled);if(disabled)button.style.color='gray';else{const color=button.getAttribute('data-oe-dynamic-enabled-color');if(color)button.style.color=color;else button.style.removeProperty('color');}button.title=add?(disabled?'最多 '+cfg.max+' 个 '+cfg.prefix:'添加 '+cfg.prefix+' 配置'):(disabled?'至少保留 '+cfg.min+' 个 '+cfg.prefix:'删除当前 '+cfg.prefix+' 配置');});
}
function wireDynamicTabs(d,options){
 options=options||{};const lists=()=>[...d.querySelectorAll('ul.tabs[data-oe-dynamic-tabs]')];lists().forEach(updateDynamicTabsState);
 if(d.__oeDynamicTabsWired)return;d.__oeDynamicTabsWired=true;
 function activate(list,anchor){const panel=d.getElementById(anchor.getAttribute('href').slice(1));if(!panel)return;[...list.children].forEach(li=>li.classList.toggle('active',li.contains(anchor)));[...panel.parentElement.children].filter(el=>el.tagName==='DIV').forEach(el=>{el.classList.toggle('active',el===panel);el.classList.toggle('in',el===panel);});}
 d.addEventListener('click',e=>{if(options.design)return;const button=e.target.closest('[data-oe-dynamic-action][data-oe-dynamic-owner]');if(!button)return;const list=d.getElementById(button.getAttribute('data-oe-dynamic-owner')),cfg=list&&readDynamicTabsConfig(list);if(!cfg)return;e.preventDefault();e.stopImmediatePropagation();updateDynamicTabsState(list);if(button.disabled)return;const entries=dynamicTabEntries(list),add=button.getAttribute('data-oe-dynamic-action')==='add';
  if(add){if(entries.length>=cfg.max)return;const template=d.getElementById(cfg.templateId),source=template?.content.firstElementChild;if(!source||!entries.length)return;const used=new Set(entries.map(x=>Number(x.anchor.getAttribute('data-oe-dynamic-slot'))));let slot=1;while(used.has(slot))slot++;const prefix='oe_instance_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),panel=cloneDynamicTabPanel(source,prefix);panel.id=prefix;panel.classList.remove('active','in');panel.hidden=false;if(panel.style.display==='none')panel.style.removeProperty('display');const item=d.createElement('li');item.className=entries[0].anchor.parentElement.className;item.classList.remove('active');const anchor=d.createElement('a');anchor.href='#'+panel.id;anchor.setAttribute('data-oe-dynamic-slot',String(slot));anchor.textContent=cfg.prefix+slot;item.append(anchor);list.append(item);entries[0].panel.parentElement.append(panel);if(typeof ids==='function')ids(d);activate(list,anchor);
  }else{if(entries.length<=cfg.min)return;const current=entries.find(x=>x.anchor.parentElement.classList.contains('active'))||entries[0],index=entries.indexOf(current);current.anchor.parentElement.remove();if(!dynamicTabEntries(list).some(x=>x.panel===current.panel))current.panel.remove();const remaining=dynamicTabEntries(list);activate(list,remaining[Math.min(index,remaining.length-1)].anchor);}
  updateDynamicTabsState(list);d.__oeInitDefaults?.(d);if(typeof applyRules==='function')applyRules(d);if(options.changed)options.changed(list);
 },true);
}

let dynamicConfigList=null;
function dynamicButtonName(button){return (button.id||button.getAttribute('aria-label')||button.textContent.trim()||'按钮')+(button.querySelector('.fa-plus')?'（＋）':button.querySelector('.fa-remove,.fa-close,.fa-times')?'（×）':'');}
function openDynamicTabsDialog(list){
 assertEditableTabs(list);snap();const entries=dynamicTabEntries(list);if(!entries.length){toast('当前页签组没有可配置的内容');return;}dynamicConfigList=list;const cfg=readDynamicTabsConfig(list),prefix=cfg?.prefix||entries[0].anchor.textContent.trim().replace(/\d+\s*$/,'').trim()||'配置';
 $('#oe-dynamic-prefix').value=prefix;$('#oe-dynamic-min').value=cfg?.min||1;$('#oe-dynamic-max').value=cfg?.max||Math.max(6,entries.length);$('#oe-dynamic-source').innerHTML=entries.map(x=>`<option value="${esc(x.anchor.dataset.edId)}">${esc(x.anchor.textContent.trim())}</option>`).join('');
 const buttons=[...doc().querySelectorAll('.module-root button')].filter(b=>!b.closest('.modal'));for(const role of ['add','remove']){const select=$('#oe-dynamic-'+role);select.innerHTML='<option value="new">自动创建按钮</option>'+buttons.map(b=>`<option value="${esc(b.dataset.edId)}">${esc(dynamicButtonName(b))}</option>`).join('');const bound=buttons.find(b=>b.getAttribute('data-oe-dynamic-owner')===list.id&&b.getAttribute('data-oe-dynamic-action')===role),candidate=bound||list.querySelector(role==='add'?'button:has(.fa-plus)':'button:has(.fa-remove),button:has(.fa-close),button:has(.fa-times)');select.value=candidate?.dataset.edId||'new';}
 $('#oe-dynamic-unbind').hidden=!cfg;$('#oe-dynamic-error').textContent='';$('#oe-dynamic-dialog').hidden=false;$('#oe-dynamic-prefix').focus();
}
function closeDynamicTabsDialog(){$('#oe-dynamic-dialog').hidden=true;dynamicConfigList=null;}
function configureDynamicTabs({list,prefix='Server',min=1,max=6,sourceKey,addButton,removeButton}){
 assertEditableTabs(list);const entries=dynamicTabEntries(list),d=doc();prefix=prefix.trim();min=Number(min);max=Number(max);if(!prefix||prefix.length>24)throw Error('名称前缀需要 1–24 个字');if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min||max>30)throw Error('数量范围需满足 1 ≤ 最少数量 ≤ 最多数量 ≤ 30');if(entries.length<min||entries.length>max)throw Error('现有页签数量需处于最少/最多数量范围内');if(addButton&&removeButton&&addButton===removeButton)throw Error('新增和删除不能绑定同一个按钮');for(const button of [addButton,removeButton].filter(Boolean)){if(!d.contains(button)||button.tagName!=='BUTTON')throw Error('请选择当前页面内的按钮');if(button.getAttribute('data-oe-dynamic-owner')&&button.getAttribute('data-oe-dynamic-owner')!==list.id)throw Error('该按钮已绑定其他页签组');}
 const sourceEntry=entries.find(x=>x.anchor.dataset.edId===sourceKey)||entries[0],parents=new Set(entries.map(x=>x.panel.parentElement));if(parents.size!==1)throw Error('当前页签组的内容区域不一致');snap();const groupId=list.id||'oe_dynamic_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);list.id=groupId;const oldCfg=readDynamicTabsConfig(list),templateId=oldCfg?.templateId||groupId+'_template',oldTemplate=d.getElementById(templateId),template=d.createElement('template');template.id=templateId;template.setAttribute('data-oe-dynamic-template',groupId);template.content.append(cleanElement(sourceEntry.panel));
 const viewed=entries.find(x=>x.anchor.parentElement.classList.contains('active'))||entries[0],originalDefault=entries.find(x=>cleanElement(x.anchor.parentElement).classList.contains('active'))||entries[0],used=new Set(),originalCopies=new Map(entries.map(x=>[x.panel,cleanElement(x.panel)]));
 entries.forEach((entry,i)=>{let panel=entry.panel;if(used.has(panel)){panel=cloneDynamicTabPanel(originalCopies.get(panel),groupId+'_initial_'+i);panel.classList.remove('active','in');entry.panel.parentElement.append(panel);entry.anchor.setAttribute('href','#'+panel.id);entry.panel=panel;}used.add(panel);entry.anchor.setAttribute('data-oe-dynamic-slot',String(i+1));});
 for(const entry of entries){for(const node of [entry.anchor.parentElement,entry.panel]){const active=entry===originalDefault,view=viewChanges.get(node.dataset.edId);if(view){view.active=active;view.in=false;}node.classList.toggle('active',active);node.classList.remove('in');}}
 if(oldTemplate)oldTemplate.replaceWith(template);else list.after(template);
 // Unbind only this group's old controls, restoring their original appearance.
 d.querySelectorAll('[data-oe-dynamic-owner]').forEach(button=>{if(button.getAttribute('data-oe-dynamic-owner')!==groupId)return;button.disabled=button.getAttribute('data-oe-dynamic-initial-disabled')==='1';button.style.color=button.getAttribute('data-oe-dynamic-initial-color')||'';button.classList.remove('is-dis');button.removeAttribute('data-oe-dynamic-owner');button.removeAttribute('data-oe-dynamic-action');});
 function bind(button,role){if(!button){const item=d.createElement('li');item.style.cssText='float:right;padding-right:2%';button=d.createElement('button');button.setAttribute('data-oe-dynamic-generated','1');button.type='button';button.className='btn btn-sm outline';button.innerHTML=role==='add'?'<i class="fa fa-plus" style="font-size:18px"></i>':'<i class="fa fa-remove" style="font-size:18px"></i>';item.append(button);list.prepend(item);}if(!button.hasAttribute('data-oe-dynamic-initial-disabled')){button.setAttribute('data-oe-dynamic-initial-disabled',button.disabled?'1':'0');button.setAttribute('data-oe-dynamic-initial-color',button.style.color);button.setAttribute('data-oe-dynamic-initial-title',button.getAttribute('title')||'');button.setAttribute('data-oe-dynamic-initial-aria',button.getAttribute('aria-label')||'');}const color=button.style.color;button.setAttribute('data-oe-dynamic-enabled-color',button.disabled||/gray|128, 128, 128/.test(color)?'':color);button.setAttribute('data-oe-dynamic-owner',groupId);button.setAttribute('data-oe-dynamic-action',role);button.setAttribute('aria-label',role==='add'?'添加 '+prefix+' 配置':'删除当前 '+prefix+' 配置');return button;}
 const add=bind(addButton,'add'),remove=bind(removeButton,'remove');list.setAttribute('data-oe-dynamic-tabs',JSON.stringify({version:1,prefix,min,max,templateId}));ids(d);updateDynamicTabsState(list);snap();activateTab(viewed.anchor);renderViewTabs();renderStructure();return {groupId,templateId,addId:add.dataset.edId,removeId:remove.dataset.edId};
}
function removeDynamicTabsInteraction(list){
 assertEditableTabs(list);const cfg=readDynamicTabsConfig(list);if(!cfg)return false;snap();const d=doc();select(null);d.querySelectorAll('[data-oe-dynamic-owner]').forEach(button=>{if(button.getAttribute('data-oe-dynamic-owner')!==list.id)return;const item=button.closest('ul.tabs>li');if(button.getAttribute('data-oe-dynamic-generated')==='1'){button.remove();if(item&&!item.querySelector('a,button,input')&&!item.textContent.trim())item.remove();return;}button.disabled=button.getAttribute('data-oe-dynamic-initial-disabled')==='1';button.style.color=button.getAttribute('data-oe-dynamic-initial-color')||'';button.classList.remove('is-dis');for(const [attr,key] of [['title','data-oe-dynamic-initial-title'],['aria-label','data-oe-dynamic-initial-aria']]){const value=button.getAttribute(key);if(value)button.setAttribute(attr,value);else button.removeAttribute(attr);}for(const attr of [...button.attributes])if(attr.name.startsWith('data-oe-dynamic-'))button.removeAttribute(attr.name);});d.getElementById(cfg.templateId)?.remove();list.removeAttribute('data-oe-dynamic-tabs');dynamicTabEntries(list).forEach(entry=>entry.anchor.removeAttribute('data-oe-dynamic-slot'));snap();renderViewTabs();renderStructure();return true;
}
function detachDynamicButton(button){
 if(!button?.hasAttribute('data-oe-dynamic-owner'))return;button.disabled=false;button.classList.remove('is-dis');const color=button.getAttribute('data-oe-dynamic-enabled-color');if(color)button.style.color=color;else button.style.removeProperty('color');for(const [attr,key] of [['title','data-oe-dynamic-initial-title'],['aria-label','data-oe-dynamic-initial-aria']]){const value=button.getAttribute(key);if(value)button.setAttribute(attr,value);else button.removeAttribute(attr);}for(const attr of [...button.attributes])if(attr.name.startsWith('data-oe-dynamic-'))button.removeAttribute(attr.name);
}
$('#oe-viewtabs').addEventListener('click',e=>{const button=e.target.closest('[data-dynamic-tabs]');if(button){try{openDynamicTabsDialog(tabListById(button.dataset.dynamicTabs));}catch(error){toast(error.message);}}});
$('#oe-dynamic-cancel').onclick=closeDynamicTabsDialog;
$('#oe-dynamic-unbind').onclick=()=>{try{removeDynamicTabsInteraction(dynamicConfigList);closeDynamicTabsDialog();toast('已移除动态交互，页签与内容保留；可撤销');}catch(error){$('#oe-dynamic-error').textContent=error.message;}};
$('#oe-dynamic-dialog').onclick=e=>{if(e.target===$('#oe-dynamic-dialog'))closeDynamicTabsDialog();};
$('#oe-dynamic-form').onsubmit=e=>{e.preventDefault();try{const button=id=>[...doc().querySelectorAll('button')].find(b=>b.dataset.edId===id);configureDynamicTabs({list:dynamicConfigList,prefix:$('#oe-dynamic-prefix').value,min:+$('#oe-dynamic-min').value,max:+$('#oe-dynamic-max').value,sourceKey:$('#oe-dynamic-source').value,addButton:button($('#oe-dynamic-add').value),removeButton:button($('#oe-dynamic-remove').value)});closeDynamicTabsDialog();toast('已配置独立页签与动态增删，请在预览中测试＋和×');}catch(error){$('#oe-dynamic-error').textContent=error.message;}};
document.addEventListener('keydown',e=>{if($('#oe-dynamic-dialog').hidden)return;if(e.key==='Escape'){e.preventDefault();closeDynamicTabsDialog();}else if(e.key==='Tab'){const fields=[...$('#oe-dynamic-dialog').querySelectorAll('input,select,button')],first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});

function sliderLimits(bar){const number=(name,fallback)=>{const x=bar.getAttribute(name);return x!==null&&Number.isFinite(+x)?+x:fallback;},min=number('data-min',0),max=Math.max(min,number('data-max',bar.closest('.image-row')?63:100)),step=Math.max(.000001,number('data-step',1));return {min,max,step};}
function sliderValue(bar){const {min,max,step}=sliderLimits(bar),readout=bar.closest('.image-row')?.querySelector('.image-val span'),raw=bar.getAttribute('data-value')??readout?.textContent??Math.round((parseFloat(bar.querySelector('.move-nonius')?.style.marginLeft)||0)/Math.max(1,(parseFloat(bar.style.width)||99)-18)*(max-min)+min),n=Number(raw);return Math.min(max,Math.max(min,Number((min+Math.round(((Number.isFinite(n)?n:min)-min)/step)*step).toFixed(8))));}
function paintPrototypeSlider(bar,value){const {min,max,step}=sliderLimits(bar),n=Math.min(max,Math.max(min,Number((min+Math.round((Number(value)-min)/step)*step).toFixed(8)))),safe=Number.isFinite(n)?n:min,thumb=bar.querySelector('.move-nonius'),width=bar.getBoundingClientRect().width||parseFloat(bar.style.width)||99,travel=Math.max(0,width-18);bar.setAttribute('data-value',String(safe));bar.setAttribute('role','slider');bar.setAttribute('tabindex','0');bar.setAttribute('aria-valuemin',String(min));bar.setAttribute('aria-valuemax',String(max));bar.setAttribute('aria-valuenow',String(safe));if(thumb)thumb.style.marginLeft=(max===min?0:(safe-min)/(max-min)*travel)+'px';const box=bar.closest('[data-oe-slider]'),readout=box?.querySelector('[data-slider-number]')||bar.closest('.image-row')?.querySelector('.image-val span');if(readout){if(readout.matches('input'))readout.value=String(safe);else readout.textContent=String(safe);}if(box)box.querySelectorAll('[data-slider-step]').forEach(b=>b.disabled=bar.getAttribute('aria-disabled')==='true'||(+b.dataset.sliderStep<0?safe<=min:safe>=max));return safe;}
function wirePrototypeControls(d,options){
 wireIoAlarm(d,options);
 d.__oeControlsOptions=options||{};const opts=()=>d.__oeControlsOptions||{},design=()=>!!opts().design,fields=root=>[...root.querySelectorAll('input:not([type=file]),textarea,select,.dragbar[data-widget="dragbarbox"]')].filter(x=>!x.closest('[data-oe-slider]')||x.matches('.dragbar'));
 function baseline(root){fields(root).forEach(x=>{if(x.hasAttribute('data-oe-form-default'))return;const state=x.matches('.dragbar')?{v:sliderValue(x)}:{v:x.defaultValue??x.value,c:x.defaultChecked??x.checked,option:x.closest('.lavaui-combo-container')?.querySelector('.list-group-item.active')?.getAttribute('data-value')};x.setAttribute('data-oe-form-default',JSON.stringify(state));});}
 d.__oeInitDefaults=baseline;if(!design()){baseline(d);d.querySelectorAll('.dragbar[data-widget="dragbarbox"]').forEach(x=>paintPrototypeSlider(x,sliderValue(x)));}
 if(d.__oeControlsWired){d.__oeRestoreSaved?.();return;}d.__oeControlsWired=true;let dragging=null;
 function enabled(bar){return !design()&&!bar.closest('.rule-dis,.is-dis,[disabled]')&&bar.getAttribute('aria-disabled')!=='true';}
 function set(bar,n){const v=paintPrototypeSlider(bar,n);bar.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));return v;}
 function pointer(bar,e){const rect=bar.getBoundingClientRect(),{min,max}=sliderLimits(bar);set(bar,min+Math.max(0,Math.min(1,(e.clientX-rect.left-9)/Math.max(1,rect.width-18)))*(max-min));}
 d.addEventListener('pointerdown',e=>{const bar=e.target.closest('.dragbar[data-widget="dragbarbox"]');if(!bar||!enabled(bar))return;e.preventDefault();dragging=bar;bar.setPointerCapture?.(e.pointerId);pointer(bar,e);},true);
 d.addEventListener('pointermove',e=>{if(dragging&&enabled(dragging))pointer(dragging,e);},true);d.addEventListener('pointerup',()=>{dragging=null;},true);d.addEventListener('pointercancel',()=>{dragging=null;},true);
 d.addEventListener('keydown',e=>{const bar=e.target.closest('.dragbar');if(!bar||!enabled(bar))return;const {min,max,step}=sliderLimits(bar),values={ArrowLeft:sliderValue(bar)-step,ArrowDown:sliderValue(bar)-step,ArrowRight:sliderValue(bar)+step,ArrowUp:sliderValue(bar)+step,Home:min,End:max};if(e.key in values){e.preventDefault();set(bar,values[e.key]);}},true);
 d.addEventListener('input',e=>{if(design()||!e.target.matches?.('[data-slider-number]'))return;const bar=e.target.closest('[data-oe-slider]').querySelector('.dragbar');if(enabled(bar)&&e.target.value!==''&&Number.isFinite(+e.target.value))paintPrototypeSlider(bar,+e.target.value);},true);
 function visibleField(x,scope){for(let node=x;node&&node!==scope;node=node.parentElement){if(node.hidden||node.matches('.tabs-content>div:not(.active)')||node.style.display==='none')return false;}return true;}
 function notify(message,error=false){let status=d.getElementById('oe-runtime-feedback');if(!status){status=d.createElement('div');status.id='oe-runtime-feedback';status.setAttribute('role','status');status.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;padding:10px 16px;background:#0c161d;color:#fff;border:1px solid #09c;border-radius:5px;max-width:380px;font:14px arial';d.body.append(status);}status.textContent=message;status.style.borderColor=error?'#e65b5b':'#09c';clearTimeout(d.__oeFeedbackTimer);d.__oeFeedbackTimer=setTimeout(()=>status.remove(),4500);}
 function write(x,state){if(x.matches('.dragbar')){paintPrototypeSlider(x,state.v);return;}x.value=state.v??'';if(x.type==='checkbox'||x.type==='radio')x.checked=!!state.c;const combo=x.closest('.lavaui-combo-container');if(combo)combo.querySelectorAll('.list-group-item').forEach(o=>o.classList.toggle('active',state.option!=null?o.getAttribute('data-value')===state.option:o.textContent.trim()===x.value));}
 function key(){return 'prototype-editor-config-v2:'+ (opts().projectId||'original-mdvr')+':'+(opts().pageKey||d.body.dataset.oePage||location.hash||'page');}
 function storage(){return opts().storage||d.defaultView.localStorage;}
 function readSaved(){try{return JSON.parse(storage().getItem(key())||'{}');}catch(_){return {};}}
 function restoreSaved(){if(design()||opts().restore===false)return;const saved=readSaved();for(const [id,group] of Object.entries(saved.__groups||{})){const list=d.getElementById(id);if(!list||!readDynamicTabsConfig(list)||!group.list||!Array.isArray(group.panels))continue;const container=dynamicTabEntries(list)[0]?.panel.parentElement;if(!container)continue;dynamicTabEntries(list).forEach(x=>x.panel.remove());list.outerHTML=group.list;group.panels.forEach(html=>container.insertAdjacentHTML('beforeend',html));const fresh=d.getElementById(id);if(fresh)updateDynamicTabsState(fresh);}if(typeof ids==='function')ids(d);fields(d).forEach(x=>{const id=x.dataset.edId||x.id;if(saved[id])write(x,saved[id]);});baseline(d);}
 // A navigation reuses the exported document but replaces its controls.
 d.__oeRestoreSaved=restoreSaved;restoreSaved();
 d.addEventListener('click',e=>{if(design())return;const stepButton=e.target.closest('[data-slider-step]');if(stepButton){const bar=stepButton.closest('[data-oe-slider]').querySelector('.dragbar');e.preventDefault();e.stopImmediatePropagation();if(!stepButton.disabled&&enabled(bar))set(bar,sliderValue(bar)+Number(stepButton.dataset.sliderStep)*sliderLimits(bar).step);return;}
  const button=e.target.closest('button');if(!button||button.disabled||button.closest('.rule-dis,.is-dis'))return;const action=button.getAttribute('data-oe-form-action')||({default:'default','恢复默认':'default',save:'save','保存':'save'}[button.textContent.trim().toLowerCase()]);if(!['default','save'].includes(action))return;e.preventDefault();e.stopImmediatePropagation();const scope=button.closest('.modal-dialog,.trigger_modal,.panel,form')||d.querySelector('.module-root')||d.body;baseline(scope);const controls=fields(scope).filter(x=>visibleField(x,scope));
  if(action==='default'){controls.forEach(x=>{try{write(x,JSON.parse(x.getAttribute('data-oe-form-default')));}catch(_){}});if(typeof applyRules==='function')applyRules(d);notify('已恢复当前表单的原型默认值；点击 Save 后保存');return;}
  const invalid=controls.find(x=>!x.disabled&&x.matches('input,textarea,select')&&!x.readOnly&&typeof x.checkValidity==='function'&&!x.checkValidity());if(invalid){invalid.reportValidity?.();invalid.focus();notify('保存失败，请检查必填项或数值范围',true);return;}
  const saved=readSaved();controls.forEach(x=>{const id=x.dataset.edId||x.id;if(!id)return;saved[id]=x.matches('.dragbar')?{v:sliderValue(x)}:{v:x.value,c:x.checked,option:x.closest('.lavaui-combo-container')?.querySelector('.list-group-item.active')?.getAttribute('data-value')};});
  scope.querySelectorAll('ul.tabs[data-oe-dynamic-tabs]').forEach(list=>{saved.__groups=saved.__groups||{};saved.__groups[list.id]={list:list.outerHTML,panels:dynamicTabEntries(list).map(entry=>{const copy=entry.panel.cloneNode(true);fields(copy).forEach(x=>{const id=x.dataset.edId||x.id;let state=saved[id];if(!state){try{state=JSON.parse(x.getAttribute('data-oe-form-default'));}catch(_){}}if(!state)return;write(x,state);if(x.matches('input')){if(x.type==='checkbox'||x.type==='radio')x.toggleAttribute('checked',x.checked);else x.setAttribute('value',x.value);}else if(x.matches('textarea'))x.textContent=x.value;else if(x.matches('select'))[...x.options].forEach(o=>o.toggleAttribute('selected',o.selected));});return copy.outerHTML;})};});
  try{storage().setItem(key(),JSON.stringify(saved));notify('已保存当前表单到本地原型');}catch(_){notify('本地存储不可用，配置尚未保存；请导出工程保留修改',true);}
 },true);
}

// Native prototype classes supply colors, borders, dimensions and typography.
Object.assign(TPL,{
 Button:'<button type="button" class="btn" style="min-width:100px">新按钮</button>',
 Input:'<input type="text" class="form-control" data-widget="editbox" value="" style="width:170px;border-color:#163C51">',
 Password:'<input type="password" class="form-control" data-widget="editbox" value="" style="width:170px;border-color:#163C51">',
 Number:'<input type="number" class="form-control" data-widget="editbox" data-type="int" value="0" style="width:110px;border-color:#163C51">',
 Textarea:'<textarea class="form-control" style="width:220px;height:80px;border-color:#163C51"></textarea>',
 Slider:'<div data-oe-slider style="width:245px;display:flex;align-items:center;gap:10px;min-height:34px"><button type="button" class="btn btn-sm outline" data-slider-step="-1" aria-label="减少" style="padding:2px 7px">−</button><div class="dragbar" data-widget="dragbarbox" data-type="int" data-min="0" data-max="63" data-step="1" data-value="31" role="slider" tabindex="0" aria-label="滑块" aria-valuemin="0" aria-valuemax="63" aria-valuenow="31" style="width:99px;flex-shrink:0;float:none;margin-top:0;touch-action:none"><div class="move-nonius" style="margin-left:39.857px"></div></div><button type="button" class="btn btn-sm outline" data-slider-step="1" aria-label="增加" style="padding:2px 7px">+</button><input type="number" class="form-control" data-slider-number aria-label="滑块数值" min="0" max="63" step="1" value="31" style="width:55px;min-width:0;border-color:#163C51"></div>',
 Progress:'<div class="progress" style="width:220px"><div class="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width:60%">60%</div></div>',
 Help:'<span class="input-icon" title="这里是帮助说明文字" style="display:inline-block;width:20px;height:20px"><i class="fa fa-question-circle" style="font-size:18px"></i></span>',
 Box:'<div class="panel" style="width:260px;height:150px;box-sizing:border-box"></div>',
 Panel:'<div class="panel ed-panel" style="width:320px"><div class="panel-header ed-panel-head" style="cursor:pointer"><span>面板标题</span><i class="fa fa-angle-down" style="float:right"></i></div><div class="panel-body ed-panel-body">面板内容</div></div>'
});
const libraryRenderProps=renderProps;
renderProps=function(){libraryRenderProps();if(!sel)return;const bar=sel.matches('.dragbar')?sel:sel.querySelector('[data-widget="dragbarbox"]');if(bar){const {min,max,step}=sliderLimits(bar);props.insertAdjacentHTML('afterbegin',`<details class="oe-options" open><summary>原型滑块</summary><label>最小值<input type="number" id="oe-slider-min" value="${min}"></label><label>最大值<input type="number" id="oe-slider-max" value="${max}"></label><label>步长<input type="number" id="oe-slider-step" min="0.000001" step="any" value="${step}"></label><label>默认值<input type="number" id="oe-slider-value" step="any" value="${sliderValue(bar)}"></label><button type="button" id="oe-slider-apply">应用滑块参数</button></details>`);}if(sel.matches('button')){const dynamic=sel.hasAttribute('data-oe-dynamic-owner'),dynamicLabel=sel.getAttribute('data-oe-dynamic-action')==='add'?'动态页签：新增配置':'动态页签：删除当前配置';const action=dynamic?'dynamic':sel.getAttribute('data-oe-form-action')||({save:'save',default:'default'}[sel.textContent.trim().toLowerCase()]||'none');props.insertAdjacentHTML('afterbegin',`<label>按钮行为<select id="oe-form-action"><option value="none">普通按钮（取消交互）</option>${dynamic?'<option value="dynamic" disabled>'+dynamicLabel+'</option>':''}<option value="default">Default：恢复当前表单默认值</option><option value="save">Save：校验并保存当前表单</option></select></label>`);$('#oe-form-action').value=action;}};
props.addEventListener('change',e=>{if(e.target.id==='oe-form-action'&&sel&&mode==='design'){if(e.target.value==='dynamic')return;detachDynamicButton(sel);sel.setAttribute('data-oe-form-action',e.target.value);snap();}});
props.addEventListener('click',e=>{if(e.target.id!=='oe-slider-apply'||!sel||mode!=='design')return;const bar=sel.matches('.dragbar')?sel:sel.querySelector('.dragbar'),min=+$('#oe-slider-min').value,max=+$('#oe-slider-max').value,step=+$('#oe-slider-step').value,value=+$('#oe-slider-value').value;if(![min,max,step,value].every(Number.isFinite)||max<=min||step<=0||value<min||value>max){toast('请填写有效范围、正数步长和范围内的默认值');return;}bar.setAttribute('data-min',min);bar.setAttribute('data-max',max);bar.setAttribute('data-step',step);paintPrototypeSlider(bar,value);const input=bar.closest('[data-oe-slider]')?.querySelector('[data-slider-number]');if(input){input.min=min;input.max=max;input.step=step;input.setAttribute('value',input.value);}snap();toast('已更新滑块参数');});

/*__IO_ALARM_RUNTIME__*/
renderTree(); load(PROJECT.editorStartKey||curKey);
