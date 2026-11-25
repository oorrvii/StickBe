import { useState } from "react";
import { Alert, Button, Card, Input, Select, Textarea } from "../ui/index.js";
import { CONTACT_METHODS } from "./orderFlow.js";
import { TEMPLATES, buildMessage, defaultTemplate, hasPlaceholder, instagramUrl, mailtoUrl, whatsappUrl } from "./messageTemplates.js";
import { formatOrderDate, statusId } from "../app/orderUtils.js";

function Section({ title, lead, children, error }) {
  return (
    <Card padded className="sb-adminsec">
      <h2>{title}</h2>
      {lead && <p className="sb-adminsec__lead">{lead}</p>}
      {children}
      {error && <Alert tone="error">{error}</Alert>}
    </Card>
  );
}

/** A button that asks for a reason before it does something the customer will see. */
function ReasonAction({ label, prompt, confirmLabel, onConfirm, busy }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)} disabled={busy}>{label}</Button>;
  return (
    <div className="sb-adminsec__reason">
      <Textarea label={prompt} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="sb-adminsec__row">
        <Button variant="danger" loading={busy} onClick={async () => {
          const res = await onConfirm(reason);
          if (!res.ok) setError(res.error);
        }}>{confirmLabel}</Button>
        <Button variant="secondary" onClick={() => { setOpen(false); setError(""); }} disabled={busy}>Keep the order</Button>
      </div>
    </div>
  );
}

export function ReviewSection({ order, run, busy }) {
  const subtotal = Number(order.subtotal) || 0;
  const [shipping, setShipping] = useState(String(order.deliveryFee ?? 0));
  const [total, setTotal] = useState(String(order.total ?? subtotal));
  const [touched, setTouched] = useState(false);
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState(order.customerNote || "");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState("");

  const onShipping = (v) => {
    setShipping(v);
    if (!touched && /^\d{1,7}$/.test(v)) setTotal(String(subtotal + Number(v)));
  };
  const approve = async () => {
    setError("");
    const res = await run("approve", { shippingCharge: shipping, finalTotal: total, adjustmentReason: reason, customerNote, internalNote }, "Order approved. Now send the customer your payment details.");
    if (!res.ok) setError(res.error);
  };

  return (
    <Section title="Review this request" lead="Approving confirms the request and marks the order as awaiting payment. The items are already set aside from stock. Payment details are sent to the customer by you, outside this website.">
      <div className="sb-formgrid sb-formgrid--2">
        <Input label="Shipping charge (₹)" inputMode="numeric" value={shipping} onChange={(e) => onShipping(e.target.value)} hint="Use 0 for free shipping." />
        <Input label="Final total (₹)" inputMode="numeric" value={total} onChange={(e) => { setTouched(true); setTotal(e.target.value); }} hint={`Items ₹${subtotal} plus shipping, unless you change it.`} />
      </div>
      <Textarea label="Reason if the final total differs from items plus shipping" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} />
      <div className="sb-formgrid sb-formgrid--2">
        <Textarea label="Note for the customer (optional)" hint="Shown on their order page." value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={3} maxLength={500} />
        <Textarea label="Internal note (optional)" hint="Only you can see this." value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} maxLength={1000} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={approve}>Approve order</Button>
        <ReasonAction label="Reject request" prompt="Reason (the customer will see it)" confirmLabel="Reject request" busy={busy}
          onConfirm={(r) => run("reject", { reason: r }, "Request rejected and the items are back in stock.")} />
      </div>
    </Section>
  );
}

