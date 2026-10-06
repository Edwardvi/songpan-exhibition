const byId=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const chapters=[
  {id:'film',title:'宣传片',view:'overview',copy:'从山川与人，认识松潘的户外旅程。',note:'约4分钟影片待接入',entries:[['film','宣传片与入场']]},
  {id:'immersion',title:'沉浸区',view:'arrival',copy:'从夜空、石岸与水面，进入山地氛围。',note:'静态空间预演 · 影像与声音待接入',entries:[['immersion','沉浸体验']]},
  {id:'resources',title:'资源展示',view:'resource',copy:'沿一条线路，读懂水、林、山与开阔地。',note:'地形与线路为示意',entries:[['resources','四类资源'],['route','代表线路'],['services','服务节点']]},
  {id:'roles',title:'五方协作',view:'collaboration',copy:'沿途遇见参与的人，看见服务怎样交接。',note:'真实物证与人物访谈待取材',entries:[['case','沿途案例'],['visitor','游客'],['business','市场主体'],['practitioner','从业者'],['village','村寨 · 上纳咪村'],['government','政府／公共管理']]},
  {id:'platform',title:'平台运行',view:'platform',copy:'条件变化时，信息怎样转化为行动与反馈。',note:'屏幕为示意 · 脚本与功能状态待明确',entries:[['platform','五段讲解结构']]},
  {id:'exit',title:'发展展望',view:'development',copy:'从资源、协作与运行，回看户外发展的变化。',note:'成效资料与发展内容待补充',entries:[['exit','发展展望']]}
];
const viewChapters={arrival:'immersion',resource:'resources',resource_detail:'resources',collaboration:'roles',ring_overview:'roles',evidence_detail:'roles',case_banner:'roles',case_track:'roles',platform:'platform',platform_side:'platform'};
for(const id of ['immersive_entry','immersive_walk','immersive_terrain','immersive_return','immersive_material','immersive_stone_path','immersive_pool','immersive_detail'])viewChapters[id]='immersion';
const shortcutViews={"film":[["overview","鸟瞰"],["film_entry","入场"],["film_screen","宣传片"]],"immersion":[["immersive_material","整体"],["immersive_pool","池边"],["immersive_stone_path","石岸"]],"resources":[["resource","整体"],["resource_detail","近看"],["resource_route","线路"]],"roles":[["collaboration","整体"],["case_banner","案例吊旗"],["evidence_detail","展台近看"]],"platform":[["platform","正面"],["platform_side","侧面"],["platform_overview","俯看"]],"exit":[["development","正面"],["development_side","侧看"],["development_overview","俯看"]]};
const fallbackViews={"overview":{"position":[29,26,25],"target":[11.25,1.5,5.85],"fov":50,"fit":"building"},"film_entry":{"position":[1.1,1.65,8.9],"target":[3,1.5,5.5],"fov":65},"film_screen":{"position":[2.25,1.65,7.2],"target":[2.25,1.85,3.86],"fov":58},"immersive_material":{"position":[9.75,1.45,8.25],"target":[7.55,1.1,4.25],"fov":74},"immersive_pool":{"position":[8.55,1.42,4.25],"target":[8.35,0.22,2.12],"fov":70},"immersive_stone_path":{"position":[8.5,5.2,8.5],"target":[8.4,0.15,5.4],"fov":68},"resource_route":{"position":[16.8,2.3,7.9],"target":[14.3,0.95,5.8],"fov":55},"platform_overview":{"position":[20.1,6.3,8.6],"target":[22.1,1.4,5.65],"fov":54},"development":{"position":[3.7,2.0,7.65],"target":[0.7,3.2,7.65],"fov":60},"development_side":{"position":[3.2,2.5,9.5],"target":[0.7,3.2,7.65],"fov":60},"development_overview":{"position":[6.2,8.5,13],"target":[2.25,1.5,7.65],"fov":55}};
Object.assign(viewChapters,{film_entry:'film',film_screen:'film',resource_route:'resources',platform_overview:'platform',development:'exit',development_side:'exit',development_overview:'exit'});

