const DEFAULT_CHECKLIST = [
  '여권 유효기간 확인','비자/전자여행허가 확인','항공권·숙소 예약내역 저장','여권 사본/사진 별도 보관',
  '해외 결제 가능한 카드 준비','현금 또는 트래블카드 준비','비상용 결제수단 준비','eSIM/SIM/로밍 준비',
  '충전기·보조배터리 준비','멀티어댑터/변환플러그 준비','날씨 확인 후 의류 준비','편한 신발 준비',
  '세면도구·선크림 준비','상비약 준비','여행자보험 확인','공항 이동방법 확인',
  '첫날 숙소 체크인 방법 확인','입장권·교통패스 확인','오프라인 지도 저장','귀국편 터미널·시간 확인'
];

const state = loadState();
let viewMonth = state.settings.startDate ? new Date(state.settings.startDate+'T00:00:00') : new Date();
let selectedDate = state.settings.startDate || todayKey();

function loadState(){
  const saved = localStorage.getItem('travelBudgetAppV1');
  if(saved) return JSON.parse(saved);
  const now = new Date();
  const start = toKey(now);
  const endD = new Date(now); endD.setDate(endD.getDate()+3);
  return {
    settings:{tripName:'나의 여행',destination:'',startDate:start,endDate:toKey(endD),people:2,budget:1000000,currencyCode:'JPY',foreignPer1000:107},
    expenses:[],
    checklist:DEFAULT_CHECKLIST.map((text,id)=>({id,text,done:false}))
  };
}
function saveState(){localStorage.setItem('travelBudgetAppV1',JSON.stringify(state));renderAll();}
function toKey(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate()-d.getTimezoneOffset()/1440).toISOString().slice(0,10)}
function todayKey(){return toKey(new Date())}
function fmt(n){return Math.round(Number(n||0)).toLocaleString('ko-KR')+'원'}
function spent(){return state.expenses.reduce((a,e)=>a+e.krwAmount,0)}
function days(){const a=new Date(state.settings.startDate),b=new Date(state.settings.endDate);return Math.max(1,Math.round((b-a)/86400000)+1)}
function dateLabel(key){if(!key)return '날짜를 선택하세요';return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date(key+'T00:00:00'))}
function dayTotal(key){return state.expenses.filter(e=>e.date===key).reduce((a,e)=>a+e.krwAmount,0)}
function showToast(msg){const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}

function renderHeader(){
  document.querySelector('#tripTitle').textContent = state.settings.tripName || state.settings.destination || '나의 여행';
  document.querySelector('#tripDays').textContent = days()+'일';
  document.querySelector('#budgetStat').textContent = fmt(state.settings.budget);
  document.querySelector('#spentStat').textContent = fmt(spent());
  document.querySelector('#remainStat').textContent = fmt(state.settings.budget-spent());
}
function renderCalendar(){
  const grid=document.querySelector('#calendarGrid'); grid.innerHTML='';
  const y=viewMonth.getFullYear(),m=viewMonth.getMonth();
  document.querySelector('#monthLabel').textContent=`${y}년 ${m+1}월`;
  const first=new Date(y,m,1); const start=new Date(y,m,1-((first.getDay()+6)%7));
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i); const key=toKey(d);
    const cell=document.createElement('button'); cell.type='button'; cell.className='day';
    if(d.getMonth()!==m)cell.classList.add('outside'); if(key===selectedDate)cell.classList.add('selected'); if(key===todayKey())cell.classList.add('today');
    const total=dayTotal(key);
    cell.innerHTML=`<div class="day-num">${d.getDate()}</div><div class="day-total">${total?fmt(total):''}</div>`;
    cell.addEventListener('click',()=>{selectedDate=key;renderCalendar();renderSelectedDay();}); grid.appendChild(cell);
  }
}
function renderSelectedDay(){
  document.querySelector('#selectedDateLabel').textContent=dateLabel(selectedDate);
  document.querySelector('#selectedDayTotal').textContent=fmt(dayTotal(selectedDate));
}
function renderRecords(){
  const list=document.querySelector('#recordsList'); list.innerHTML='';
  const sorted=[...state.expenses].sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt));
  if(!sorted.length){list.innerHTML='<div class="empty">아직 저장된 지출이 없습니다.</div>';return}
  sorted.forEach(e=>{
    const div=document.createElement('div'); div.className='record';
    div.innerHTML=`<div><strong>${e.description}</strong><small>${e.date} · ${e.category} · ${e.payment} · ${e.currencyMode==='foreign'?state.settings.currencyCode:'KRW'} ${Number(e.amount).toLocaleString()}</small>${e.memo?`<small> · ${e.memo}</small>`:''}</div><div class="record-amount">${fmt(e.krwAmount)}<br><button class="record-delete" data-id="${e.id}">삭제</button></div>`;
    list.appendChild(div);
  });
  list.querySelectorAll('.record-delete').forEach(btn=>btn.addEventListener('click',()=>{
    const i=state.expenses.findIndex(e=>String(e.id)===btn.dataset.id); if(i>=0){state.expenses.splice(i,1);saveState();showToast('지출을 삭제했어요');}
  }));
}
function renderChecklist(){
  const list=document.querySelector('#checklistList');list.innerHTML='';
  state.checklist.forEach(item=>{
    const lab=document.createElement('label');lab.className='check-item'+(item.done?' done':'');
    lab.innerHTML=`<input type="checkbox" ${item.done?'checked':''} data-id="${item.id}"><span>${item.text}</span>`;list.appendChild(lab);
  });
  list.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',()=>{const item=state.checklist.find(x=>String(x.id)===cb.dataset.id);item.done=cb.checked;saveState();}));
  const done=state.checklist.filter(x=>x.done).length;document.querySelector('#checkProgress').textContent=Math.round(done/state.checklist.length*100)+'%';
}
function renderSettings(){
  const s=state.settings; ['tripName','destination','startDate','endDate','people','budget','currencyCode','foreignPer1000'].forEach(id=>document.querySelector('#'+id).value=s[id]);
}
function renderAll(){renderHeader();renderCalendar();renderSelectedDay();renderRecords();renderChecklist();renderSettings();}

