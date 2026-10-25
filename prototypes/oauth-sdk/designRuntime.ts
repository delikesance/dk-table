/**
 * Runtime injecte dans chaque design servi : la toile reste libre (scripts, animations), la page
 * parente la pilote par `postMessage` ({dk:1, type}) sans que le design ait a s'en occuper.
 *
 * Messages recus : `theme` (value: light|dark|auto -> `data-theme` + `color-scheme` sur <html>),
 *   `pause` (value: bool -> fige/relance animations et transitions).
 * Messages envoyes : `ready`, `error` (erreurs, promesses rejetees, console.error/warn).
 * Aucun acces reseau. Usage : `injectRuntime(html)` (idempotent).
 */

/** Code du runtime (sans balise). */
export const RUNTIME_JS = `(function(){
var D=document,R=D.documentElement;
function post(m){m.dk=1;try{parent.postMessage(m,"*")}catch(e){}}
addEventListener("error",function(e){post({type:"error",message:e.message+" ("+(e.lineno||0)+":"+(e.colno||0)+")"})});
addEventListener("unhandledrejection",function(e){post({type:"error",message:"promesse rejetee : "+(e.reason&&e.reason.message||e.reason)})});
["error","warn"].forEach(function(k){var o=console[k];console[k]=function(){post({type:"error",message:[].join.call(arguments," ")});return o.apply(console,arguments)}});
function anims(f){if(D.getAnimations)D.getAnimations().forEach(f)}
addEventListener("message",function(e){var m=e.data;if(!m||m.dk!==1)return;
if(m.type==="theme"){if(m.value==="auto"){R.removeAttribute("data-theme");R.style.colorScheme=""}else{R.setAttribute("data-theme",m.value);R.style.colorScheme=m.value}}
if(m.type==="pause"){var s=D.getElementById("dk-pause");
if(m.value){if(!s){s=D.createElement("style");s.id="dk-pause";D.head.appendChild(s)}s.textContent="*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";anims(function(a){a.pause()})}
else{if(s)s.remove();anims(function(a){a.play()})}}});
post({type:"ready"});
})();`;

const TAG = `<script data-dk-runtime>${RUNTIME_JS}</script>`;

/** Ajoute le runtime avant `</body>` (sinon en fin de document); sans effet s'il est deja present. */
export function injectRuntime(html: string): string {
  if (html.includes("data-dk-runtime")) return html;
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i < 0 ? html + TAG : html.slice(0, i) + TAG + html.slice(i);
}
