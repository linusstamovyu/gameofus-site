(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();let c=null;function w(){c??(c=new AudioContext),c.state==="suspended"&&c.resume()}function u(e){if(!c||c.state!=="running")return;const t=c.createOscillator(),n=c.createGain(),a=c.currentTime,i={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(i[e],a),n.gain.setValueAtTime(1e-4,a),n.gain.exponentialRampToValueAtTime(.075,a+.008),n.gain.exponentialRampToValueAtTime(1e-4,a+.12),t.connect(n).connect(c.destination),t.start(a),t.stop(a+.13)}const L={baby:[1200,2100],regular:[1800,3600],hardest:[2400,4500]};function R(e){let t=e>>>0;return()=>{t+=1831565813;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function N(e,t){const n=R(t),[a,i]=L[e],r=Math.round(a+n()*(i-a)),s=[];if(e==="hardest"){const l=n()<.5?1:2;for(let p=0;p<l;p+=1){const M=(p+1)/(l+1);s.push(Math.round(450+M*(r-900)))}}return{signalAt:r,fakeFlashes:s}}function q(e,t){return{difficulty:e,seed:t,schedule:N(e,t),status:"waiting",reactionMs:null,falseStart:!1}}function S(e,t){if(e.status!=="waiting")throw new Error("Reaction round is already complete");if(!Number.isFinite(t)||t<0)throw new RangeError("Elapsed time must be non-negative");if(t<e.schedule.signalAt)return{...e,status:"lost",falseStart:!0,reactionMs:null};const n=Math.round(t-e.schedule.signalAt);return{...e,status:n<=1500?"won":"lost",falseStart:!1,reactionMs:n}}function I(){var n,a,i;const e=(a=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.playerName)==null?void 0:a.trim(),t=(i=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:i.trim();return e||t||"Linus"}function O(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function k(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function C(){var i,r;const e=(i=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:i.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",n=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.partyMode;return{difficulty:t,partyMode:n==="off"||n==="light"||n==="standard"?n:"off"}}function G(e=0){var n;const t=(n=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:n.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function F(e,t,n){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${H(n)}</strong>?</p>
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
    </main>`}function $(e,t,n){var i,r;const a=()=>{document.querySelectorAll("[data-difficulty]").forEach(s=>{const l=s.dataset.difficulty===t.difficulty;s.classList.toggle("selected",l),s.setAttribute("aria-pressed",String(l))}),document.querySelectorAll("[data-party]").forEach(s=>{const l=s.dataset.party===t.partyMode;s.classList.toggle("selected",l),s.setAttribute("aria-pressed",String(l))})};document.querySelectorAll("[data-difficulty]").forEach(s=>{s.addEventListener("click",()=>{t.difficulty=s.dataset.difficulty,a(),u("cursor")})}),document.querySelectorAll("[data-party]").forEach(s=>{s.addEventListener("click",()=>{t.partyMode=s.dataset.party,a(),u("cursor")})}),(i=document.querySelector("#start"))==null||i.addEventListener("click",()=>{u("confirm"),n()}),(r=document.querySelector("#cancel"))==null||r.addEventListener("click",()=>{u("confirm"),k(e)}),a()}function P(e,t,n){if(n==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const a=t==="baby"?1:t==="regular"?2:3,i=n==="light"?Math.min(2,a):a;return{direction:"assign",units:i,label:`ASSIGN ${i} ${i===1?"SIP":"SIPS"}`}}function x(e,t){return`<header class="game-head">
    <p class="eyebrow">${e}</p>
    <div class="chips">
      <span class="chip">${t.difficulty}</span>
      <span class="chip">Party: ${t.partyMode}</span>
    </div>
  </header>`}function D(e,t,n,a){return`<div class="result ${e?"win":"loss"}" aria-live="assertive">
    <p class="eyebrow">${e?"Challenge clear":"Round over"}</p>
    <p class="big">${t}</p>
    <p>${n}</p>
    <p class="consequence">${a.label}</p>
  </div>`}function H(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const b="reaction_light",E=I(),d=C();let o=null,y=0,_=0,m=0,f=[];window.addEventListener("pointerdown",w,{once:!0});window.addEventListener("keydown",w,{once:!0});g();function h(){f.forEach(e=>window.clearTimeout(e)),f=[]}function g(){h(),o=null,document.querySelector("#app").innerHTML=F("Reaction Light","Wait for green, ignore decoys, then react immediately.",E),$(b,d,A)}function A(){h(),y=G(_++),o=q(d.difficulty,y),document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${x("Reaction Light",d)}
        <div class="play-area">
          <p class="status" id="status">Wait… do not press early.</p>
          <button class="light" id="light" type="button" aria-label="Reaction button">WAIT</button>
          <p class="help">Press the light or use Enter / Space / E when it turns green.</p>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="action" id="replay" type="button">RESTART</button>
        </div>
      </section>
    </main>`,document.querySelector("#settings").addEventListener("click",g),document.querySelector("#replay").addEventListener("click",A),document.querySelector("#light").addEventListener("click",T),m=performance.now();for(const e of o.schedule.fakeFlashes)f.push(window.setTimeout(K,e));f.push(window.setTimeout(W,o.schedule.signalAt)),f.push(window.setTimeout(B,o.schedule.signalAt+1501)),document.querySelector("#light").focus()}function K(){if(!o||o.status!=="waiting")return;const e=document.querySelector("#light");e.classList.add("fake"),e.textContent="FAKE!",u("cursor"),f.push(window.setTimeout(()=>{!o||o.status!=="waiting"||(e.classList.remove("fake"),e.textContent="WAIT")},140))}function W(){if(!o||o.status!=="waiting")return;const e=document.querySelector("#light");e.classList.remove("fake"),e.classList.add("go"),e.textContent="GO!",document.querySelector("#status").textContent="NOW!",u("action")}function T(){if(!o||o.status!=="waiting")return;const e=performance.now()-m;o=S(o,e),v()}function B(){!o||o.status!=="waiting"||(o=S(o,o.schedule.signalAt+1501),v())}function v(){if(!o)return;h();const e=o.status==="won",t=P(e,d.difficulty,d.partyMode);u(e?"win":"lose");const n=o.falseStart?"False Start!":e?`${o.reactionMs} ms!`:"Too Slow!",a=o.falseStart?"You pressed before the true green signal.":o.reactionMs===null?"No reaction was recorded.":`Reaction time: ${o.reactionMs} milliseconds.`;document.querySelector(".play-area").innerHTML=D(e,n,a,t),document.querySelector("#replay").textContent="TRY AGAIN",document.querySelector("#replay").focus(),O({gameId:b,outcome:e?"victory":"defeat",playerName:E,difficulty:d.difficulty,partyMode:d.partyMode,consequence:t,seed:y,elapsedSeconds:Math.round((performance.now()-m)/100)/10,metadata:{reactionMs:o.reactionMs,falseStart:o.falseStart,signalAtMs:o.schedule.signalAt,fakeFlashes:o.schedule.fakeFlashes}})}window.addEventListener("keydown",e=>{var t;if(e.code==="Escape"){e.preventDefault(),g();return}(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&((o==null?void 0:o.status)==="waiting"?(e.preventDefault(),T()):(t=document.querySelector("#replay"))==null||t.click())});
