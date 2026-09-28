// Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { estimate } = require("../js/calc.js");

const base = { date: "2026-09-01", outcome: "late", cls: "std", status: "todo" };

test("Delay Repay 15 single: 15–29 min pays 25%", () => {
  const r = estimate({ ...base, operator: "avanti", ticketType: "anys", price: 100, delay: 20 });
  assert.equal(r.eligible, true);
  assert.equal(r.total, 25);
});

test("Delay Repay 15 return, one leg: 19 min pays 12.5% of the return fare", () => {
  const r = estimate({ ...base, operator: "avanti", ticketType: "anyr", price: 318.20, delay: 19, cls: "first" });
  assert.equal(r.total, 39.78); // 39.775 rounded to the nearest penny
});

test("Delay Repay 30 operator: 22 min is below the threshold", () => {
  const r = estimate({ ...base, operator: "lner", ticketType: "advs", price: 50, delay: 22 });
  assert.equal(r.eligible, false);
  assert.equal(r.total, 0);
});

test("Delay Repay 30: 43 min pays 50%, plus the Seatfrog upgrade at the same rate", () => {
  const r = estimate({ ...base, operator: "lner", ticketType: "advs", price: 54.10, delay: 43, seatfrog: true, sfPrice: 22, sfUsed: "yes" });
  assert.equal(r.ticketComp, 27.05);
  assert.equal(r.sfComp, 11);
  assert.equal(r.total, 38.05);
});

test("Seatfrog is ignored on a First Class ticket", () => {
  const r = estimate({ ...base, operator: "lner", ticketType: "advs", price: 100, delay: 45, cls: "first", seatfrog: true, sfPrice: 30 });
  assert.equal(r.total, 50);
});

test("Monthly season: one journey is 1/40, 60+ min pays 100% of it", () => {
  const r = estimate({ ...base, operator: "gwr", ticketType: "sm", price: 492, delay: 73 });
  assert.equal(r.total, 12.3);
});

test("Season ticket doubles at 120+ minutes", () => {
  const r = estimate({ ...base, operator: "gwr", ticketType: "sm", price: 400, delay: 130 });
  assert.equal(r.total, 20);
});

test("Return ticket at 120+ minutes pays the whole return fare", () => {
  const r = estimate({ ...base, operator: "southern", ticketType: "offr", price: 40, delay: 125 });
  assert.equal(r.total, 40);
});

test("Didn't travel is a refund of the whole ticket", () => {
  const r = estimate({ ...base, operator: "tpe", ticketType: "offs", price: 18.6, outcome: "notravel" });
  assert.equal(r.kind, "refund");
  assert.equal(r.total, 18.6);
});

test("Claim deadline is 28 days after travel", () => {
  const r = estimate({ ...base, operator: "northern", ticketType: "anys", price: 10, delay: 15 });
  assert.equal(r.deadline.getDate(), 29);
  assert.equal(r.deadline.getMonth(), 8); // September
});

test("Unknown operator falls back to Delay Repay 15", () => {
  const r = estimate({ ...base, operator: "nope", ticketType: "anys", price: 10, delay: 16 });
  assert.equal(r.total, 2.5);
});
