import { supabase } from "./supabase.js";
import { IMAGE_BUCKET } from "./config.js";
import { classifyEwaste, estimateValue, categoryLabel, classes } from "./ai.js";
import { pendingLots, queueLot, syncPending } from "./offline.js";

const $ = s => document.querySelector(s);
const content = $("#content");
let profile = null;
let currentPage = "dashboard";
let lastLot = null;

const pages = {
  collector: [
    ["dashboard","Dashboard"],["new-lot","Add E-Waste"],["lots","My Lots"],["earnings","Earnings"],["passport","Collection Passport"]
  ],
  recycler: [
    ["dashboard","Dashboard"],["offers","Incoming Lots"],["transactions","Transactions"],["recyclers","Profile"]
  ],
  admin: [
    ["dashboard","Dashboard"],["lots","All Lots"],["recyclers","Recyclers"],["analytics","Analytics"]
  ]
};

function toast(msg, ok=true) {
  const t=$("#toast"); t.textContent=msg; t.className=ok?"show success":"show error";
  setTimeout(()=>t.className="",2600);
}
function esc(s="") { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function money(n) { return `₹${Number(n||0).toLocaleString("en-IN")}`; }
function dateTime(d) { return d ? new Date(d).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) : "—"; }

function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  buildNav();
  render(currentPage);
}
function buildNav() {
  $("#nav").innerHTML = (pages[profile.role] || pages.collector).map(([id,label]) =>
    `<button class="nav-btn ${currentPage===id?"active":""}" data-page="${id}"><span>${icon(id)}</span>${label}</button>`
  ).join("");
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;buildNav();render(currentPage)});
}
function icon(id) {
  return ({dashboard:"⌂","new-lot":"+","lots":"▣",earnings:"₹",passport:"◈",offers:"↔",transactions:"✓",recyclers:"♻",analytics:"◒"})[id]||"•";
}

async function loadProfile(user) {
  let {data,error}=await supabase.from("profiles").select("*").eq("id",user.id).single();
  if(error || !data) {
    const role = user.user_metadata?.role || "collector";
    const name = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const res=await supabase.from("profiles").upsert({id:user.id,name,role,email:user.email});
    if(res.error) console.warn(res.error);
    data={id:user.id,name,role,email:user.email};
  }
  profile=data;
  $("#userName").textContent=data.name||"User";
  $("#userRole").textContent=data.role;
  $("#userInitial").textContent=(data.name||"U")[0].toUpperCase();
}

async function render(page) {
  $("#pageTitle").textContent = pageTitle(page);
  $("#pageSubtitle").textContent = subtitle(page);
  if(page==="dashboard") return renderDashboard();
  if(page==="new-lot") return renderNewLot();
  if(page==="lots") return renderLots(profile.role==="admin");
  if(page==="earnings") return renderEarnings();
  if(page==="passport") return renderPassport();
  if(page==="offers") return renderOffers();
  if(page==="transactions") return renderTransactions();
  if(page==="recyclers") return renderRecyclers();
  if(page==="analytics") return renderAnalytics();
}
function pageTitle(p){ return ({dashboard:"Dashboard","new-lot":"Add E-Waste",lots:"Lots",earnings:"Earnings",passport:"Collection Passport",offers:"Incoming Lots",transactions:"Transactions",recyclers:"Recyclers",analytics:"Analytics"})[p]||"Kabadiwala Connect"; }
function subtitle(p){ return ({dashboard:"Your e-waste activity at a glance","new-lot":"Create a traceable digital material lot",lots:"Track collection and handover status",earnings:"Payments and realized value",passport:"Trace every lot from capture to handover",offers:"Review collector lots and make offers",transactions:"Completed and pending handovers",recyclers:"Authorized recycler information",analytics:"Platform-level operational view"})[p]||""; }

async function getLots(filter={}) {
  let q=supabase.from("lots").select("*, profiles!lots_collector_id_fkey(name,email), recyclers(name,location,authorization_status)").order("created_at",{ascending:false});
  if(filter.collector_id) q=q.eq("collector_id",filter.collector_id);
  if(filter.recycler_id) q=q.eq("recycler_id",filter.recycler_id);
  if(filter.status) q=q.eq("status",filter.status);
  const {data,error}=await q;
  if(error){console.error(error);return []}
  return data||[];
}

