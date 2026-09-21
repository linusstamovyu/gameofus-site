(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(r){if(r.ep)return;r.ep=!0;const s=n(r);fetch(r.href,s)}})();let d=null;function g(){d??(d=new AudioContext),d.state==="suspended"&&d.resume()}function f(e){if(!d||d.state!=="running")return;const t=d.createOscillator(),n=d.createGain(),o=d.currentTime,r={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(r[e],o),n.gain.setValueAtTime(1e-4,o),n.gain.exponentialRampToValueAtTime(.075,o+.008),n.gain.exponentialRampToValueAtTime(1e-4,o+.12),t.connect(n).connect(d.destination),t.start(o),t.stop(o+.13)}const C={baby:4,regular:7,hardest:10};function M(e){let t=e>>>0;return()=>{t+=1831565813;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function q(e,t){const n=M(t),o=Math.floor(n()*3),r=[];let s=o;for(let c=0;c<C[e];c+=1){const i=Math.floor(n()*3);let y=Math.floor(n()*2);y>=i&&(y=y+1),r.push({type:"swap",a:i,b:y}),s===i?s=y:s===y&&(s=i),e==="hardest"&&c>0&&c%3===0&&r.push({type:"feint",a:y,b:i})}return{seed:t,difficulty:e,startCup:o,events:r,answer:s,choice:null,status:"watching"}}function N(e){if(e.status!=="watching")throw new Error("Shuffle is not awaiting playback");return{...e,status:"choosing"}}function R(e,t){if(e.status!=="choosing")throw new Error("Cup choice is not currently allowed");if(t<0||t>2)throw new RangeError("Cup must be 0, 1, or 2");return{...e,choice:t,status:t===e.answer?"won":"lost"}}function I(){var n,o,r;const e=(o=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.playerName)==null?void 0:o.trim(),t=(r=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:r.trim();return e||t||"Linus"}function $(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function O(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function G(){var r,s;const e=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",n=(s=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:s.partyMode;return{difficulty:t,partyMode:n==="off"||n==="light"||n==="standard"?n:"off"}}function D(e=0){var n;const t=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function F(e,t,n){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${_(n)}</strong>?</p>
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
    </main>`}function P(e,t,n){var r,s;const o=()=>{document.querySelectorAll("[data-difficulty]").forEach(c=>{const i=c.dataset.difficulty===t.difficulty;c.classList.toggle("selected",i),c.setAttribute("aria-pressed",String(i))}),document.querySelectorAll("[data-party]").forEach(c=>{const i=c.dataset.party===t.partyMode;c.classList.toggle("selected",i),c.setAttribute("aria-pressed",String(i))})};document.querySelectorAll("[data-difficulty]").forEach(c=>{c.addEventListener("click",()=>{t.difficulty=c.dataset.difficulty,o(),f("cursor")})}),document.querySelectorAll("[data-party]").forEach(c=>{c.addEventListener("click",()=>{t.partyMode=c.dataset.party,o(),f("cursor")})}),(r=document.querySelector("#start"))==null||r.addEventListener("click",()=>{f("confirm"),n()}),(s=document.querySelector("#cancel"))==null||s.addEventListener("click",()=>{f("confirm"),O(e)}),o()}function k(e,t,n){if(n==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const o=t==="baby"?1:t==="regular"?2:3,r=n==="light"?Math.min(2,o):o;return{direction:"assign",units:r,label:`ASSIGN ${r} ${r===1?"SIP":"SIPS"}`}}function H(e,t){return`<header class="game-head">
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
  </div>`}function _(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const E="three_cup_shuffle",v=I(),l=G();let a=null,w=0,x=0,m=0,u=1,T=0;window.addEventListener("pointerdown",g,{once:!0});window.addEventListener("keydown",g,{once:!0});S();function S(){m+=1,a=null,document.querySelector("#app").innerHTML=F("Three-Cup Shuffle","Watch the berry, follow every swap, then choose its cup.",v),P(E,l,A)}function A(){m+=1;const e=m;w=D(x++),a=q(l.difficulty,w),T=performance.now(),u=1,document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${H("Three-Cup Shuffle",l)}
        <div class="play-area">
          <p class="status" id="status">The berry starts here. Keep your eyes on it!</p>
          <div class="cups" id="cups">
            ${[0,1,2].map(t=>`
              <button class="cup" type="button" data-cup="${t}" disabled aria-label="Cup ${t+1}">
                <span class="berry ${t===a.startCup?"":"hidden"}">🍓</span><span>🥤</span>
              </button>`).join("")}
          </div>
          <p class="help">Choose with pointer, Left/Right + Enter, or A/D + E.</p>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="action" id="replay" type="button">RESTART</button>
        </div>
      </section>
    </main>`,p(a.startCup).classList.add("reveal"),document.querySelector("#settings").addEventListener("click",S),document.querySelector("#replay").addEventListener("click",A),B(e)}async function B(e){if(!a||(await h(l.difficulty==="baby"?1100:850),e!==m||!a))return;document.querySelectorAll(".berry").forEach(n=>n.classList.add("hidden")),document.querySelectorAll(".cup").forEach(n=>n.classList.remove("reveal")),document.querySelector("#status").textContent="Follow the cups…";const t=l.difficulty==="baby"?620:l.difficulty==="regular"?410:270;for(const n of a.events){if(e!==m||!a)return;const o=p(n.a),r=p(n.b);o.classList.add(n.type==="feint"?"feint":"active"),r.classList.add(n.type==="feint"?"feint":"active"),document.querySelector("#status").textContent=n.type==="feint"?"Feint! The cups snap back.":`${b(n.a)} ↔ ${b(n.b)}`,f(n.type==="feint"?"cursor":"action"),await h(t*.62),o.classList.remove("active","feint"),r.classList.remove("active","feint"),await h(t*.38)}e!==m||!a||(a=N(a),document.querySelector("#status").textContent="Where is the berry?",document.querySelectorAll(".cup").forEach(n=>{n.disabled=!1,n.addEventListener("click",()=>L(Number(n.dataset.cup)))}),u=1,p(u).focus())}function L(e){var o;if(!a||a.status!=="choosing")return;a=R(a,e);const t=a.status==="won",n=k(t,l.difficulty,l.partyMode);p(a.answer).classList.add("reveal"),(o=p(a.answer).querySelector(".berry"))==null||o.classList.remove("hidden"),document.querySelectorAll(".cup").forEach(r=>{r.disabled=!0}),f(t?"win":"lose"),window.setTimeout(()=>{!a||a.status!=="won"&&a.status!=="lost"||(document.querySelector(".play-area").innerHTML=K(t,t?"Found It!":"Wrong Cup!",`The berry was under the ${b(a.answer).toLowerCase()} cup.`,n),document.querySelector("#replay").textContent="SHUFFLE AGAIN",document.querySelector("#replay").focus())},520),$({gameId:E,outcome:t?"victory":"defeat",playerName:v,difficulty:l.difficulty,partyMode:l.partyMode,consequence:n,seed:w,elapsedSeconds:Math.round((performance.now()-T)/100)/10,metadata:{startCup:a.startCup,answerCup:a.answer,chosenCup:e,events:a.events}})}function p(e){return document.querySelector(`[data-cup="${e}"]`)}function b(e){return["LEFT","MIDDLE","RIGHT"][e]}function h(e){return new Promise(t=>window.setTimeout(t,e))}window.addEventListener("keydown",e=>{var t;if(e.code==="Escape"){e.preventDefault(),S();return}if(!a||a.status!=="choosing"){(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(a==null?void 0:a.status)!=="watching"&&((t=document.querySelector("#replay"))==null||t.click());return}e.code==="ArrowLeft"||e.code==="KeyA"?(e.preventDefault(),u=(u+2)%3,p(u).focus(),f("cursor")):e.code==="ArrowRight"||e.code==="KeyD"?(e.preventDefault(),u=(u+1)%3,p(u).focus(),f("cursor")):(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(e.preventDefault(),L(u))});