export function initExhibition({revision,requestView}){
  const isCountyTerrain=['r27','r28','r29','r30','r31'].includes(revision),isRouteMap=['r28','r29','r30','r31'].includes(revision),isLeadership=['r29','r30','r31'].includes(revision);
  if(isCountyTerrain){const resource=chapters.find(c=>c.id==='resources');resource.copy='从松潘县的真实山地，读懂水、林、山与线路。';resource.note='县域真实地形 · 行程序列为示意';resource.entries[0][1]='地形与资源';shortcutViews.resources[1][1]='地形';}
  if(isRouteMap){const resource=chapters.find(c=>c.id==='resources');resource.copy='从县域山地，辨认交通与徒步线路。';resource.note='真实地形 · 交通与徒步标记';}
  if(['r30','r31'].includes(revision)){const film=chapters.find(c=>c.id==='film');film.view='film_screen';film.note='松潘全域户外 · 5分14秒';}
  const immersion=chapters.find(c=>c.id==='immersion');
  if(['r21','r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(revision))immersion.view=['r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(revision)?'immersive_material':'immersive_walk';
  else {immersion.copy='从现有围合与水面，进入山地体验的起点。';immersion.note='沉浸主题、影像与声音待深化';}
  if(['r30','r31'].includes(revision))immersion.note='动态效果参考 · 71秒 / 夜空静态';
  let active='film',data=null,lastTrigger=null,currentEntry=null,pendingEntry=null,availableViews=[],currentView=null;
  const params=new URLSearchParams(location.search),candidate=params.get('chapter')||viewChapters[params.get('view')];
  if(chapters.some(c=>c.id===candidate))active=candidate;
  pendingEntry=params.get('entry');
  const dialog=byId('exhibit-dialog'),body=byId('exhibit-body');
  const chapterNow=()=>chapters.find(c=>c.id===active);
  const supportedView=id=>availableViews.some(v=>v.id===id);
  const docURL='./assets/exhibition-content-r4.json?rev=27';

  function urlState(){const url=new URL(location.href);url.searchParams.set('version',revision);url.searchParams.set('chapter',active);if(currentEntry)url.searchParams.set('entry',currentEntry);else url.searchParams.delete('entry');history.replaceState(null,'',url);}
  function updateViewChoices(){
    const quick=byId('quick-views');
    let choices=shortcutViews[active].filter(([id])=>supportedView(id));
    if(!choices.length){const id=chapterNow().view;if(supportedView(id))choices=[[id,active==='immersion'?'入口':'整体']];}
    const signature=choices.map(([id])=>id).join(',');
    if(quick.dataset.signature!==signature){quick.replaceChildren();quick.dataset.signature=signature;for(const [id,title] of choices){const b=make('button','',title);b.type='button';b.dataset.quickView=id;b.addEventListener('click',()=>requestView(id,{playFilm:['r30','r31'].includes(revision)&&id==='film_screen'}));quick.append(b);}}
    for(const b of quick.querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.quickView===currentView));

  }
  function renderChapter(move=true,fromUser=false){
    const chapter=chapterNow(),index=chapters.indexOf(chapter);
    document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.chapter===active)));
    byId('chapter-title').textContent=chapter.title;byId('chapter-copy').textContent=chapter.copy;byId('chapter-note').textContent=chapter.note;
    byId('chapter-progress').textContent=`${String(index+1).padStart(2,'0')} / 06`;
    byId('chapter-prev').disabled=index===0;byId('chapter-next').disabled=index===chapters.length-1;
    updateViewChoices();urlState();
    const selected=document.querySelector('[data-chapter][aria-current="true"]');
    if(matchMedia('(max-width:760px)').matches){const nav=byId('chapters');if(selected.offsetLeft<nav.scrollLeft||selected.offsetLeft+selected.offsetWidth>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=selected.offsetLeft-nav.offsetLeft-12;}
    if(move&&chapter.view)requestView(chapter.view,{playFilm:fromUser&&['r30','r31'].includes(revision)&&active==='film',playImmersion:fromUser&&['r30','r31'].includes(revision)&&active==='immersion'});
  }
  function selectChapter(id,move=true,fromUser=false){if(!chapters.some(c=>c.id===id))return;active=id;currentEntry=null;renderChapter(move,fromUser);}
  chapters.forEach((chapter,index)=>{const b=make('button','chapter-button');b.type='button';b.dataset.chapter=chapter.id;b.append(make('span','chapter-number',String(index+1).padStart(2,'0')),make('span','',chapter.title));b.addEventListener('click',()=>selectChapter(chapter.id,true,true));byId('chapters').append(b);});
  byId('chapter-prev').addEventListener('click',()=>selectChapter(chapters[Math.max(0,chapters.findIndex(c=>c.id===active)-1)].id,true,true));
  byId('chapter-next').addEventListener('click',()=>selectChapter(chapters[Math.min(5,chapters.findIndex(c=>c.id===active)+1)].id,true,true));

  function paragraph(text,cls='article-paragraph'){body.append(make('p',cls,text));}
  function section(title,text){const node=make('section','panel-section');node.append(make('h4','',title),make('p','',text));body.append(node);}
  function badge(text){body.append(make('span','content-badge',text));}
  function link(title,href,download=false){const a=make('a','document-link',title+(download?' ↓':' ↗'));a.href=href;if(download)a.download='';else{a.target='_blank';a.rel='noopener noreferrer';}return a;}
  function leadershipContent(id){
    const p=data.presentation;
    if(id==='film'){
      body.append(make('p','role-headline',p.intro[0]));paragraph(p.intro[1]);paragraph(p.film.body);section('片后转场',p.film.transition);
    }else if(id==='immersion'){
      body.append(make('p','role-headline',p.immersion.headline));paragraph(p.immersion.body);section('走向资源展示',p.immersion.transition);
    }else if(id==='resources'){
      body.append(make('p','role-headline',p.resources.headline));p.resources.paragraphs.forEach(t=>paragraph(t));
      data.categories.forEach(c=>section(c.name+' · '+c.title,c.copy));
      const credit=make('p','panel-note');credit.append(document.createTextNode('地形：Copernicus DEM GLO-30；卫星底图：EOX Sentinel-2 cloudless 2016；交通与参考边界：'));const osm=make('a','','© OpenStreetMap contributors');osm.href='https://www.openstreetmap.org/copyright';osm.target='_blank';osm.rel='noopener noreferrer';credit.append(osm,document.createTextNode('。徒步线路分别保留六份KML资料；县域边界与通行状态仍待核实。'));body.append(credit);section('从资源到参与',p.resources.transition);
    }else if(id==='route'){
      section(data.case.title,data.route.copy);const list=make('ol','route-nodes');data.route.nodes.forEach(node=>list.append(make('li','',node)));body.append(list);
      paragraph('沿这段行程，看风景之外的服务与交接。');paragraph('案例行程序列示意；与地图上六条独立KML资料分别保留。','panel-note');
    }else if(id==='services'){
      data.services.forEach(c=>section(c.place+' · '+c.title,c.copy));
    }else if(id==='case'){
      body.append(make('p','role-headline',p.roles.headline));p.roles.paragraphs.forEach(t=>paragraph(t));section(data.case.title,data.case.copy);section('继续到平台运行',p.roles.transition);
      paragraph('案例资料综合，自主徒步、赛事与村寨经营分别保留所属记录。','panel-note');
    }else if(data.roles.some(r=>r.id===id)){
      const role=data.roles.find(r=>r.id===id);body.append(make('p','role-headline',role.headline));paragraph(role.copy);section('展项示意',role.display_evidence);section('一个动作',role.action);section('交接关系',role.handoff);
    }else if(id==='platform'){
      body.append(make('p','role-headline',p.platform.headline));paragraph(p.platform.body);section('情境推演',p.platform.caseTitle);p.platform.steps.forEach(s=>section(s.title,s.copy));paragraph(p.platform.support);section('从一次到下一次',p.platform.closing);paragraph(p.platform.identity,'panel-note');
    }else if(id==='exit'){
      body.append(make('p','role-headline',p.exit.headline));paragraph(p.exit.body);p.exit.changes.forEach(s=>section(s.title,s.copy));section('本地怎样参与',p.exit.local);section('持续运行的条件',p.exit.conditions);section('发展方向',p.exit.closing);paragraph(p.exit.outro);paragraph(p.exit.identity,'panel-note');
    }

  }
  function content(id){
    if(isLeadership){leadershipContent(id);return;}
    if(id==='resources'){
      if(isCountyTerrain){section('松潘县山地','真实高程形成县域山脊与河谷，卫星底图呈现地表。高差放大4倍；2016年影像为历史合成底图。');paragraph(isRouteMap?'模型以颜色区分公路、铁路及本地KML徒步资料。代表案例的行程序列保留在文稿中。':'台面侧板保留行程序列示意，尚未在地形上标注未经核实的路线。','panel-note');}
      paragraph(data.intro);data.categories.forEach(c=>{const row=make('section','panel-section');row.append(make('span','category-label',c.name),make('h3','',c.title),make('p','',c.copy),make('p','panel-note','沿线观察：'+c.place));body.append(row);});
    }else if(id==='route'){
      paragraph(data.route.subtitle);const list=make('ol','route-nodes');data.route.nodes.forEach(node=>list.append(make('li','',node)));body.append(list);paragraph(data.route.copy);paragraph(isRouteMap?'此处为代表案例的六站行程序列，准确轨迹仍待核对；与地图上六条独立KML资料分别保留。':isCountyTerrain?'线路顺序用于讲解；准确轨迹与参数待核对，未作为真实轨迹叠加到县域地形上。':data.route.note,'panel-note');
    }else if(id==='services'){
      data.services.forEach(c=>{const row=make('section','panel-section');row.append(make('span','category-label',c.place),make('h3','',c.title),make('p','',c.copy),make('p','panel-note','待对应资料：'+c.collection));body.append(row);});
    }else if(id==='case'){
      paragraph(data.case.copy);paragraph('自主徒步、赛事组织与村寨服务来自不同记录，各自保留来源与年份。案例用于解释沿途的协作，不作为松潘户外产业的统一标准模式。','panel-note');
    }else if(data.roles.some(role=>role.id===id)){
      const role=data.roles.find(role=>role.id===id);body.append(make('p','role-headline',role.headline));paragraph(role.copy);section('一组物证 · 待取材',role.evidence);section('一个动作',role.action);section('交接关系',role.handoff);section('取材重点',role.collection);
    }else if(id==='platform'){
      badge('脚本待编排');paragraph('当途中条件发生变化，这些人怎样收到信息、采取行动并确认结果？');
      ['行前：准备与信息确认','途中：现场状态与服务衔接','情况变化：信息传递与行动','处理确认：核对安排与执行结果','行后反馈：记录与改进'].forEach(v=>section(v.split('：')[0],v.split('：')[1]));
      paragraph('85寸电视的现有屏幕为示意。后续脚本将分别标明历史资料、情境推演，以及平台已实现、试运行或规划的能力。','panel-note');
    }else if(id==='film'){
      badge('影片待接入');paragraph('约4分钟宣传片，建立对松潘山川资源、户外活动与参与者的整体认识。');paragraph('成片接入后提供播放、暂停与继续参观。','panel-note');const b=make('button','panel-action','继续到沉浸区 →');b.addEventListener('click',()=>{dialog.close();selectChapter('immersion');});body.append(b);
    }else if(id==='immersion'){
      paragraph(['r21','r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(revision)?'夜空墙面、石岸、植物与水面构成进入山地的氛围。沿路径观看，让视线从开阔的夜空转向脚边的石缝与水面。':'围合、水池、石岛与门帘构成沉浸体验的空间起点，主题与媒体内容继续深化。');
      section('墙面与体验',['r21','r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(revision)?'墙面使用用户提供的夜空照片，目前为静态裁切与展开。连续影像、声音及体验时长待明确。':'沉浸主题、影像、声音与体验时长待明确。');
      paragraph('现阶段为静态空间预演。','panel-note');const b=make('button','panel-action','继续到资源展示 →');b.addEventListener('click',()=>{dialog.close();selectChapter('resources');});body.append(b);
    }else if(id==='exit'){
      paragraph('进入山里的人变多以后，需要协作的事情也变多了。');section('从资源到旅程','山川资源、线路服务与参与者的具体交接，共同构成户外发展的观看线索。');section('持续运行的条件','通过运营条件、建设需求和实际成效，继续说明发展的变化。');paragraph('本章内容以出口吊旗呈现；成效资料及统计口径待补充。','panel-note');
    }
  }
  function renderArticle(){
    body.replaceChildren();
    const chapter=chapterNow();
    byId('modal-chapter-number').textContent=String(chapters.indexOf(chapter)+1).padStart(2,'0');
    byId('exhibit-title').textContent=chapter.title;
    if(!data){
      paragraph(byId('content-status').hidden?'内容正在载入。':'文稿未能载入，请刷新页面重试。');
      return;
    }
    for(const [index,[id,title]] of chapter.entries.entries()){
      const entry=make('section','chapter-entry'+(index===0?' chapter-entry--primary':''));
      entry.id='chapter-entry-'+id;entry.dataset.contentEntry=id;
      if(index>0){
        const heading=make('header','chapter-entry__header');
        heading.append(make('span','chapter-entry__number',String(index).padStart(2,'0')),make('h3','chapter-entry__title',title));entry.append(heading);
      }
      const start=body.childNodes.length;content(id);
      const copy=make('div','chapter-entry__copy');copy.append(...[...body.childNodes].slice(start));entry.append(copy);body.append(entry);
    }
    body.scrollTop=0;
    if(currentEntry&&currentEntry!==chapter.entries[0][0])requestAnimationFrame(()=>byId('chapter-entry-'+currentEntry)?.scrollIntoView({block:'start',behavior:'instant'}));
  }
  function openEntry(id,trigger){
    const chapter=chapters.find(c=>c.entries.some(entry=>entry[0]===id));if(!chapter)return;
    if(!dialog.open)lastTrigger=trigger||document.activeElement;
    if(active!==chapter.id){active=chapter.id;renderChapter(false);}
    currentEntry=id;urlState();renderArticle();if(!dialog.open)dialog.showModal();
  }
  byId('content-link').addEventListener('click',e=>openEntry(chapterNow().entries[0][0],e.currentTarget));
  byId('close-exhibit').addEventListener('click',()=>dialog.close());
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!dialog.open)return;
    const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length);
    const first=items[0],last=items.at(-1),focused=document.activeElement;
    if(!first)return;
    if(event.shiftKey&&(focused===first||!dialog.contains(focused))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(focused===last||!dialog.contains(focused))){event.preventDefault();first.focus();}
  });

  dialog.addEventListener('close',()=>{currentEntry=null;urlState();if(lastTrigger?.isConnected)lastTrigger.focus();else document.querySelector('[data-chapter][aria-current="true"]').focus();});
  for(const d of [dialog])d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
  byId('home-link').href='./?rev=27&version='+revision+'&chapter=film';
  document.addEventListener('pointerdown',event=>{const settings=byId('picture-settings');if(settings.open&&!settings.contains(event.target))settings.open=false;});
  byId('picture-settings').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();byId('picture-settings').open=false;byId('picture-settings').querySelector('summary').focus();}});
  renderChapter(active!=='film'&&!shortcutViews[active].some(([id])=>id===params.get('view')));
  fetch(docURL).then(response=>{if(!response.ok)throw Error('文稿未载入');return response.json();}).then(value=>{
    data=value;
    if(isLeadership){for(const chapter of chapters)Object.assign(chapter,data.chapters[chapter.id]);if(['r30','r31'].includes(revision)){chapters.find(c=>c.id==='film').note='松潘全域户外 · 5分14秒';chapters.find(c=>c.id==='immersion').note='动态效果参考 · 71秒 / 夜空静态';}renderChapter(false);}
    if(pendingEntry){const wanted=pendingEntry;pendingEntry=null;openEntry(wanted,null);}else if(dialog.open)renderArticle();
  }).catch(()=>{byId('content-status').hidden=false;byId('content-status').textContent='文稿暂未载入';if(dialog.open)renderArticle();});
  return {
    activeChapter:()=>active,
    limitViews(allViews){
      const map=new Map(allViews.map(v=>[v.id,v]));
      return Object.entries(shortcutViews).flatMap(([chapter,list])=>list.map(([id,title])=>{
        const base=map.get(id)||map.get(chapters.find(c=>c.id===chapter).view)||map.get('overview');
        return {...base,...(!map.has(id)||id==='overview'?fallbackViews[id]:{}),id,title:chapters.find(c=>c.id===chapter).title+' · '+title,chapter};
      }));
    },
    onViewsReady(allViews){availableViews=allViews;updateViewChoices();},
    onViewChange(viewId,syncChapter=true){currentView=viewId;const id=viewChapters[viewId];if(syncChapter&&id&&id!==active)selectChapter(id,false);else updateViewChoices();}
  };
}
