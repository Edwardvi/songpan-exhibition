const money=value=>Number(value).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};

function validate(data){
  const rows=data.rows,totals=data.totals;
  if(rows.length!==47||Number(totals.project_control_total)!==650000)throw Error('预算资料不完整');
  const sums=new Map();
  for(const row of rows){
    if(Math.abs(Number(row.quantity)*Number(row.unit_price)-Number(row.amount))>.005)throw Error('预算明细计算不一致');
    sums.set(row.category,(sums.get(row.category)||0)+Number(row.amount));
  }
  if([...sums].some(([category,sum])=>sum!==Number(data.subtotals[category]))||[...sums.values()].reduce((a,b)=>a+b,0)!==Number(totals.before_tax))throw Error('分类汇总不一致');
  if(Number(totals.before_tax)+Number(totals.estimated_tax)!==Number(totals.construction_total_including_tax)||Number(totals.construction_total_including_tax)+Number(totals.project_reserve)!==650000)throw Error('预算汇总不一致');
}

function renderBudget(data,body){
  const content=document.createDocumentFragment(),totals=data.totals;
  const hero=node('section','budget-hero');hero.setAttribute('aria-label','整个项目预算控制总额');
  hero.append(node('p','budget-kicker','整个项目预算控制总额'));
  const total=node('p','budget-total');total.id='budget-control-total';total.append(node('span','budget-currency','¥'),node('strong','',Number(totals.project_control_total).toLocaleString('zh-CN')),node('span','budget-unit','元'));hero.append(total);
  hero.append(node('p','budget-lead','包含已完成基础水电与墙面、六章展项、设计和现场实施、税费与预备费。'));
  const facts=node('p','budget-facts','已完成工程暂列25,000元，已计入总额；实际结算与付款待核。');hero.append(facts);content.append(hero);

  const summary=node('section','budget-section');summary.append(node('h3','','预算分配'));
  const list=node('dl','budget-summary');
  const groups=Object.entries(data.subtotals);
  groups.forEach(([category,amount],index)=>{
    const item=node('div','budget-summary__row'),term=node('dt'),button=node('button','budget-summary__link',category);button.type='button';button.dataset.group=String(index);term.append(button);item.append(term,node('dd','',money(amount)));list.append(item);
  });summary.append(list);
  const reconciliation=node('dl','budget-reconciliation');
  const values=[['工程及服务费 税前','before_tax'],['税费暂估 按原底稿1%','estimated_tax'],['工程含税金额','construction_total_including_tax'],['项目预备费','project_reserve']];
  for(const [label,key]of values){const r=node('div');r.append(node('dt','',label),node('dd','',money(totals[key])));r.dataset.total=key;reconciliation.append(r);}summary.append(reconciliation);
  summary.append(node('p','budget-small','金额单位：人民币元。预备费44,000元用于核量、设备深化、变更与实际税费，使用前需明确对应费用。'));content.append(summary);

  const detail=node('section','budget-section budget-detail');
  const detailHead=node('div','budget-section-heading');detailHead.append(node('h3','','完整清单'),node('span','budget-small','47项 · 金额为税前估计'));
  const toggle=node('button','budget-expand','展开全部');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','budget-groups');detailHead.append(toggle);detail.append(detailHead);
  const groupWrap=node('div');groupWrap.id='budget-groups';
  groups.forEach(([category,amount],index)=>{
    const group=node('details','budget-group');group.id='budget-group-'+index;
    const heading=node('summary');heading.append(node('span','budget-group__name',category),node('span','budget-group__amount',money(amount)),node('span','budget-group__indicator'));group.append(heading);
    const scroll=node('div','budget-table-wrap');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',category+'预算明细');
    const table=node('table','budget-table');table.append(node('caption','sr-only',category+'九列报价清单，单位人民币元'));
    const thead=node('thead'),headrow=node('tr');for(const h of data.headers){const th=node('th','',h);th.scope='col';headrow.append(th);}thead.append(headrow);table.append(thead);
    const tbody=node('tbody');
    for(const record of data.rows.filter(r=>r.category===category)){
      const tr=node('tr');tr.dataset.budgetItem=String(record.no);
      const fields=[record.no,record.category,record.item,record.description,record.unit,record.quantity,money(record.unit_price),money(record.amount),record.note];
      fields.forEach((value,i)=>{const td=node('td','budget-col-'+i,String(value));td.dataset.label=data.headers[i].replaceAll('\n','');tr.append(td);});tbody.append(tr);
    }
    table.append(tbody);scroll.append(table);group.append(scroll);groupWrap.append(group);
  });detail.append(groupWrap);content.append(detail);
  list.addEventListener('click',event=>{const button=event.target.closest('[data-group]');if(!button)return;const group=groupWrap.querySelector('#budget-group-'+button.dataset.group);group.open=true;group.scrollIntoView({block:'start',behavior:'instant'});group.querySelector('summary').focus({preventScroll:true});});
  function syncToggle(){const all=[...groupWrap.children].every(d=>d.open);toggle.textContent=all?'收起全部':'展开全部';toggle.setAttribute('aria-expanded',String(all));}
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';for(const group of groupWrap.children)group.open=open;syncToggle();});
  for(const group of groupWrap.children)group.addEventListener('toggle',syncToggle);

  const notes=node('section','budget-section');notes.append(node('h3','','估算口径'));const ol=node('ol','budget-notes');for(const note of data.notes)ol.append(node('li','',note));notes.append(ol);content.append(notes);
  const changes=node('section','budget-section');changes.append(node('h3','','清单优化'));const ul=node('ul','budget-changes');for(const item of data.removed_or_replaced)ul.append(node('li','',item.decision));changes.append(ul);content.append(changes);
  const sources=node('section','budget-section budget-sources');sources.append(node('h3','','估算依据'),node('p','','依据原施工报价底稿与当前六章方案重组。原底稿税前250,123.45元、税费2,501.23元、含税252,624.68元，原71项优化为47项。'));
  const technical=node('p');technical.append(document.createTextNode('投影设备技术档参考 '));const link=node('a','','BenQ LU960ST官方规格');link.href='https://www.benq.com/zh-tw/business/projector/lu960st.html';link.target='_blank';link.rel='noopener noreferrer';technical.append(link,document.createTextNode('。25,000元单台为本轮预算占位，非该品牌供应商报价。'));sources.append(technical);content.append(sources);
  body.replaceChildren(content);
}

