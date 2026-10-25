/** Panneau Boucle : modele des phases/agents/budget alimente par le flux SSE /events. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var RATE = 1.08; // EUR -> USD (estimation d'affichage)
  var PHASES = [["research", "Recherche"], ["implementation", "Implémentation"], ["correction", "Correction"], ["design", "Design"]];
  var AXES = [["nouveau", "Idées nouvelles"], ["absent", "Fonctions manquantes"], ["neglige", "Boudées"], ["mal", "Mal conçues"]];
  var ST = { pending: ["○", "en attente"], running: ["●", "en cours"], ok: ["✓", "réussi"], fail: ["✕", "échec"] };
  var cards = {}, phases = {}, order = [], summaries = 0, current = null, started = false, spentUsd = 0;

  PHASES.forEach(function (p) { phases[p[0]] = { label: p[1], state: "pending", cost: null, elapsed: null, t0: 0 }; });
  AXES.forEach(function (a) { add("r:" + a[0], a[1], "research"); });
  PHASES.slice(1).forEach(function (p) { add(p[0], p[1], p[0]); });

  /** Declare une carte d'agent rattachee a une phase. */
  function add(key, label, phase) { cards[key] = { label: label, phase: phase, state: "pending", elapsed: null, t0: 0 }; order.push(key); }
  /** Montant en euros ou dollars, format fr (virgule). */
  function fmt(n, min) { return n.toLocaleString("fr-FR", { minimumFractionDigits: min == null ? 2 : min, maximumFractionDigits: 2 }); }
  function secs(t0) { return t0 ? (Date.now() - t0) / 1000 : 0; }
  function dur(s) { return s == null ? "" : s < 90 ? Math.round(s) + " s" : Math.floor(s / 60) + " min " + Math.round(s % 60) + " s"; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function cap() { return Number($("budgetEur").value) || 0; }

  /** Pose l'etat d'une carte/phase en gardant duree et cout. */
  function setState(o, st, e) {
    if (st === "running" && o.state !== "running") o.t0 = Date.now();
    else if (st !== "running" && o.state === "running") o.elapsed = e.elapsedS != null ? e.elapsedS : secs(o.t0);
    if (e.elapsedS != null && st !== "running") o.elapsed = e.elapsedS;
    if (e.costUsd != null) o.cost = (o.cost || 0) + e.costUsd;
    o.state = st;
  }

  /** Applique un evenement au modele (phases, cartes, budget). */
  function track(e) {
    var st = e.type === "start" ? "running" : e.type === "end" ? (e.ok === false ? "fail" : "ok") : e.type === "error" ? "fail" : null;
    if (e.totalUsd != null) spentUsd = e.totalUsd;
    if (!st) return;
    var ph = phases[e.sector];
    if (e.axis && cards["r:" + e.axis]) setState(cards["r:" + e.axis], st, e);
    else if (!e.axis && cards[e.sector]) setState(cards[e.sector], st, e);
    if (!ph) { if (e.type === "error") PHASES.forEach(function (p) { if (phases[p[0]].state === "running") setState(phases[p[0]], "fail", e); }); return; }
    if (!e.axis) setState(ph, st, e);
    else if (ph.state === "pending") setState(ph, "running", {});
    current = e.sector;
  }

  /** Titre de la phase courante, grand. */
  function drawNow() {
    var p = phases[current]; if (!p) return;
    var i = PHASES.findIndex(function (x) { return x[0] === current; }) + 1;
    $("now").hidden = false;
    $("now").textContent = "Phase " + i + "/4 · " + p.label + " · " + ST[p.state][1];
  }

  /** Etapes numerotees : libelle, etat, duree et cout. */
  function drawSteps() {
    $("phasebar").replaceChildren.apply($("phasebar"), PHASES.map(function (p, i) {
      var o = phases[p[0]], li = el("li", "step " + o.state);
      var live = o.state === "running" ? secs(o.t0) : o.elapsed;
      li.appendChild(el("b", null, (i + 1) + ". " + o.label));
      li.appendChild(el("small", null, ST[o.state][0] + " " + ST[o.state][1] +
        (live ? " · " + dur(live) : "") + (o.cost != null ? " · " + fmt(o.cost) + " $" : "")));
      return li;
    }));
  }

  /** Cartes des agents : libelle, icone, etat texte, duree. */
  function drawAgents() {
    $("agents").replaceChildren.apply($("agents"), order.map(function (k) {
      var o = cards[k], c = el("div", "card " + o.state), b = el("b");
      b.appendChild(el("span", "ico", ST[o.state][0])); b.appendChild(document.createTextNode(" " + o.label));
      var live = o.state === "running" ? secs(o.t0) : o.elapsed;
      c.appendChild(b); c.appendChild(el("div", "meta", ST[o.state][1] + (live ? " · " + dur(live) : "")));
      return c;
    }));
  }

  /** Jauge et montants : depense / plafond, en euros puis en dollars. */
  function drawBudget() {
    var c = cap(), capUsd = c * RATE, spentEur = spentUsd / RATE, pct = capUsd ? Math.min(100, spentUsd / capUsd * 100) : 0;
    $("estimate").textContent = "≈ " + fmt(capUsd) + " $ de plafond";
    $("amounts").textContent = "Dépensé " + fmt(spentEur) + " € sur " + fmt(c, 0) + " € (≈ " + fmt(spentUsd) + " $ sur " + fmt(capUsd) + " $)";
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

  /** Ligne du journal; defilement automatique vers le bas. */
  function logLine(e) {
    var where = [e.sector, e.axis].filter(Boolean).join(" / ");
    var li = el("li", e.type, [e.type, where, e.message, e.costUsd != null && fmt(e.costUsd) + " $",
      e.elapsedS != null && dur(e.elapsedS)].filter(Boolean).join(" · "));
    var log = $("log"); log.appendChild(li); log.scrollTop = log.scrollHeight;
  }

  function running(on) { $("go").disabled = on; $("stop").disabled = !on; if (on) $("feed").open = true; }
  function redraw() { drawNow(); drawSteps(); drawAgents(); drawBudget(); }

  /** Point d'entree : applique un evenement SSE a toute l'interface. */
  function show(e) {
    if (!started) { started = true; var idle = $("idle"); if (idle) idle.remove(); }
    if (e.type === "summary") drawSummary(e); else track(e);
    if (e.type === "error") $("status").textContent = "Erreur : " + (e.message || "");
    if (e.type === "done") { running(false); $("status").textContent = "Terminé : " + (e.message || ""); }
    redraw(); logLine(e);
  }

  $("go").onclick = function () {
    fetch("/go", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetEur: cap() }) })
      .then(function (r) {
        if (r.ok) { $("log").textContent = ""; $("status").textContent = "En cours…"; running(true); return; }
        return r.json().then(function (j) { $("status").textContent = "Refusé : " + (j.error || r.status); });
      });
  };
  $("stop").onclick = function () { fetch("/stop", { method: "POST" }); };
  $("budgetEur").oninput = drawBudget;
  setInterval(function () { if ($("stop").disabled === false) { drawSteps(); drawAgents(); } }, 1000);

  redraw();
  var es = new EventSource("/events");
  es.onmessage = function (m) { var e = JSON.parse(m.data); if (e.type !== "done") running(true); show(e); };
})();
