/* Page design : toile libre pilotee. L'iframe execute les scripts du design (isolee: pas same-origin, reseau coupe par la CSP du serveur);
   la page la pilote par postMessage {dk:1} (theme, pause) et recoit ses erreurs. */
(function () {
  var STATES = { "ecrit": "écrit", "mis-a-jour": "mis à jour" };
  var data = { files: [], steps: [] };
  var S = { picked: null, picked2: null, vp: 0, zoom: "fit", theme: "auto", paused: false, compare: false, token: 0 };
  var errors = [];
  try { var saved = JSON.parse(localStorage.getItem("dk-design") || "{}"); S.vp = saved.vp || 0; S.theme = saved.theme || "auto"; } catch (e) { /* stockage indisponible */ }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(ms) { return new Date(ms).toLocaleString("fr-FR"); }
  function byName(n) { return data.files.filter(function (f) { return f.name === n; })[0]; }
  function designs() { return data.files.filter(function (f) { return f.kind !== "recap"; }).sort(function (a, b) { return b.mtimeMs - a.mtimeMs; }); }
  function current() { if (S.picked && byName(S.picked)) return S.picked; var l = designs()[0]; return l ? l.name : null; }
  function second(cur) {
    if (S.picked2 && byName(S.picked2)) return S.picked2;
    var o = designs().filter(function (f) { return f.name !== cur; })[0]; return o ? o.name : cur;
  }
  function post(win, m) { m.dk = 1; try { win.postMessage(m, "*"); } catch (e) { /* cadre ferme */ } }
  function frames() { return Array.prototype.slice.call($("viewer").querySelectorAll("iframe")); }
  function sendAll() { frames().forEach(function (f) { if (f.contentWindow) { post(f.contentWindow, { type: "theme", value: S.theme }); post(f.contentWindow, { type: "pause", value: S.paused }); } }); }

  /** Une etape de la timeline. */
  function stepItem(s) {
    var li = el("li", "step" + (s.type === "error" || (s.type === "end" && s.ok === false) ? " fail" : ""));
    var f = s.type === "file" ? byName(s.message) : null;
    var label = s.type === "start" ? "Début" : s.type === "file" ? "Fichier " + (s.message || "")
      : s.type === "end" ? (s.ok === false ? "Fin : échec" : "Fin : ok") : s.type === "error" ? "Erreur " + (s.message || "") : (s.message || s.type);
    li.appendChild(el("div", "", label));
    if (s.type === "file") { var st = f ? f.state : "ecrit"; li.lastChild.appendChild(el("span", "badge" + (st === "mis-a-jour" ? " upd" : ""), STATES[st] || st)); }
    if (f) li.appendChild(el("div", "when", fmt(f.mtimeMs)));
    if (s.costUsd != null) li.appendChild(el("div", "when", "Coût " + s.costUsd.toFixed(2) + " $"));
    return li;
  }

  /** Remplit une liste deroulante de designs. */
  function fill(sel, cur, pick) {
    sel.textContent = "";
    data.files.slice().sort(function (a, b) { return b.mtimeMs - a.mtimeMs; }).forEach(function (f) {
      var o = el("option", "", fmt(f.mtimeMs) + " — " + f.name + (f.kind === "recap" ? " [récap]" : "")); o.value = f.name; o.selected = f.name === cur; sel.appendChild(o);
    });
    sel.onchange = function () { pick(sel.value); render(); };
  }

  /** Echelle appliquee a une toile de largeur `w` (0 = libre). */
  function scaleFor(w) {
    if (!w) return 1;
    if (S.zoom !== "fit") return Number(S.zoom);
    var avail = $("viewer").clientWidth / (S.compare ? 2 : 1);
    return avail > 0 ? Math.min(1, avail / w) : 1;
  }

  /** Cale la case `i` sur (nom, mtime): l'iframe n'est recreee que si le fichier ou la version a change. */
  function slot(i, name) {
    var v = $("viewer"), f = byName(name), key = name + "|" + (f ? f.mtimeMs : 0) + "|" + S.token;
    var box = v.children[i];
    if (!box || !box.classList.contains("slot")) { box = el("div", "slot"); v.insertBefore(box, v.children[i] || null); }
    var w = S.vp, sc = scaleFor(w);
    box.style.width = w ? Math.round(w * sc) + "px" : "100%";
    if (box.dataset.key !== key) {
      if (i === 0) { errors = []; drawErrors(); }
      box.dataset.key = key; box.textContent = "";
      var fr = document.createElement("iframe");
      fr.setAttribute("sandbox", "allow-scripts"); fr.setAttribute("title", name);
      fr.setAttribute("src", "/designs/" + encodeURIComponent(name) + "?v=" + S.token + "-" + (f ? f.mtimeMs : 0));
      box.appendChild(fr);
    }
    var fr2 = box.firstChild;
    fr2.style.width = w ? w + "px" : "100%";
    fr2.style.height = (100 / sc) + "%"; fr2.style.transform = sc === 1 ? "" : "scale(" + sc + ")";
  }

  /** Redessine timeline, barre, toile(s) et miniatures. */
  function render() {
    var tl = $("timeline"), v = $("viewer"), th = $("thumbs");
    tl.textContent = ""; th.textContent = "";
    data.steps.forEach(function (s) { tl.appendChild(stepItem(s)); });
    var cur = current();
    fill($("history"), cur, function (n) { S.picked = n; });
    $("history2").hidden = !S.compare;
    if (S.compare && cur) fill($("history2"), second(cur), function (n) { S.picked2 = n; });
    ["data-vp", "data-theme-set"].forEach(function (a) {
      Array.prototype.forEach.call(document.querySelectorAll("[" + a + "]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute(a) === String(a === "data-vp" ? S.vp : S.theme)));
      });
    });
    $("compare").setAttribute("aria-pressed", String(S.compare)); $("pause").setAttribute("aria-pressed", String(S.paused));
    if (!cur) { v.textContent = ""; v.appendChild(el("p", "empty", "Aucun design pour l'instant.")); }
    else {
      if (v.firstChild && !v.firstChild.classList.contains("slot")) v.textContent = "";
      slot(0, cur);
      if (S.compare) slot(1, second(cur)); else while (v.children.length > 1) v.removeChild(v.lastChild);
    }
    designs().reverse().forEach(function (f) {
      var b = el("button", "thumb" + (f.name === cur ? " sel" : ""), f.name + (f.state === "mis-a-jour" ? " (mis à jour)" : ""));
      b.type = "button"; b.setAttribute("role", "listitem");
      if (f.name === cur) b.setAttribute("aria-current", "true");
      b.onclick = function () { S.picked = f.name; render(); };
      th.appendChild(b);
    });
  }

  function drawErrors() {
    var ul = $("errors"); ul.textContent = "";
    errors.forEach(function (m) { ul.appendChild(el("li", "", m)); });
    $("err-count").textContent = String(errors.length);
    $("errors-box").classList.toggle("has-err", errors.length > 0);
  }
  function save() { try { localStorage.setItem("dk-design", JSON.stringify({ vp: S.vp, theme: S.theme })); } catch (e) { /* stockage indisponible */ } }

  Array.prototype.forEach.call(document.querySelectorAll("[data-vp]"), function (b) { b.onclick = function () { S.vp = Number(b.getAttribute("data-vp")); save(); render(); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-theme-set]"), function (b) { b.onclick = function () { S.theme = b.getAttribute("data-theme-set"); save(); render(); sendAll(); }; });
  $("zoom").onchange = function () { S.zoom = $("zoom").value; render(); };
  $("pause").onclick = function () { S.paused = !S.paused; render(); sendAll(); };
  $("reload").onclick = function () { S.token++; errors = []; drawErrors(); render(); };
  $("compare").onclick = function () { S.compare = !S.compare; render(); };
  window.addEventListener("resize", function () { if (S.zoom === "fit" && S.vp) render(); });
  window.addEventListener("message", function (e) {
    var m = e.data; if (!m || m.dk !== 1) return;
    var mine = frames().some(function (f) { return f.contentWindow && f.contentWindow === e.source; });
    if (!mine) return;
    if (m.type === "ready") sendAll();
    if (m.type === "error" && errors.length < 50) { errors.push(String(m.message).slice(0, 300)); drawErrors(); }
  });

  /** Relit /designs; rafales regroupees (au plus une lecture toutes les 2 s), pas de lecture onglet cache. */
  var last = 0, timer = null;
  function refresh() {
    last = Date.now();
    return fetch("/designs").then(function (r) { return r.json(); }).then(function (d) { data = { files: d.files || [], steps: d.steps || [] }; render(); }).catch(function () {});
  }
  function soon() { if (timer) return; timer = setTimeout(function () { timer = null; refresh(); }, Math.max(0, 2000 - (Date.now() - last))); }
  refresh();
  setInterval(function () { if (!document.hidden) refresh(); }, 5000);
  try { var es = new EventSource("/events"); es.onmessage = soon; } catch (e) { /* SSE indisponible */ }
})();
