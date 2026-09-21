(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function r(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(o){if(o.ep)return;o.ep=!0;const i=r(o);fetch(o.href,i)}})();let c=null;function b(){c??(c=new AudioContext),c.state==="suspended"&&c.resume()}function u(e){if(!c||c.state!=="running")return;const t=c.createOscillator(),r=c.createGain(),a=c.currentTime,o={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};t.type=e==="lose"||e==="denied"?"square":"triangle",t.frequency.setValueAtTime(o[e],a),r.gain.setValueAtTime(1e-4,a),r.gain.exponentialRampToValueAtTime(.075,a+.008),r.gain.exponentialRampToValueAtTime(1e-4,a+.12),t.connect(r).connect(c.destination),t.start(a),t.stop(a+.13)}const A={baby:8,regular:12,hardest:16};function R(e){let t=e>>>0;return()=>{t+=1831565813;let r=t;return r=Math.imul(r^r>>>15,r|1),r^=r+Math.imul(r^r>>>7,r|61),((r^r>>>14)>>>0)/4294967296}}function L(e){return{difficulty:e,target:A[e],turn:1,maxTurns:3,banked:0,unbanked:0,lastRoll:null,status:"playing"}}function q(e){const t=Math.min(.999999999,Math.max(0,e()));return Math.floor(t*6)+1}function M(e,t){if(m(e),!Number.isInteger(t)||t<1||t>6)throw new RangeError("Die must be an integer from 1 to 6");return t===1?e.turn>=e.maxTurns?{...e,unbanked:0,lastRoll:t,status:"lost"}:{...e,turn:e.turn+1,unbanked:0,lastRoll:t}:{...e,unbanked:e.unbanked+t,lastRoll:t}}function N(e){if(m(e),e.unbanked===0)throw new Error("Nothing is available to bank");const t=e.banked+e.unbanked;return t>=e.target?{...e,banked:t,unbanked:0,status:"won"}:e.turn>=e.maxTurns?{...e,banked:t,unbanked:0,status:"lost"}:{...e,banked:t,unbanked:0,turn:e.turn+1}}function m(e){if(e.status!=="playing")throw new Error("Dice challenge is already complete")}function $(){var r,a,o;const e=(a=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.playerName)==null?void 0:a.trim(),t=(o=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:o.trim();return e||t||"Linus"}function I(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function O(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}function x(){var o,i;const e=(o=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:o.difficulty,t=e==="baby"||e==="regular"||e==="hardest"?e:"regular",r=(i=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:i.partyMode;return{difficulty:t,partyMode:r==="off"||r==="light"||r==="standard"?r:"off"}}function C(e=0){var r;const t=(r=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:r.seed;return Number.isFinite(t)?Number(t)+e>>>0:Date.now()+e>>>0}function G(e,t,r){return`
    <main class="shell">
      <section class="panel" aria-labelledby="title">
        <p class="eyebrow">STRANGER CHALLENGE</p>
        <h1 id="title">${e}</h1>
        <p class="lede">${t} Ready, <strong>${_(r)}</strong>?</p>
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
    </main>`}function D(e,t,r){var o,i;const a=()=>{document.querySelectorAll("[data-difficulty]").forEach(s=>{const d=s.dataset.difficulty===t.difficulty;s.classList.toggle("selected",d),s.setAttribute("aria-pressed",String(d))}),document.querySelectorAll("[data-party]").forEach(s=>{const d=s.dataset.party===t.partyMode;s.classList.toggle("selected",d),s.setAttribute("aria-pressed",String(d))})};document.querySelectorAll("[data-difficulty]").forEach(s=>{s.addEventListener("click",()=>{t.difficulty=s.dataset.difficulty,a(),u("cursor")})}),document.querySelectorAll("[data-party]").forEach(s=>{s.addEventListener("click",()=>{t.partyMode=s.dataset.party,a(),u("cursor")})}),(o=document.querySelector("#start"))==null||o.addEventListener("click",()=>{u("confirm"),r()}),(i=document.querySelector("#cancel"))==null||i.addEventListener("click",()=>{u("confirm"),O(e)}),a()}function P(e,t,r){if(r==="off")return{direction:"none",units:0,label:"BRAGGING RIGHTS"};if(!e)return{direction:"take",units:1,label:"TAKE 1 SIP"};const a=t==="baby"?1:t==="regular"?2:3,o=r==="light"?Math.min(2,a):a;return{direction:"assign",units:o,label:`ASSIGN ${o} ${o===1?"SIP":"SIPS"}`}}function B(e,t){return`<header class="game-head">
    <p class="eyebrow">${e}</p>
    <div class="chips">
      <span class="chip">${t.difficulty}</span>
      <span class="chip">Party: ${t.partyMode}</span>
    </div>
  </header>`}function H(e,t,r,a){return`<div class="result ${e?"win":"loss"}" aria-live="assertive">
    <p class="eyebrow">${e?"Challenge clear":"Round over"}</p>
    <p class="big">${t}</p>
    <p>${r}</p>
    <p class="consequence">${a.label}</p>
  </div>`}function _(e){const t=document.createElement("span");return t.textContent=e,t.innerHTML}const g="dice_push_your_luck",h=$(),l=x(),F=["","⚀","⚁","⚂","⚃","⚄","⚅"];let n=null,S=Math.random,p=0,K=0,k=0;window.addEventListener("pointerdown",b,{once:!0});window.addEventListener("keydown",b,{once:!0});f();function f(){n=null,document.querySelector("#app").innerHTML=G("Dice Push-Your-Luck","Build points over three turns. Bank safely—or roll again and risk a 1.",h),D(g,l,T)}function T(){p=C(K++),S=R(p),n=L(l.difficulty),k=performance.now(),document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="panel">
        ${B("Dice Push-Your-Luck",l)}
        <div class="play-area">
          <p class="status" id="status">Reach ${n.target} banked points in three turns.</p>
          <div class="scoreboard">
            <div class="scorebox">BANKED<strong id="banked">0</strong></div>
            <div class="scorebox">THIS TURN<strong id="unbanked">0</strong></div>
            <div class="scorebox">TURN<strong id="turn">1 / 3</strong></div>
          </div>
          <div class="die" id="die" aria-label="No roll yet">?</div>
          <p class="help">Enter / Space / E rolls. B banks the current turn.</p>
        </div>
        <div class="actions">
          <button class="secondary" id="settings" type="button">SETTINGS</button>
          <button class="secondary" id="bank" type="button" disabled>BANK</button>
          <button class="action" id="roll" type="button">ROLL</button>
        </div>
      </section>
    </main>`,document.querySelector("#settings").addEventListener("click",f),document.querySelector("#roll").addEventListener("click",v),document.querySelector("#bank").addEventListener("click",E),document.querySelector("#roll").focus(),y()}function v(){if(!n||n.status!=="playing")return;const e=n.turn,t=q(S);n=M(n,t),document.querySelector("#die").textContent=F[t],document.querySelector("#die").setAttribute("aria-label",`Rolled ${t}`),t===1?(u("denied"),document.querySelector("#status").textContent=n.status==="lost"?"A 1 busts the final turn!":`Bust! Turn ${e} scores nothing.`):(u("action"),document.querySelector("#status").textContent=`Rolled ${t}. Bank ${n.unbanked}, or risk another roll.`),y(),n.status!=="playing"&&w(!1)}function E(){if(!n||n.status!=="playing"||n.unbanked===0){u("denied");return}const e=n.unbanked;n=N(n),u(n.status==="won"?"win":"confirm"),y(),n.status==="playing"?(document.querySelector("#status").textContent=`Banked ${e}. Turn ${n.turn}: roll again.`,document.querySelector("#die").textContent="?"):w(n.status==="won")}function y(){n&&(document.querySelector("#banked").textContent=String(n.banked),document.querySelector("#unbanked").textContent=String(n.unbanked),document.querySelector("#turn").textContent=`${n.turn} / ${n.maxTurns}`,document.querySelector("#bank").disabled=n.unbanked===0||n.status!=="playing")}function w(e){if(!n)return;const t=P(e,l.difficulty,l.partyMode);u(e?"win":"lose"),document.querySelector(".play-area").innerHTML=H(e,e?"Target Banked!":"Out of Turns!",e?`${n.banked} points beat the ${n.target}-point target.`:`${n.banked} banked points fell short of ${n.target}.`,t),document.querySelector(".actions").innerHTML='<button class="secondary" id="settings" type="button">SETTINGS</button><button class="action" id="replay" type="button">ROLL AGAIN</button>',document.querySelector("#settings").addEventListener("click",f),document.querySelector("#replay").addEventListener("click",T),document.querySelector("#replay").focus(),I({gameId:g,outcome:e?"victory":"defeat",playerName:h,difficulty:l.difficulty,partyMode:l.partyMode,consequence:t,seed:p,elapsedSeconds:Math.round((performance.now()-k)/100)/10,metadata:{banked:n.banked,target:n.target,turnsUsed:n.turn,lastRoll:n.lastRoll}})}window.addEventListener("keydown",e=>{var t;e.code==="Escape"?(e.preventDefault(),f()):e.code==="KeyB"&&(n==null?void 0:n.status)==="playing"?(e.preventDefault(),E()):(e.code==="Enter"||e.code==="Space"||e.code==="KeyE")&&(e.preventDefault(),(n==null?void 0:n.status)==="playing"?v():(t=document.querySelector("#replay"))==null||t.click())});
