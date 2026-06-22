/* ==========================================================================
   Chore Squad — app logic
   Uses Firebase Auth (passcode gate) + Firestore (live cross-device sync).
   Firestore's modular SDK is CSP-safe — no eval usage.
   ========================================================================== */

import { initializeApp }                          from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword,
         onAuthStateChanged, signOut }            from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX } from "./firebase-config.js";

(function () {
  "use strict";

  console.log("[FamilyHub] module loading…");

  var fbApp   = initializeApp(firebaseConfig);
  var auth    = getAuth(fbApp);
  var db      = getFirestore(fbApp);
  var choreDocRef = doc(db, "family", "chores");

  console.log("[FamilyHub] Firebase initialized");

  var GRADIENTS = [
    ["#FF4FA3","#FF8FCB"],["#9B5DE5","#C7A6FF"],["#00C2D1","#7BE0EA"],
    ["#FF9F1C","#FFC773"],["#22B07D","#7CE3B5"],["#FF6B6B","#FFA3A3"],
    ["#5B7FFF","#A3B8FF"]
  ];
  var FREQ_LABELS = {1:"Daily",2:"Every 2 days",3:"Every 3 days",7:"Weekly",14:"Every 2 weeks",30:"Monthly"};
  var CONFETTI_EMOJI = ["✨","💖","⭐","🎀","💫","🩷"];

  var state = {
    chores:[],loading:true,dbError:false,
    showAddForm:false,
    newChore:{name:"",person:"",freqPreset:"7",freqCustom:"",doneToday:false},
    filterPerson:"all",dueOnly:false,ui:{}
  };

  // ---------- DOM refs ----------
  var authLoadingEl = document.getElementById("auth-loading");
  var gateEl        = document.getElementById("passcode-gate");
  var gateErrorEl   = document.getElementById("gate-error");
  var gateSubmitBtn = document.getElementById("gate-submit");
  var gateInputsWrap= document.getElementById("gate-inputs");
  var digitEls      = Array.prototype.slice.call(document.querySelectorAll(".gate-digit"));
  var appRootEl     = document.getElementById("chore-app-root");
  var footerEl      = document.getElementById("site-footer");
  var lockBtn       = document.getElementById("lock-device-btn");

  console.log("[FamilyHub] DOM elements found:", {
    authLoading: !!authLoadingEl, gate: !!gateEl,
    appRoot: !!appRootEl, footer: !!footerEl
  });

  // ---------- digit inputs ----------
  function focusDigit(i){ if(digitEls[i]) digitEls[i].focus(); }

  digitEls.forEach(function(el,i){
    el.addEventListener("input",function(){
      el.value = el.value.replace(/[^0-9]/g,"").slice(0,1);
      if(el.value && i < digitEls.length-1) focusDigit(i+1);
      if(digitEls.every(function(d){return d.value.length===1;})) attemptUnlock();
    });
    el.addEventListener("keydown",function(e){
      if(e.key==="Backspace" && !el.value && i>0) focusDigit(i-1);
      if(e.key==="Enter") attemptUnlock();
    });
  });

  if(gateSubmitBtn) gateSubmitBtn.addEventListener("click", attemptUnlock);
  if(lockBtn) lockBtn.addEventListener("click",function(){ signOut(auth); });

  function showGateError(msg){
    gateErrorEl.textContent = msg;
    gateErrorEl.hidden = false;
    gateInputsWrap.classList.remove("shake");
    void gateInputsWrap.offsetWidth;
    gateInputsWrap.classList.add("shake");
  }

  function attemptUnlock(){
    var code = digitEls.map(function(d){return d.value;}).join("");
    if(code.length !== 4){ showGateError("Enter all 4 digits"); return; }
    gateSubmitBtn.disabled = true;
    gateSubmitBtn.textContent = "Checking…";
    console.log("[FamilyHub] attempting sign-in…");
    signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX+code)
      .then(function(){ console.log("[FamilyHub] sign-in resolved"); })
      .catch(function(err){
        console.error("[FamilyHub] sign-in error:", err.code, err.message);
        showGateError("😬 Wrong code — try again!");
        digitEls.forEach(function(d){d.value="";});
        focusDigit(0);
      })
      .finally(function(){
        gateSubmitBtn.disabled = false;
        gateSubmitBtn.textContent = "Unlock ✨";
      });
  }

  // ---------- auth state ----------
  var unsubscribeChores = null;

  onAuthStateChanged(auth, function(user){
    console.log("[FamilyHub] onAuthStateChanged:", user ? user.email : "signed out");
    authLoadingEl.hidden = true;
    if(user){
      gateEl.hidden     = true;
      appRootEl.hidden  = false;
      footerEl.hidden   = false;
      gateErrorEl.hidden= true;
      digitEls.forEach(function(d){d.value="";});
      subscribeToChores();
    } else {
      gateEl.hidden    = false;
      appRootEl.hidden = true;
      footerEl.hidden  = true;
      if(unsubscribeChores){ unsubscribeChores(); unsubscribeChores=null; }
      focusDigit(0);
    }
  });

  // ---------- Firestore live sync ----------
  function subscribeToChores(){
    console.log("[FamilyHub] subscribing to Firestore…");
    state.loading = true;
    render();
    unsubscribeChores = onSnapshot(choreDocRef,
      function(snap){
        console.log("[FamilyHub] Firestore snapshot received, exists:", snap.exists());
        var data = snap.exists() ? snap.data() : {};
        var raw  = data.list || [];
        state.chores  = Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw);
        state.loading = false;
        state.dbError = false;
        render();
      },
      function(err){
        console.error("[FamilyHub] Firestore read error:", err.code, err.message);
        state.dbError = true;
        state.loading = false;
        render();
      }
    );
  }

  function saveChores(){
    setDoc(choreDocRef, {list: state.chores}, {merge:false})
      .then(function(){ console.log("[FamilyHub] saved to Firestore"); })
      .catch(function(err){
        console.error("[FamilyHub] Firestore write error:", err.code, err.message);
        state.dbError = true;
        render();
      });
  }

  // ---------- date helpers ----------
  function todayDate(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
  function todayISO(){ return toISODate(todayDate()); }
  function toISODate(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function parseISODate(s){ var p=s.split("-").map(Number); return new Date(p[0],p[1]-1,p[2]); }
  function daysBetween(a,b){ return Math.round((b-a)/86400000); }
  function freqLabel(n){
    n=Number(n);
    return FREQ_LABELS[n]||("Every "+n+" day"+(n===1?"":"s"));
  }

  function computeStatus(chore){
    var today=todayDate();
    if(!chore.lastDone) return {key:"never",label:"🌱 Never done yet",color:"var(--accent-never)",bg:"var(--accent-never-bg)",ringProgress:1,sortValue:Infinity,lastDoneLabel:"Never done"};
    var last=parseISODate(chore.lastDone), daysSince=daysBetween(last,today), remaining=chore.frequencyDays-daysSince;
    var ringProgress=Math.min(Math.max(daysSince/chore.frequencyDays,0),1);
    var lastDoneLabel=daysSince===0?"Done today 🎉":daysSince===1?"Done yesterday":"Done "+daysSince+" days ago";
    var key,label,color,bg;
    if(remaining<0){key="overdue";label="😬 "+(-remaining)+" day"+((-remaining)>1?"s":"")+" overdue";color="var(--accent-overdue)";bg="var(--accent-overdue-bg)";}
    else if(remaining===0){key="due-today";label="⏰ Due today";color="var(--accent-soon)";bg="var(--accent-soon-bg)";}
    else if(remaining<=1){key="due-soon";label="🔔 Due tomorrow";color="var(--accent-soon)";bg="var(--accent-soon-bg)";}
    else{key="ok";label="✨ Due in "+remaining+" days";color="var(--accent-fresh)";bg="var(--accent-fresh-bg)";}
    return {key:key,label:label,color:color,bg:bg,ringProgress:ringProgress,sortValue:-remaining,lastDoneLabel:lastDoneLabel};
  }

  function hashGradient(name){
    var hash=0; for(var i=0;i<name.length;i++) hash=name.charCodeAt(i)+((hash<<5)-hash);
    return GRADIENTS[Math.abs(hash)%GRADIENTS.length];
  }
  function initials(name){ return name.trim().split(/\s+/).slice(0,2).map(function(p){return p[0]||"";}).join("").toUpperCase(); }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function uniquePeople(){ var set={}; state.chores.forEach(function(c){set[c.person]=true;}); return Object.keys(set).sort(function(a,b){return a.localeCompare(b);}); }

  // ---------- confetti ----------
  function spawnConfetti(x,y){
    for(var i=0;i<12;i++){
      var piece=document.createElement("span"); piece.className="confetti-piece";
      piece.textContent=CONFETTI_EMOJI[Math.floor(Math.random()*CONFETTI_EMOJI.length)];
      var angle=Math.random()*Math.PI*2, dist=50+Math.random()*60;
      piece.style.left=x+"px"; piece.style.top=y+"px";
      piece.style.setProperty("--tx",Math.cos(angle)*dist+"px");
      piece.style.setProperty("--ty",(Math.sin(angle)*dist-30)+"px");
      piece.style.setProperty("--rot",(Math.random()*360-180)+"deg");
      piece.style.setProperty("--dur",(0.6+Math.random()*0.4)+"s");
      document.body.appendChild(piece);
      (function(p){setTimeout(function(){p.remove();},1100);})(piece);
    }
  }

  // ---------- chore actions ----------
  function addChore(){
    var nc=state.newChore, name=nc.name.trim(), person=nc.person.trim();
    var freq=nc.freqPreset==="custom"?parseInt(nc.freqCustom,10):parseInt(nc.freqPreset,10);
    if(!name||!person||!freq||freq<1) return;
    state.chores.push({id:uid(),name:name,person:person,frequencyDays:freq,lastDone:nc.doneToday?todayISO():null});
    state.newChore={name:"",person:"",freqPreset:"7",freqCustom:"",doneToday:false};
    state.showAddForm=false;
    saveChores(); render();
  }
  function markDoneToday(id){
    var c=state.chores.find(function(x){return x.id===id;}); if(!c) return;
    c.lastDone=todayISO(); saveChores(); render();
  }
  function deleteChore(id){
    state.chores=state.chores.filter(function(x){return x.id!==id;}); delete state.ui[id]; saveChores(); render();
  }
  function startEdit(id){
    var c=state.chores.find(function(x){return x.id===id;}); if(!c) return;
    var isPreset=FREQ_LABELS.hasOwnProperty(String(c.frequencyDays));
    state.ui[id]={mode:"edit",editName:c.name,editPerson:c.person,editFreqPreset:isPreset?String(c.frequencyDays):"custom",editFreqCustom:isPreset?"":String(c.frequencyDays)};
    render();
  }
  function saveEdit(id){
    var c=state.chores.find(function(x){return x.id===id;}), u=state.ui[id]; if(!c||!u) return;
    var name=(u.editName||"").trim(), person=(u.editPerson||"").trim();
    var freq=u.editFreqPreset==="custom"?parseInt(u.editFreqCustom,10):parseInt(u.editFreqPreset,10);
    if(!name||!person||!freq||freq<1) return;
    c.name=name; c.person=person; c.frequencyDays=freq; state.ui[id]={mode:"view"}; saveChores(); render();
  }
  function cancelEdit(id){ state.ui[id]={mode:"view"}; render(); }
  function askDelete(id)  { state.ui[id]={mode:"delete"}; render(); }
  function cancelDelete(id){ state.ui[id]={mode:"view"}; render(); }
  function resetAll(){
    if(!confirm("Delete all chores? This can't be undone.")) return;
    state.chores=[]; state.ui={}; saveChores(); render();
  }

  // ---------- rendering ----------
  function ringSVG(status,size){
    size=size||56;
    var r=(size/2)-6, c=2*Math.PI*r, center=size/2, offset=c*(1-status.ringProgress);
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
      +'<circle class="ring-track" cx="'+center+'" cy="'+center+'" r="'+r+'"></circle>'
      +'<circle class="ring-progress" cx="'+center+'" cy="'+center+'" r="'+r+'" stroke="'+status.color+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 '+center+' '+center+')"></circle>'
      +'<path d="M'+(center*0.62)+' '+(center*1.0)+' L'+(center*0.85)+' '+(center*1.18)+' L'+(center*1.35)+' '+(center*0.68)+'" stroke="'+status.color+'" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      +'</svg>';
  }

  function freqSelectHTML(idPrefix,currentPreset,currentCustom){
    var opts=["1","2","3","7","14","30"];
    var html='<select class="freq-select" data-idprefix="'+idPrefix+'">';
    opts.forEach(function(o){ html+='<option value="'+o+'" '+(currentPreset===o?"selected":"")+'>'+freqLabel(o)+'</option>'; });
    html+='<option value="custom" '+(currentPreset==="custom"?"selected":"")+'>Custom…</option></select>';
    if(currentPreset==="custom") html+='<input type="number" min="1" class="freq-custom" data-idprefix="'+idPrefix+'" placeholder="days" value="'+esc(currentCustom||"")+'" style="width:78px;margin-left:6px;">';
    return html;
  }

  function cardHTML(chore){
    var status=computeStatus(chore), ui=state.ui[chore.id]||{mode:"view"};
    var grad=hashGradient(chore.person), avatarStyle="background:linear-gradient(135deg,"+grad[0]+","+grad[1]+")";
    if(ui.mode==="edit"){
      return '<div class="card surface"><div class="card-body"><div class="edit-form">'
        +'<input type="text" class="edit-name" data-id="'+chore.id+'" value="'+esc(ui.editName)+'" placeholder="Chore name" style="font-family:Fredoka,sans-serif;font-weight:600;font-size:15px;padding:10px 13px;border:2px solid var(--surface-border);border-radius:14px;">'
        +'<div class="edit-row"><input type="text" class="edit-person" data-id="'+chore.id+'" value="'+esc(ui.editPerson)+'" placeholder="Assigned to" list="peopleList" style="padding:10px 13px;border:2px solid var(--surface-border);border-radius:14px;"></div>'
        +'<div class="edit-row" style="align-items:center;">'+freqSelectHTML("edit-"+chore.id,ui.editFreqPreset,ui.editFreqCustom)+'</div>'
        +'<div class="form-actions"><button class="btn btn-primary btn-small" data-action="save-edit" data-id="'+chore.id+'">💾 Save</button><button class="btn btn-ghost btn-small" data-action="cancel-edit" data-id="'+chore.id+'">Cancel</button></div>'
        +'</div></div></div>';
    }
    var deleteBlock=ui.mode==="delete"
      ?'<div class="confirm-delete">Delete this chore?<button class="btn btn-danger btn-small" data-action="confirm-delete" data-id="'+chore.id+'">Delete</button><button class="btn btn-ghost btn-small" data-action="cancel-delete" data-id="'+chore.id+'">Cancel</button></div>':'';
    return '<div class="card surface">'
      +'<button class="ring-btn" data-action="mark-done" data-id="'+chore.id+'" title="Mark done today">'+ringSVG(status,56)+'</button>'
      +'<div class="card-body"><div class="card-top"><h3 class="chore-name">'+esc(chore.name)+'</h3>'
      +'<div class="card-icons">'
      +'<button class="icon-btn" data-action="edit" data-id="'+chore.id+'" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'
      +'<button class="icon-btn" data-action="ask-delete" data-id="'+chore.id+'" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>'
      +'</div></div>'
      +'<div class="meta-row"><span class="avatar" style="'+avatarStyle+'">'+esc(initials(chore.person))+'</span><span>'+esc(chore.person)+'</span><span class="dot">·</span><span class="freq-text">'+freqLabel(chore.frequencyDays)+'</span></div>'
      +'<div class="last-done">'+esc(status.lastDoneLabel)+'</div>'
      +'<span class="status-pill" style="color:'+status.color+';background:'+status.bg+'">'+status.label+'</span>'
      +deleteBlock+'</div></div>';
  }

  function render(){
    var appEl=document.getElementById("app"); if(!appEl) return;
    if(state.loading){ appEl.innerHTML='<div class="loading-state">Loading your chores… ✨</div>'; return; }
    var people=uniquePeople(), total=state.chores.length;
    var dueCount=state.chores.map(computeStatus).filter(function(s){return s.key==="overdue"||s.key==="due-today"||s.key==="never";}).length;
    var html="";
    if(state.dbError) html+='<div class="storage-banner">📡 Couldn\'t reach the family database — check your connection.</div>';
    html+='<div class="app-header"><div><div class="title-wrap"><span class="title-emoji">🧹</span><h1 class="app-title">Chore Squad</h1></div>'
      +'<div class="stats">'+total+' chore'+(total===1?"":"s")+(total?' · <strong>'+dueCount+'</strong> due now':'')+'</div></div>'
      +'<button class="btn btn-primary" data-action="toggle-add">'+(state.showAddForm?"Close":"✨ New Chore")+'</button></div>';
    if(state.showAddForm){
      var nc=state.newChore;
      html+='<div class="panel surface"><div class="form-grid">'
        +'<div class="field"><label>Chore</label><input type="text" id="new-name" placeholder="e.g. Take out trash" value="'+esc(nc.name)+'"></div>'
        +'<div class="field"><label>Assigned to</label><input type="text" id="new-person" list="peopleList" placeholder="e.g. Jordan" value="'+esc(nc.person)+'"></div>'
        +'<div class="field"><label>Frequency</label><div style="display:flex;">'+freqSelectHTML("new",nc.freqPreset,nc.freqCustom)+'</div></div>'
        +'</div><label class="checkbox-row"><input type="checkbox" id="new-donetoday" '+(nc.doneToday?"checked":"")+'>Already done today</label>'
        +'<div class="form-actions"><button class="btn btn-primary" data-action="add-chore">✨ Add Chore</button><button class="btn btn-ghost" data-action="toggle-add">Cancel</button></div></div>';
    }
    html+='<datalist id="peopleList">'+people.map(function(p){return'<option value="'+esc(p)+'">';}).join("")+'</datalist>';
    if(total>0){
      html+='<div class="filter-bar"><select id="filter-person"><option value="all">All people</option>'
        +people.map(function(p){return'<option value="'+esc(p)+'" '+(state.filterPerson===p?"selected":"")+'>'+esc(p)+'</option>';}).join("")
        +'</select><button class="toggle-chip '+(state.dueOnly?"active":"")+'" data-action="toggle-due-only">🔥 Due &amp; overdue only</button></div>';
    }
    var visible=state.chores.filter(function(c){
      if(state.filterPerson!=="all"&&c.person!==state.filterPerson) return false;
      if(state.dueOnly){var s=computeStatus(c);if(!(s.key==="overdue"||s.key==="due-today"||s.key==="never")) return false;}
      return true;
    }).sort(function(a,b){
      var sa=computeStatus(a).sortValue,sb=computeStatus(b).sortValue;
      return sa!==sb?sb-sa:a.name.localeCompare(b.name);
    });
    if(total===0) html+='<div class="empty-state"><span class="big-emoji">🦋</span><h3>Nothing here yet</h3><p>Add your first chore and let\'s get this party started!</p><button class="btn btn-primary" data-action="toggle-add">✨ New Chore</button></div>';
    else if(visible.length===0) html+='<div class="empty-state"><span class="big-emoji">🔍</span><h3>Nothing matches</h3><p>Try a different filter.</p></div>';
    else html+='<div class="grid">'+visible.map(cardHTML).join("")+'</div>';
    html+='<div class="footer-bar"><button data-action="reset-all">🗑️ Clear all chores</button></div>';
    appEl.innerHTML=html;

    // re-bind live inputs
    var nameEl=document.getElementById("new-name"), personEl=document.getElementById("new-person"), doneEl=document.getElementById("new-donetoday");
    if(nameEl)   nameEl.addEventListener("input",function(){state.newChore.name=nameEl.value;});
    if(personEl) personEl.addEventListener("input",function(){state.newChore.person=personEl.value;});
    if(doneEl)   doneEl.addEventListener("change",function(){state.newChore.doneToday=doneEl.checked;});
    document.querySelectorAll(".edit-name").forEach(function(el){ el.addEventListener("input",function(){var id=el.getAttribute("data-id");if(state.ui[id])state.ui[id].editName=el.value;}); });
    document.querySelectorAll(".edit-person").forEach(function(el){ el.addEventListener("input",function(){var id=el.getAttribute("data-id");if(state.ui[id])state.ui[id].editPerson=el.value;}); });
    document.querySelectorAll(".freq-select").forEach(function(el){
      el.addEventListener("change",function(){
        var prefix=el.getAttribute("data-idprefix");
        if(prefix==="new") state.newChore.freqPreset=el.value;
        else {var id=prefix.replace("edit-","");if(state.ui[id])state.ui[id].editFreqPreset=el.value;}
        render();
      });
    });
    document.querySelectorAll(".freq-custom").forEach(function(el){
      el.addEventListener("input",function(){
        var prefix=el.getAttribute("data-idprefix");
        if(prefix==="new") state.newChore.freqCustom=el.value;
        else {var id=prefix.replace("edit-","");if(state.ui[id])state.ui[id].editFreqCustom=el.value;}
      });
    });
    var filterPersonEl=document.getElementById("filter-person");
    if(filterPersonEl) filterPersonEl.addEventListener("change",function(){state.filterPerson=filterPersonEl.value;render();});
  }

  // ---------- click delegation ----------
  document.getElementById("chore-app-root").addEventListener("click",function(e){
    var btn=e.target.closest("[data-action]"); if(!btn) return;
    var action=btn.getAttribute("data-action"), id=btn.getAttribute("data-id");
    if(action==="toggle-add")      { state.showAddForm=!state.showAddForm; render(); }
    else if(action==="add-chore")  { addChore(); }
    else if(action==="mark-done")  { var r=btn.getBoundingClientRect(); spawnConfetti(r.left+r.width/2,r.top+r.height/2); markDoneToday(id); }
    else if(action==="edit")       { startEdit(id); }
    else if(action==="save-edit")  { saveEdit(id); }
    else if(action==="cancel-edit"){ cancelEdit(id); }
    else if(action==="ask-delete") { askDelete(id); }
    else if(action==="confirm-delete"){ deleteChore(id); }
    else if(action==="cancel-delete"){ cancelDelete(id); }
    else if(action==="toggle-due-only"){ state.dueOnly=!state.dueOnly; render(); }
    else if(action==="reset-all")  { resetAll(); }
  });

  console.log("[FamilyHub] ready");
})();
