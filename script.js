const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
let currentUser = null;
let latestRequirements = null;
let latestPlanId = null;
let planUnlocked = false;
let authMode = 'signup';
let supabaseClient = null;
const supabaseReady = () => !!(window.supabase && window.PLANORA_SUPABASE_URL &&
  window.PLANORA_SUPABASE_ANON_KEY &&
  !window.PLANORA_SUPABASE_URL.includes('PASTE_') &&
  !window.PLANORA_SUPABASE_ANON_KEY.includes('PASTE_'));
if (supabaseReady()) supabaseClient = window.supabase.createClient(
  window.PLANORA_SUPABASE_URL, window.PLANORA_SUPABASE_ANON_KEY
);
async function recordEvent(eventType, metadata={}) {
  if (!supabaseClient || !currentUser) return;
  const { error } = await supabaseClient.from('activity_events').insert({
    user_id: currentUser.id, event_type: eventType, metadata
  });
  if (error) console.warn('Activity event not saved:', error.message);
}
async function refreshUser() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
}

const modalIds = ['authModal','builderModal','previewModal','unlockModal'];

function showModal(id){const el=$('#'+id);el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeModal(id){const el=$('#'+id);el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!$('.modal-backdrop.open'))document.body.style.overflow='';}
function closeAll(){modalIds.forEach(closeModal)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3300)}
async function beginPlan(){
  if (!supabaseClient) { toast('Add your Supabase URL and publishable key in supabase-config.js first.'); authMode='signup'; updateAuthMode(); showModal('authModal'); return; }
  await refreshUser();
  if (!currentUser) { authMode='signup'; updateAuthMode(); showModal('authModal'); toast('Create an account or log in to start.'); return; }
  await recordEvent('open_plan_builder');
  showModal('builderModal');
}
refreshUser();
['startBtn','priceStartBtn','footerStartBtn'].forEach(id=>$('#'+id).addEventListener('click',beginPlan));
$('#loginBtn').addEventListener('click',()=>{authMode='login';updateAuthMode();showModal('authModal')});
$('#signupBtn').addEventListener('click',()=>{authMode='signup';updateAuthMode();showModal('authModal')});
$('#menuBtn').addEventListener('click',()=>$('.topbar').classList.toggle('mobile-open'));
$$('.topbar nav a').forEach(a=>a.addEventListener('click',()=>$('.topbar').classList.remove('mobile-open')));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal-backdrop').id)));
$$('.modal-backdrop').forEach(back=>back.addEventListener('click',e=>{if(e.target===back)closeModal(back.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
$$('[data-auth]').forEach(b=>b.addEventListener('click',()=>{authMode=b.dataset.auth;updateAuthMode()}));
function updateAuthMode(){const signup=authMode==='signup';$$('[data-auth]').forEach(b=>b.classList.toggle('active',b.dataset.auth===authMode));$('#authTitle').innerHTML=signup?`Let's get you <em>started.</em>`:`Welcome <em>back.</em>`;$('#authName').closest('label').style.display=signup?'block':'none';$('#authName').required=signup;$('#authPassword').autocomplete=signup?'new-password':'current-password';$('#authSubmit').textContent=signup?'Create my account ↗':'Log in ↗';}
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabaseClient) { toast('Supabase is not configured in supabase-config.js.'); return; }
  const signup = authMode === 'signup';
  const name = $('#authName').value.trim();
  const email = $('#authEmail').value.trim().toLowerCase();
  const password = $('#authPassword').value;
  $('#authSubmit').disabled = true;
  try {
    if (signup) {
      const { data, error } = await supabaseClient.auth.signUp({
        email, password, options: { data: { full_name: name } }
      });
      if (error) throw error;
      currentUser = data.user;
      if (!data.session) {
        toast('Account created. Confirm your email, then log in.');
        authMode = 'login'; updateAuthMode(); return;
      }
      await recordEvent('registration', { method: 'email' });
      toast('Account created successfully.');
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await recordEvent('login', { method: 'email' });
      toast('Welcome back!');
    }
    closeModal('authModal'); showModal('builderModal');
  } catch (err) {
    toast(err.message || 'Authentication failed. Please try again.');
  } finally {
    $('#authSubmit').disabled = false;
    updateAuthMode();
  }
});
$$('.choice-card input').forEach(input=>input.addEventListener('change',()=>{$$('.choice-card').forEach(card=>card.classList.toggle('selected',card.contains(input)&&input.checked))}));

$('#requirementsForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);latestRequirements=Object.fromEntries(fd.entries());['parking','stairs','elderly','extra'].forEach(k=>latestRequirements[k]=fd.has(k));if(Number(latestRequirements.width)<=0||Number(latestRequirements.length)<=0){toast('Please enter valid plot dimensions.');return}renderPreview(latestRequirements);closeModal('builderModal');showModal('previewModal');savePlan(latestRequirements)});

async function savePlan(requirements) {
  if (!supabaseClient || !currentUser) return;
  const { data, error } = await supabaseClient.from('floor_plans').insert({
    user_id: currentUser.id,
    title: `${requirements.bhk} · ${requirements.width}m × ${requirements.length}m`,
    requirements,
    preview_svg: $('#generatedPlan').outerHTML,
    status: 'preview'
  }).select('id').single();
  if (error) { console.error(error); toast('Could not save plan. Check database setup.'); return; }
  latestPlanId = data.id;
  await recordEvent('plan_generated', { floor_plan_id: latestPlanId, bhk: requirements.bhk });
  toast('Plan and requirements saved.');
}
function renderPreview(r){
 const width=Number(r.width),length=Number(r.length),bhk=parseInt(r.bhk,10)||2;
 $('#previewTitle').innerHTML=`Your ${escapeHtml(r.bhk)} home, <em>taking shape.</em>`;
 $('#previewSummary').textContent=`${width} m × ${length} m plot · ${r.front}-facing · ${r.floors} floor${r.floors==='1'?'':'s'} requested`;
 $('#compassLabel').textContent=({North:'N ↑',South:'S ↓',East:'E →',West:'W ←','North-East':'NE ↗','North-West':'NW ↖','South-East':'SE ↘','South-West':'SW ↙'})[r.front]||'N ↑';
 const features=[r.bhk+' layout',r.kitchen,r.living,r.parking?'Parking space':'No parking requested',r.stairs?`${r.stairLocation} staircase`:'No staircase requested',r.attachedBath,r.wc,r.openings];
 if(r.elderly)features.push('Age-friendly circulation');
 if(r.extra)features.push('Extra utility / pooja space');
 if(r.notes.trim())features.push('Additional notes considered');
 $('#featureList').innerHTML=features.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
 drawPlan(r,false);
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawPlan(r,dimensions){
 const svg=$('#generatedPlan');const W=500,H=430;const x=43,y=35,w=414,h=344;const stroke='#29483a';let parts=[];
 parts.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#f8f8f0"/>`);
 // Building outline and flexible room divisions; explicitly conceptual, not scaled to plot.
 parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffef9" stroke="${stroke}" stroke-width="7"/>`);
 const n=parseInt(r.bhk,10)||2;
 const leftW= n>=3?150:170, topH= n>=3?125:140, rightX=x+leftW;
 // Living zone bottom-left; kitchen bottom-right-ish; bedroom bands top.
 parts.push(`<path d="M${rightX} ${y} V${y+h} M${x} ${y+topH} H${rightX} M${rightX} ${y+topH+42} H${x+w} M${x+w-105} ${y+topH+42} V${y+h}" fill="none" stroke="${stroke}" stroke-width="5"/>`);
 // bathroom / WC corner
 parts.push(`<path d="M${x+w-105} ${y} V${y+topH} M${x+w-53} ${y} V${y+topH}" fill="none" stroke="${stroke}" stroke-width="4"/>`);
 // Extra bedrooms, where selected
 if(n>=2){parts.push(`<path d="M${x} ${y+topH+110} H${rightX}" fill="none" stroke="${stroke}" stroke-width="4"/>`)}
 if(n>=3){parts.push(`<path d="M${rightX} ${y+topH+125} H${x+w-105}" fill="none" stroke="${stroke}" stroke-width="4"/>`)}
 if(n>=4){parts.push(`<path d="M${x+leftW/2} ${y} V${y+topH}" fill="none" stroke="${stroke}" stroke-width="4"/>`)}
 const rooms=[];
 if(n===1)rooms.push(['BEDROOM',x+leftW/2,y+topH/2]);
 else if(n===2){rooms.push(['BEDROOM 1',x+leftW/2,y+topH/2],['BEDROOM 2',x+leftW/2,y+topH+62])}
 else if(n===3){rooms.push(['BEDROOM 1',x+leftW/2,y+topH/2],['BEDROOM 2',x+leftW/2,y+topH+62],['BEDROOM 3',rightX+((w-leftW-105)/2),y+topH+83])}
 else {rooms.push(['BEDROOM 1',x+leftW/4,y+topH/2],['BEDROOM 2',x+leftW*.75,y+topH/2],['BEDROOM 3',x+leftW/2,y+topH+62],['BEDROOM 4',rightX+((w-leftW-105)/2),y+topH+83])}
 rooms.forEach(([name,tx,ty])=>parts.push(roomText(name,tx,ty)));
 parts.push(roomText(r.living.includes('Separate')?'LIVING':'LIVING + DINING',x+leftW/2,y+h-48));
 parts.push(roomText('KITCHEN',rightX+(w-leftW-105)/2,y+h-48));
 parts.push(roomText(r.attachedBath.startsWith('Yes')?'BATH':'BATHROOM',x+w-79,y+topH*.45,10));
 parts.push(roomText('WC',x+w-26,y+topH*.45,9));
 if(r.extra)parts.push(roomText('UTILITY / POOJA',x+w-52,y+topH+18,8));
 if(r.parking){parts.push(`<rect x="${x+8}" y="${y+h+8}" width="105" height="27" rx="2" fill="#e8eee1" stroke="#8fa68b" stroke-dasharray="4 3"/>`);parts.push(roomText('PARKING',x+60,y+h+25,9))}
 if(r.stairs){const sx=r.stairLocation==='Outside the home'?x+w-85:x+rightX-x-0;const sy=r.stairLocation==='Outside the home'?y+h+8:y+topH+8;const sw=r.stairLocation==='Outside the home'?75:Math.max(50,leftW-18);const sh=45;parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#f1eadb" stroke="#a99065" stroke-width="1.5"/>`);for(let i=1;i<6;i++)parts.push(`<path d="M${sx+4} ${sy+i*sh/6} H${sx+sw-4}" stroke="#b6a17d" stroke-width="1"/>`);parts.push(roomText('STAIRS',sx+sw/2,sy+sh/2+3,8))}
 // Door openings, door leaf and swing
 const doorY=y+h-40, doorX=x+w/2-20;
 parts.push(`<path d="M${doorX} ${y+h} v-34 M${doorX} ${y+h-34} A34 34 0 0 1 ${doorX+34} ${y+h}" fill="none" stroke="#fffef9" stroke-width="8"/>`);
 parts.push(`<path d="M${doorX} ${y+h} v-34" stroke="#9f8d6e" stroke-width="2"/>`);
 // Windows drawn as breaks / double lines on outside wall
 [[x+50,y,x+94,y],[x+190,y,x+232,y],[x+w,y+75,x+w,y+112],[x+20,y+h,x+65,y+h]].forEach(([x1,y1,x2,y2])=>{parts.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#fffef9" stroke-width="9"/>`);parts.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#6eaaa0" stroke-width="3"/>`)});
 // Door gaps between rooms, symbolic
 parts.push(`<path d="M${rightX} ${y+topH+14} h-24" stroke="#fffef9" stroke-width="7"/><path d="M${rightX-24} ${y+topH+14} v23" stroke="#9f8d6e" stroke-width="1.5"/>`);
 // dimensions only after demo unlock, clearly marked illustrative
 if(dimensions){
   parts.push(`<g fill="#48634e" font-family="Arial,sans-serif" font-size="10" font-weight="700"><text x="${x+w/2}" y="${y-13}" text-anchor="middle">${width.toFixed(1)} m (plot width)</text><text x="${x-10}" y="${y+h/2}" text-anchor="middle" transform="rotate(-90 ${x-10} ${y+h/2})">${length.toFixed(1)} m (plot length)</text></g>`);
   parts.push(`<path d="M${x} ${y-5} V${y-18} M${x+w} ${y-5} V${y-18} M${x} ${y-13} H${x+w}" stroke="#78956a" stroke-width="1"/><path d="M${x-5} ${y} H${x-18} M${x-5} ${y+h} H${x-18} M${x-13} ${y} V${y+h}" stroke="#78956a" stroke-width="1"/>`);
   parts.push(`<text x="${W/2}" y="${H-7}" fill="#8a968a" font-size="8" text-anchor="middle">ILLUSTRATIVE DIMENSIONS ONLY · VERIFY WITH A QUALIFIED PROFESSIONAL</text>`);
 }else{
   parts.push(`<text x="${W/2}" y="${H-7}" fill="#8a968a" font-size="8" text-anchor="middle">CONCEPT ONLY · ROOM SIZES NOT SHOWN · NOT TO SCALE</text>`);
 }
 svg.innerHTML=parts.join('');
}
function roomText(text,x,y,size=10){return `<text x="${x}" y="${y}" fill="#3b5746" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" text-anchor="middle">${escapeHtml(text)}</text>`}
$('#editRequirements').addEventListener('click',()=>{closeModal('previewModal');showModal('builderModal')});
$('#unlockBtn').addEventListener('click',()=>{if(planUnlocked)downloadPlan();else showModal('unlockModal')});
$('#demoPayBtn').addEventListener('click',async()=>{planUnlocked=true;closeModal('unlockModal');drawPlan(latestRequirements,true);const button=$('#unlockBtn');button.textContent='Download concept plan ↓';button.classList.remove('btn-dark');button.classList.add('btn-lime');await recordEvent('demo_unlock_clicked',{floor_plan_id:latestPlanId,amount_inr:50,payment_simulated:true});toast('Demo only. No payment was taken.')});
async function downloadPlan(){
 if(!latestRequirements)return;
 await recordEvent('plan_downloaded',{floor_plan_id:latestPlanId,format:'svg',demo_unlocked:planUnlocked});
 const svg=$('#generatedPlan').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1000');svg.setAttribute('height','860');
 const svgText=new XMLSerializer().serializeToString(svg);const blob=new Blob([svgText],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='planora-concept-floor-plan.svg';a.click();URL.revokeObjectURL(url);toast('Plan downloaded as SVG. You can print it or save it as PDF.');
}
