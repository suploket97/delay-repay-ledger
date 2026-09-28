/* Delay Repay Ledger — app UI */
(function () {
  "use strict";
  const D = window.DRL_DATA;
  const C = window.DRL_CALC;
  const { OPS, OPMAP, TICKETS, TMAP, STATIONS, CRS, SCHEMES, BAND_EDGES } = D;
  const { estimate, pctFor, bandLabel, addDays, money: gbp } = C;

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const F = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const crsOf = name => CRS[(name || "").trim().toLowerCase()] || (name || "").trim().slice(0, 3).toUpperCase() || "—";
  const uid = () => "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const daysUntil = d => Math.round((d - today()) / 86400000);

  /* ---------- storage (this browser only) ---------- */
  const LS_KEY = "drl-journeys-v1";
  let journeys = [];
  let storageOk = true;

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      journeys = Array.isArray(arr) ? arr.filter(j => j && typeof j === "object" && j.id) : [];
    } catch { storageOk = false; journeys = []; }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(journeys)); storageOk = true; }
    catch { storageOk = false; }
    setSaveState();
    return storageOk;
  }
  function setSaveState() {
    const el = F("saveState");
    el.classList.toggle("warn", !storageOk);
    F("saveText").textContent = storageOk ? "Saved on this device" : "Not saved: browser storage is blocked";
  }
  // Keep several open tabs in step.
  window.addEventListener("storage", e => { if (e.key === LS_KEY) { load(); renderAll(); } });

  // Ask the browser not to clear our data under storage pressure.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ---------- examples ---------- */
  function samples() {
    const t = today(), d = n => iso(addDays(t, -n));
    return [
      { id: "s1", sample: true, date: d(3), origin: "London King's Cross", dest: "York", via: "Peterborough, Doncaster", routeCode: "Booked train only (Advance)", service: "17:30 LNER to Edinburgh", operator: "lner", retailer: "Train company website/app", cls: "std", ticketType: "advs", price: 54.10, leg: "out", seatfrog: true, sfPrice: 22, sfUsed: "yes", outcome: "late", sched: "19:22", actual: "20:05", delay: 43, status: "todo", notes: "Signalling fault near Stevenage." },
      { id: "s2", sample: true, date: d(9), origin: "Manchester Piccadilly", dest: "London Euston", via: "Stoke-on-Trent", routeCode: "Any Permitted", service: "07:35 Avanti", operator: "avanti", retailer: "Trainline", cls: "first", ticketType: "anyr", price: 318.20, leg: "out", outcome: "late", sched: "09:42", actual: "10:01", delay: 19, status: "submitted", ref: "AWC-88214" },
      { id: "s3", sample: true, date: d(21), origin: "Reading", dest: "London Paddington", routeCode: "Any Permitted", operator: "gwr", retailer: "Train company website/app", cls: "std", ticketType: "sm", price: 492.00, outcome: "late", sched: "08:21", actual: "09:34", delay: 73, status: "paid", paid: 12.30, paidAs: "Bank transfer / card", ref: "GWR-4471" },
      { id: "s4", sample: true, date: d(26), origin: "Leeds", dest: "Manchester Piccadilly", via: "Huddersfield", routeCode: "Any Permitted", operator: "tpe", retailer: "Station ticket office / machine", cls: "std", ticketType: "offr", price: 18.60, leg: "ret", outcome: "late", sched: "18:10", actual: "18:34", delay: 24, status: "rejected", notes: "Rejected: they said the ticket photo was unreadable. Appeal?" },
      { id: "s5", sample: true, date: d(34), origin: "Birmingham New Street", dest: "Bristol Temple Meads", via: "Cheltenham Spa", routeCode: "Any Permitted", operator: "xc", retailer: "Trainline", cls: "std", ticketType: "offs", price: 31.40, outcome: "late", sched: "14:28", actual: "14:50", delay: 22, status: "na" }
    ];
  }
  const data = () => journeys.length ? journeys : samples();
  const isSample = () => !journeys.length;

  /* ---------- status ---------- */
  const STATUS = { todo: "To claim", submitted: "Submitted", paid: "Paid", rejected: "Rejected", na: "Not eligible" };
  function effStatus(j, r) {
    if (j.status === "todo" && r.kind === "refund") return ["refund", "Refund due"];
    if (j.status === "todo" && !r.eligible && r.t.kind !== "manual") return ["na", "Below threshold"];
    const s = STATUS[j.status] ? j.status : "todo";
    return [s, STATUS[s]];
  }

  /* ---------- where to claim ---------- */
  function channelHtml(j, r) {
    const op = r.op, items = [];
    const sfLink = `<a href="${D.SEATFROG_HELP}" target="_blank" rel="noopener">Seatfrog's help centre</a>`;
    if (r.kind === "refund") {
      items.push(`Ask <b>${esc(j.retailer || "the retailer")}</b> for a refund of the unused ticket.`);
      if (j.seatfrog && j.cls !== "first") items.push(`Request the unused upgrade refund through ${sfLink}.`);
    } else {
      items.push(`Claim from <b>${esc(op.name)}</b>: <a href="${op.url}" target="_blank" rel="noopener">Delay Repay page</a>.`);
      if (op.note) items.push(esc(op.note));
      if (j.retailer === "Trainline") items.push("Bought on Trainline: the claim still goes to the train company, not Trainline.");
      if (j.seatfrog && j.cls !== "first" && j.sfUsed !== "no") items.push("Attach your Seatfrog upgrade confirmation alongside the Standard ticket. The £3 platform fee isn't refundable.");
      if (j.seatfrog && j.cls !== "first" && j.sfUsed === "no") items.push(`Upgrade unused: ask for a refund through ${sfLink}.`);
      if (j.cls === "first" && j.declassified) items.push("First Class wasn't available: ask the operator separately for the difference between the First and Standard fares.");
      if (j.routeCode === "Booked train only (Advance)") items.push("Advance ticket: name the booked train in the claim, even if you caught a later one.");
      if (r.deadline) items.push(`Claim by <b>${r.deadline.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</b> (28 days after travel).`);
    }
    return `<div class="channel"><h3>Where to claim</h3><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
  }

  /* ---------- KPIs ---------- */
  function kpiHtml(list) {
    let owed = 0, paid = 0, open = 0, mins = 0, soon = null, decided = 0, won = 0;
    for (const j of list) {
      const r = estimate(j);
      if (j.outcome !== "notravel") mins += Number(j.delay) || 0;
      if ((j.status === "todo" || j.status === "submitted") && r.total > 0) { owed += r.total; open++; }
      if (j.status === "todo" && r.eligible && r.deadline && r.kind !== "refund" && daysUntil(r.deadline) >= 0) {
        if (!soon || r.deadline < soon) soon = r.deadline;
      }
      if (j.status === "paid") { paid += Number(j.paid) || 0; won++; decided++; }
      if (j.status === "rejected") decided++;
    }
    const left = soon ? daysUntil(soon) : null;
    const pl = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
    return `
      <div class="kpi hl"><div class="lab">Still owed (est.)</div><div class="val num">${gbp(owed)}</div><div class="sub">${pl(open, "open claim")}</div></div>
      <div class="kpi"><div class="lab">Paid to date</div><div class="val num">${gbp(paid)}</div><div class="sub">${pl(won, "claim")} paid</div></div>
      <div class="kpi"><div class="lab">Success rate</div><div class="val num">${decided ? Math.round(won / decided * 100) + "%" : "—"}</div><div class="sub">of ${pl(decided, "decided claim")}</div></div>
      <div class="kpi"><div class="lab">Next deadline</div><div class="val num">${left == null ? "—" : left === 0 ? "Today" : pl(left, "day")}</div><div class="sub">${soon ? "Claim by " + soon.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Nothing waiting"} · ${Math.round(mins / 6) / 10} h lost</div></div>`;
  }

  /* ---------- journeys ---------- */
  function ticketHtml(j) {
    const r = estimate(j);
    const [sk, sl] = effStatus(j, r);
    const t = TMAP[j.ticketType] || {};
    let due = "";
    if (j.status === "todo" && r.eligible && r.kind !== "refund" && r.deadline) {
      const dl = daysUntil(r.deadline);
      due = `<span class="due ${dl <= 7 ? "soon" : ""}">${dl < 0 ? "Deadline passed" : dl === 0 ? "Last day to claim" : dl + " days left"}</span>`;
    }
    const amt = j.status === "paid"
      ? `<div class="t-amt paid num"><small>Paid</small>${gbp(j.paid)}</div>`
      : `<div class="t-amt num"><small>${r.kind === "refund" ? "Refund" : "Estimate"}</small>${gbp(r.total)}</div>`;
    const sf = j.seatfrog && j.cls !== "first";
    return `<button type="button" class="ticket" data-id="${esc(j.id)}" aria-label="Edit ${esc(j.origin)} to ${esc(j.dest)}, ${esc(fmtDate(j.date))}">
      <div class="t-main">
        <div class="t-route">
          <span class="t-crs">${esc(crsOf(j.origin))}</span><span class="t-arrow">→</span><span class="t-crs">${esc(crsOf(j.dest))}</span>
          <span class="class-stamp ${j.cls === "first" ? "first" : "std"}">${j.cls === "first" ? "1ST" : "STD"}</span>
          ${sf ? '<span class="class-stamp sf">SEATFROG 1ST</span>' : ""}
          ${j.sample ? '<span class="sample-tag">Example</span>' : ""}
          <span class="t-names">${esc(j.origin)} to ${esc(j.dest)}${j.via ? ` · via ${esc(j.via)}` : ""}</span>
        </div>
        <div class="t-meta">
          <span><b>${esc(fmtDate(j.date))}</b></span>
          <span>${esc(r.op.name)}</span>
          <span>${esc(t.name || "")}${t.kind === "return" ? ` · ${j.leg === "ret" ? "return leg" : "outward leg"}` : ""}</span>
          <span>${gbp(j.price)}</span>
          <span>Route: ${esc(j.routeCode || "—")}</span>
          <span><b>${j.outcome === "notravel" ? "Didn't travel" : (Number(j.delay) || 0) + " min late"}</b></span>
        </div>
      </div>
      <div class="t-side">
        ${amt}
        <div class="t-status"><span class="chip ${sk}">${esc(sl)}</span>${due}</div>
      </div>
    </button>`;
  }

  function renderLog() {
    const list = data();
    F("kpis").innerHTML = kpiHtml(list);
    F("sampleBanner").hidden = !isSample();
    const q = F("q").value.trim().toLowerCase(), fo = F("fOp").value, fs = F("fStatus").value;
    const shown = list.filter(j => {
      if (fo && j.operator !== fo) return false;
      if (fs) {
        const [k] = effStatus(j, estimate(j));
        if (fs === "na" ? k !== "na" : (j.status !== fs || k === "na")) return false;
      }
      if (q) {
        const hay = [j.origin, j.dest, j.via, (OPMAP[j.operator] || {}).name, j.ref, j.notes, j.service, crsOf(j.origin), crsOf(j.dest)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    F("tickets").innerHTML = shown.length ? shown.map(ticketHtml).join("") : `<div class="empty">No journeys match. Try clearing the search or filters.</div>`;
  }

  /* ---------- stats ---------- */
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }

  function renderStats() {
    const list = data();
    const by = {};
    const bands = { "15–29": 0, "30–59": 0, "60–119": 0, "120+": 0 };
    for (const j of list) {
      const r = estimate(j);
      const o = by[r.op.id] || (by[r.op.id] = { op: r.op, n: 0, delayed: 0, mins: 0, est: 0, paid: 0, sub: 0, won: 0, lost: 0 });
      o.n++;
      const dl = Number(j.delay) || 0;
      if (j.outcome !== "notravel" && dl >= 15) { o.delayed++; o.mins += dl; bands[bandLabel(dl)]++; }
      if (j.status !== "na") o.est += r.total;
      if (["submitted", "paid", "rejected"].includes(j.status)) o.sub++;
      if (j.status === "paid") { o.won++; o.paid += Number(j.paid) || 0; }
      if (j.status === "rejected") o.lost++;
    }
    F("kpis2").innerHTML = kpiHtml(list);
    const rows = Object.values(by).sort((a, b) => b.est - a.est);

    // Money by operator: horizontal paired bars. Narrower viewBox on phones keeps labels readable.
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const W = narrow ? 360 : 560, rowH = 46, padL = narrow ? 112 : 150, padR = 66, H = Math.max(rowH * rows.length + 30, 80);
    const max = Math.max(1, ...rows.map(r => Math.max(r.est, r.paid)));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const x = v => padL + (W - padL - padR) * v / top;
    const maxName = narrow ? 14 : 20;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated and paid compensation by operator">`;
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += `<line x1="${x(v)}" x2="${x(v)}" y1="4" y2="${H - 22}" stroke="var(--line)" stroke-width="1"/>`;
      svg += `<text x="${x(v)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="IBM Plex Mono, monospace">£${+v.toFixed(2)}</text>`;
    }
    rows.forEach((r, i) => {
      const y = 8 + i * rowH;
      const nm = r.op.name.length > maxName ? r.op.name.slice(0, maxName - 1) + "…" : r.op.name;
      svg += `<text x="${padL - 10}" y="${y + 20}" text-anchor="end" font-size="12" fill="var(--ink-2)"><title>${esc(r.op.name)}</title>${esc(nm)}</text>`;
      svg += `<rect x="${padL}" y="${y + 4}" width="${Math.max(0, x(r.est) - padL)}" height="13" rx="2" fill="var(--line-strong)"/>`;
      svg += `<rect x="${padL}" y="${y + 20}" width="${Math.max(0, x(r.paid) - padL)}" height="13" rx="2" fill="var(--good)"/>`;
      svg += `<text x="${x(r.est) + 6}" y="${y + 15}" font-size="11" fill="var(--ink-2)" font-family="IBM Plex Mono, monospace">${gbp(r.est)}</text>`;
      svg += `<text x="${x(r.paid) + 6}" y="${y + 31}" font-size="11" fill="var(--good)" font-family="IBM Plex Mono, monospace">${gbp(r.paid)}</text>`;
    });
    svg += `</svg>`;
    F("moneyChart").innerHTML = rows.length ? svg : `<div class="empty">No journeys yet.</div>`;

    // Delay bands: vertical bars
    const bk = Object.keys(bands), bmax = Math.max(1, ...Object.values(bands));
    const BW = 360, BH = 200, bw = 56, gap = (BW - 40 - bw * 4) / 3;
    let b = `<svg viewBox="0 0 ${BW} ${BH}" role="img" aria-label="Delayed journeys by band">`;
    b += `<line x1="20" x2="${BW - 20}" y1="${BH - 30}" y2="${BH - 30}" stroke="var(--line-strong)"/>`;
    bk.forEach((k, i) => {
      const h = (BH - 70) * bands[k] / bmax, bx = 20 + i * (bw + gap), by2 = BH - 30 - h;
      b += `<rect x="${bx}" y="${by2}" width="${bw}" height="${h}" rx="3" fill="${i >= 2 ? "var(--accent)" : "var(--network)"}" opacity="${0.55 + i * 0.15}"/>`;
      b += `<text x="${bx + bw / 2}" y="${by2 - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${bands[k]}</text>`;
      b += `<text x="${bx + bw / 2}" y="${BH - 12}" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="IBM Plex Mono, monospace">${k} min</text>`;
    });
    F("bandChart").innerHTML = b + `</svg>`;

    F("opTable").innerHTML = `<thead><tr><th>Operator</th><th class="n">Journeys</th><th class="n">Delayed 15+</th><th class="n">Avg delay</th><th class="n">Claims</th><th>Success</th><th class="n">Estimated</th><th class="n">Paid</th></tr></thead><tbody>` +
      (rows.map(r => {
        const dec = r.won + r.lost, rate = dec ? r.won / dec : null;
        return `<tr><td><b>${esc(r.op.name)}</b><div class="note">${SCHEMES[r.op.s].label}</div></td>
          <td class="n" data-label="Journeys">${r.n}</td>
          <td class="n" data-label="Delayed 15+">${r.delayed} <span class="note">(${Math.round(r.delayed / r.n * 100)}%)</span></td>
          <td class="n" data-label="Avg delay">${r.delayed ? Math.round(r.mins / r.delayed) + " min" : "—"}</td>
          <td class="n" data-label="Claims">${r.sub}</td>
          <td data-label="Success">${rate == null ? '<span class="note">No decisions yet</span>' : `<div class="rate"><div class="meter"><i style="width:${rate * 100}%"></i></div><span class="num">${Math.round(rate * 100)}%</span></div>`}</td>
          <td class="n" data-label="Estimated">${gbp(r.est)}</td>
          <td class="n" data-label="Paid">${gbp(r.paid)}</td></tr>`;
      }).join("") || `<tr><td colspan="8" class="note">No journeys yet.</td></tr>`) + `</tbody>`;
  }

  /* ---------- rules ---------- */
  function renderRules() {
    const pct = arr => arr.map(([m, v]) => `${m}+ min: ${+(v * 100).toFixed(1)}%`).join("<br>");
    F("rulesTable").innerHTML = `<thead><tr><th>Operator</th><th>Scheme</th><th>Single fare</th><th>Return fare (one leg)</th><th>Claim at</th></tr></thead><tbody>` +
      OPS.filter(o => o.id !== "other").map(o => {
        const s = SCHEMES[o.s];
        return `<tr><td><b>${esc(o.name)}</b>${o.note ? `<div class="note">${esc(o.note)}</div>` : ""}</td>
          <td class="scheme" data-label="Scheme">${s.label}</td>
          <td class="scheme" data-label="Single fare">${pct(s.single)}</td>
          <td class="scheme" data-label="Return fare">${pct(s.ret)}</td>
          <td data-label="Claim at"><a href="${o.url}" target="_blank" rel="noopener">Delay Repay page ↗</a></td></tr>`;
      }).join("") + `</tbody>`;
  }

  /* ---------- form ---------- */
  let editingId = null;

  function fillSelects() {
    const opOpts = OPS.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join("");
    F("operator").innerHTML = opOpts;
    F("fOp").innerHTML = `<option value="">All operators</option>` + opOpts;
    F("ticketType").innerHTML = TICKETS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    F("stations").innerHTML = STATIONS.map(([n, c]) => `<option value="${esc(n)}">${c}</option>`).join("");
  }

  function readForm() {
    const num = id => { const v = parseFloat(F(id).value); return isFinite(v) && v >= 0 ? v : 0; };
    return {
      origin: F("origin").value.trim(), dest: F("dest").value.trim(), date: F("date").value, operator: F("operator").value,
      routeCode: F("routeCode").value, via: F("via").value.trim(), service: F("service").value.trim(), retailer: F("retailer").value,
      cls: document.querySelector('input[name="cls"]:checked').value, ticketType: F("ticketType").value,
      price: num("price"), leg: F("leg").value, declassified: F("declassified").checked,
      seatfrog: F("seatfrog").checked, sfPrice: num("sfPrice"), sfUsed: F("sfUsed").value,
      outcome: F("outcome").value, sched: F("sched").value, actual: F("actual").value, delay: Math.round(num("delay")),
      status: F("status").value, ref: F("ref").value.trim(), paid: num("paid"), paidAs: F("paidAs").value, notes: F("notes").value.trim()
    };
  }

  function writeForm(j) {
    const set = (id, v) => { F(id).value = v ?? ""; };
    set("origin", j.origin); set("dest", j.dest); set("date", j.date || iso(today())); set("operator", j.operator || "avanti");
    set("routeCode", j.routeCode || "Any Permitted"); set("via", j.via); set("service", j.service); set("retailer", j.retailer || "Train company website/app");
    (j.cls === "first" ? F("clsFirst") : F("clsStd")).checked = true;
    set("ticketType", j.ticketType || "advs"); set("price", j.price || ""); set("leg", j.leg || "out");
    F("declassified").checked = !!j.declassified; F("seatfrog").checked = !!j.seatfrog;
    set("sfPrice", j.sfPrice || ""); set("sfUsed", j.sfUsed || "yes"); set("outcome", j.outcome || "late");
    set("sched", j.sched); set("actual", j.actual); set("delay", j.delay || ""); set("status", j.status || "todo");
    set("ref", j.ref); set("paid", j.paid || ""); set("paidAs", j.paidAs || ""); set("notes", j.notes);
    syncForm();
  }

  function syncForm() {
    const j = readForm();
    const t = TMAP[j.ticketType] || {};
    F("legWrap").hidden = t.kind !== "return";
    F("declassWrap").hidden = j.cls !== "first";
    F("sfBox").hidden = j.cls === "first";
    F("sfFields").hidden = !j.seatfrog || j.cls === "first";
    F("priceHint").textContent = t.kind === "season" ? `Full season ticket price. One journey counts as 1/${t.div} of it.`
      : t.kind === "return" ? "Price of the whole return ticket." : "Price after any railcard discount.";
    const late = j.outcome === "late";
    ["sched", "actual", "delay"].forEach(id => { F(id).disabled = !late; });
    renderEstimate(j);
  }

  function renderEstimate(j) {
    const r = estimate(j);
    F("estScheme").textContent = r.kind === "refund" ? "Refund" : r.sc.label;
    const table = r.t.kind === "return" ? r.sc.ret : r.sc.single;
    const bandsHtml = r.kind === "refund" ? "" : `<div class="bands">${BAND_EDGES.map((e, i) => {
      const p = pctFor(table, e) * (r.t.kind === "season" && e >= 120 ? 2 : 1);
      const next = BAND_EDGES[i + 1] ?? Infinity, on = r.delay >= e && r.delay < next && p > 0;
      return `<div class="band ${on ? "on" : ""} ${p === 0 ? "off" : ""}"><b>${p ? +(p * 100).toFixed(1) + "%" : "—"}</b>${e}${i === 3 ? "+" : "–" + (next - 1)}</div>`;
    }).join("")}</div>`;
    const pctNote = r.t.kind === "season" ? "of one journey's value" : r.t.kind === "return" ? "of the return fare" : "of the single fare";
    const sub = r.kind === "refund" ? "refund due" : r.eligible ? `${bandLabel(r.delay)} minute band · ${+(r.pct * 100).toFixed(1)}% ${pctNote}` : "no Delay Repay due yet";
    F("estBody").innerHTML = `
      <div><div class="est-total num">${gbp(r.total)}</div><p class="note">${sub}</p></div>
      ${bandsHtml}
      ${r.reason ? `<p class="note">${esc(r.reason)}</p>` : ""}
      ${r.lines.length ? `<div class="rows">${r.lines.map(([a, b]) => `<div><span>${esc(a)}</span><span>${b}</span></div>`).join("")}</div>` : ""}
      ${channelHtml(j, r)}`;
    F("estMini").innerHTML = `<b class="num">${gbp(r.total)}</b><span>${r.kind === "refund" ? "Refund due" : r.eligible ? esc(r.op.name) + " · " + bandLabel(r.delay) + " min" : "Below threshold"}</span>`;
  }

  function autoDelay() {
    const s = F("sched").value, a = F("actual").value;
    if (!s || !a) return;
    const m = t => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
    let d = m(a) - m(s);
    if (d < -720) d += 1440; // arrived after midnight
    F("delay").value = Math.max(0, d);
  }

  function openEditor(j) {
    editingId = j && !j.sample ? j.id : null;
    writeForm(j ? { ...j } : { date: iso(today()), status: "todo" });
    F("saveBtn").textContent = editingId ? "Save changes" : (j && j.sample ? "Save as my journey" : "Save journey");
    F("delWrap").hidden = !editingId;
    F("delConfirm").hidden = true;
    showTab("add");
    window.scrollTo({ top: 0 });
  }

  /* ---------- tabs & routing ---------- */
  const HASH = { log: "#journeys", add: "#log-journey", stats: "#stats", rules: "#rules" };
  const FROM_HASH = Object.fromEntries(Object.entries(HASH).map(([k, v]) => [v, k]));

  function showTab(name, fromHash) {
    document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    ["log", "add", "stats", "rules"].forEach(n => { F("view-" + n).hidden = n !== name; });
    if (name === "stats") renderStats();
    if (name === "log") renderLog();
    if (!fromHash && location.hash !== HASH[name]) history.pushState(null, "", HASH[name]);
  }
  window.addEventListener("popstate", () => {
    const t = FROM_HASH[location.hash] || "log";
    if (t === "add" && F("view-add").hidden) { openEditor(null); history.replaceState(null, "", HASH.add); return; }
    showTab(t, true);
  });

  function renderAll() {
    renderLog();
    if (!F("view-stats").hidden) renderStats();
  }

  let toastT;
  function toast(msg) {
    const t = F("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 2800);
  }

  /* ---------- theme ---------- */
  const THEMES = ["auto", "light", "dark"];
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    F("themeLabel").textContent = t[0].toUpperCase() + t.slice(1);
    F("themeBtn").setAttribute("aria-label", `Theme: ${t}. Change theme`);
    try { if (t === "auto") localStorage.removeItem("drl-theme"); else localStorage.setItem("drl-theme", t); } catch {}
  }
  let theme = "auto";
  try { theme = localStorage.getItem("drl-theme") || "auto"; } catch {}

  /* ---------- backup ---------- */
  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportJson() {
    if (!journeys.length) { toast("Nothing to back up yet."); return; }
    const payload = { app: "delay-repay-ledger", version: 1, exportedAt: new Date().toISOString(), journeys };
    download(`delay-repay-ledger-${iso(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Backup downloaded");
  }
  function exportCsv() {
    if (!journeys.length) { toast("Nothing to export yet."); return; }
    const cols = ["date", "origin", "dest", "via", "routeCode", "service", "operator", "retailer", "cls", "ticketType", "price", "leg", "seatfrog", "sfPrice", "outcome", "sched", "actual", "delay", "estimate", "status", "ref", "paid", "paidAs", "notes"];
    const cell = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const rows = journeys.map(j => {
      const r = estimate(j);
      return cols.map(c => cell(
        c === "estimate" ? r.total.toFixed(2) :
        c === "operator" ? (OPMAP[j.operator] || {}).name :
        c === "ticketType" ? (TMAP[j.ticketType] || {}).name :
        c === "cls" ? (j.cls === "first" ? "First" : "Standard") : j[c]
      )).join(",");
    });
    download(`delay-repay-ledger-${iso(new Date())}.csv`, "﻿" + [cols.join(","), ...rows].join("\r\n"), "text/csv");
    toast("CSV downloaded");
  }
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const list = Array.isArray(parsed) ? parsed : parsed && parsed.journeys;
        if (!Array.isArray(list)) throw new Error("shape");
        const valid = list.filter(j => j && typeof j === "object" && typeof j.id === "string" && !j.sample);
        if (!valid.length) { toast("That file has no journeys in it."); return; }
        const byId = new Map(journeys.map(j => [j.id, j]));
        let added = 0, updated = 0;
        for (const j of valid) { if (byId.has(j.id)) updated++; else added++; byId.set(j.id, j); }
        journeys = [...byId.values()];
        save(); renderAll();
        toast(`Restored: ${added} added, ${updated} updated`);
        F("dataDialog").close();
      } catch { toast("That file isn't a Delay Repay Ledger backup."); }
    };
    reader.onerror = () => toast("Couldn't read that file.");
    reader.readAsText(file);
  }

  /* ---------- events ---------- */
  fillSelects();
  renderRules();
  load();
  setSaveState();
  applyTheme(THEMES.includes(theme) ? theme : "auto");

  document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.tab === "add") openEditor(null); else showTab(b.dataset.tab);
  }));
  document.addEventListener("click", e => {
    if (e.target.closest("[data-go]")) { openEditor(null); return; }
    const t = e.target.closest(".ticket");
    if (t) { const j = data().find(x => x.id === t.dataset.id); if (j) openEditor(j); }
  });
  ["q", "fOp", "fStatus"].forEach(id => F(id).addEventListener("input", renderLog));
  F("form").addEventListener("input", e => { if (e.target.id === "sched" || e.target.id === "actual") autoDelay(); syncForm(); });
  F("form").addEventListener("change", syncForm);
  F("cancelBtn").addEventListener("click", () => showTab("log"));
  F("delBtn").addEventListener("click", () => { F("delConfirm").hidden = false; F("delConfirm").focus(); });
  F("delConfirm").addEventListener("click", () => {
    journeys = journeys.filter(j => j.id !== editingId);
    save();
    toast("Journey deleted");
    showTab("log");
  });
  F("form").addEventListener("submit", e => {
    e.preventDefault();
    const j = readForm();
    if (!j.origin || !j.dest || !j.date) {
      toast("Add the origin, destination and date first.");
      (!j.origin ? F("origin") : !j.dest ? F("dest") : F("date")).focus();
      return;
    }
    if (j.cls === "first") j.seatfrog = false;
    j.id = editingId || uid();
    j.updatedAt = new Date().toISOString();
    const idx = journeys.findIndex(x => x.id === j.id);
    if (idx >= 0) journeys[idx] = { ...journeys[idx], ...j }; else { j.createdAt = j.updatedAt; journeys.push(j); }
    toast(save() ? "Journey saved" : "Saved for this visit only: browser storage is blocked");
    showTab("log");
  });

  F("themeBtn").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(theme);
  });
  F("dataBtn").addEventListener("click", () => {
    F("wipeConfirm").hidden = true;
    F("storageNote").textContent = `${journeys.length} journey${journeys.length === 1 ? "" : "s"} saved in this browser.`;
    if (typeof F("dataDialog").showModal === "function") F("dataDialog").showModal(); else F("dataDialog").setAttribute("open", "");
  });
  F("exportJson").addEventListener("click", exportJson);
  F("exportCsv").addEventListener("click", exportCsv);
  F("importFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; });
  F("wipeBtn").addEventListener("click", () => { F("wipeConfirm").hidden = false; F("wipeConfirm").focus(); });
  F("wipeConfirm").addEventListener("click", () => {
    journeys = []; save(); renderAll();
    F("dataDialog").close();
    toast("All journeys deleted");
  });
  F("dataDialog").addEventListener("click", e => { if (e.target === F("dataDialog")) F("dataDialog").close(); });

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (!F("view-stats").hidden) renderStats(); }, 150);
  });

  // Start on the tab in the address bar (so installed-app shortcuts and back button work).
  const start = FROM_HASH[location.hash] || "log";
  if (start === "add") { openEditor(null); history.replaceState(null, "", HASH.add); }
  else { showTab(start, true); if (!location.hash) history.replaceState(null, "", HASH.log); }

  /* ---------- offline support ---------- */
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
  }
})();