export function initBudgetPreview({beforeOpen=()=>{}}={}){
  const button=document.getElementById('budget-button'),dialog=document.getElementById('budget-dialog'),body=document.getElementById('budget-body');
  let promise=null,loaded=false,backdropDown=false;
  async function load(){
    if(loaded)return;
    if(!promise)promise=fetch('./data/budget-estimate-r1.json?rev=27').then(response=>{if(!response.ok)throw Error('预算资料未载入');return response.json();}).then(data=>{validate(data);renderBudget(data,body);loaded=true;}).catch(()=>{
      promise=null;const message=node('p','budget-error','预算资料暂未载入，请重试。'),retry=node('button','','重新载入');retry.type='button';retry.addEventListener('click',load);body.replaceChildren(message,retry);
    }).finally(()=>body.setAttribute('aria-busy','false'));
    body.setAttribute('aria-busy','true');await promise;
  }
  button.addEventListener('click',()=>{
    if(dialog.open)return;
    beforeOpen();dialog.showModal();button.setAttribute('aria-expanded','true');body.scrollTop=0;load();
  });
  document.getElementById('close-budget').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog&&outside(event);});
  dialog.addEventListener('pointerup',event=>{if(backdropDown&&event.target===dialog&&outside(event))dialog.close();backdropDown=false;});
}
