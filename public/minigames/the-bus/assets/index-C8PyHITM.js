(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(a){if(a.ep)return;a.ep=!0;const s=t(a);fetch(a.href,s)}})();let y=null;function V(){y??(y=new AudioContext),y.state==="suspended"&&y.resume()}function u(e){if(!y||y.state!=="running")return;const n=y.createOscillator(),t=y.createGain(),r=y.currentTime,a={cursor:420,confirm:620,denied:150,action:330,win:820,lose:120};n.type=e==="lose"||e==="denied"?"square":"triangle",n.frequency.setValueAtTime(a[e],r),t.gain.setValueAtTime(1e-4,r),t.gain.exponentialRampToValueAtTime(.075,r+.008),t.gain.exponentialRampToValueAtTime(1e-4,r+.12),n.connect(t).connect(y.destination),n.start(r),n.stop(r+.13)}const de="/assets/cards";function j(){var e;return((e=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:e.cardAssetBase)??de}function ue(e,n){return`${j()}/cards/${e}/${n}.png`}function ce(){return`${j()}/backs/default.png`}const le=[{name:"clubs",code:"C"},{name:"diamonds",code:"D"},{name:"hearts",code:"H"},{name:"spades",code:"S"}],pe=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],F=[1,1,1,1,2,2,2,3,3,4];function U(){return le.flatMap(({name:e,code:n})=>pe.map((t,r)=>({id:`${t}${n}`,suit:e,suitCode:n,rank:t,value:r+1})))}function _(e,n=Math.random){const t=[...e];for(let r=t.length-1;r>0;r-=1){const a=Math.min(.999999999,Math.max(0,n())),s=Math.floor(a*(r+1));[t[r],t[s]]=[t[s],t[r]]}return t}function fe(e){let n=e>>>0;return()=>{n+=1831565813;let t=n;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function he(e,n,t=Math.random){if(e.length<1||e.length>5)throw new Error("The Bus needs one to five players");if(e.some(r=>!r.trim()))throw new Error("Every player needs a display name");if(new Set(e.map(r=>r.trim().toLowerCase())).size!==e.length)throw new Error("Player names must be unique");return{phase:"gauntlet",partyMode:n,players:e.map(r=>({name:r.trim(),hand:[],give:0,take:0})),deck:_(U(),t),round:1,activePlayerIndex:0,pyramid:ke(t),pyramidIndex:0,suddenCandidates:[],busRiders:[],activeRiderIndex:0,busWinnerIndex:null,lastEvent:null}}function Y(e){return e.phase!=="gauntlet"?[]:e.round===1?["red","black"]:e.round===2?["higher","lower"]:e.round===3?["inside","outside"]:["have-suit","new-suit"]}function ye(e,n){if(m(e,"gauntlet"),!Y(e).includes(n))throw new Error(`Invalid guess for round ${e.round}`);const{card:t,deck:r}=$(e.deck),a=e.players[e.activePlayerIndex],s=ge(e.round,a.hand,n,t),o=G(e.round,e.partyMode),d=A(e.players,e.activePlayerIndex,{...a,hand:[...a.hand,t],give:a.give+(s?o:0),take:a.take+(s?0:o)});return{...e,phase:"gauntlet_result",players:d,deck:r,lastEvent:{kind:"gauntlet",playerIndex:e.activePlayerIndex,round:e.round,guess:n,card:t,correct:s,units:o}}}function be(e){if(m(e,"gauntlet_result"),e.activePlayerIndex<e.players.length-1)return{...e,phase:"gauntlet",activePlayerIndex:e.activePlayerIndex+1,lastEvent:null};if(e.round<4)return{...e,phase:"gauntlet",round:e.round+1,activePlayerIndex:0,lastEvent:null};let n=[...e.deck];const t=e.pyramid.map(r=>{const a=$(n);return n=a.deck,{...r,card:a.card}});return{...e,phase:"pyramid",deck:n,pyramid:t,pyramidIndex:0,activePlayerIndex:0,lastEvent:null}}function X(e){m(e,"pyramid");const n=e.pyramid[e.pyramidIndex];if(!n)throw new Error("There is no pyramid card left to flip");const t=G(n.baseUnits*(n.doubled?2:1),e.partyMode),r=[],a=e.players.map((o,d)=>{const p=o.hand.findIndex(l=>l.rank===n.card.rank);if(p===-1)return o;const h=o.hand[p];return r.push({playerIndex:d,discardedCard:h,units:t}),{...o,hand:o.hand.filter((l,g)=>g!==p),give:o.give+t}}),s=A(e.pyramid,e.pyramidIndex,{...n,revealed:!0});return{...e,phase:"pyramid_result",players:a,pyramid:s,lastEvent:{kind:"pyramid",pyramidIndex:e.pyramidIndex,card:n.card,row:n.row,doubled:n.doubled,units:t,matches:r}}}function Q(e,n=Math.random){if(m(e,"pyramid_result"),e.pyramidIndex<e.pyramid.length-1)return{...e,phase:"pyramid",pyramidIndex:e.pyramidIndex+1,lastEvent:null};const t=Math.max(...e.players.map(a=>a.hand.length)),r=e.players.map((a,s)=>({index:s,count:a.hand.length})).filter(({count:a})=>a===t).map(({index:a})=>a);return r.length>2?{...e,phase:"sudden_death",suddenCandidates:r,lastEvent:null}:Z(e,r,n)}function ve(e,n=Math.random){m(e,"sudden_death");const{card:t,deck:r}=$(e.deck,n),a=e.suddenCandidates.filter(d=>e.players[d].hand.some(p=>p.rank===t.rank)),s=a.length===e.suddenCandidates.length?[]:a,o=e.suddenCandidates.filter(d=>!s.includes(d));return{...e,phase:"sudden_result",deck:r,suddenCandidates:o,lastEvent:{kind:"sudden",card:t,escapedPlayerIndices:s,remainingPlayerIndices:o}}}function me(e,n=Math.random){return m(e,"sudden_result"),e.suddenCandidates.length>2?{...e,phase:"sudden_death",lastEvent:null}:Z(e,e.suddenCandidates,n)}function Ee(e,n,t=Math.random){if(m(e,"bus"),n!=="higher"&&n!=="lower")throw new Error("The bus guess must be higher or lower");const r=e.busRiders[e.activeRiderIndex];if(!r||r.finished)throw new Error("There is no active bus rider");const a=r.leg===1?r.firstLegCards.length:6+r.secondLegCards.length,{card:s,deck:o}=$(e.deck,t),d=n==="higher"?s.value>r.reference.value:s.value<r.reference.value,p=d?r.streak+1:0,h=d&&p===5,l=h&&r.leg===2;let g=o,k=null;if(h&&r.leg===1){const W=$(g,t);k=W.card,g=W.deck}const K=e.players[r.playerIndex],se=d?e.players:A(e.players,r.playerIndex,{...K,take:K.take+G(1,e.partyMode)}),I={...r,reference:k??s,routeStart:!d&&r.leg===1?s:r.routeStart,firstLegCards:r.leg===1?d?[...r.firstLegCards,s]:[]:r.firstLegCards,checkpoint:h&&r.leg===1?k:!d&&r.leg===2?s:r.checkpoint,secondLegCards:r.leg===2?d?[...r.secondLegCards,s]:[]:r.secondLegCards,leg:h&&r.leg===1?2:r.leg,streak:h?0:p,wrongs:r.wrongs+(d?0:1),finished:l},ie=A(e.busRiders,e.activeRiderIndex,I),oe=k?6:d?I.leg===1?I.firstLegCards.length:6+I.secondLegCards.length:I.leg===1?0:6;return{...e,phase:"bus_result",players:se,deck:g,busRiders:ie,lastEvent:{kind:"bus",playerIndex:r.playerIndex,guess:n,previousCard:r.reference,card:s,correct:d,completedLeg:h,checkpointCard:k,previousRouteIndex:a,routeIndex:oe,finished:l,streak:I.streak}}}function Ie(e){m(e,"bus_result");const n=e.busRiders.findIndex(r=>r.finished);if(n!==-1)return{...e,phase:"complete",activeRiderIndex:n,busWinnerIndex:e.busRiders[n].playerIndex,lastEvent:null};const t=e.busRiders.length===1?0:(e.activeRiderIndex+1)%e.busRiders.length;return{...e,phase:"bus",activeRiderIndex:t,lastEvent:null}}function z(e,n=0){if(e.phase!=="complete")throw new Error("Outcome is only available after the game completes");const t=e.busRiders.map(r=>r.playerIndex);return t.includes(n)?t.length===1?"defeat":e.busWinnerIndex===n?"victory":"defeat":"victory"}function $e(e,n=0){const t=e.players[n];if(!t)throw new Error("Unknown player");if(e.partyMode==="off")return{direction:"none",units:0,label:"TABLE COMPLETE"};const r=t.give-t.take;if(r===0)return{direction:"none",units:0,label:"EVEN TABLE"};const a=Math.abs(r),s=e.partyMode==="light"?Math.min(2,a):a,o=s===1?"SIP":"SIPS";return r>0?{direction:"assign",units:s,label:`GIVE ${s} ${o}`}:{direction:"take",units:s,label:`TAKE ${s} ${o}`}}function G(e,n){if(!Number.isInteger(e)||e<0)throw new Error("Consequence units must be a non-negative integer");return n==="light"?Math.min(2,e):e}function ge(e,n,t,r){if(e===1){const s=r.suit==="hearts"||r.suit==="diamonds"?"red":"black";return t===s}if(e===2){const s=n[0];if(!s)throw new Error("Round two needs the first card");return t==="higher"?r.value>s.value:t==="lower"&&r.value<s.value}if(e===3){if(n.length<2)throw new Error("Round three needs two cards");const s=Math.min(n[0].value,n[1].value),o=Math.max(n[0].value,n[1].value);return t==="inside"?r.value>s&&r.value<o:t==="outside"&&(r.value<s||r.value>o)}if(n.length<3)throw new Error("Round four needs three cards");const a=n.some(s=>s.suit===r.suit);return t===(a?"have-suit":"new-suit")}function ke(e){const n=_([...F.keys()].map(String),e).map(Number),t=4+Math.floor(Math.min(.999999999,Math.max(0,e()))*2),r=new Set(n.slice(0,t));return F.map((a,s)=>({card:U()[0],row:a,baseUnits:a,doubled:r.has(s),revealed:!1}))}function Z(e,n,t){if(n.length<1||n.length>2)throw new Error("The Bus supports one or two final riders");let r=[...e.deck];const a=n.map(s=>{const o=$(r,t);return r=o.deck,{playerIndex:s,reference:o.card,routeStart:o.card,firstLegCards:[],checkpoint:null,secondLegCards:[],leg:1,streak:0,wrongs:0,finished:!1}});return{...e,phase:"bus",deck:r,suddenCandidates:n,busRiders:a,activeRiderIndex:0,busWinnerIndex:null,lastEvent:null}}function $(e,n=Math.random){const t=e.length?[...e]:_(U(),n),r=t.shift();if(!r)throw new Error("The deck could not be replenished");return{card:r,deck:t}}function m(e,n){if(e.phase!==n)throw new Error(`Action requires ${n} phase`)}function A(e,n,t){return e.map((r,a)=>a===n?t:r)}function we(){var t,r,a;const e=(r=(t=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:t.playerName)==null?void 0:r.trim(),n=(a=new URLSearchParams(window.location.search).get("playerName"))==null?void 0:a.trim();return e||n||"Linus"}function Re(e="off"){var t;const n=(t=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:t.partyMode;return n==="off"||n==="light"||n==="standard"?n:e}function Te(e){window.dispatchEvent(new CustomEvent("frokost:minigame-complete",{detail:e}))}function B(e){window.dispatchEvent(new CustomEvent("frokost:minigame-cancel",{detail:{gameId:e}}))}const P="the_bus",Se=["Linus","Seb","Peter","Rico","Chris"],Ae=["RED OR BLACK","HIGHER OR LOWER","INSIDE OR OUTSIDE","HAVE THE SUIT?"],b=document.querySelector("#app"),Ce=we();let f={playerCount:1,partyMode:Re("standard")},i=null,C=0,E=Math.random,J=0,N=!1,M=!1,w=null;window.addEventListener("pointerdown",V,{once:!0});window.addEventListener("keydown",V,{once:!0});b.addEventListener("click",Me);window.addEventListener("keydown",xe);x();function Me(e){var r,a;const n=e.target.closest("button");if(!n||n.disabled)return;const t=n.dataset.action;if(t){if(t==="player-count"){f.playerCount=Number(n.dataset.value),u("cursor"),x();return}if(t==="party-mode"){f.partyMode=Qe(n.dataset.value),u("cursor"),x();return}if(t==="start"){q();return}if(t==="cancel"){qe();return}if(t==="settings"){ne();return}if(t==="replay"){q();return}if(i)try{if(t==="gauntlet-guess")R(),i=ye(i,n.dataset.value),u(((r=i.lastEvent)==null?void 0:r.kind)==="gauntlet"&&i.lastEvent.correct?"win":"lose");else if(t==="continue-gauntlet")i=be(i),u("confirm");else if(t==="flip-pyramid")R(),i=X(i),u("action");else if(t==="auto-pyramid"){M=!0,u("confirm"),H();return}else t==="continue-pyramid"?(i=Q(i,E),u("confirm")):t==="draw-sudden"?(i=ve(i,E),u("action")):t==="continue-sudden"?(i=me(i,E),u("confirm")):t==="bus-guess"?(i=Ee(i,n.dataset.value,E),u(((a=i.lastEvent)==null?void 0:a.kind)==="bus"&&i.lastEvent.correct?"win":"lose")):t==="continue-bus"&&(i=Ie(i),u(i.phase==="complete"?"win":"confirm"));L()}catch(s){u("denied"),console.error(s)}}}function xe(e){var t,r,a;if(e.code==="Escape"){e.preventDefault(),i?ne():B(P);return}if(!i)return;const n=[...b.querySelectorAll("button:not(:disabled)")].filter(s=>s.offsetParent!==null);if(["ArrowLeft","ArrowUp","KeyA","KeyW","ArrowRight","ArrowDown","KeyD","KeyS"].includes(e.code)){e.preventDefault();const s=["ArrowLeft","ArrowUp","KeyA","KeyW"].includes(e.code)?-1:1,o=Math.max(0,n.indexOf(document.activeElement));(t=n[(o+s+n.length)%n.length])==null||t.focus({preventScroll:!0}),u("cursor");return}if(i.phase==="bus"&&(e.code==="KeyH"||e.code==="KeyL")){e.preventDefault(),(r=b.querySelector(`[data-action="bus-guess"][data-value="${e.code==="KeyH"?"higher":"lower"}"]`))==null||r.click();return}if(/^Digit[1-4]$/.test(e.code)&&i.phase==="gauntlet"){const s=Number(e.code.slice(-1))-1,o=b.querySelectorAll("[data-action='gauntlet-guess']")[s];o&&(e.preventDefault(),o.click());return}(e.code==="KeyE"||(e.code==="Enter"||e.code==="Space")&&document.activeElement===document.body)&&(e.preventDefault(),(a=b.querySelector(".primary-action"))==null||a.click())}function q(){R(),C=Xe(),E=fe(C),i=he(te(f.playerCount),f.partyMode,E),J=performance.now(),N=!1,u("confirm"),L()}function x(){i=null;const e=te(f.playerCount),n=f.partyMode==="off"?"TABLE POINTS":f.partyMode==="light"?"SIPS (MAX 2 PER HIT)":"SIPS";b.innerHTML=`
    ${re()}
    <main class="minigame-shell setup-shell">
      <section class="setup-card" aria-labelledby="game-title">
        <div class="route-sign"><span>ROUTE</span><strong>10</strong></div>
        <div class="setup-copy">
          <p class="eyebrow">FROKOST PARTY LINE</p>
          <h1 id="game-title">THE BUS</h1>
          <p>Four calls. One pyramid. Ten correct cards between you and the last stop.</p>
        </div>

        <fieldset class="setup-field">
          <legend>PLAYERS AROUND THE TABLE</legend>
          <div class="choice-row five">
            ${[1,2,3,4,5].map(t=>S("player-count",String(t),String(t),t===f.playerCount)).join("")}
          </div>
          <div class="roster-preview">${e.map((t,r)=>`<span><b>${r+1}</b>${c(t)}</span>`).join("")}</div>
        </fieldset>

        <fieldset class="setup-field">
          <legend>PARTY MODE</legend>
          <div class="choice-row three">
            ${S("party-mode","off","OFF",f.partyMode==="off")}
            ${S("party-mode","light","LIGHT",f.partyMode==="light")}
            ${S("party-mode","standard","STANDARD",f.partyMode==="standard")}
          </div>
          <p class="mode-help">${n}. Correct calls add to GIVE; misses add to TAKE. Everyone's running tally stays under their seat.</p>
        </fieldset>

        <div class="route-map" aria-label="Game phases">
          <span><b>1</b>FOUR CALLS</span><i>→</i><span><b>2</b>PYRAMID</span><i>→</i><span><b>3</b>THE BUS</span>
        </div>
        <div class="setup-actions">
          <button class="secondary-button" data-action="cancel" type="button">BACK</button>
          <button class="primary-button primary-action" data-action="start" type="button" data-autofocus>BOARD THE BUS</button>
        </div>
      </section>
    </main>`,ae()}function L(){if(!i)return;const e=Ye(i);b.innerHTML=`
    ${re()}
    <main class="minigame-shell game-shell">
      <section class="table-card" aria-labelledby="table-title">
        <header class="game-header">
          <button class="icon-button" data-action="settings" type="button" aria-label="Return to settings">←</button>
          <div><p class="eyebrow">ROUTE 10 · ${c(e.kicker)}</p><h1 id="table-title">THE BUS</h1></div>
          <div class="header-chips"><span>${f.partyMode.toUpperCase()}</span><span>#${String(C).slice(-6).padStart(6,"0")}</span></div>
        </header>

        ${Le(i)}

        <section class="play-stage ${i.phase}" aria-live="polite">
          ${Oe(i)}
        </section>
      </section>
    </main>`,i.phase==="complete"&&Fe(i),ae()}function Le(e){return`<div class="table-roster" aria-label="Player tally">
    ${e.players.map((n,t)=>{const r=Ve(e)===t,a=e.suddenCandidates.includes(t)||e.busRiders.some(s=>s.playerIndex===t);return`<article class="player-seat${r?" active":""}${a?" candidate":""}">
        <div class="seat-name"><span>${t+1}</span><strong>${c(n.name)}</strong>${r?"<em>TURN</em>":""}</div>
        <div class="mini-hand" aria-label="${n.hand.length} cards remaining">
          ${n.hand.length?n.hand.map(s=>v(s,!0,"mini-card")).join(""):"<span class='empty-hand'>CLEAR</span>"}
        </div>
        <div class="tally"><span class="give">GIVE <b>${n.give}</b></span><span class="take">TAKE <b>${n.take}</b></span></div>
      </article>`}).join("")}
  </div>`}function Oe(e){return e.phase==="gauntlet"?Pe(e):e.phase==="gauntlet_result"?De(e):e.phase==="pyramid"||e.phase==="pyramid_result"?Ne(e):e.phase==="sudden_death"||e.phase==="sudden_result"?Ue(e):e.phase==="bus"||e.phase==="bus_result"?Ge(e):We(e)}function Pe(e){const n=e.players[e.activePlayerIndex],t=Y(e),r=je(e);return`<div class="challenge-panel">
    <p class="phase-step">CALL ${e.round} OF 4 · WORTH ${O(e.round,e.partyMode)} ${D(O(e.round,e.partyMode),e.partyMode)}</p>
    <h2>PASS TO ${c(n.name)}</h2>
    <p class="question">${r}</p>
    <div class="reference-cards">${n.hand.length?n.hand.map(a=>v(a,!0)).join(""):v(null,!1)}</div>
    <div class="guess-grid count-${t.length}">
      ${t.map((a,s)=>`<button class="guess-button${s===0?" primary-action":""}" data-action="gauntlet-guess" data-value="${a}" type="button" ${s===0?"data-autofocus":""}><kbd>${s+1}</kbd>${ze(a)}</button>`).join("")}
    </div>
    <p class="rule-note">${e.round===4?"HAVE THE SUIT means the fourth card repeats any suit shown above.":"Equal ranks miss. Inside/outside uses strict boundaries."}</p>
  </div>`}function De(e){var r;if(((r=e.lastEvent)==null?void 0:r.kind)!=="gauntlet")return"";const n=e.lastEvent,t=e.players[n.playerIndex];return`<div class="reveal-panel ${n.correct?"success":"miss"}">
    <p class="phase-step">${Ae[n.round-1]}</p>
    ${v(n.card,!0,"hero-card")}
    <h2>${n.correct?"CORRECT CALL!":"MISSED THE STOP"}</h2>
    <p>${c(t.name)} ${n.correct?"adds":"takes"} <strong>${n.units} ${D(n.units,e.partyMode)}</strong>.</p>
    <button class="primary-button primary-action" data-action="continue-gauntlet" type="button" data-autofocus>PASS ON <kbd>E</kbd></button>
  </div>`}function Ne(e){var t;const n=((t=e.lastEvent)==null?void 0:t.kind)==="pyramid"?e.lastEvent:null;return`<div class="pyramid-layout">
    <div class="pyramid-board" aria-label="Four row card pyramid">
      ${[4,3,2,1].map(r=>`<div class="pyramid-row row-${r}">
        ${e.pyramid.map((a,s)=>({slot:a,index:s})).filter(({slot:a})=>a.row===r).map(({slot:a,index:s})=>`<div class="pyramid-slot${s===e.pyramidIndex?" current":""}${a.doubled?" double":""}">
            ${v(a.card,a.revealed,a.doubled?"horizontal-card":"")}
            <span class="row-value">${a.baseUnits}${a.doubled?"×2":""}</span>
          </div>`).join("")}
      </div>`).join("")}
    </div>
    <aside class="pyramid-console">
      <p class="phase-step">PYRAMID · CARD ${Math.min(e.pyramidIndex+1,10)} OF 10</p>
      ${n?He(n,e):"<h2>FLIP THE NEXT CARD</h2><p>Every player with the same rank discards one card and adds this row's value to GIVE.</p>"}
      ${e.phase==="pyramid"?'<div class="console-actions"><button class="secondary-button" data-action="auto-pyramid" type="button">AUTO PLAY</button><button class="primary-button primary-action" data-action="flip-pyramid" type="button" data-autofocus>FLIP CARD <kbd>E</kbd></button></div>':`<button class="primary-button primary-action" data-action="continue-pyramid" type="button" data-autofocus>${e.pyramidIndex===9?"COUNT CARDS":"NEXT CARD"} <kbd>E</kbd></button>`}
    </aside>
  </div>`}function He(e,n){const t=e.matches.map(r=>c(n.players[r.playerIndex].name));return`<div class="flip-result">
    <span class="big-rank">${e.card.rank}${Ze(e.card.suit)}</span>
    <h2>${t.length?"MATCH!":"NO MATCH"}</h2>
    <p>${t.length?`${t.join(", ")} ${t.length===1?"gives":"give"} <strong>${e.units} ${D(e.units,n.partyMode)}</strong>.`:"Nobody discards a card this flip."}</p>
    ${e.doubled?"<strong class='double-callout'>HORIZONTAL · DOUBLE VALUE</strong>":""}
  </div>`}function Ue(e){var r;const n=((r=e.lastEvent)==null?void 0:r.kind)==="sudden"?e.lastEvent:null,t=e.suddenCandidates.map(a=>c(e.players[a].name));return`<div class="sudden-panel">
    <p class="phase-step">HEADS-UP SUDDEN DEATH</p>
    <h2>${n?"MATCH CHECK":`${t.length}-WAY TIE`}</h2>
    ${n?v(n.card,!0,"hero-card"):v(null,!1,"hero-card")}
    <p>${n?_e(n,e):"A shared card is drawn. Anyone holding its rank escapes the tie. Continue until no more than two riders remain."}</p>
    <div class="candidate-list">${t.map(a=>`<span>${a}</span>`).join("")}</div>
    ${e.phase==="sudden_death"?'<button class="primary-button primary-action" data-action="draw-sudden" type="button" data-autofocus>DRAW TIEBREAKER <kbd>E</kbd></button>':`<button class="primary-button primary-action" data-action="continue-sudden" type="button" data-autofocus>${e.suddenCandidates.length<=2?"BOARD THE BUS":"DRAW AGAIN"} <kbd>E</kbd></button>`}
  </div>`}function _e(e,n){if(!e.escapedPlayerIndices.length)return"No one escapes on this card. The tied group stays aboard.";const t=e.escapedPlayerIndices.map(r=>c(n.players[r].name));return`${t.join(" and ")} matched the rank and ${t.length===1?"escapes":"escape"}.`}function Ge(e){var a;const n=e.busRiders[e.activeRiderIndex],t=e.players[n.playerIndex],r=((a=e.lastEvent)==null?void 0:a.kind)==="bus"?e.lastEvent:null;return`<div class="bus-panel">
    <div class="bus-progress riders-${e.busRiders.length}">
      <p class="bus-health-title">RIDER HEALTH &amp; PROGRESS</p>
      ${e.busRiders.map((s,o)=>{const d=e.players[s.playerIndex];return`<article class="rider-progress${o===e.activeRiderIndex?" active":""}">
          <strong>${c(d.name)}</strong><span>LEG ${s.leg}/2</span>
          <div class="streak-dots">${[0,1,2,3,4].map(p=>`<i class="${p<s.streak?"filled":""}"></i>`).join("")}</div>
          <small>${s.wrongs} MISSES</small>
        </article>`}).join("")}
    </div>
    <div class="bus-call">
      <p class="phase-step">${e.busRiders.length===2?"RACE":"SOLO RIDE"} · ${c(t.name)} · LEG ${n.leg}</p>
      <h2>${n.leg===1?"FIRST FIVE":"FINAL FIVE"}</h2>
      ${Ke(n,r)}
      ${r?Be(r,e):`
        <p>Call the next card from your current stop.</p>
        <div class="guess-grid count-2">
          <button class="guess-button primary-action" data-action="bus-guess" data-value="higher" type="button" data-autofocus><kbd>H</kbd>HIGHER</button>
          <button class="guess-button" data-action="bus-guess" data-value="lower" type="button"><kbd>L</kbd>LOWER</button>
        </div>
        <p class="rule-note">Start + five cards + checkpoint + final five. Equal ranks miss and reset only the current leg.</p>`}
      ${r?`<button class="primary-button primary-action" data-action="continue-bus" type="button" data-autofocus>${r.finished?"FINISH ROUTE":r.completedLeg?"CHECKPOINT":"NEXT RIDER"} <kbd>E</kbd></button>`:""}
    </div>
  </div>`}function Be(e,n){const t=n.players[e.playerIndex],r=e.finished?"ROUTE CLEARED!":e.completedLeg?"CHECKPOINT!":e.correct?"CORRECT":"BACK TO ZERO";return`<div class="bus-reveal ${e.correct?"success":"miss"}">
    <h2>${r}</h2>
    <p>${e.checkpointCard?`${c(t.name)} reaches the break. The new face-up checkpoint starts the final five.`:e.correct?`${c(t.name)} keeps the streak.`:`${c(t.name)} takes ${O(1,n.partyMode)} ${D(O(1,n.partyMode),n.partyMode)} and restarts this leg.`}</p>
  </div>`}function Ke(e,n){const t=e.leg===1?e.firstLegCards.length:6+e.secondLegCards.length,r=(n==null?void 0:n.routeIndex)??t,a=(n==null?void 0:n.previousRouteIndex)??r,s=21+r*46,o=21+a*46,d=Array.from({length:5},(h,l)=>T(e.firstLegCards[l]??null,l+1,String(l+1),r===l+1)).join(""),p=Array.from({length:5},(h,l)=>T(e.secondLegCards[l]??null,l+7,String(l+1),r===l+7)).join("");return`<div class="bus-route-scroll" aria-label="Twelve-card bus route">
    <div class="bus-route-map">
      <div class="bus-route">
        ${T(e.routeStart,0,"START",r===0,"start")}
        ${d}
        ${T(e.checkpoint,6,"BREAK",r===6,"checkpoint")}
        ${p}
      </div>
      <div class="bus-road" style="--bus-progress: ${s}px; --bus-from: ${o}px">
        <div class="road-stops" aria-hidden="true">${Array.from({length:12},()=>"<i></i>").join("")}</div>
        <div class="route-bus${n?" moving":""}" aria-label="Bus at route card ${r+1}"><span>BUS</span></div>
      </div>
    </div>
  </div>`}function T(e,n,t,r,a="call"){return`<div class="route-card ${a}${r?" active":""}" data-route-index="${n}">
    ${v(e,e!==null)}
    <span>${t}</span>
  </div>`}function We(e){const n=e.players[e.busWinnerIndex??e.busRiders[0].playerIndex],t=e.busRiders.length===1?[e.busRiders[0].playerIndex]:e.busRiders.filter(a=>a.playerIndex!==e.busWinnerIndex).map(a=>a.playerIndex);return`<div class="complete-panel ${z(e)}">
    <p class="phase-step">LAST STOP</p>
    <div class="ticket-icon">✓</div>
    <h2>${e.busRiders.length===1?`${c(n.name)} SURVIVED THE BUS`:`${c(n.name)} GOT OFF FIRST`}</h2>
    <p>${e.busRiders.length===1?"The solo rider completed both five-card legs.":`${t.map(a=>c(e.players[a].name)).join(" and ")} finished last aboard.`}</p>
    <div class="final-scoreboard">${e.players.map(a=>`<div><strong>${c(a.name)}</strong><span class="give">GIVE ${a.give}</span><span class="take">TAKE ${a.take}</span><b>NET ${a.give-a.take>=0?"+":""}${a.give-a.take}</b></div>`).join("")}</div>
    <div class="complete-actions"><button class="secondary-button" data-action="settings" type="button">SETTINGS</button><button class="primary-button primary-action" data-action="replay" type="button" data-autofocus>RIDE AGAIN</button></div>
  </div>`}function Fe(e){if(N)return;N=!0;const n=z(e),t=$e(e,0),r=e.busRiders.length===1?[e.busRiders[0].playerIndex]:e.busRiders.filter(a=>a.playerIndex!==e.busWinnerIndex).map(a=>a.playerIndex);Te({gameId:P,outcome:n,playerName:e.players[0].name,difficulty:null,partyMode:e.partyMode,consequence:t,seed:C,elapsedSeconds:Math.max(0,Math.round((performance.now()-J)/1e3)),metadata:{playerCount:e.players.length,tallies:e.players.map(a=>({name:a.name,give:a.give,take:a.take,net:a.give-a.take})),busRiders:e.busRiders.map(a=>e.players[a.playerIndex].name),busWinner:e.busWinnerIndex===null?null:e.players[e.busWinnerIndex].name,finalLosers:r.map(a=>e.players[a].name),busMisses:e.busRiders.map(a=>({name:e.players[a.playerIndex].name,misses:a.wrongs}))}})}function H(){if(ee(),!(!M||!i)){if(i.phase==="pyramid"){i=X(i),u("action"),L(),w=window.setTimeout(H,1050);return}i.phase==="pyramid_result"&&(i=Q(i,E),L(),i.phase==="pyramid"?w=window.setTimeout(H,420):M=!1)}}function R(){M=!1,ee()}function ee(){w!==null&&window.clearTimeout(w),w=null}function ne(){const e=i!==null;R(),x(),u("confirm"),e&&B(P)}function qe(){R(),u("confirm"),B(P)}function Ve(e){var n;return e.phase==="gauntlet"?e.activePlayerIndex:e.phase==="gauntlet_result"&&((n=e.lastEvent)==null?void 0:n.kind)==="gauntlet"?e.lastEvent.playerIndex:(e.phase==="bus"||e.phase==="bus_result")&&e.busRiders.length?e.busRiders[e.activeRiderIndex].playerIndex:null}function je(e){return e.round===1?"Will your first card be red or black?":e.round===2?`Will card two be higher or lower than your ${e.players[e.activePlayerIndex].hand[0].rank}?`:e.round===3?"Will card three land strictly inside or outside your first two ranks?":"Will card four match a suit already in your first three cards?"}function Ye(e){return e.phase.startsWith("gauntlet")?{kicker:`CALL ${e.round}/4`}:e.phase.startsWith("pyramid")?{kicker:"PYRAMID"}:e.phase.startsWith("sudden")?{kicker:"TIEBREAKER"}:e.phase.startsWith("bus")?{kicker:"FINAL ROUTE"}:{kicker:"COMPLETE"}}function te(e){const n=[Ce];for(const t of Se){if(n.length>=e)break;n.some(r=>r.toLowerCase()===t.toLowerCase())||n.push(t)}return n.slice(0,e)}function Xe(){var t;const e=(t=window.FROKOST_MINIGAME_CONTEXT)==null?void 0:t.seed,n=Number(new URLSearchParams(window.location.search).get("seed"));return Number.isFinite(e)?Number(e)>>>0:Number.isFinite(n)&&n>0?n>>>0:Date.now()>>>0}function Qe(e){return e==="off"||e==="light"||e==="standard"?e:"standard"}function S(e,n,t,r){return`<button type="button" data-action="${e}" data-value="${n}" class="${r?"selected":""}" aria-pressed="${r}">${t}</button>`}function v(e,n,t=""){const r=e&&n?ue(e.suit,e.rank):ce(),a=e&&n?`${e.rank} of ${e.suit}`:"Face-down card";return`<span class="card-slot ${t}"><img class="pixel-art" src="${r}" alt="${a}"></span>`}function O(e,n){return n==="light"?Math.min(2,e):e}function D(e,n){return n==="off"?e===1?"POINT":"POINTS":e===1?"SIP":"SIPS"}function ze(e){return{red:"♥ RED",black:"♠ BLACK",higher:"↑ HIGHER",lower:"↓ LOWER",inside:"↔ INSIDE",outside:"↗ OUTSIDE","have-suit":"✓ HAVE THE SUIT","new-suit":"✦ NEW SUIT"}[e]}function Ze(e){return{hearts:"♥",diamonds:"♦",clubs:"♣",spades:"♠"}[e]}function re(){return'<div class="world-backdrop" aria-hidden="true"><div class="moon"></div><div class="city"></div><div class="road"><i></i></div><div class="pixel-bus">BUS 10</div></div>'}function ae(){window.requestAnimationFrame(()=>{var e,n;(e=b.querySelector(".route-card.active"))==null||e.scrollIntoView({block:"nearest",inline:"center"}),(n=b.querySelector("[data-autofocus]"))==null||n.focus({preventScroll:!0})})}function c(e){const n=document.createElement("span");return n.textContent=e,n.innerHTML}
