const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'travelBudgetPlannerV2';

const defaultChecklist = [
  ['필수서류','여권 유효기간 확인'],['필수서류','비자/전자여행허가 필요 여부 확인'],['필수서류','항공권 예약내역 저장'],['필수서류','숙소 예약내역 저장'],['필수서류','여권 사본/사진 별도 보관'],
  ['금융','해외 결제 가능한 카드 준비'],['금융','트래블카드/현금 준비'],['금융','카드 해외사용 알림·한도 확인'],['금융','비상용 결제수단 추가 준비'],
  ['통신','eSIM/SIM/로밍 준비'],['통신','오프라인 지도 저장'],
  ['전자기기','휴대폰 충전기'],['전자기기','보조배터리'],['전자기기','멀티어댑터/변환플러그'],['전자기기','이어폰·충전 케이블'],
  ['의류·생활','날씨 확인 후 옷 준비'],['의류·생활','편한 신발'],['의류·생활','우산/우비'],['의류·생활','세면도구'],['의류·생활','선크림·화장품'],
  ['건강','상비약'],['건강','여행자보험 확인'],
  ['일정','공항 이동방법 확인'],['일정','숙소 체크인 방법 확인'],['일정','입장권/교통패스 예약 확인'],['일정','첫날 동선 확인'],
  ['출국 당일','여권·지갑·휴대폰 최종 확인'],['출국 당일','보조배터리 기내 반입 확인'],['출국 당일','공항 터미널·도착시간 확인'],
  ['여행 중','매일 지출 기록'],['여행 중','다음 날 일정·교통 확인'],
  ['귀국 전','면세/세관 신고 대상 확인'],['귀국 전','숙소에 두고 가는 물건 확인'],['귀국 전','공항 이동시간·터미널 확인']
].map(([group,text], i) => ({ id:`c${i+1}`, group, text, done:false }));

function todayISO(){
  const d=new Date(); const off=d.getTimezoneOffset(); return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
function plusDays(iso,n){ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function defaultState(){
  const t=todayISO();
  return {
    settings:{ tripName:'나의 여행', destination:'', startDate:t, endDate:plusDays(t,3), people:2, budget:1000000, currencyCode:'JPY', krwPerUnit:9.35 },
    expenses:[], checklist:defaultChecklist, selectedDate:t,
  };
}
function loadState(){
  try {
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!raw) return defaultState();
    const base=defaultState();
    return {
      ...base, ...raw,
      settings:(()=>{
        const old=raw.settings||{};
        const migrated={...base.settings,...old};
        if(!(Number(migrated.krwPerUnit)>0) && Number(old.foreignPer1000)>0){ migrated.krwPerUnit=1000/Number(old.foreignPer1000); }
        return migrated;
      })(),
      expenses:Array.isArray(raw.expenses)?raw.expenses:[],
      checklist:Array.isArray(raw.checklist)&&raw.checklist.length?raw.checklist:base.checklist
    };
  } catch { return defaultState(); }
}
let state=loadState();
let viewDate=new Date((state.selectedDate||state.settings.startDate)+'T12:00:00');

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function won(v){ return `${Math.round(Number(v)||0).toLocaleString('ko-KR')}원`; }
function formatDate(iso){
  if(!iso) return '';
  return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(iso+'T12:00:00'));
}
function dateOnly(d){ const off=d.getTimezoneOffset(); return new Date(d.getTime()-off*60000).toISOString().slice(0,10); }
function tripDays(){
  const s=new Date(state.settings.startDate+'T12:00:00'), e=new Date(state.settings.endDate+'T12:00:00');
  return Math.max(1, Math.floor((e-s)/86400000)+1);
}
function expenseKRW(exp){
  if(exp.currencyMode==='krw') return Number(exp.amount)||0;
  const rate=Number(exp.rateSnapshot || state.settings.krwPerUnit)||0;
  return rate>0 ? (Number(exp.amount)||0)*rate : 0;
}
function totalSpent(){ return state.expenses.reduce((a,e)=>a+expenseKRW(e),0); }
function dayTotal(iso){ return state.expenses.filter(e=>e.date===iso).reduce((a,e)=>a+expenseKRW(e),0); }
function inTrip(iso){ return iso>=state.settings.startDate && iso<=state.settings.endDate; }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),1700); }