async function renderDashboard() {
  if(profile.role==="collector") {
    const lots=await getLots({collector_id:profile.id});
    const total=lots.reduce((s,x)=>s+Number(x.final_sale_value||0),0);
    content.innerHTML=`
      <div class="hero"><div><span class="eyebrow">COLLECTOR-FIRST</span><h2>Turn every collection into a traceable digital lot.</h2><p>Capture e-waste, discover indicative value, connect with authorized recyclers and maintain your earnings ledger.</p><button class="primary" id="addBtn">+ Add E-Waste</button></div><div class="hero-stat"><b>${lots.length}</b><span>Total Lots</span></div></div>
      <div class="grid-4"><div class="stat"><span>Lots</span><b>${lots.length}</b></div><div class="stat"><span>Realized Value</span><b>${money(total)}</b></div><div class="stat"><span>Completed</span><b>${lots.filter(x=>x.status==="completed").length}</b></div><div class="stat"><span>Pending Sync</span><b>${pendingLots().length}</b></div></div>
      <div class="section-head"><h3>Recent Collections</h3><button class="ghost" id="viewLots">View all</button></div>
      ${lotTable(lots.slice(0,5))}
    `;
    $("#addBtn").onclick=()=>{currentPage="new-lot";buildNav();render("new-lot")};
    $("#viewLots").onclick=()=>{currentPage="lots";buildNav();render("lots")};
  } else if(profile.role==="recycler") {
    const lots=await getLots({recycler_id:profile.id});
    content.innerHTML=`
      <div class="hero"><div><span class="eyebrow">RECYCLER INTERFACE</span><h2>Review compatible collector lots.</h2><p>Verify material, make offers, confirm handover and maintain a structured transaction record.</p><button class="primary" id="offersBtn">View Incoming Lots</button></div><div class="hero-stat"><b>${lots.filter(x=>x.status!=="completed").length}</b><span>Open Lots</span></div></div>
      <div class="grid-4"><div class="stat"><span>Assigned Lots</span><b>${lots.length}</b></div><div class="stat"><span>Completed</span><b>${lots.filter(x=>x.status==="completed").length}</b></div><div class="stat"><span>Pending</span><b>${lots.filter(x=>x.status!=="completed").length}</b></div><div class="stat"><span>Indicative Value</span><b>${money(lots.reduce((s,x)=>s+Number(x.estimated_value||0),0))}</b></div></div>
      ${lotTable(lots.slice(0,8),true)}
    `;
    $("#offersBtn").onclick=()=>{currentPage="offers";buildNav();render("offers")};
  } else {
    const lots=await getLots();
    const recyclers=await getRecyclers();
    content.innerHTML=`
      <div class="hero"><div><span class="eyebrow">ADMIN CONTROL CENTER</span><h2>Trace the recycling network.</h2><p>Monitor lots, recycler participation, transaction states and platform activity.</p></div><div class="hero-stat"><b>${lots.length}</b><span>Total Lots</span></div></div>
      <div class="grid-4"><div class="stat"><span>Total Lots</span><b>${lots.length}</b></div><div class="stat"><span>Completed</span><b>${lots.filter(x=>x.status==="completed").length}</b></div><div class="stat"><span>Open</span><b>${lots.filter(x=>x.status!=="completed").length}</b></div><div class="stat"><span>Recyclers</span><b>${recyclers.length}</b></div></div>
      ${lotTable(lots.slice(0,10))}
    `;
  }
}

function lotTable(lots,recycler=false) {
  if(!lots.length) return `<div class="empty">No lots found yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Lot ID</th><th>Material</th><th>Weight</th><th>Value</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
    ${lots.map(x=>`<tr><td><b>${esc(x.lot_id)}</b></td><td>${esc(categoryLabel(x.category))}</td><td>${x.weight_kg} kg</td><td>${money(x.final_sale_value||x.estimated_value)}</td><td><span class="badge ${x.status}">${esc(x.status)}</span></td><td>${dateTime(x.created_at)}</td><td><button class="link-btn" data-lot="${esc(x.id)}">Open</button></td></tr>`).join("")}
  </tbody></table></div>
  <script></script>`;
}

