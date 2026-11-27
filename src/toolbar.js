// Move existing controls into menus, preserving their bound handlers and IDs.
function closeEditorMenus(except=null){document.querySelectorAll('.oe-menu[open],.oe-tab-actions[open]').forEach(menu=>{if(menu!==except)menu.open=false;});}
function wireEditorMenu(menu){menu.addEventListener('toggle',()=>{if(!menu.open)return;closeEditorMenus(menu);const panel=menu.querySelector('.oe-menu-panel'),rect=menu.querySelector('summary').getBoundingClientRect();if(!panel)return;panel.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-panel.offsetWidth-8))+'px';panel.style.top=Math.max(8,Math.min(rect.bottom+6,window.innerHeight-panel.offsetHeight-8))+'px';});}
function makeEditorMenu(title,items,className='oe-menu'){
 const menu=document.createElement('details');menu.className=className;const summary=document.createElement('summary');summary.textContent=title;const panel=document.createElement('div');panel.className='oe-menu-panel';panel.setAttribute('aria-label',title+'选项');items.filter(Boolean).forEach(item=>panel.append(item));menu.append(summary,panel);wireEditorMenu(menu);return menu;
}
function organiseEditorToolbar(){
 const header=document.querySelector('.ed>header');if(!header)return;const byId=id=>document.getElementById(id),brand=header.querySelector('b'),badge=header.querySelector('.oe-badge'),status=byId('oe-status'),fileInput=byId('oe-file'),smart=byId('oe-smart')?.closest('label');
 const modes=document.createElement('div');modes.className='oe-toolbar-modes';modes.setAttribute('aria-label','工作模式');['bd','bp'].forEach(id=>{if(byId(id))modes.append(byId(id));});
 const zoom=document.createElement('div');zoom.className='oe-menu-zoom';zoom.dataset.keepOpen='';['zo','zt','zi','zr'].forEach(id=>{if(byId(id))zoom.append(byId(id));});if(smart){smart.title='开启：优先选中完整控件；关闭：可选内部文字、图标。仅影响设计模式。';smart.classList.add('oe-menu-check');}
 const nav=document.createElement('nav');nav.className='oe-toolbar-menus';nav.setAttribute('aria-label','编辑器功能');nav.append(makeEditorMenu('文件',[byId('oe-open'),byId('oe-save'),byId('oe-save-html')]),makeEditorMenu('编辑',[byId('un'),byId('re'),smart]),makeEditorMenu('视图',[zoom,byId('oe-fit'),byId('oe-reset')]),makeEditorMenu('导出',[byId('oe-export-image'),byId('ex')]));
 const title=document.createElement('div');title.className='oe-toolbar-title';if(brand)title.append(brand);if(badge)title.append(badge);header.replaceChildren(title,modes,nav);if(status)header.append(status);if(fileInput)header.append(fileInput);
}
function organiseTabActions(){
 document.querySelectorAll('#oe-viewtabs .oe-tabset').forEach(group=>{if(group.querySelector('.oe-tab-actions'))return;const actions=[...group.querySelectorAll(':scope>button[data-new-tab],:scope>button[data-manage-tabs],:scope>button[data-dynamic-tabs]')];if(!actions.length)return;const menu=makeEditorMenu('页签操作',actions,'oe-tab-actions');menu.hidden=mode!=='design';group.append(menu);});
}
const originalViewTabsForMenus=renderViewTabs;
renderViewTabs=function(){originalViewTabsForMenus();organiseTabActions();};
organiseEditorToolbar();organiseTabActions();
document.addEventListener('click',e=>{const menu=e.target.closest?.('.oe-menu,.oe-tab-actions');if(!menu)closeEditorMenus();else if(e.target.closest?.('button')&&!e.target.closest?.('[data-keep-open]'))closeEditorMenus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.activeElement?.closest('.oe-menu[open],.oe-tab-actions[open]')||document.querySelector('.oe-menu[open],.oe-tab-actions[open]');if(menu){e.preventDefault();closeEditorMenus();menu.querySelector('summary')?.focus();}}});
window.addEventListener('resize',()=>closeEditorMenus());
const menuFrameDocuments=new WeakSet();
function wireCanvasMenuClose(){const d=doc();if(!d||menuFrameDocuments.has(d))return;menuFrameDocuments.add(d);d.addEventListener('pointerdown',()=>closeEditorMenus(),true);}
wireCanvasMenuClose();frame.addEventListener('load',wireCanvasMenuClose);
