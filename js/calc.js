/*
 * Delay Repay Ledger — compensation estimate.
 * Pure functions with no DOM access, so they can be unit tested in Node.
 */
(function (root) {
  "use strict";
  const D = (typeof module !== "undefined" && module.exports) ? require("./data.js") : root.DRL_DATA;

  function pctFor(table, delay) {
    let p = 0;
    for (const [m, v] of table) if (delay >= m) p = v;
    return p;
  }

  function bandLabel(d) {
    return d >= 120 ? "120+" : d >= 60 ? "60–119" : d >= 30 ? "30–59" : d >= 15 ? "15–29" : "<15";
  }

  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function money(n) { return "£" + (Number(n) || 0).toFixed(2); }

  // Rounds to whole pence, as operators pay.
  function pence(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  /**
   * Estimate compensation for one logged journey.
   * Returns { op, sc, t, delay, pct, base, ticketComp, sfComp, total, eligible, kind, lines, reason, deadline }
   */
  function estimate(j) {
    const op = D.OPMAP[j.operator] || D.OPMAP.other;
    const sc = D.SCHEMES[op.s];
    const t = D.TMAP[j.ticketType] || D.TICKETS[0];
    const delay = Math.max(0, Number(j.delay) || 0);
    const price = Math.max(0, Number(j.price) || 0);
    const r = { op, sc, t, delay, pct: 0, base: 0, ticketComp: 0, sfComp: 0, total: 0, eligible: false, kind: "dr", lines: [], reason: "" };
    r.deadline = j.date ? addDays(new Date(j.date + "T00:00:00"), D.CLAIM_WINDOW_DAYS) : null;
    const hasSf = !!j.seatfrog && j.cls !== "first" && Number(j.sfPrice) > 0;

    if (j.outcome === "notravel") {
      r.kind = "refund";
      r.total = price;
      r.eligible = price > 0;
      r.reason = "You didn't travel, so this is a refund of the unused ticket from the retailer, not Delay Repay.";
      r.lines.push(["Unused ticket", money(price)]);
      if (hasSf) {
        r.sfComp = Number(j.sfPrice);
        r.total += r.sfComp;
        r.lines.push(["Unused Seatfrog upgrade (from Seatfrog)", money(r.sfComp)]);
      }
      r.total = pence(r.total);
      return r;
    }

    if (t.kind === "manual") {
      r.reason = "Rovers, rangers and similar tickets are valued by the operator case by case. Log it and claim anyway.";
      return r;
    }

    if (delay < sc.from) {
      r.reason = delay ? `${op.name} pays from ${sc.from} minutes. ${delay} minutes is below that.` : "Enter the delay to see an estimate.";
    } else {
      r.eligible = true;
    }

    if (t.kind === "season") {
      const perJourney = price / t.div;
      r.base = perJourney;
      r.pct = pctFor(sc.single, delay) * (delay >= 120 ? 2 : 1);
      r.lines.push([`Value of one journey (÷${t.div})`, money(perJourney)]);
    } else if (t.kind === "return") {
      r.base = price;
      r.pct = pctFor(sc.ret, delay);
      r.lines.push(["Return fare", money(price)]);
    } else {
      r.base = price;
      r.pct = pctFor(sc.single, delay);
      r.lines.push(["Single fare", money(price)]);
    }

    r.ticketComp = r.eligible ? pence(r.base * r.pct) : 0;
    if (r.eligible) r.lines.push([`Ticket compensation (${+(r.pct * 100).toFixed(1)}%)`, money(r.ticketComp)]);

    if (hasSf) {
      const sf = Number(j.sfPrice);
      if (j.sfUsed === "no") {
        r.sfComp = sf;
        r.sfSeparate = true;
        r.lines.push(["Seatfrog upgrade: refund from Seatfrog", money(sf)]);
      } else if (r.eligible) {
        const p = pctFor(sc.single, delay);
        r.sfComp = pence(sf * p);
        r.lines.push([`Seatfrog upgrade (${Math.round(p * 100)}% of ${money(sf)})`, money(r.sfComp)]);
      }
    }

    r.total = pence(r.ticketComp + r.sfComp);
    return r;
  }

  const API = { estimate, pctFor, bandLabel, addDays, money, pence };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.DRL_CALC = API;
})(typeof self !== "undefined" ? self : this);