document.addEventListener("click", async e=>{
  const b=e.target.closest("[data-lot]");
  if(b) openLot(b.dataset.lot);
});

async function openLot(id) {
  const {data,error}=await supabase.from("lots").select("*,profiles!lots_collector_id_fkey(name,email),recyclers(name,location,authorization_status)").eq("id",id).single();
  if(error){toast(error.message,false);return}
  lastLot=data;
  content.innerHTML=`<div class="detail-head"><button class="ghost" id="back">← Back</button><span class="badge ${data.status}">${esc(data.status)}</span></div>
  <div class="detail-grid">
    <div class="card"><span class="eyebrow">COLLECTION PASSPORT</span><h2>${esc(data.lot_id)}</h2>
      ${data.image_url?`<img class="lot-img" src="${esc(data.image_url)}">`:""}
      <div class="kv"><span>Material</span><b>${esc(categoryLabel(data.category))}</b></div>
      <div class="kv"><span>Weight</span><b>${data.weight_kg} kg</b></div>
      <div class="kv"><span>Indicative value</span><b>${money(data.value_low)} – ${money(data.value_high)}</b></div>
      <div class="kv"><span>Location</span><b>${data.latitude?`${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}`:"Not captured"}</b></div>
      <div class="kv"><span>Timestamp</span><b>${dateTime(data.created_at)}</b></div>
    </div>
    <div class="card"><h3>Chain of custody</h3>
      <div class="timeline"><div><b>1. Captured</b><small>${dateTime(data.created_at)}</small></div><div><b>2. Classified</b><small>${esc(data.classification_source||"AI / manual")}</small></div><div><b>3. Recycler</b><small>${esc(data.recyclers?.name||"Pending match")}</small></div><div><b>4. Handover</b><small>${data.handover_at?dateTime(data.handover_at):"Pending"}</small></div><div><b>5. Payment</b><small>${data.payment_status||"Pending"}</small></div></div>
      ${profile.role==="recycler" && data.status!=="completed"?`<button class="primary full" id="confirmHandover">Confirm Handover</button>`:""}
    </div>
  </div>`;
  $("#back").onclick=()=>render(currentPage);
  if($("#confirmHandover")) $("#confirmHandover").onclick=()=>confirmHandover(data);
}

async function renderNewLot() {
  content.innerHTML=`<div class="form-grid">
    <div class="card"><span class="eyebrow">STEP 1</span><h3>Capture e-waste</h3>
      <label>Photo<input id="lotPhoto" type="file" accept="image/*" capture="environment"></label>
      <div id="preview"></div>
      <label>Category <select id="category"><option value="">AI will identify</option>${Object.entries(classes).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select></label>
      <label>Approximate weight (kg)<input id="weight" type="number" min="0.01" step="0.01" placeholder="e.g. 2.5" required></label>
      <button class="primary full" id="analyze">Analyze & Estimate Value</button>
    </div>
    <div class="card"><span class="eyebrow">STEP 2</span><h3>AI + Fair Value</h3><div id="analysisBox" class="analysis-empty">Upload a photo and enter weight.</div></div>
  </div>`;
  $("#lotPhoto").onchange=()=>{const f=$("#lotPhoto").files[0];if(f) $("#preview").innerHTML=`<img class="preview" src="${URL.createObjectURL(f)}">`};
  $("#analyze").onclick=analyzeLot;
}