// tabs
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');document.querySelector('#'+btn.dataset.tab).classList.add('active');
}));

document.querySelector('#prevMonth').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);renderCalendar()};
document.querySelector('#nextMonth').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);renderCalendar()};

document.querySelector('#expenseForm').addEventListener('submit',e=>{
  e.preventDefault(); if(!selectedDate){showToast('날짜를 먼저 선택해주세요');return}
  const amount=Number(document.querySelector('#amount').value); const mode=document.querySelector('#currencyMode').value;
  const rate=Number(state.settings.foreignPer1000||0); const krw=mode==='foreign'?(rate?amount/rate*1000:0):amount;
  state.expenses.push({id:Date.now(),createdAt:new Date().toISOString(),date:selectedDate,category:document.querySelector('#category').value,description:document.querySelector('#description').value,payment:document.querySelector('#payment').value,currencyMode:mode,amount,krwAmount:krw,memo:document.querySelector('#memo').value});
  e.target.reset();document.querySelector('#currencyMode').value='foreign';saveState();showToast('지출을 저장했어요');
});

document.querySelector('#settingsForm').addEventListener('submit',e=>{
  e.preventDefault(); const oldRate=state.settings.foreignPer1000;
  state.settings={tripName:tripName.value||'나의 여행',destination:destination.value,startDate:startDate.value,endDate:endDate.value,people:Number(people.value||1),budget:Number(budget.value||0),currencyCode:currencyCode.value,foreignPer1000:Number(foreignPer1000.value||1)};
  if(oldRate!==state.settings.foreignPer1000){state.expenses.forEach(x=>{if(x.currencyMode==='foreign')x.krwAmount=x.amount/state.settings.foreignPer1000*1000})}
  viewMonth=new Date(state.settings.startDate+'T00:00:00');selectedDate=state.settings.startDate;saveState();showToast('여행 설정을 저장했어요');
});

document.querySelector('#exportBtn').onclick=()=>{
  const rows=[['날짜','구분','내용','결제수단','통화','결제금액','원화환산','메모'],...state.expenses.map(e=>[e.date,e.category,e.description,e.payment,e.currencyMode==='foreign'?state.settings.currencyCode:'KRW',e.amount,Math.round(e.krwAmount),e.memo])];
  const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='여행지출기록.csv';a.click();URL.revokeObjectURL(a.href);
};
document.querySelector('#resetBtn').onclick=()=>{if(confirm('여행 설정과 모든 지출 기록을 초기화할까요?')){localStorage.removeItem('travelBudgetAppV1');location.reload();}};

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderAll();
