/* Moodboard : cartes par etat, recherche, filtre d'axe, tiroir du rapport en direct (SSE `card`). */
(() => {
  const COLS = { idee: "idee", piste: "idee", "en-cours": "en-cours", bloque: "en-cours", preuves: "preuves", termine: "termine" };
  const LABEL = { idee: "Idées", "en-cours": "En cours", preuves: "Preuves", termine: "Terminées" };
  const AXES = { new: "✚ Nouveau", missing: "∅ Manquant", neglected: "◔ Négligé", poor: "▽ Pauvre" };
  let cards = [], filter = null, query = "", open = null, loop = null;
  const $ = (id) => document.getElementById(id);

  /** Element avec classe et texte (textContent: pas d'injection HTML). */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const shown = (c) => (!filter || c.axis === filter) && (!query || norm(c.title + " " + c.summary).includes(query));

  /** Carte cliquable: axe, etats particuliers (piste, bloque, preuves manquantes), titre, resume. */
  function cardEl(c) {
    const b = el("button", "card s-" + c.state);
    b.type = "button"; b.dataset.id = c.id;
    b.setAttribute("aria-expanded", String(open === c.id));
    const tags = el("div", "tags");
    if (AXES[c.axis]) tags.append(el("span", "tag", AXES[c.axis]));
    if (c.state === "piste") tags.append(el("span", "tag", "piste"));
    if (c.state === "bloque") tags.append(el("span", "tag bad", "bloqué"));
    if (c.state === "preuves" && c.missing && c.missing.length) tags.append(el("span", "tag warn", "manque : " + c.missing.join(", ")));
    if (c.anomalies && c.anomalies.length) tags.append(el("span", "tag warn anom", "⚠ " + c.anomalies[0]));
    b.append(tags, el("h3", null, c.title), el("p", null, c.summary || ""));
    b.addEventListener("click", () => select(c.id));
    return b;
  }

  /** Progression, compteurs, filtres et colonnes. */
  function render() {
    const done = cards.filter((c) => c.state === "termine").length;
    const p = $("progress");
    p.replaceChildren(document.createTextNode(loop === true ? "Boucle terminée · " + done + " / " + cards.length
      : loop === false ? "Boucle non terminée · " + done + " / " + cards.length + " terminées" : done + " / " + cards.length + " terminées"));
    const bar = el("i"), fill = el("b");
    fill.style.width = (cards.length ? Math.round((100 * done) / cards.length) : 0) + "%";
    bar.append(fill); p.append(bar);
    const bad = cards.filter((c) => c.anomalies && c.anomalies.length).length;
    $("counters").replaceChildren(...Object.entries(LABEL).map(([k, t]) => {
      const s = el("span", "count", t + " "); s.append(el("b", null, String(cards.filter((c) => COLS[c.state] === k).length))); return s;
    }), ...(bad ? [Object.assign(el("span", "count tag warn", "Anomalies "), { title: "Incohérences détectées par le réconciliateur" })] : []));
    if (bad) $("counters").lastChild.append(el("b", null, String(bad)));
    $("filters").replaceChildren(...Object.entries(AXES).map(([a, t]) => {
      const b = el("button", "axis-chip", t); b.dataset.axis = a; b.type = "button";
      b.setAttribute("aria-pressed", String(filter === a));
      b.addEventListener("click", () => { filter = filter === a ? null : a; render(); });
      return b;
    }));
    for (const k of Object.keys(LABEL)) {
      const col = $("col-" + k), list = cards.filter((c) => COLS[c.state] === k && shown(c));
      col.replaceChildren(...(list.length ? list.map(cardEl) : [el("div", "empty", "Aucune carte")]));
    }
  }

  /** Remplit une section du tiroir (titre + puces) si elle a du contenu. */
  function section(d, title, items) {
    if (!items.length) return;
    d.append(el("h3", null, title));
    const ul = el("ul"); for (const t of items) ul.append(el("li", null, t)); d.append(ul);
  }

  /** Dessine le rapport de la carte ouverte (null: pas encore de rapport). */
  function drawReport(r) {
    const d = $("drawer"), c = cards.find((x) => x.id === open);
    d.replaceChildren();
    const close = el("button", "close", "Fermer"); close.type = "button"; close.addEventListener("click", () => select(null));
    d.append(close, el("h2", null, c ? c.title : open));
    if (!r) { d.append(el("p", "empty", "Pas encore de rapport : l'agent l'écrit dès qu'il commence cette carte.")); return; }
    d.append(el("p", "live", "Rapport en direct · " + r.state));
    const rp = r.report;
    section(d, "Fait", rp.done); section(d, "Non fait", rp.todo);
    if (r.missing && r.missing.length) { d.append(el("h3", null, "Preuves manquantes")); d.append(el("p", "missing", r.missing.join(", "))); }
    if (rp.tests) section(d, "Tests", [rp.tests]);
    if (rp.screenshots.length) {
      d.append(el("h3", null, "Captures"));
      const g = el("div", "shots");
      for (const s of rp.screenshots) { const i = el("img"); i.src = "/shots/" + s; i.alt = s; i.loading = "lazy"; g.append(i); }
      d.append(g);
    }
    section(d, "Décisions", rp.decisions);
  }

  /** Relit le rapport de la carte ouverte. */
  async function loadReport() {
    if (!open) return;
    const id = open;
    try {
      const r = await fetch("/reports/" + id);
      if (open === id) drawReport(r.ok ? await r.json() : null);
    } catch { if (open === id) drawReport(null); }
  }

  /** Ouvre (ou ferme avec null / second clic) le tiroir de la carte. */
  function select(id) {
    open = open === id ? null : id;
    $("drawer").hidden = !open;
    if (open) { drawReport(null); loadReport(); }
    render();
  }

  /** Message d'echec avec bouton Reessayer (un seul, retire au prochain succes). */
  function showError() {
    if ($("loaderr")) return;
    const box = el("div", "loaderr", "Impossible de charger les cartes. ");
    box.id = "loaderr"; box.setAttribute("role", "alert");
    const b = el("button", null, "Réessayer"); b.type = "button"; b.addEventListener("click", load);
    box.append(b); $("board").before(box);
  }

  /** Recharge les cartes (get /moodboard), au plus une fois toutes les 3 s en rafale; en cas d'echec garde l'etat et propose de reessayer. */
  let last = 0, timer = null;
  async function load() {
    last = Date.now();
    try {
      const r = await fetch("/moodboard");
      if (!r.ok) throw new Error(String(r.status));
      cards = await r.json(); const e = $("loaderr"); if (e) e.remove(); render();
    } catch { showError(); }
  }
  function soon() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; load(); }, Math.max(0, 3000 - (Date.now() - last)));
  }

  $("q").addEventListener("input", (e) => { query = norm(e.target.value); render(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) select(open); });
  load();
  setInterval(() => { if (!document.hidden) load(); }, 15000);
  try {
    const es = new EventSource("/events");
    es.addEventListener("message", (e) => {
      let m = {}; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "card" && m.cardId === open) loadReport();
      if (m.type === "card" || m.type === "end" || m.type === "summary") soon();
      if (m.type === "done") { loop = m.complete === true ? true : m.complete === false ? false : null; render(); load(); }
      if (m.type === "start" && loop !== null) { loop = null; render(); }
    });
  } catch { /* SSE indisponible: le rafraichissement periodique suffit */ }
})();
