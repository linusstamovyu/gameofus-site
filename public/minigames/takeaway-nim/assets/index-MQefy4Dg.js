(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(r){if(r.ep)return;r.ep=!0;const o=n(r);fetch(r.href,o)}})();let u=null;function T(){u??(u=new AudioContext),u.state==="suspended"&&u.resume()}function l(e){if(!u||u.state!=="running")return;const t=u.createOscillator(),n=u.createGain(),i=u.currentTime,r={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(r[e],i),n.gain.setValueAtTime(1e-4,i),n.gain.exponentialRampToValueAtTime(.075,i+.008),n.gain.exponentialRampToValueAtTime(1e-4,i+.12),t.connect(n).connect(u.destination),t.start(i),t.stop(i+.13)}const R={baby:12,regular:15,hardest:17};function q(e){let t=e>>>0;return()=>{t+=1831565813;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function S(e){return{difficulty:e,remaining:R[e],turn:"player",status:"playing",lastTake:null}}function E(e,t){if(e.status!=="playing")throw new Error("Takeaway game is already complete");if(!Number.isInteger(t)||t<1||t>3||t>e.remaining)throw new RangeError("Take must be 1–3 and cannot exceed the pile");const n=e.remaining-t;return n===0?{...e,remaining:n,lastTake:t,status:e.turn==="player"?"player-won":"ai-won"}:{...e,remaining:n,lastTake:t,turn:e.turn==="player"?"ai":"player"}}function I(e,t=Math.random){if(e.status!=="playing"||e.turn!=="ai")throw new Error("It is not the AI turn");const n=Math.min(3,e.remaining),i=Math.floor(Math.min(.999999,Math.max(0,t()))*n)+1;if(e.difficulty==="baby")return i;const r=e.remaining%4;return e.difficulty==="hardest"?r===0?i:Math.min(r,n):t()<.65&&r!==0?Math.min(r,n):i}function $(){var n,i,r;const e=(i=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.playerName)==null?void 0:i.trim(),t=(r=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:r.trim();return e||t||"Linus"}function O(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function D(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function G(){var r,o;const e=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",n=(o=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:o.partyMode;return{difficulty:t,partyMode:n==="off"||n==="light"||n==="standard"?n:"off"}}function C(e=0){var n;const t=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function P(e,t,n){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${F(n)}</strong>?</p>
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
    </main>`}function K(e,t,n){var r,o;const i=()=>{document.querySelectorAll("[data-difficulty]").forEach(c=>{const f=c.dataset.difficulty===t.difficulty;c.classList.toggle("selected",f),c.setAttribute("aria-pressed",String(f))}),document.querySelectorAll("[data-party]").forEach(c=>{const f=c.dataset.party===t.partyMode;c.classList.toggle("selected",f),c.setAttribute("aria-pressed",String(f))})};document.querySelectorAll("[data-difficulty]").forEach(c=>{c.addEventListener("click",()=>{t.difficulty=c.dataset.difficulty,i(),l("cursor")})}),document.querySelectorAll("[data-party]").forEach(c=>{c.addEventListener("click",()=>{t.partyMode=c.dataset.party,i(),l("cursor")})}),(r=document.querySelector("#start"))==null||r.addEventListener("click",()=>{l("confirm"),n()}),(o=document.querySelector("#cancel"))==null||o.addEventListener("click",()=>{l("confirm"),D(e)}),i()}function x(e,t,n){if(n==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const i=t==="baby"?1:t==="regular"?2:3,r=n==="light"?Math.min(2,i):i;return{direction:"assign",units:r,label:`ASSIGN ${r} ${r===1?"SIP":"SIPS"}`}}function H(e,t){return`<header class="game-head">
    <p class="eyebrow">${e}</p>
    <div class="chips">
      <span class="chip">${t.difficulty}</span>
      <span class="chip">Party: ${t.partyMode}</span>
    </div>
  </header>`}function _(e,t,n,i){return`<div class="result ${e?"win":"loss"}" aria-live="assertive">
    <p class="eyebrow">${e?"Challenge clear":"Round over"}</p>
    <p class="big">${t}</p>
    <p>${n}</p>
    <p class="consequence">${i.label}</p>
  </div>`}function F(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const A="takeaway_nim",k=$(),d=G();let a=null,m=0,M=Math.random,B=0,v=0,y=0,s=1;window.addEventListener("pointerdown",T,{once:!0});window.addEventListener("keydown",T,{once:!0});h();function h(){window.clearTimeout(y),a=null,document.querySelector("#app").innerHTML=P("Takeaway Nim","Take 1, 2, or 3 berries. Whoever takes the final berry wins.",k),K(A,d,N)}function N(){window.clearTimeout(y),m=C(B++),M=q(m),a=S(d.difficulty),v=performance.now(),s=1,document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${H("Takeaway Nim",d)}
        <div class="play-area">
          <p class="status" id="status">Your turn. Take 1, 2, or 3 berries.</p>
          <div class="pile" id="pile" aria-label="${a.remaining} berries remain"></div>
          <p class="help"><strong id="remaining">${a.remaining}</strong> REMAIN · Arrow/A-D + Enter, or number keys 1–3</p>
          <div class="take-row">
            ${[1,2,3].map(e=>`<button class="action" type="button" data-take="${e}">TAKE ${e}</button>`).join("")}
          </div>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="secondary" id="replay" type="button">RESTART</button>
        </div>
      </section>
    </main>`,document.querySelector("#settings").addEventListener("click",h),document.querySelector("#replay").addEventListener("click",N),document.querySelectorAll("[data-take]").forEach(e=>{e.addEventListener("click",()=>g(Number(e.dataset.take)))}),b(),p(1).focus()}function g(e){if(!a||a.status!=="playing"||a.turn!=="player"||e>a.remaining){l("denied");return}if(a=E(a,e),l("action"),b(),a.status==="player-won"){L(!0);return}document.querySelector("#status").textContent=`You took ${e}. Rival is thinking…`,w(!1),y=window.setTimeout(Y,520)}function Y(){if(!a||a.status!=="playing"||a.turn!=="ai")return;const e=I(a,M);if(a=E(a,e),l("action"),b(),a.status==="ai-won"){L(!1);return}document.querySelector("#status").textContent=`Rival took ${e}. Your turn!`,w(!0),s=Math.min(s,Math.min(3,a.remaining)),p(s).focus()}function b(){a&&(document.querySelector("#pile").innerHTML=Array.from({length:a.remaining},()=>'<span class="token" aria-hidden="true"></span>').join(""),document.querySelector("#pile").setAttribute("aria-label",`${a.remaining} berries remain`),document.querySelector("#remaining").textContent=String(a.remaining),w(a.status==="playing"&&a.turn==="player"))}function w(e){a&&document.querySelectorAll("[data-take]").forEach(t=>{t.disabled=!e||Number(t.dataset.take)>a.remaining})}function L(e){if(!a)return;window.clearTimeout(y);const t=x(e,d.difficulty,d.partyMode);l(e?"win":"lose"),document.querySelector(".play-area").innerHTML=_(e,e?"Final Berry!":"Rival Wins!",e?"You took the last object.":"The rival took the last object.",t),document.querySelector("#replay").textContent="PLAY AGAIN",document.querySelector("#replay").focus(),O({gameId:A,outcome:e?"victory":"defeat",playerName:k,difficulty:d.difficulty,partyMode:d.partyMode,consequence:t,seed:m,elapsedSeconds:Math.round((performance.now()-v)/100)/10,metadata:{startingPile:S(d.difficulty).remaining,finalTake:a.lastTake,winner:e?"player":"ai"}})}function p(e){return document.querySelector(`[data-take="${e}"]`)}window.addEventListener("keydown",e=>{var n;if(e.code==="Escape"){e.preventDefault(),h();return}if(!a||a.status!=="playing"||a.turn!=="player"){(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&((n=document.querySelector("#replay"))==null||n.click());return}const t={Digit1:1,Digit2:2,Digit3:3}[e.code];t?(e.preventDefault(),g(t)):e.code==="ArrowLeft"||e.code==="ArrowUp"||e.code==="KeyA"||e.code==="KeyW"?(e.preventDefault(),s=s===1?Math.min(3,a.remaining):s-1,p(s).focus(),l("cursor")):e.code==="ArrowRight"||e.code==="ArrowDown"||e.code==="KeyD"||e.code==="KeyS"?(e.preventDefault(),s=s>=Math.min(3,a.remaining)?1:s+1,p(s).focus(),l("cursor")):(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(e.preventDefault(),g(s))});
