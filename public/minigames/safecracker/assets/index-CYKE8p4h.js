(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(a){if(a.ep)return;a.ep=!0;const i=n(a);fetch(a.href,i)}})();let c=null;function b(){c??(c=new AudioContext),c.state==="suspended"&&c.resume()}function l(e){if(!c||c.state!=="running")return;const t=c.createOscillator(),n=c.createGain(),o=c.currentTime,a={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(a[e],o),n.gain.setValueAtTime(1e-4,o),n.gain.exponentialRampToValueAtTime(.075,o+.008),n.gain.exponentialRampToValueAtTime(1e-4,o+.12),t.connect(n).connect(c.destination),t.start(o),t.stop(o+.13)}const q={baby:3,regular:5,hardest:7},w=["up","right","down","left"];function L(e){let t=e>>>0;return()=>{t+=1831565813;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function M(e,t){const n=L(t),o=Array.from({length:q[e]},()=>w[Math.floor(n()*w.length)]);return{difficulty:e,seed:t,sequence:o,entered:[],status:"showing"}}function N(e){if(e.status!=="showing")throw new Error("Sequence is not being shown");return{...e,status:"input"}}function R(e,t){if(e.status!=="input")throw new Error("Direction input is not allowed");const n=e.sequence[e.entered.length],o=[...e.entered,t];return t!==n?{...e,entered:o,status:"lost"}:{...e,entered:o,status:o.length===e.sequence.length?"won":"input"}}function O(){var n,o,a;const e=(o=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.playerName)==null?void 0:o.trim(),t=(a=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:a.trim();return e||t||"Linus"}function I(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function $(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function k(){var a,i;const e=(a=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:a.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",n=(i=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:i.partyMode;return{difficulty:t,partyMode:n==="off"||n==="light"||n==="standard"?n:"off"}}function C(e=0){var n;const t=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function D(e,t,n){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${x(n)}</strong>?</p>
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
    </main>`}function G(e,t,n){var a,i;const o=()=>{document.querySelectorAll("[data-difficulty]").forEach(s=>{const d=s.dataset.difficulty===t.difficulty;s.classList.toggle("selected",d),s.setAttribute("aria-pressed",String(d))}),document.querySelectorAll("[data-party]").forEach(s=>{const d=s.dataset.party===t.partyMode;s.classList.toggle("selected",d),s.setAttribute("aria-pressed",String(d))})};document.querySelectorAll("[data-difficulty]").forEach(s=>{s.addEventListener("click",()=>{t.difficulty=s.dataset.difficulty,o(),l("cursor")})}),document.querySelectorAll("[data-party]").forEach(s=>{s.addEventListener("click",()=>{t.partyMode=s.dataset.party,o(),l("cursor")})}),(a=document.querySelector("#start"))==null||a.addEventListener("click",()=>{l("confirm"),n()}),(i=document.querySelector("#cancel"))==null||i.addEventListener("click",()=>{l("confirm"),$(e)}),o()}function P(e,t,n){if(n==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const o=t==="baby"?1:t==="regular"?2:3,a=n==="light"?Math.min(2,o):o;return{direction:"assign",units:a,label:`ASSIGN ${a} ${a===1?"SIP":"SIPS"}`}}function H(e,t){return`<header class="game-head">
    <p class="eyebrow">${e}</p>
    <div class="chips">
      <span class="chip">${t.difficulty}</span>
      <span class="chip">Party: ${t.partyMode}</span>
    </div>
  </header>`}function K(e,t,n,o){return`<div class="result ${e?"win":"loss"}" aria-live="assertive">
    <p class="eyebrow">${e?"Challenge clear":"Round over"}</p>
    <p class="big">${t}</p>
    <p>${n}</p>
    <p class="consequence">${o.label}</p>
  </div>`}function x(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const S="safecracker",g=O(),u=k(),E={up:"↑",right:"→",down:"↓",left:"←"};let r=null,y=0,_=0,f=0,A=0;window.addEventListener("pointerdown",b,{once:!0});window.addEventListener("keydown",b,{once:!0});h();function h(){f+=1,r=null,document.querySelector("#app").innerHTML=D("Safecracker","Memorize the direction sequence, then repeat it exactly.",g),G(S,u,v)}function v(){f+=1;const e=f;y=C(_++),r=M(u.difficulty,y),A=performance.now(),document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${H("Safecracker",u)}
        <div class="play-area">
          <p class="status" id="status">Watch the combination…</p>
          <div class="sequence-slots" id="slots" aria-label="Sequence progress">
            ${r.sequence.map(()=>"<span></span>").join("")}
          </div>
          <div class="direction-pad" aria-label="Direction controls">
            ${["up","left","down","right"].map(t=>`<button type="button" data-dir="${t}" disabled aria-label="${t}">${E[t]}</button>`).join("")}
          </div>
          <p class="help">Arrow keys or WASD use the same directions as the main game.</p>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="action" id="replay" type="button">RESTART</button>
        </div>
      </section>
    </main>`,document.querySelector("#settings").addEventListener("click",h),document.querySelector("#replay").addEventListener("click",v),document.querySelectorAll("[data-dir]").forEach(t=>{t.addEventListener("click",()=>T(t.dataset.dir))}),F(e)}async function F(e){if(!r)return;const t=u.difficulty==="baby"?560:u.difficulty==="regular"?430:340;await p(550);for(const n of r.sequence){if(e!==f||!r)return;const o=m(n);o.classList.add("flash"),l("cursor"),await p(t*.62),o.classList.remove("flash"),await p(t*.38)}e!==f||!r||(r=N(r),document.querySelector("#status").textContent="Repeat the combination!",document.querySelectorAll("[data-dir]").forEach(n=>{n.disabled=!1}),m("up").focus())}function T(e){if(!r||r.status!=="input")return;r=R(r,e);const t=m(e);t.classList.add("flash"),window.setTimeout(()=>t.classList.remove("flash"),130),l(r.status==="lost"?"denied":"action"),document.querySelectorAll("#slots span").forEach((n,o)=>{n.classList.toggle("done",o<r.entered.length&&r.status!=="lost")}),(r.status==="won"||r.status==="lost")&&B()}function B(){if(!r)return;const e=r.status==="won",t=P(e,u.difficulty,u.partyMode);document.querySelectorAll("[data-dir]").forEach(n=>{n.disabled=!0}),l(e?"win":"lose"),window.setTimeout(()=>{r&&(document.querySelector(".play-area").innerHTML=K(e,e?"Safe Open!":"Lock Jammed!",e?`All ${r.sequence.length} directions matched.`:`The correct code was ${r.sequence.map(n=>E[n]).join(" ")}.`,t),document.querySelector("#replay").textContent="NEW CODE",document.querySelector("#replay").focus())},360),I({gameId:S,outcome:e?"victory":"defeat",playerName:g,difficulty:u.difficulty,partyMode:u.partyMode,consequence:t,seed:y,elapsedSeconds:Math.round((performance.now()-A)/100)/10,metadata:{sequence:r.sequence,entered:r.entered}})}function m(e){return document.querySelector(`[data-dir="${e}"]`)}function p(e){return new Promise(t=>window.setTimeout(t,e))}window.addEventListener("keydown",e=>{var o;if(e.code==="Escape"){e.preventDefault(),h();return}const n={ArrowUp:"up",KeyW:"up",ArrowRight:"right",KeyD:"right",ArrowDown:"down",KeyS:"down",ArrowLeft:"left",KeyA:"left"}[e.code];n&&(r==null?void 0:r.status)==="input"?(e.preventDefault(),T(n)):(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(r==null?void 0:r.status)!=="showing"&&(r==null?void 0:r.status)!=="input"&&((o=document.querySelector("#replay"))==null||o.click())});