function renderHeader(){
  const spent=totalSpent(), budget=Number(state.settings.budget)||0, remain=budget-spent;
  $('tripTitle').textContent=state.settings.tripName||'나의 여행';
  $('tripDestination').textContent=state.settings.destination||'';
  $('tripDays').textContent=`${tripDays()}일`;
  $('budgetStat').textContent=won(budget); $('spentStat').textContent=won(spent); $('remainStat').textContent=won(remain);
  const pct=budget>0?Math.min(100,spent/budget*100):0; $('budgetBar').style.width=`${pct}%`;
  $('budgetUsage').textContent=budget>0?`예산의 ${pct.toFixed(1)}% 사용 · 1인당 ${won(spent/Math.max(1,Number(state.settings.people)||1))}`:'총 예산을 설정해 주세요.';
}

function renderCalendar(){
  const y=viewDate.getFullYear(), m=viewDate.getMonth();
  $('monthLabel').textContent=`${y}년 ${m+1}월`;
  const first=new Date(y,m,1,12); const mondayOffset=(first.getDay()+6)%7;
  const start=new Date(y,m,1-mondayOffset,12);
  const today=todayISO();
  const grid=$('calendarGrid'); grid.innerHTML='';
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i); const iso=dateOnly(d);
    const btn=document.createElement('button'); btn.type='button'; btn.className='day-cell';
    if(d.getMonth()!==m) btn.classList.add('outside');
    if(!inTrip(iso)) btn.classList.add('outtrip');
    if(iso===state.selectedDate) btn.classList.add('selected');
    if(iso===today) btn.classList.add('today');
    const total=dayTotal(iso);
    btn.innerHTML=`<span class="day-num">${d.getDate()}</span>${total>0?`<span class="day-total">${won(total)}</span>`:''}`;
    btn.addEventListener('click',()=>{ state.selectedDate=iso; saveState(); renderCalendar(); renderSelectedDate(); });
    grid.appendChild(btn);
  }
}
function renderSelectedDate(){
  $('selectedDateLabel').textContent=formatDate(state.selectedDate);
  $('selectedDayTotal').textContent=won(dayTotal(state.selectedDate));
}

