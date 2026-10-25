/** Panneau Boucle : modele des phases/agents/budget alimente par le flux SSE /events. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var RATE = 1.08; // EUR -> USD (les couts arrivent en dollars, tout s'affiche en euros)
  var PHASES = [["research", "Recherche"], ["design", "Design"], ["implementation", "Implémentation"], ["correction", "Correction"]];
  var AXES = [["nouveau", "Idées nouvelles"], ["absent", "Fonctions manquantes"], ["neglige", "Boudées"], ["mal", "Mal conçues"]];
  var ST = { pending: ["○", "en attente"], running: ["●", "en cours"], ok: ["✓", "réussi"], fail: ["✕", "échec"] };
  var TAGS = { start: "début", end: "fin", info: "info", error: "erreur", summary: "résumé", file: "fichier", done: "terminé" };
  var agents = {}, phases = {}, summaries = 0, current = null, started = false, spentUsd = 0;

  PHASES.forEach(function (p) { phases[p[0]] = { label: p[1], state: "pending", cost: null, elapsed: null, t0: 0 }; });
  AXES.forEach(function (a) { agents[a[0]] = { label: a[1], state: "pending", elapsed: null, t0: 0 }; });

  /** Montant au format fr (virgule), `min` decimales minimum. */
  function fmt(n, min) { return n.toLocaleString("fr-FR", { minimumFractionDigits: min == null ? 2 : min, maximumFractionDigits: 2 }); }
  function secs(t0) { return t0 ? (Date.now() - t0) / 1000 : 0; }
  /** Duree lisible; rien sous 1 s (evite "0 s" au demarrage). */
  function dur(s) { return s == null || s < 1 ? "" : s < 90 ? Math.round(s) + " s" : Math.floor(s / 60) + " min " + Math.round(s % 60) + " s"; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function cap() { return Number($("budgetEur").value) || 0; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function clock(ts) { var d = new Date(ts); return two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()); }
  function live(o) { return o.state === "running" ? secs(o.t0) : o.elapsed; }

  /** Pose l'etat d'une phase/agent en gardant duree et cout. */
  function setState(o, st, e) {
    if (st === "running" && o.state !== "running") o.t0 = Date.now();
    else if (st !== "running" && o.state === "running") o.elapsed = e.elapsedS != null ? e.elapsedS : secs(o.t0);
    if (e.elapsedS != null && st !== "running") o.elapsed = e.elapsedS;
    if (e.costUsd != null) o.cost = (o.cost || 0) + e.costUsd;
    o.state = st;
  }

  /** Applique un evenement au modele (phases, agents, budget). */
  function track(e) {
    var st = e.type === "start" ? "running" : e.type === "end" ? (e.ok === false ? "fail" : "ok") : e.type === "error" ? "fail" : null;
    if (e.totalUsd != null) spentUsd = e.totalUsd;
    if (!st) return;
    var ph = phases[e.sector];
    if (e.axis && agents[e.axis]) setState(agents[e.axis], st, e);
    if (!ph) { if (e.type === "error") PHASES.forEach(function (p) { if (phases[p[0]].state === "running") setState(phases[p[0]], "fail", e); }); return; }
    if (!e.axis) setState(ph, st, e);
    else if (ph.state === "pending") setState(ph, "running", {});
    current = e.sector;
  }

  /** `done` ferme toute phase/agent reste en cours: arret => echec, sinon selon les agents de la phase. */
  function closeAll(stopped) {
    var any = Object.keys(agents).some(function (k) { return agents[k].state === "fail"; });
    PHASES.forEach(function (p) {
      var o = phases[p[0]];
      if (o.state === "running") setState(o, stopped || (p[0] === "research" && any) ? "fail" : "ok", {});
    });
    Object.keys(agents).forEach(function (k) { if (agents[k].state === "running") setState(agents[k], stopped ? "fail" : "ok", {}); });
  }

  /** Ligne de statut finale unique : etat, depense, plafond (en euros). */
  function finalStatus(e) {
    var stopped = /arr/i.test(e.message || "");
    closeAll(stopped);
    var end = stopped ? "Arrêté" : e.complete === true ? "Terminé, toutes les cartes" : e.complete === false ? "Terminé, cartes restantes" : "Terminé";
    $("status").textContent = end + " · " + fmt(spentUsd / RATE) + " € sur " + fmt(cap(), 0) + " €";
  }

  /** Titre de la phase courante, grand. */
  function drawNow() {
    var p = phases[current]; if (!p) return;
    var i = PHASES.findIndex(function (x) { return x[0] === current; }) + 1;
    $("now").hidden = false;
    $("now").textContent = "Phase " + i + "/4 · " + p.label + " · " + ST[p.state][1];
  }

  /** Une ligne d'etat: icone, libelle, etat, duree (+ cout pour une phase). */
  function line(o, tag, cls, label) {
    var n = el(tag, cls + " " + o.state), t = dur(live(o));
    n.appendChild(el("span", "ico", ST[o.state][0]));
    n.appendChild(el(label ? "b" : "span", null, o.label));
    n.appendChild(el("small", null, ST[o.state][1] + (t ? " · " + t : "") + (o.cost != null ? " · " + fmt(o.cost / RATE) + " €" : "")));
    return n;
  }

  /** Frise des phases; les agents de la recherche sont imbriques sous leur phase. */
  function drawSteps() {
    $("phasebar").replaceChildren.apply($("phasebar"), PHASES.map(function (p) {
      var li = line(phases[p[0]], "li", "step", true), head = el("div");
      while (li.firstChild) head.appendChild(li.firstChild);
      li.appendChild(head);
      if (p[0] === "research") {
        var ul = el("ul", "agents");
        AXES.forEach(function (a) { ul.appendChild(line(agents[a[0]], "li", "agent")); });
        li.appendChild(ul);
      }
      return li;
    }));
  }

  /** Jauge et montant unique : depense sur plafond, en euros. */
  function drawBudget() {
    var c = cap(), capUsd = c * RATE, pct = capUsd ? Math.min(100, spentUsd / capUsd * 100) : 0;
    $("amounts").textContent = fmt(spentUsd / RATE) + " € sur " + fmt(c, 0) + " €";
    $("amounts").title = "≈ " + fmt(spentUsd) + " $ sur " + fmt(capUsd) + " $";
    $("gauge").firstChild.style.width = pct + "%";
    $("gauge").setAttribute("aria-valuenow", String(Math.round(pct)));
    $("gauge").classList.toggle("warn", pct > 85);
  }

  /** Dernier resume en grand, precedents dans l'historique. */
  function drawSummary(e) {
    if (summaries++ > 0) {
      var p = el("p", null, ($("phase-label").textContent ? $("phase-label").textContent + " : " : "") + $("latest").textContent);
      $("hist").insertBefore(p, $("hist").firstChild); $("history").hidden = false;
    }
    $("latest").hidden = false; $("latest").textContent = e.message || "";
    var known = PHASES.filter(function (x) { return x[0] === e.phase; })[0];
    $("phase-label").textContent = known ? "Résumé · " + known[1] : e.phase ? "Résumé · " + e.phase : "Résumé";
  }

  /** Ligne du journal: heure, type, lieu et message; defile seulement si on lit deja le bas. */
  function logLine(e) {
    var where = [e.sector, e.axis].filter(Boolean).join(" / ");
    var li = el("li", e.type), log = $("log"), bottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 24;
    li.appendChild(el("time", null, clock(e.ts || Date.now())));
    li.appendChild(el("span", "tag", TAGS[e.type] || e.type));
    li.appendChild(el("span", null, [where, e.message, e.costUsd != null && fmt(e.costUsd / RATE) + " €",
      e.elapsedS != null && dur(e.elapsedS)].filter(Boolean).join(" · ")));
    li.hidden = $("onlyErr").checked && e.type !== "error";
    log.appendChild(li); if (bottom) log.scrollTop = log.scrollHeight;
  }

  /** Bouton unique Go/Stop: le libelle et l'etat suivent l'execution. */
  function running(on) { var b = $("run"); b.textContent = on ? "Stop" : "Go"; b.dataset.state = on ? "running" : "idle"; }
  function alertMsg(msg) { $("alert").hidden = !msg; $("alert").textContent = msg || ""; }
  function redraw() { drawNow(); drawSteps(); drawBudget(); }

  /** Point d'entree : applique un evenement SSE a toute l'interface. */
  function show(e) {
    if (!started) { started = true; var idle = $("idle"); if (idle) idle.remove(); }
    if (e.type === "summary") drawSummary(e); else track(e);
    if (e.type === "error") { alertMsg(e.message || "erreur inconnue"); $("status").textContent = "En cours, avec erreur"; }
    if (e.type === "done") { running(false); finalStatus(e); }
    redraw(); logLine(e);
  }

  $("run").onclick = function () {
    if ($("run").dataset.state === "running") { fetch("/stop", { method: "POST" }); return; }
    alertMsg("");
    fetch("/go", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetEur: cap() }) })
      .then(function (r) {
        if (r.ok) { $("log").textContent = ""; $("status").textContent = "En cours…"; running(true); return; }
        return r.json().then(function (j) { alertMsg("Refusé : " + (j.error || r.status)); });
      });
  };
  $("budgetEur").oninput = drawBudget;
  $("onlyErr").onchange = function () {
    var only = $("onlyErr").checked;
    Array.prototype.forEach.call($("log").children, function (li) { li.hidden = only && !li.classList.contains("error"); });
  };
  setInterval(function () { if ($("run").dataset.state === "running") drawSteps(); }, 1000);

  redraw();
  var es = new EventSource("/events");
  es.onopen = function () { $("conn").hidden = true; };
  es.onerror = function () { $("conn").hidden = false; };
  es.onmessage = function (m) { var e = JSON.parse(m.data); if (e.type !== "done") running(true); show(e); };
})();
