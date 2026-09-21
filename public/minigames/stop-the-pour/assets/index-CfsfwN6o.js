(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function r(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(n){if(n.ep)return;n.ep=!0;const a=r(n);fetch(n.href,a)}})();let c=null;function h(){c??(c=new AudioContext),c.state==="suspended"&&c.resume()}function l(e){if(!c||c.state!=="running")return;const t=c.createOscillator(),r=c.createGain(),o=c.currentTime,n={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(n[e],o),r.gain.setValueAtTime(1e-4,o),r.gain.exponentialRampToValueAtTime(.075,o+.008),r.gain.exponentialRampToValueAtTime(1e-4,o+.12),t.connect(r).connect(c.destination),t.start(o),t.stop(o+.13)}const b={baby:{speed:.035,targetWidth:34,requiredStops:1},regular:{speed:.065,targetWidth:20,requiredStops:1},hardest:{speed:.09,targetWidth:12,requiredStops:2}};function L(e){let t=e>>>0;return()=>{t+=1831565813;let r=t;return r=Math.imul(r^r>>>15,r|1),r^=r+Math.imul(r^r>>>7,r|61),((r^r>>>14)>>>0)/4294967296}}function M(e,t){const r=b[e],o=L(t),n=7,a=100-r.targetWidth-n*2,i=n+o()*a;return{difficulty:e,seed:t,targetStart:i,targetWidth:r.targetWidth,requiredStops:r.requiredStops,successfulStops:0,attempts:0,status:"playing"}}function P(e,t){if(!Number.isFinite(e)||e<0)throw new RangeError("Elapsed time must be non-negative");const r=e*b[t].speed%200;return r<=100?r:200-r}function N(e,t){return t>=e.targetStart&&t<=e.targetStart+e.targetWidth}function O(e,t){if(e.status!=="playing")throw new Error("Round is already complete");if(!Number.isFinite(t)||t<0||t>100)throw new RangeError("Marker position must be between 0 and 100");const r=e.attempts+1;if(!N(e,t))return{...e,attempts:r,status:"lost"};const o=e.successfulStops+1;return{...e,attempts:r,successfulStops:o,status:o>=e.requiredStops?"won":"playing"}}function R(){var r,o,n;const e=(o=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.playerName)==null?void 0:o.trim(),t=(n=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:n.trim();return e||t||"Linus"}function I(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function k(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function G(){var n,a;const e=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",r=(a=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:a.partyMode;return{difficulty:t,partyMode:r==="off"||r==="light"||r==="standard"?r:"off"}}function $(e=0){var r;const t=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function C(e,t,r){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${W(r)}</strong>?</p>
        <div class="setup-grid">
          <section class="option-card">
            <h2>Difficulty</h2>
            <div class="choice-row" aria-label="Difficulty">
              <button type="button" data-difficulty="baby">BABY</button>
              <button type="button" data-difficulty="regular">REGULAR</button>
              <button type="button" data-difficulty="hardest">HARDEST</button>
            </div>
          </section>
          <section class="option-card">
            <h2>Party mode</h2>
            <div class="choice-row" aria-label="Party mode">
              <button type="button" data-party="off">OFF</button>
              <button type="button" data-party="light">LIGHT</button>
              <button type="button" data-party="standard">STANDARD</button>
            </div>
          </section>
        </div>
        <div class="actions">
          <button class="secondary" type="button" id="cancel">BACK</button>
          <button class="action" type="button" id="start">START</button>
        </div>
      </section>
    </main>`}function F(e,t,r){var n,a;const o=()=>{document.querySelectorAll("[data-difficulty]").forEach(i=>{const d=i.dataset.difficulty===t.difficulty;i.classList.toggle("selected",d),i.setAttribute("aria-pressed",String(d))}),document.querySelectorAll("[data-party]").forEach(i=>{const d=i.dataset.party===t.partyMode;i.classList.toggle("selected",d),i.setAttribute("aria-pressed",String(d))})};document.querySelectorAll("[data-difficulty]").forEach(i=>{i.addEventListener("click",()=>{t.difficulty=i.dataset.difficulty,o(),l("cursor")})}),document.querySelectorAll("[data-party]").forEach(i=>{i.addEventListener("click",()=>{t.partyMode=i.dataset.party,o(),l("cursor")})}),(n=document.querySelector("#start"))==null||n.addEventListener("click",()=>{l("confirm"),r()}),(a=document.querySelector("#cancel"))==null||a.addEventListener("click",()=>{l("confirm"),k(e)}),o()}function H(e,t,r){if(r==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const o=t==="baby"?1:t==="regular"?2:3,n=r==="light"?Math.min(2,o):o;return{direction:"assign",units:n,label:`ASSIGN ${n} ${n===1?"SIP":"SIPS"}`}}function _(e,t){return`<header class="game-head">
    <p class="eyebrow">${e}</p>
    <div class="chips">
      <span class="chip">${t.difficulty}</span>
      <span class="chip">Party: ${t.partyMode}</span>
    </div>
  </header>`}function D(e,t,r,o){return`<div class="result ${e?"win":"loss"}" aria-live="assertive">
    <p class="eyebrow">${e?"Challenge clear":"Round over"}</p>
    <p class="big">${t}</p>
    <p>${r}</p>
    <p class="consequence">${o.label}</p>
  </div>`}function W(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const w="stop_the_pour",E=R(),u=G();let s=null,m=0,K=0,f=0,S=0,g=0,p=0;window.addEventListener("pointerdown",h,{once:!0});window.addEventListener("keydown",h,{once:!0});y();function y(){var e;cancelAnimationFrame(f),s=null,document.querySelector("#app").innerHTML=C("Stop the Pour","Stop the moving marker inside the green zone.",E),F(w,u,v),(e=document.querySelector("#start"))==null||e.focus()}function v(){var t;m=$(K++),s=M(u.difficulty,m),g=performance.now(),S=g,document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${_("Stop the Pour",u)}
        <div class="play-area">
          <p class="status" id="status">Press once when the marker is inside the green zone.</p>
          <div class="meter" aria-label="Pour timing meter">
            <div class="target" id="target"></div>
            <div class="marker" id="marker"></div>
          </div>
          <div class="progress-dots" id="progress" aria-label="Successful stops"></div>
          <p class="help">Enter / Space / E or the STOP button</p>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="action" id="stop" type="button">STOP!</button>
        </div>
      </section>
    </main>`;const e=document.querySelector("#target");e.style.left=`${s.targetStart}%`,e.style.width=`${s.targetWidth}%`,document.querySelector("#settings").addEventListener("click",y),document.querySelector("#stop").addEventListener("click",q),A(),f=requestAnimationFrame(T),(t=document.querySelector("#stop"))==null||t.focus()}function T(e){!s||s.status!=="playing"||(p=P(e-S,s.difficulty),document.querySelector("#marker").style.left=`${p}%`,f=requestAnimationFrame(T))}function q(){if(!(!s||s.status!=="playing")){if(s=O(s,p),A(),s.status==="playing"){l("action"),document.querySelector("#status").textContent="Perfect! One more stop in succession.",S=performance.now(),p=0;return}cancelAnimationFrame(f),x(s.status==="won")}}function A(){s&&(document.querySelector("#progress").innerHTML=Array.from({length:s.requiredStops},(e,t)=>`<span class="${t<s.successfulStops?"done":""}"></span>`).join(""))}function x(e){if(!s)return;l(e?"win":"lose");const t=H(e,u.difficulty,u.partyMode),r=Math.round((performance.now()-g)/100)/10;document.querySelector(".play-area").innerHTML=D(e,e?"Clean Pour!":"Spilled!",e?"The marker landed safely in every target.":"The pour missed the safe zone.",t),document.querySelector(".actions").innerHTML='<button class="secondary" id="settings" type="button">SETTINGS</button><button class="action" id="replay" type="button">POUR AGAIN</button>',document.querySelector("#settings").addEventListener("click",y),document.querySelector("#replay").addEventListener("click",v),document.querySelector("#replay").focus(),I({gameId:w,outcome:e?"victory":"defeat",playerName:E,difficulty:u.difficulty,partyMode:u.partyMode,consequence:t,seed:m,elapsedSeconds:r,metadata:{markerPosition:Math.round(p*100)/100,targetStart:s.targetStart,targetWidth:s.targetWidth,successfulStops:s.successfulStops}})}window.addEventListener("keydown",e=>{var t;if(e.code==="Escape"){e.preventDefault(),y();return}if(!s||s.status!=="playing"){(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&((t=document.querySelector("#replay"))==null||t.click());return}(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(e.preventDefault(),q())});
