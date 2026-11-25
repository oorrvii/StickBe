import assert from "node:assert/strict";
import * as client from "../src/site/saleLogic.js";
import * as server from "../api/_lib/sale.js";
const now = Date.UTC(2026, 10, 18, 12);
const cases = [
  [null, 0], [{ active: false, percent: 20 }, 0], [{ active: true, percent: 20 }, 20],
  [{ active: true, percent: 0 }, 0], [{ active: true, percent: "abc" }, 0], [{ active: true, percent: 95 }, 90],
  [{ active: true, percent: 15, startsAt: "2026-11-19T00:00:00Z" }, 0],
  [{ active: true, percent: 15, startsAt: "2026-11-18T00:00:00Z", endsAt: "2026-11-19T00:00:00Z" }, 15],
  [{ active: true, percent: 15, endsAt: "2026-11-18T12:00:00Z" }, 0],
  [{ active: true, percent: 15, endsAt: { seconds: now / 1000 + 60 } }, 15],
  [{ active: true, percent: 15, endsAt: { toMillis: () => now - 1 } }, 0],
  [{ active: "yes", percent: 15 }, 0], [{ active: true, percent: 12.4 }, 12],
];
for (const [sale, want] of cases) {
  assert.equal(client.activeSalePercent(sale, now), want, JSON.stringify(sale));
  assert.equal(server.activeSalePercent(sale, now), want, "server " + JSON.stringify(sale));
}
console.log("ok: sale rules agree on client and server");

import { saleEndLabel, saleHeadline } from "../src/site/saleLogic.js";
assert.equal(saleEndLabel({ endsAt: "2026-12-01T00:00:00+05:30" }), "30 November");
assert.equal(saleEndLabel({ endsAt: "2027-01-01T00:00:00+05:30" }), "31 December");
assert.equal(saleEndLabel({ endsAt: "" }), "");
assert.equal(saleHeadline({ label: " Diwali sale " }, 30), "Diwali sale, 30% off");
assert.equal(saleHeadline({ label: "" }, 10), "Sale, 10% off");
console.log("ok: sale banner wording and end date");