async function analyzeLot() {
  const file=$("#lotPhoto").files[0], weight=Number($("#weight").value), manual=$("#category").value;
  if(!file || !weight) return toast("Photo and weight are required.",false);
  const box=$("#analysisBox"); box.innerHTML=`<div class="spinner"></div><p>Analyzing material…</p>`;
  const result=await classifyEwaste(file,manual), val=estimateValue(weight,result);
  box.innerHTML=`<div class="ai-result"><div class="confidence">${Math.round(result.confidence*100)}%</div><div><b>${esc(result.label)}</b><small>Classification confidence • ${result.source}</small></div></div>
  <div class="value-box"><span>Indicative value range</span><strong>${money(val.low)} – ${money(val.high)}</strong><small>Demo/reference estimate — actual recycler offer may differ.</small></div>
  <button class="primary full" id="createLot">Create Digital Lot & Find Recyclers</button>`;
  $("#createLot").onclick=()=>createLot(file,result,val,weight);
}

async function createLot(file,result,val,weight) {
  let imageUrl=null;
  if(navigator.onLine) {
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${profile.id}/${crypto.randomUUID()}.${ext}`;
    const up=await supabase.storage.from(IMAGE_BUCKET).upload(path,file,{contentType:file.type||"image/jpeg"});
    if(!up.error) imageUrl=supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  const geo=await getLocation();
  const lot={
    collector_id:profile.id,
    category:result.category,
    description:result.label,
    weight_kg:weight,
    value_low:val.low,
    value_high:val.high,
    estimated_value:Math.round((val.low+val.high)/2),
    latitude:geo?.lat||null, longitude:geo?.lng||null,
    image_url:imageUrl,
    classification_source:result.source,
    status:"created",
    payment_status:"pending"
  };
  if(!navigator.onLine) {
    queueLot(lot);
    toast("Saved offline. It will sync when connection returns.");
    return renderNewLot();
  }
  const {data,error}=await supabase.from("lots").insert(lot).select().single();
  if(error){console.error(error);queueLot(lot);toast("Saved locally; sync will retry.",false);return;}
  toast("Lot created successfully.");
  lastLot=data;
  currentPage="lots"; buildNav(); render("lots");
}

async function getLocation(){
  if(!navigator.geolocation) return null;
  return new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(null),{timeout:5000}));
}

async function renderLots(admin=false) {
  const lots=await getLots(admin?{}:{collector_id:profile.id});
  content.innerHTML=`<div class="toolbar"><div><b>${lots.length}</b> lots</div><button class="primary" id="newLot">+ Add E-Waste</button></div>${lotTable(lots)}`;
  $("#newLot").onclick=()=>{currentPage="new-lot";buildNav();render("new-lot")};
}
async function renderEarnings(){
  const lots=await getLots({collector_id:profile.id});
  const completed=lots.filter(x=>x.status==="completed");
  const total=completed.reduce((s,x)=>s+Number(x.final_sale_value||0),0);
  content.innerHTML=`<div class="grid-3"><div class="stat"><span>Total earned</span><b>${money(total)}</b></div><div class="stat"><span>Completed sales</span><b>${completed.length}</b></div><div class="stat"><span>Pending payment</span><b>${money(lots.filter(x=>x.payment_status!=="paid").reduce((s,x)=>s+Number(x.final_sale_value||0),0))}</b></div></div>${lotTable(completed)}`;
}
async function renderPassport(){
  const lots=await getLots({collector_id:profile.id});
  content.innerHTML=`<div class="card"><h3>Collection Passports</h3><p class="muted">Each passport is the traceable identity of a collected e-waste lot.</p>${lots.map(x=>`<button class="passport-row" data-lot="${esc(x.id)}"><b>${esc(x.lot_id)}</b><span>${esc(categoryLabel(x.category))}</span><span>${x.weight_kg} kg</span><span>${money(x.final_sale_value||x.estimated_value)}</span><span class="badge ${x.status}">${x.status}</span></button>`).join("")||'<div class="empty">No passports yet.</div>'}</div>`;
}
async function getRecyclers(){
  const {data,error}=await supabase.from("recyclers").select("*").order("name");
  if(error){console.error(error);return []} return data||[];
}
async function renderOffers(){
  const recyclers=await getRecyclers();
  const {data,error}=await supabase.from("lots").select("*,profiles!lots_collector_id_fkey(name,email)").neq("status","completed").order("created_at",{ascending:false});
  const lots=error?[]:data||[];
  content.innerHTML=`<div class="notice">Recycler offers are matched using material compatibility, location, indicative value and authorization status.</div>${lotTable(lots,true)}`;
}
async function confirmHandover(data){
  const final=Number(prompt("Enter final sale value (₹):",data.estimated_value||0));
  if(!final) return;
  const {error}=await supabase.from("lots").update({status:"completed",final_sale_value:final,handover_at:new Date().toISOString(),payment_status:"paid",recycler_id:profile.id}).eq("id",data.id);
  if(error) return toast(error.message,false);
  toast("Handover confirmed and earnings updated."); render("transactions");
}
async function renderTransactions(){
  const lots=await getLots({recycler_id:profile.id});
  content.innerHTML=lotTable(lots);
}
async function renderRecyclers(){
  const rs=await getRecyclers();
  content.innerHTML=`<div class="cards-grid">${rs.map(r=>`<div class="card recycler-card"><span class="verified">✓ ${esc(r.authorization_status||"Verified")}</span><h3>${esc(r.name)}</h3><p>${esc(r.location||"")}</p><div class="kv"><span>Materials</span><b>${esc((r.accepted_materials||[]).join(", "))}</b></div><div class="kv"><span>Pickup</span><b>${r.pickup_available?"Available":"Contact recycler"}</b></div></div>`).join("")||'<div class="empty">No recycler records yet.</div>'}</div>`;
}
async function renderAnalytics(){
  const lots=await getLots(), totalWeight=lots.reduce((s,x)=>s+Number(x.weight_kg||0),0), value=lots.reduce((s,x)=>s+Number(x.final_sale_value||x.estimated_value||0),0);
  content.innerHTML=`<div class="grid-4"><div class="stat"><span>Lots captured</span><b>${lots.length}</b></div><div class="stat"><span>Total weight</span><b>${totalWeight.toFixed(1)} kg</b></div><div class="stat"><span>Value tracked</span><b>${money(value)}</b></div><div class="stat"><span>Completion rate</span><b>${lots.length?Math.round(lots.filter(x=>x.status==="completed").length/lots.length*100):0}%</b></div></div><div class="card"><h3>Material distribution</h3>${Object.entries(lots.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{})).map(([k,v])=>`<div class="bar-row"><span>${esc(categoryLabel(k))}</span><div><i style="width:${Math.min(100,v/lots.length*100)}%"></i></div><b>${v}</b></div>`).join("")||"No data"}</div>`;
}

async function start(){
  $("#authTabs").onclick=e=>{const b=e.target.closest("[data-auth]");if(!b)return;document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");const reg=b.dataset.auth==="register";document.querySelectorAll(".register-only").forEach(x=>x.classList.toggle("hidden",!reg));$("#authSubmit").textContent=reg?"Create account":"Login";$("#authForm").dataset.mode=reg?"register":"login"};
  $("#authForm").onsubmit=async e=>{
    e.preventDefault();const mode=e.currentTarget.dataset.mode||"login",email=$("#authEmail").value.trim(),password=$("#authPassword").value,name=$("#authName").value.trim(),role=$("#authRole").value;
    if(mode==="register"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name,role}}});
      if(error)return toast(error.message,false);
      if(data.user) await loadProfile(data.user);
      toast("Account created. Check email verification if enabled.");
      showApp();
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)return toast(error.message,false);
      await loadProfile(data.user);showApp();
    }
  };
  $("#logoutBtn").onclick=async()=>{await supabase.auth.signOut();location.reload()};
  window.addEventListener("online",async()=>{updateOnline(); if(profile){const r=await syncPending(async lot=>{delete lot.local_id;delete lot.queued_at;await supabase.from("lots").insert(lot)});if(r.synced)toast(`${r.synced} offline lot(s) synced.`)}});
  window.addEventListener("offline",updateOnline);updateOnline();
  const {data:{session}}=await supabase.auth.getSession();
  if(session){await loadProfile(session.user);showApp();}
}
function updateOnline(){const el=$("#onlineStatus");el.textContent=navigator.onLine?"● Online":"● Offline";el.className=`status-pill ${navigator.onLine?"":"offline"}`}

start();
