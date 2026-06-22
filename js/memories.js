/* ==========================================================================
   Family Memories — photo timeline + document vault
   Auth:    Firebase Auth (same 4-digit gate as Chore Squad)
   Data:    Firestore — collections "photos" and "documents"
   Storage: Cloudinary free tier — direct browser upload, no server needed
   ========================================================================== */

import { initializeApp }                                  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword,
         onAuthStateChanged, signOut }                    from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc,
         updateDoc, doc, query, orderBy,
         onSnapshot, serverTimestamp }                    from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX,
         CLOUDINARY_CLOUD_NAME,
         CLOUDINARY_UPLOAD_PRESET }                       from "./firebase-config.js";

(function(){
"use strict";

var fbApp  = initializeApp(firebaseConfig);
var auth   = getAuth(fbApp);
var db     = getFirestore(fbApp);

var photosCol = collection(db, "photos");
var docsCol   = collection(db, "documents");

var MAX_MB = 20;

var state = {
  photos:[], docs:[],
  photosLoading:true, docsLoading:true,
  photoUploads:{}, docUploads:{},   // id → {name,progress}
  photoUI:{},                        // photoId → {editing,draft}
  lightbox:null                      // {idx}
};

var unsubPhotos=null, unsubDocs=null;

// ── DOM refs ────────────────────────────────────────────────────────────────
var authLoadingEl  = document.getElementById("auth-loading");
var gateEl         = document.getElementById("passcode-gate");
var gateErrorEl    = document.getElementById("gate-error");
var gateSubmitBtn  = document.getElementById("gate-submit");
var gateInputsWrap = document.getElementById("gate-inputs");
var digitEls       = Array.prototype.slice.call(document.querySelectorAll(".gate-digit"));
var appRootEl      = document.getElementById("mem-root");
var footerEl       = document.getElementById("site-footer");
var lockBtn        = document.getElementById("lock-btn");

// ── Auth gate ────────────────────────────────────────────────────────────────
function focusDigit(i){ if(digitEls[i]) digitEls[i].focus(); }

digitEls.forEach(function(el,i){
  el.addEventListener("input",function(){
    el.value=el.value.replace(/[^0-9]/g,"").slice(0,1);
    if(el.value && i<digitEls.length-1) focusDigit(i+1);
    if(digitEls.every(function(d){return d.value.length===1;})) attemptUnlock();
  });
  el.addEventListener("keydown",function(e){
    if(e.key==="Backspace"&&!el.value&&i>0) focusDigit(i-1);
    if(e.key==="Enter") attemptUnlock();
  });
});

if(gateSubmitBtn) gateSubmitBtn.addEventListener("click",attemptUnlock);
if(lockBtn) lockBtn.addEventListener("click",function(){ signOut(auth); });

function showGateError(msg){
  gateErrorEl.textContent=msg;
  gateErrorEl.hidden=false;
  gateInputsWrap.classList.remove("shake");
  void gateInputsWrap.offsetWidth;
  gateInputsWrap.classList.add("shake");
}

function attemptUnlock(){
  var code=digitEls.map(function(d){return d.value;}).join("");
  if(code.length!==4){showGateError("Enter all 4 digits");return;}
  gateSubmitBtn.disabled=true;
  gateSubmitBtn.textContent="Checking…";
  signInWithEmailAndPassword(auth,FAMILY_EMAIL,PASSWORD_PREFIX+code)
    .catch(function(){
      showGateError("😬 Wrong code — try again!");
      digitEls.forEach(function(d){d.value="";});
      focusDigit(0);
    })
    .finally(function(){
      gateSubmitBtn.disabled=false;
      gateSubmitBtn.textContent="Unlock ✨";
    });
}

onAuthStateChanged(auth,function(user){
  authLoadingEl.hidden=true;
  if(user){
    gateEl.hidden=true;
    appRootEl.hidden=false;
    footerEl.hidden=false;
    gateErrorEl.hidden=true;
    digitEls.forEach(function(d){d.value="";});
    subscribeToData();
  } else {
    gateEl.hidden=false;
    appRootEl.hidden=true;
    footerEl.hidden=true;
    if(unsubPhotos){unsubPhotos();unsubPhotos=null;}
    if(unsubDocs)  {unsubDocs();  unsubDocs=null;}
    focusDigit(0);
  }
});

// ── Firestore subscriptions ──────────────────────────────────────────────────
function subscribeToData(){
  unsubPhotos=onSnapshot(
    query(photosCol,orderBy("uploadedAt","desc")),
    function(snap){
      state.photos=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
      state.photosLoading=false; renderPhotos();
    },
    function(err){console.error("Photos:",err);state.photosLoading=false;renderPhotos();}
  );
  unsubDocs=onSnapshot(
    query(docsCol,orderBy("uploadedAt","desc")),
    function(snap){
      state.docs=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
      state.docsLoading=false; renderDocs();
    },
    function(err){console.error("Docs:",err);state.docsLoading=false;renderDocs();}
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmtBytes(b){if(!b)return"";if(b<1024)return b+" B";if(b<1048576)return(b/1024).toFixed(1)+" KB";return(b/1048576).toFixed(1)+" MB";}
function fmtDate(ts){if(!ts)return"";var d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function monthKey(ts){var d=ts&&ts.toDate?ts.toDate():new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function monthLabel(k){var p=k.split("-");return new Date(Number(p[0]),Number(p[1])-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"});}
function tiltDeg(id){var h=0;for(var i=0;i<id.length;i++)h=id.charCodeAt(i)+((h<<5)-h);return((Math.abs(h)%7)-3)+"deg";}
function docInfo(filename,mime){
  var ext=(filename||"").split(".").pop().toLowerCase();
  if(ext==="pdf"||(mime||"").includes("pdf"))         return{label:"PDF", color:"#C5341B",bg:"#FFE8E5"};
  if(ext==="doc"||ext==="docx")                        return{label:"DOC", color:"#2B5DB5",bg:"#E8EFFF"};
  if(ext==="xls"||ext==="xlsx")                        return{label:"XLS", color:"#1A7B44",bg:"#E3F6ED"};
  if(ext==="ppt"||ext==="pptx")                        return{label:"PPT", color:"#C0411A",bg:"#FFEEE9"};
  return{label:(ext||"FILE").toUpperCase().slice(0,4), color:"#9B5DE5",bg:"#F0E5FF"};
}
function safeName(n){return n.replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);}

// ── Cloudinary upload ────────────────────────────────────────────────────────
function cloudinaryUpload(file,folder,onProgress){
  return new Promise(function(resolve,reject){
    var isImage=file.type.startsWith("image/");
    var endpoint="https://api.cloudinary.com/v1_1/"+CLOUDINARY_CLOUD_NAME+"/"+(isImage?"image":"raw")+"/upload";
    var fd=new FormData();
    fd.append("file",file);
    fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
    fd.append("folder",folder);
    var xhr=new XMLHttpRequest();
    xhr.open("POST",endpoint);
    xhr.upload.onprogress=function(e){if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=function(){
      if(xhr.status===200){
        var data=JSON.parse(xhr.responseText);
        resolve({url:data.secure_url,publicId:data.public_id});
      } else {
        reject(new Error("Cloudinary error "+xhr.status+": "+xhr.responseText));
      }
    };
    xhr.onerror=function(){reject(new Error("Network error"));};
    xhr.send(fd);
  });
}

function doUpload(file,isPhoto){
  if(file.size>MAX_MB*1024*1024){alert('"'+file.name+'" is too large — max '+MAX_MB+' MB.');return;}
  var uploadId=uid();
  if(isPhoto) state.photoUploads[uploadId]={name:file.name,progress:0};
  else        state.docUploads[uploadId]  ={name:file.name,progress:0};
  renderProgress();

  cloudinaryUpload(file,isPhoto?"family-hub/photos":"family-hub/docs",function(pct){
    if(isPhoto) state.photoUploads[uploadId].progress=pct;
    else        state.docUploads[uploadId].progress  =pct;
    renderProgress();
  }).then(function(result){
    var col =isPhoto?photosCol:docsCol;
    var data=isPhoto
      ?{url:result.url,publicId:result.publicId,caption:"",filename:file.name,uploadedAt:serverTimestamp()}
      :{url:result.url,publicId:result.publicId,filename:file.name,mimeType:file.type,size:file.size,uploadedAt:serverTimestamp()};
    return addDoc(col,data);
  }).catch(function(err){
    console.error("Upload failed:",err);
    alert('Upload failed for "'+file.name+'". Please try again.');
  }).finally(function(){
    if(isPhoto) delete state.photoUploads[uploadId];
    else        delete state.docUploads[uploadId];
    renderProgress();
  });
}

function handleFiles(files,isPhoto){Array.prototype.forEach.call(files,function(f){doUpload(f,isPhoto);});}

// ── Drop zones ────────────────────────────────────────────────────────────────
function wireZone(zoneId,inputId,isPhoto){
  var zone=document.getElementById(zoneId), input=document.getElementById(inputId);
  if(!zone||!input)return;
  zone.addEventListener("dragover",function(e){e.preventDefault();zone.classList.add("drag-over");});
  ["dragleave","dragend"].forEach(function(ev){zone.addEventListener(ev,function(){zone.classList.remove("drag-over");});});
  zone.addEventListener("drop",function(e){e.preventDefault();zone.classList.remove("drag-over");handleFiles(e.dataTransfer.files,isPhoto);});
  input.addEventListener("change",function(){handleFiles(input.files,isPhoto);input.value="";});
}
document.getElementById("photo-btn").addEventListener("click",function(){document.getElementById("photo-input").click();});
document.getElementById("doc-btn").addEventListener("click",function(){document.getElementById("doc-input").click();});
wireZone("photo-zone","photo-input",true);
wireZone("doc-zone","doc-input",false);

// ── Progress rendering ────────────────────────────────────────────────────────
function renderProgress(){
  renderProgressEl("photo-progress",state.photoUploads);
  renderProgressEl("doc-progress",state.docUploads);
}
function renderProgressEl(id,uploads){
  var el=document.getElementById(id); if(!el)return;
  var items=Object.values(uploads);
  el.innerHTML=items.length===0?"":
    '<div class="progress-list">'+items.map(function(u){
      return'<div class="progress-item">'
        +'<div class="progress-label">📤 '+esc(u.name)+'</div>'
        +'<div class="progress-track"><div class="progress-fill" style="width:'+u.progress+'%"></div></div>'
        +'</div>';
    }).join("")+'</div>';
}

// ── Photo timeline ────────────────────────────────────────────────────────────
function renderPhotos(){
  var el=document.getElementById("photo-timeline"); if(!el)return;
  if(state.photosLoading){el.innerHTML='<div class="loading-state">Loading your memories… ✨</div>';return;}
  if(state.photos.length===0){
    el.innerHTML='<div class="empty-state"><span class="big-emoji">📷</span><h3>No photos yet!</h3><p>Add your first photo and start your family timeline. 💛</p></div>';
    return;
  }
  var groups={};
  state.photos.forEach(function(p){
    var k=p.uploadedAt?monthKey(p.uploadedAt):"0000-00";
    if(!groups[k])groups[k]=[];
    groups[k].push(p);
  });
  var html="";
  Object.keys(groups).sort().reverse().forEach(function(k){
    var label=k==="0000-00"?"Recent":monthLabel(k);
    html+='<div class="month-group">'
      +'<div class="month-divider"><div class="month-line"></div>'
      +'<span class="month-badge">📅 '+esc(label)+'</span>'
      +'<div class="month-line"></div></div>'
      +'<div class="photo-grid">'
      +groups[k].map(photoCardHTML).join("")
      +'</div></div>';
  });
  el.innerHTML=html;

  // Wire any active caption inputs
  el.querySelectorAll(".caption-input").forEach(function(inp){
    var id=inp.getAttribute("data-id");
    inp.addEventListener("input",function(){
      if(!state.photoUI[id])state.photoUI[id]={};
      state.photoUI[id].draft=inp.value;
    });
    inp.addEventListener("blur",function(){saveCaption(id);});
    inp.addEventListener("keydown",function(e){
      if(e.key==="Enter"){e.preventDefault();saveCaption(id);}
      if(e.key==="Escape"){state.photoUI[id]={};renderPhotos();}
    });
    inp.focus();
  });
}

function photoCardHTML(photo){
  var ui=state.photoUI[photo.id]||{};
  var captionBlock=ui.editing
    ?'<input class="caption-input" data-id="'+photo.id+'" value="'+esc(ui.draft!==undefined?ui.draft:photo.caption)+'" placeholder="Add a caption… ✨" maxlength="100">'
    :'<div class="photo-caption" data-action="edit-caption" data-id="'+photo.id+'">'
       +(photo.caption?esc(photo.caption):'<span class="caption-placeholder">Tap to add a caption…</span>')
       +'</div>';
  return'<div class="photo-card" style="--tilt:'+tiltDeg(photo.id)+'">'
    +'<button class="photo-del" data-action="del-photo" data-id="'+photo.id+'" aria-label="Delete photo">✕</button>'
    +'<img class="photo-img" src="'+esc(photo.url)+'" alt="'+esc(photo.caption||photo.filename||"photo")+'" data-action="open-lb" data-id="'+photo.id+'" loading="lazy">'
    +captionBlock
    +(photo.uploadedAt?'<div class="photo-date">'+esc(fmtDate(photo.uploadedAt))+'</div>':"")
    +'</div>';
}

function saveCaption(id){
  var ui=state.photoUI[id]||{}, draft=(ui.draft!==undefined?ui.draft:"").trim();
  var photo=state.photos.find(function(p){return p.id===id;});
  state.photoUI[id]={};
  if(photo&&draft!==photo.caption)
    updateDoc(doc(db,"photos",id),{caption:draft}).catch(function(e){console.error(e);});
  renderPhotos();
}

// ── Document list ─────────────────────────────────────────────────────────────
function renderDocs(){
  var el=document.getElementById("doc-list"); if(!el)return;
  if(state.docsLoading){el.innerHTML='<div class="loading-state" style="padding:40px">Loading files… ✨</div>';return;}
  if(state.docs.length===0){
    el.innerHTML='<div class="empty-state"><span class="big-emoji">📂</span><h3>No files yet</h3><p>Upload school papers, recipes, or any family document to keep handy. 📋</p></div>';
    return;
  }
  var html='<div class="doc-list">';
  state.docs.forEach(function(d){
    var info=docInfo(d.filename,d.mimeType);
    html+='<div class="doc-card">'
      +'<span class="doc-badge" style="color:'+info.color+';background:'+info.bg+'">'+info.label+'</span>'
      +'<div class="doc-info"><div class="doc-name" title="'+esc(d.filename)+'">'+esc(d.filename)+'</div>'
      +'<div class="doc-meta">'+(d.size?fmtBytes(d.size)+" · ":"")+esc(fmtDate(d.uploadedAt))+'</div></div>'
      +'<div class="doc-actions">'
      +'<a class="btn btn-ghost btn-small" href="'+esc(d.url)+'" target="_blank" rel="noopener" download="'+esc(d.filename)+'">⬇ Download</a>'
      +'<button class="btn btn-danger btn-small" data-action="del-doc" data-id="'+d.id+'">✕</button>'
      +'</div></div>';
  });
  el.innerHTML=html+'</div>';
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(photoId){
  var idx=state.photos.findIndex(function(p){return p.id===photoId;});
  if(idx<0)return;
  state.lightbox={idx:idx};
  renderLightbox();
}
function renderLightbox(){
  var existing=document.getElementById("mem-lb"); if(existing)existing.remove();
  if(!state.lightbox)return;
  var photo=state.photos[state.lightbox.idx]; if(!photo)return;
  var idx=state.lightbox.idx, total=state.photos.length;
  var lb=document.createElement("div");
  lb.id="mem-lb"; lb.className="lightbox";
  lb.innerHTML=
    '<button class="lb-close" id="lb-x" aria-label="Close">✕</button>'
    +(idx>0?'<button class="lb-nav lb-prev" id="lb-p" aria-label="Newer photo">‹</button>':"")
    +'<div class="lb-content">'
    +'<img class="lb-img" src="'+esc(photo.url)+'" alt="'+esc(photo.caption||"")+'">'
    +(photo.caption?'<p class="lb-caption">'+esc(photo.caption)+'</p>':"")
    +(photo.uploadedAt?'<p class="lb-date">'+esc(fmtDate(photo.uploadedAt))+'</p>':"")
    +'</div>'
    +(idx<total-1?'<button class="lb-nav lb-next" id="lb-n" aria-label="Older photo">›</button>':"")
    +'<div class="lb-counter">'+(idx+1)+' / '+total+'</div>';
  document.body.appendChild(lb);
  document.getElementById("lb-x").addEventListener("click",closeLightbox);
  lb.addEventListener("click",function(e){if(e.target===lb)closeLightbox();});
  var bp=document.getElementById("lb-p"), bn=document.getElementById("lb-n");
  if(bp)bp.addEventListener("click",function(){state.lightbox.idx--;renderLightbox();});
  if(bn)bn.addEventListener("click",function(){state.lightbox.idx++;renderLightbox();});
}
function closeLightbox(){state.lightbox=null;var lb=document.getElementById("mem-lb");if(lb)lb.remove();}

document.addEventListener("keydown",function(e){
  if(!state.lightbox)return;
  if(e.key==="Escape")  closeLightbox();
  if(e.key==="ArrowLeft" &&state.lightbox.idx>0)                       {state.lightbox.idx--;renderLightbox();}
  if(e.key==="ArrowRight"&&state.lightbox.idx<state.photos.length-1)   {state.lightbox.idx++;renderLightbox();}
});
var _tx=0;
document.addEventListener("touchstart",function(e){_tx=e.touches[0].clientX;},{passive:true});
document.addEventListener("touchend",function(e){
  if(!state.lightbox)return;
  var dx=e.changedTouches[0].clientX-_tx; if(Math.abs(dx)<50)return;
  if(dx>0&&state.lightbox.idx>0)                      {state.lightbox.idx--;renderLightbox();}
  if(dx<0&&state.lightbox.idx<state.photos.length-1)  {state.lightbox.idx++;renderLightbox();}
},{passive:true});

// ── Deletes (Firestore only — Cloudinary files persist but are inaccessible) ─
function delPhoto(id){
  if(!confirm("Delete this photo? This can't be undone."))return;
  deleteDoc(doc(db,"photos",id)).catch(function(e){console.error(e);});
}
function delDoc(id){
  if(!confirm("Delete this file? This can't be undone."))return;
  deleteDoc(doc(db,"documents",id)).catch(function(e){console.error(e);});
}

// ── Event delegation ──────────────────────────────────────────────────────────
document.getElementById("mem-root").addEventListener("click",function(e){
  var btn=e.target.closest("[data-action]"); if(!btn)return;
  var action=btn.getAttribute("data-action"), id=btn.getAttribute("data-id");
  if(action==="open-lb")      openLightbox(id);
  else if(action==="del-photo") delPhoto(id);
  else if(action==="del-doc")   delDoc(id);
  else if(action==="edit-caption"){
    var photo=state.photos.find(function(p){return p.id===id;});
    state.photoUI[id]={editing:true,draft:photo?photo.caption||"":""};
    renderPhotos();
  }
});

})();