function renderRecords(){
  const list=$('recordsList'); list.innerHTML='';
  let data=[...state.expenses];
  const f=$('recordCategoryFilter').value; if(f!=='all') data=data.filter(e=>e.category===f);
  const sort=$('recordSort').value;
  if(sort==='asc') data.sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);
  else if(sort==='amountDesc') data.sort((a,b)=>expenseKRW(b)-expenseKRW(a));
  else data.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  if(!data.length){ list.innerHTML='<div class="empty">아직 저장된 지출이 없습니다.</div>'; return; }
  data.forEach(e=>{
    const el=document.createElement('div'); el.className='record';
    const original=e.currencyMode==='krw'?`${Number(e.amount).toLocaleString('ko-KR')}원`:`${Number(e.amount).toLocaleString('ko-KR')} ${e.currencyCodeSnapshot||state.settings.currencyCode}`;
    el.innerHTML=`
      <div class="record-top"><div><div class="record-title">${escapeHtml(e.description)}</div><div class="record-date">${formatDate(e.date)}</div></div><div class="record-amount">${won(expenseKRW(e))}</div></div>
      <div class="record-meta">${escapeHtml(e.category)} · ${escapeHtml(e.payment)} · ${original}${e.memo?` · ${escapeHtml(e.memo)}`:''}</div>
      <div class="record-actions"><button class="mini-btn edit" data-id="${e.id}">수정</button><button class="mini-btn delete" data-id="${e.id}">삭제</button></div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.edit').forEach(b=>b.onclick=()=>startEdit(b.dataset.id));
  list.querySelectorAll('.delete').forEach(b=>b.onclick=()=>deleteExpense(b.dataset.id));
}
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function renderChecklist(){
  const list=$('checklistList'); list.innerHTML='';
  const groups=[...new Set(state.checklist.map(i=>i.group))];
  groups.forEach(g=>{
    const h=document.createElement('div'); h.className='check-group-title'; h.textContent=g; list.appendChild(h);
    state.checklist.filter(i=>i.group===g).forEach(item=>{
      const row=document.createElement('label'); row.className=`check-item ${item.done?'done':''}`;
      row.innerHTML=`<input type="checkbox" data-id="${item.id}" ${item.done?'checked':''}><span class="check-text">${escapeHtml(item.text)}</span>`;
      list.appendChild(row);
    });
  });
  list.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.onchange=()=>{
    const item=state.checklist.find(x=>x.id===cb.dataset.id); if(item)item.done=cb.checked; saveState(); renderChecklist();
  });
  const done=state.checklist.filter(i=>i.done).length, total=state.checklist.length, pct=total?Math.round(done/total*100):0;
  $('checkProgress').textContent=`${pct}%`; $('checkProgressBar').style.width=`${pct}%`;
}


function updateRateLabel(){
  const code=$('currencyCode')?.value || state.settings.currencyCode || 'JPY';
  const label=$('rateLabel'); if(label) label.textContent=`1 ${code} = 몇 원(KRW)?`;
  const hint=$('rateHint'); if(hint) hint.textContent=`구글·네이버·XE 등에서 “1 ${code} KRW” 또는 “${code} KRW 환율”을 검색해 나온 원화 값을 그대로 입력하세요.`;
}

function fillSettings(){
  const s=state.settings;
  $('tripName').value=s.tripName||''; $('destination').value=s.destination||''; $('startDate').value=s.startDate||''; $('endDate').value=s.endDate||'';
  $('people').value=s.people||1; $('budget').value=s.budget||0; $('currencyCode').value=s.currencyCode||'JPY'; $('krwPerUnit').value=s.krwPerUnit||9.35; updateRateLabel();
}
function renderAll(){ renderHeader(); renderCalendar(); renderSelectedDate(); renderRecords(); renderChecklist(); fillSettings(); }

$('expenseForm').addEventListener('submit',(ev)=>{
  ev.preventDefault();
  if(!state.selectedDate){ toast('먼저 날짜를 선택해 주세요.'); return; }
  const amount=Number($('amount').value); if(!(amount>0)){ toast('금액을 입력해 주세요.'); return; }
  const id=$('editingId').value;
  const data={
    date:state.selectedDate, category:$('category').value, description:$('description').value.trim(), payment:$('payment').value,
    currencyMode:$('currencyMode').value, amount, memo:$('memo').value.trim(), rateSnapshot:Number(state.settings.krwPerUnit)||0, currencyCodeSnapshot:state.settings.currencyCode,
  };
  if(!data.description){ toast('내용을 입력해 주세요.'); return; }
  if(id){
    const idx=state.expenses.findIndex(e=>e.id===id); if(idx>=0) state.expenses[idx]={...state.expenses[idx],...data,updatedAt:Date.now()};
    toast('지출을 수정했습니다.');
  } else {
    state.expenses.push({id:crypto.randomUUID?crypto.randomUUID():`e${Date.now()}${Math.random()}`, ...data, createdAt:Date.now()});
    toast('지출을 저장했습니다.');
  }
  saveState(); clearExpenseForm(); renderAll();
});
function clearExpenseForm(){
  $('editingId').value=''; $('description').value=''; $('amount').value=''; $('memo').value=''; $('category').value='식비'; $('payment').value='카드'; $('currencyMode').value='foreign';
  $('expenseSubmitBtn').textContent='지출 저장'; $('cancelEditBtn').classList.add('hidden');
}
function startEdit(id){
  const e=state.expenses.find(x=>x.id===id); if(!e)return;
  state.selectedDate=e.date; viewDate=new Date(e.date+'T12:00:00');
  $('editingId').value=e.id; $('category').value=e.category; $('description').value=e.description; $('payment').value=e.payment; $('currencyMode').value=e.currencyMode; $('amount').value=e.amount; $('memo').value=e.memo||'';
  $('expenseSubmitBtn').textContent='수정 저장'; $('cancelEditBtn').classList.remove('hidden');
  activateTab('calendar'); renderCalendar(); renderSelectedDate(); window.scrollTo({top:0,behavior:'smooth'}); toast('수정할 내용을 확인해 주세요.');
}
function deleteExpense(id){
  const e=state.expenses.find(x=>x.id===id); if(!e)return;
  if(!confirm(`${e.description} 지출을 삭제할까요?`))return;
  state.expenses=state.expenses.filter(x=>x.id!==id); saveState(); renderAll(); toast('지출을 삭제했습니다.');
}
$('cancelEditBtn').onclick=()=>{clearExpenseForm();toast('수정을 취소했습니다.');};

$('settingsForm').addEventListener('submit',(ev)=>{
  ev.preventDefault();
  const start=$('startDate').value, end=$('endDate').value;
  if(!start||!end){toast('여행 날짜를 입력해 주세요.');return;}
  if(end<start){toast('종료일은 시작일 이후여야 합니다.');return;}
  const rate=Number($('krwPerUnit').value); if(!(rate>0)){toast('1 외화가 몇 원인지 입력해 주세요.');return;}
  state.settings={ tripName:$('tripName').value.trim()||'나의 여행', destination:$('destination').value.trim(), startDate:start, endDate:end, people:Math.max(1,Number($('people').value)||1), budget:Math.max(0,Number($('budget').value)||0), currencyCode:$('currencyCode').value, krwPerUnit:rate };
  if(!inTrip(state.selectedDate)) state.selectedDate=start;
  viewDate=new Date(start+'T12:00:00'); saveState(); renderAll(); activateTab('calendar'); toast('여행 설정을 저장했습니다.');
});

$('prevMonth').onclick=()=>{ viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1,12); renderCalendar(); };
$('nextMonth').onclick=()=>{ viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1,12); renderCalendar(); };
$('recordCategoryFilter').onchange=renderRecords; $('recordSort').onchange=renderRecords; $('currencyCode').onchange=updateRateLabel;

function activateTab(id){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===id));
  if(id==='records')renderRecords(); if(id==='settings')fillSettings();
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.tab)));

$('exportBtn').onclick=()=>{
  if(!state.expenses.length){toast('내보낼 지출 기록이 없습니다.');return;}
  const rows=[['날짜','구분','내용','결제수단','통화','원금액','원화환산','메모']];
  [...state.expenses].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>rows.push([e.date,e.category,e.description,e.payment,e.currencyMode==='krw'?'KRW':(e.currencyCodeSnapshot||state.settings.currencyCode),e.amount,Math.round(expenseKRW(e)),e.memo||'']));
  const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`여행경비_${state.settings.tripName||'여행'}.csv`; a.click(); URL.revokeObjectURL(url); toast('CSV 파일을 만들었습니다.');
};
$('resetBtn').onclick=()=>{
  if(!confirm('여행 설정, 지출 기록, 체크리스트를 모두 초기화할까요?'))return;
  state=defaultState(); viewDate=new Date(state.settings.startDate+'T12:00:00'); saveState(); clearExpenseForm(); renderAll(); activateTab('calendar'); toast('초기화했습니다.');
};

renderAll();

// ===== v2.2 다꾸 꾸미기 / 사진 / 공유 =====
const appearanceDefaults = {
  theme: 'passport', accent: '#3d8fb0', font: 'system', backgroundPhoto: '', stickers: []
};
if (!state.appearance) state.appearance = {...appearanceDefaults};
else state.appearance = {...appearanceDefaults, ...state.appearance};

const themeMap = {
  passport:{bg:'#f5f8fb', hero1:'#17324d', hero2:'#28516f', accent:'#3d8fb0'},
  ocean:{bg:'#f0fbfb', hero1:'#075d68', hero2:'#2a9d8f', accent:'#238b8f'},
  sunset:{bg:'#fff7f1', hero1:'#92374d', hero2:'#e07a5f', accent:'#d36b52'},
  pastel:{bg:'#fff8fc', hero1:'#8c6aa7', hero2:'#d69ac1', accent:'#b678a6'},
  night:{bg:'#f2f1f8', hero1:'#171933', hero2:'#3b356e', accent:'#6c63b7'},
  vintage:{bg:'#fbf5e9', hero1:'#66513c', hero2:'#a17b5b', accent:'#8d6a4c'}
};
const stickerCatalog = ['✈️','🧳','📷','🗺️','🌴','🌊','☕','🍜','🛍️','🎡','🏨','💗','⭐','🌙','🎟️','🚆'];

function applyAppearance(){
  const a=state.appearance||appearanceDefaults, t=themeMap[a.theme]||themeMap.passport;
  const root=document.documentElement;
  root.style.setProperty('--app-bg',t.bg); root.style.setProperty('--hero1',t.hero1); root.style.setProperty('--hero2',t.hero2); root.style.setProperty('--accent',a.accent||t.accent);
  document.body.classList.toggle('font-rounded',a.font==='rounded'); document.body.classList.toggle('font-serif',a.font==='serif');
  const hero=$('heroCard'), photo=$('heroPhoto');
  if(hero&&photo){ if(a.backgroundPhoto){ hero.classList.add('has-photo'); photo.style.backgroundImage=`url("${a.backgroundPhoto}")`; } else {hero.classList.remove('has-photo'); photo.style.backgroundImage='none';} }
  const layer=$('stickerLayer'); if(layer){ layer.innerHTML=''; (a.stickers||[]).slice(0,6).forEach(st=>{const span=document.createElement('span');span.className='hero-sticker';span.textContent=st;layer.appendChild(span);}); }
  const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content',a.accent||t.accent);
}

function renderCustomize(){
  const a=state.appearance;
  $('themeSelect').value=a.theme; $('accentColor').value=a.accent||'#3d8fb0'; $('fontSelect').value=a.font||'system';
  const wrap=$('stickerChoices'); wrap.innerHTML='';
  stickerCatalog.forEach(st=>{ const b=document.createElement('button'); b.type='button'; b.className='sticker-chip'+((a.stickers||[]).includes(st)?' active':''); b.textContent=st; b.onclick=()=>toggleSticker(st); wrap.appendChild(b); });
}
function toggleSticker(st){
  const arr=[...(state.appearance.stickers||[])], i=arr.indexOf(st);
  if(i>=0) arr.splice(i,1); else { if(arr.length>=6){toast('스티커는 최대 6개까지 선택할 수 있어요.');return;} arr.push(st); }
  state.appearance.stickers=arr; saveState(); applyAppearance(); renderCustomize();
}
function openCustomize(){renderCustomize();$('customizePanel').classList.remove('hidden');}
function closeCustomize(){$('customizePanel').classList.add('hidden');}
$('customizeBtn').onclick=openCustomize; $('closeCustomizeBtn').onclick=closeCustomize;
$('themeSelect').onchange=()=>{ const t=themeMap[$('themeSelect').value]; state.appearance.theme=$('themeSelect').value; state.appearance.accent=t.accent; $('accentColor').value=t.accent; saveState(); applyAppearance(); };
$('accentColor').oninput=()=>{state.appearance.accent=$('accentColor').value;saveState();applyAppearance();};
$('fontSelect').onchange=()=>{state.appearance.font=$('fontSelect').value;saveState();applyAppearance();};
$('removePhotoBtn').onclick=()=>{state.appearance.backgroundPhoto='';saveState();applyAppearance();toast('배경사진을 지웠습니다.');};
$('resetStyleBtn').onclick=()=>{state.appearance={...appearanceDefaults};saveState();applyAppearance();renderCustomize();toast('꾸미기를 초기화했습니다.');};

async function resizeImageFile(file,maxW=1400,maxH=1000,quality=.82){
  const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data;});
  let w=img.width,h=img.height, scale=Math.min(1,maxW/w,maxH/h); w=Math.round(w*scale);h=Math.round(h*scale);
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg',quality);
}
$('backgroundPhotoInput').onchange=async(e)=>{
  const file=e.target.files?.[0]; if(!file)return;
  try{ state.appearance.backgroundPhoto=await resizeImageFile(file); saveState();applyAppearance();toast('내 사진을 배경으로 적용했습니다.'); }
  catch{toast('사진을 불러오지 못했습니다.');}
  e.target.value='';
};

function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function canvasText(ctx,text,x,y,size,weight='600',color='#17324d',align='left'){ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y);}
async function drawShareCard(){
  const c=$('shareCanvas'),ctx=c.getContext('2d'),a=state.appearance,t=themeMap[a.theme]||themeMap.passport;
  ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle=t.bg;ctx.fillRect(0,0,c.width,c.height);
  // hero
  const gx=ctx.createLinearGradient(70,70,1010,430);gx.addColorStop(0,t.hero1);gx.addColorStop(1,t.hero2);roundRect(ctx,60,60,960,440,42,gx);
  if(a.backgroundPhoto){ try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=a.backgroundPhoto;});ctx.save();ctx.globalAlpha=.28;ctx.beginPath();ctx.roundRect(60,60,960,440,42);ctx.clip();const ratio=Math.max(960/img.width,440/img.height),dw=img.width*ratio,dh=img.height*ratio;ctx.drawImage(img,60+(960-dw)/2,60+(440-dh)/2,dw,dh);ctx.restore();}catch{} }
  canvasText(ctx,'TRAVEL BUDGET',105,125,26,'700','rgba(255,255,255,.74)');
  canvasText(ctx,state.settings.tripName||'나의 여행',105,190,54,'800','#fff'); canvasText(ctx,state.settings.destination||'',105,235,28,'500','#fff');
  const spent=totalSpent(),budget=Number(state.settings.budget)||0,remain=budget-spent;
  [['총 예산',won(budget)],['총 지출',won(spent)],['남은 예산',won(remain)]].forEach((it,i)=>{const x=105+i*290;canvasText(ctx,it[0],x,355,23,'600','rgba(255,255,255,.72)');canvasText(ctx,it[1],x,400,31,'800','#fff');});
  (a.stickers||[]).slice(0,6).forEach((st,i)=>canvasText(ctx,st,860-(i%3)*70,120+Math.floor(i/3)*85,45,'600','#fff','center'));
  canvasText(ctx,'여행 지출 캘린더',75,575,34,'800',t.hero1);
  // recent date totals
  const dates=[...new Set(state.expenses.map(e=>e.date))].sort().slice(-6); let y=635;
  if(!dates.length){canvasText(ctx,'아직 저장된 지출이 없어요.',75,y,28,'500','#6b7c8f');}
  dates.forEach(d=>{roundRect(ctx,75,y-34,930,76,20,'#ffffff');canvasText(ctx,formatDate(d),105,y+12,27,'700',t.hero1);canvasText(ctx,won(dayTotal(d)),965,y+12,27,'800',a.accent||t.accent,'right');y+=94;});
  y=Math.max(y+15,1220); canvasText(ctx,`총 ${state.expenses.length}건 · ${state.settings.currencyCode||'KRW'} 기준`,75,y,23,'600','#6b7c8f');canvasText(ctx,'나의 여행경비 플래너',1005,y,23,'700',t.hero1,'right');
}
function canvasBlob(){return new Promise(resolve=>$('shareCanvas').toBlob(resolve,'image/png',.95));}
async function openShare(){await drawShareCard();$('sharePanel').classList.remove('hidden');}
$('shareBtn').onclick=openShare; $('closeShareBtn').onclick=()=>$('sharePanel').classList.add('hidden');
$('nativeShareBtn').onclick=async()=>{
  await drawShareCard(); const blob=await canvasBlob(); const file=new File([blob],`여행경비_${state.settings.tripName||'여행'}.png`,{type:'image/png'});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){try{await navigator.share({title:state.settings.tripName||'여행경비',text:'내 여행경비 플래너',files:[file]});return;}catch(e){if(e?.name==='AbortError')return;}}
  downloadBlob(blob,file.name);toast('공유가 지원되지 않아 이미지 파일로 저장했습니다.');
};
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('saveImageBtn').onclick=async()=>{
  await drawShareCard();const blob=await canvasBlob();const file=new File([blob],`여행경비_${state.settings.tripName||'여행'}.png`,{type:'image/png'});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:'여행경비 이미지 저장'});toast('공유 시트에서 ‘이미지 저장’을 선택하세요.');return;}catch(e){if(e?.name==='AbortError')return;}}
  downloadBlob(blob,file.name);toast('이미지 파일을 저장했습니다.');
};

// 기존 렌더링 뒤에도 꾸미기 적용
const _renderAllV22 = renderAll;
renderAll = function(){ _renderAllV22(); applyAppearance(); };
applyAppearance();