export function ContactSection({ order, priv, runService }) {
  const [method, setMethod] = useState(CONTACT_METHODS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sent = priv?.paymentInstructionsSentAt;

  const go = async (fn, success) => {
    setBusy(true);
    setError("");
    const res = await runService(fn, success);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else setNote("");
  };

  return (
    <Section title="Contact and payment instructions" lead="Contact the customer yourself and share your payment QR or details outside this website. Use these buttons to keep a record of what you did. Nothing is sent automatically." error={error}>
      <div className="sb-formgrid sb-formgrid--contact">
        <Select label="How you contacted them" value={method} onChange={(e) => setMethod(e.target.value)}>
          {CONTACT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </Select>
        <Input label="What happened (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      <div className="sb-adminsec__row">
        <Button variant="secondary" loading={busy} onClick={() => go((s) => s.recordContact(order.id, { method, note }), "Contact recorded.")}>Record contact</Button>
        <Button variant="secondary" disabled={busy || !!sent} onClick={() => go((s) => s.markInstructionsSent(order.id), "Recorded that you sent the payment instructions.")}>
          {sent ? `Payment instructions sent ${formatOrderDate(sent)}` : "I have sent the payment instructions"}
        </Button>
      </div>
      {Array.isArray(priv?.contactLog) && priv.contactLog.length > 0 && (
        <ul className="sb-adminsec__log">
          {priv.contactLog.map((c, i) => <li key={i}><strong>{c.method}</strong> · {formatOrderDate(c.at)}{c.note ? ` · ${c.note}` : ""}</li>)}
        </ul>
      )}
    </Section>
  );
}

export function VerifySection({ order, run, busy }) {
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  return (
    <Section title="Verify payment" lead="Only verify after you have checked your real business payment account. A screenshot from the customer is not proof." error={error}>
      <label className="sb-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>I checked my payment account and ₹{order.total} has arrived for this order</span>
      </label>
      <Input label="Payment reference (optional, only you see it)" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={async () => {
          setError("");
          const res = await run("verifyPayment", { confirmed, reference }, "Payment verified.");
          if (!res.ok) setError(res.error);
        }}>Verify payment</Button>
      </div>
    </Section>
  );
}

export function SimpleStep({ title, lead, label, action, success, run, busy }) {
  const [error, setError] = useState("");
  return (
    <Section title={title} lead={lead} error={error}>
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={async () => {
          setError("");
          const res = await run(action, {}, success);
          if (!res.ok) setError(res.error);
        }}>{label}</Button>
      </div>
    </Section>
  );
}

export function DispatchSection({ run, busy }) {
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <Section title="Dispatch the order" error={error}>
      <div className="sb-formgrid sb-formgrid--2">
        <Input label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={60} />
        <Input label="Tracking number (optional)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} maxLength={80} />
      </div>
      <Input label="Tracking link (optional)" hint="A full link starting with https://" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} maxLength={500} />
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={async () => {
          setError("");
          const res = await run("dispatch", { courier, trackingNumber, trackingUrl }, "Order marked as dispatched.");
          if (!res.ok) setError(res.error);
        }}>Mark dispatched</Button>
      </div>
    </Section>
  );
}

export function CancelSection({ run, busy }) {
  return (
    <Section title="Cancel this order" lead="Cancelling needs a reason, and the customer will see it. The items go back into stock. If payment was already received, handle the refund yourself and then record it here.">
      <ReasonAction label="Cancel order" prompt="Reason (the customer will see it)" confirmLabel="Cancel order" busy={busy}
        onConfirm={(r) => run("cancel", { reason: r }, "Order cancelled and the items are back in stock.")} />
    </Section>
  );
}

export function NotesSection({ order, priv, runService }) {
  const [customerNote, setCustomerNote] = useState(order.customerNote || "");
  const [internalNote, setInternalNote] = useState(priv?.internalNote || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Section title="Notes" error={error}>
      <div className="sb-formgrid sb-formgrid--2">
        <Textarea label="Note for the customer" hint="Shown on their order page." value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={4} maxLength={500} />
        <Textarea label="Internal note" hint="Only you can see this." value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={4} maxLength={1000} />
      </div>
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={async () => {
          setBusy(true);
          setError("");
          const res = await runService((s) => s.saveNotes(order.id, { customerNote, internalNote }), "Notes saved.");
          setBusy(false);
          if (!res.ok) setError(res.error);
        }}>Save notes</Button>
      </div>
    </Section>
  );
}

export function HistorySection({ history }) {
  return (
    <Section title="History">
      <ol className="sb-timeline sb-timeline--admin">
        {history.map((e, i) => (
          <li key={i}><strong>{e.text}</strong>{e.at ? <span>{formatOrderDate(e.at)}</span> : null}</li>
        ))}
      </ol>
    </Section>
  );
}

export function MessageSection({ order }) {
  const [templateId, setTemplateId] = useState(() => defaultTemplate(statusId(order)));
  const [text, setText] = useState(() => buildMessage(defaultTemplate(statusId(order)), order));
  const [copied, setCopied] = useState(false);
  const c = order.customer || {};
  const num = order.orderNumber || order.id;
  const wa = whatsappUrl(c.phone, text);
  const mail = mailtoUrl(c.email, `Your StickBe order ${num}`, text);
  const ig = instagramUrl(c.instagram);
  const unfinished = hasPlaceholder(text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Section title="Message the customer" lead="Nothing is sent automatically. Pick a message, edit it, then copy it or open it in WhatsApp or email. Add your payment details yourself, they are never stored on the website.">
      <Select label="Message" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setText(buildMessage(e.target.value, order)); }}>
        {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </Select>
      <Textarea label="Text" value={text} onChange={(e) => setText(e.target.value)} rows={9} />
      {unfinished && <p className="sb-adminsec__warn">Replace the bracketed line before sending.</p>}
      <div className="sb-adminsec__row">
        <Button onClick={copy}>{copied ? "Copied" : "Copy message"}</Button>
        {wa && <a className="sb-btn sb-btn--secondary" href={wa} target="_blank" rel="noopener noreferrer">Open in WhatsApp</a>}
        {mail && <a className="sb-btn sb-btn--secondary" href={mail}>Open in email</a>}
        {ig && <a className="sb-btn sb-btn--secondary" href={ig} target="_blank" rel="noopener noreferrer">Open Instagram profile</a>}
      </div>
      <p className="sb-adminsec__lead">Instagram cannot be pre-filled. Copy the message, then paste it in the chat.</p>
    </Section>
  );
}
