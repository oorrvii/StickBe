import assert from "node:assert/strict";
import { FlowError, applyAction, applyContact, applyInstructionsSent, applyNotes, catalogCheck, ordersToCsv, stockReturns } from "../src/admin/orderFlow.js";
import { buildMessage, hasPlaceholder, instagramUrl, mailtoUrl, whatsappUrl } from "../src/admin/messageTemplates.js";
import { historyOf, statusId } from "../src/app/orderUtils.js";

const base = () => ({ id: "o1", orderNumber: "SB-261118-ABCDE", status: "new", subtotal: 140, deliveryFee: 20, total: 160, createdAt: 1000,
  items: [{ slug: "panda", name: "Panda", qty: 2, price: 70, listPrice: 70 }, { slug: "custom", name: "Custom", qty: 1, price: 0, isCustom: true }],
  customer: { name: "Asha", phone: "9876543210", email: "a@b.com", instagram: "asha.v" }, history: [{ status: "new", text: "Order request received", at: 1000 }] });
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof FlowError && e.code === code, code);

// approve
let r = applyAction(base(), {}, "approve", { shippingCharge: "20", finalTotal: "160" }, 5);
assert.equal(r.order.status, "approved"); assert.equal(r.order.total, 160); assert.equal(r.order.adjustmentReason, null);
assert.equal(r.order.history.length, 2); assert.match(r.order.history[1].text, /approved/); assert.equal(r.restoreStock, false);
throwsCode(() => applyAction(base(), {}, "approve", { shippingCharge: "20", finalTotal: "150" }), "REASON_REQUIRED");
r = applyAction(base(), {}, "approve", { shippingCharge: "0", finalTotal: "130", adjustmentReason: "Friend discount", customerNote: "Thanks!", internalNote: "regular" });
assert.equal(r.order.deliveryFee, 0); assert.equal(r.order.total, 130); assert.equal(r.order.adjustmentReason, "Friend discount");
assert.equal(r.order.customerNote, "Thanks!"); assert.equal(r.priv.internalNote, "regular");
throwsCode(() => applyAction(base(), {}, "approve", { shippingCharge: "-5", finalTotal: "100" }), "BAD_SHIPPING");
throwsCode(() => applyAction(base(), {}, "approve", { shippingCharge: "20", finalTotal: "abc" }), "BAD_TOTAL");
// wrong states (double click, stale tab)
const approved = applyAction(base(), {}, "approve", { shippingCharge: "20", finalTotal: "160" }).order;
throwsCode(() => applyAction(approved, {}, "approve", { shippingCharge: "20", finalTotal: "160" }), "WRONG_STATE");
throwsCode(() => applyAction(base(), {}, "dispatch", { courier: "x" }), "WRONG_STATE");
throwsCode(() => applyAction(base(), {}, "nope"), "UNKNOWN_ACTION");
// reject restores stock once
r = applyAction(base(), {}, "reject", { reason: "Out of the colour you wanted" });
assert.equal(r.order.status, "rejected"); assert.equal(r.restoreStock, true); assert.equal(r.order.stockRestored, true);
throwsCode(() => applyAction(base(), {}, "reject", { reason: "" }), "REASON_REQUIRED");
assert.deepEqual([...stockReturns(base())], [["panda", 2]], "custom items never return to stock");
// payment
throwsCode(() => applyAction(approved, {}, "verifyPayment", { confirmed: false }), "CONFIRM_REQUIRED");
r = applyAction(approved, {}, "verifyPayment", { confirmed: true, reference: " UPI 123 " }, 9);
assert.equal(r.order.status, "paid"); assert.equal(r.priv.paymentReference, "UPI 123"); assert.equal(r.priv.paymentVerifiedAt, 9);
assert.equal(JSON.stringify(r.order).includes("UPI 123"), false, "payment reference stays out of the customer-visible order");
// processing, dispatch, deliver
const paid = r.order; const processing = applyAction(paid, {}, "startProcessing").order; assert.equal(processing.status, "processing");
throwsCode(() => applyAction(processing, {}, "dispatch", { courier: "" }), "COURIER_REQUIRED");
throwsCode(() => applyAction(processing, {}, "dispatch", { courier: "DTDC", trackingUrl: "http://x.com" }), "BAD_LINK");
throwsCode(() => applyAction(processing, {}, "dispatch", { courier: "DTDC", trackingUrl: "javascript:alert(1)" }), "BAD_LINK");
r = applyAction(processing, {}, "dispatch", { courier: "DTDC", trackingNumber: "T123", trackingUrl: "https://dtdc.in/t/T123" });
assert.equal(r.order.status, "dispatched"); assert.deepEqual(r.order.dispatch, { courier: "DTDC", trackingNumber: "T123", trackingUrl: "https://dtdc.in/t/T123" });
assert.match(r.order.history.at(-1).text, /dispatched with DTDC/);
const delivered = applyAction(r.order, {}, "deliver").order; assert.equal(delivered.status, "delivered");
throwsCode(() => applyAction(delivered, {}, "cancel", { reason: "late" }), "WRONG_STATE");
// cancel
r = applyAction(paid, {}, "cancel", { reason: "Customer changed their mind" });
assert.equal(r.order.status, "cancelled"); assert.equal(r.restoreStock, true);
r = applyAction({ ...paid, stockRestored: true }, {}, "cancel", { reason: "again" }); assert.equal(r.restoreStock, false, "never restore twice");
// notes, contact
r = applyNotes(base(), {}, { customerNote: "Hello", internalNote: "secret" }); assert.equal(r.order.customerNote, "Hello"); assert.equal(r.priv.internalNote, "secret");
throwsCode(() => applyContact(base(), {}, { method: "Pigeon" }), "BAD_METHOD");
r = applyContact(base(), {}, { method: "WhatsApp", note: "Sent QR" }, 7); assert.equal(r.priv.contactLog[0].method, "WhatsApp");
throwsCode(() => applyInstructionsSent(base(), {}), "WRONG_STATE");
assert.equal(applyInstructionsSent(approved, {}, 3).priv.paymentInstructionsSentAt, 3);
// legacy
assert.equal(statusId({ status: "fulfilled" }), "delivered"); assert.equal(statusId({}), "new"); assert.equal(statusId({ status: "weird" }), "new");
assert.equal(historyOf({ status: "fulfilled", createdAt: 5 }).length, 2); assert.equal(historyOf(base()).length, 1);
// catalogue check
assert.deepEqual(catalogCheck(base(), [{ slug: "panda", price: 70 }]), []);
assert.match(catalogCheck(base(), [{ slug: "panda", price: 80 }])[0], /price is now ₹80/);
assert.match(catalogCheck(base(), [])[0], /no longer in the catalogue/);
// messages
let m = buildMessage("approved", { ...base(), total: 160 }); assert.ok(hasPlaceholder(m)); assert.match(m, /Hi Asha/); assert.match(m, /₹160/);
assert.ok(!hasPlaceholder(buildMessage("paid", base())));
assert.match(buildMessage("dispatched", { ...base(), dispatch: { courier: "DTDC", trackingNumber: "T1", trackingUrl: "https://x.in" } }), /Tracking number: T1/);
assert.equal(whatsappUrl("9876543210", "hi there").startsWith("https://wa.me/919876543210?text=hi%20there"), true); assert.equal(whatsappUrl("123", "x"), null);
assert.equal(instagramUrl("@asha.v"), "https://instagram.com/asha.v"); assert.equal(instagramUrl("a b"), null);
assert.match(mailtoUrl("a@b.com", "Order", "Hi"), /^mailto:a@b\.com\?subject=Order&body=Hi$/);
// csv: quoting + formula safety
const csv = ordersToCsv([{ ...base(), customer: { name: '=HYPERLINK("x")', phone: "1" }, note: 'He said "hi", ok' }], () => "New", () => "d");
assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); assert.ok(csv.includes('"He said ""hi"", ok"'));
console.log("ok: order flow, messages and csv");
