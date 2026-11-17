import { useState } from "react";
import { Button, Badge, Card, Dialog, Input, Textarea, Select, Spinner, Alert, EmptyState, Skeleton } from "./index.js";

const SWATCHES = [
  ["Violet", "var(--sb-violet)", "#7250A0", "#fff"],
  ["Charcoal", "var(--sb-ink)", "#28252D", "#fff"],
  ["Ivory", "var(--sb-ivory)", "#F6F2EA", "#28252D"],
  ["Lavender", "var(--sb-lavender)", "#D9CBE8", "#28252D"],
  ["Terracotta", "var(--sb-terracotta)", "#DF936E", "#28252D"],
  ["Sage", "var(--sb-sage)", "#AAB394", "#28252D"],
  ["White", "var(--sb-white)", "#FFFFFF", "#28252D"],
];

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "var(--sb-space-7)" }}>
      <h3 style={{ marginBottom: "var(--sb-space-4)" }}>{title}</h3>
      {children}
    </section>
  );
}

export default function Styleguide() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fakeSave = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1400);
  };

  return (
    <div className="sb2" style={{ minHeight: "100vh", padding: "var(--sb-space-6) var(--sb-space-4)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="sb-accent" style={{ fontSize: "var(--sb-text-xl)", color: "var(--sb-violet)" }}>
          StickBe 2.0
        </p>
        <h1 style={{ marginBottom: "var(--sb-space-7)" }}>Design system preview</h1>

        <Section title="Colour">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "var(--sb-space-3)" }}>
            {SWATCHES.map(([name, bg, hex, fg]) => (
              <div
                key={name}
                style={{ background: bg, color: fg, padding: "var(--sb-space-4)", borderRadius: "var(--sb-radius-md)", border: "var(--sb-border)", minHeight: 84 }}
              >
                <strong style={{ display: "block", fontSize: "var(--sb-text-sm)" }}>{name}</strong>
                <span style={{ fontSize: "var(--sb-text-xs)" }}>{hex}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <h1 style={{ fontSize: "var(--sb-text-3xl)" }}>Plus Jakarta Sans heading</h1>
          <p style={{ margin: "var(--sb-space-3) 0" }}>Inter body text for product descriptions, forms and interface copy.</p>
          <p className="sb-accent" style={{ fontSize: "var(--sb-text-2xl)" }}>
            DM Serif Display, used sparingly
          </p>
        </Section>

        <Section title="Buttons">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sb-space-3)", alignItems: "center" }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="danger">Delete</Button>
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={fakeSave}>
              {loading ? "Saving" : "Click to load"}
            </Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Form fields">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sb-space-4)" }}>
            <Input label="Name" placeholder="Your name" hint="As it should appear on the parcel" />
            <Input label="Pincode" defaultValue="12" error="Enter a 6-digit pincode" />
            <Select label="Category" defaultValue="stickers">
              <option value="stickers">Stickers</option>
              <option value="washi">Washi Tapes</option>
            </Select>
            <Textarea label="Notes" placeholder="Anything we should know?" />
          </div>
        </Section>

        <Section title="Badges">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sb-space-2)" }}>
            <Badge>Violet</Badge>
            <Badge tone="lavender">New</Badge>
            <Badge tone="terracotta">Bestseller</Badge>
            <Badge tone="sage">Handmade</Badge>
            <Badge tone="success">In stock</Badge>
            <Badge tone="danger">Sold out</Badge>
            <Badge tone="warning">Low stock</Badge>
            <Badge tone="ink">10% OFF</Badge>
          </div>
        </Section>

        <Section title="Cards">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sb-space-4)" }}>
            <Card padded>
              <h4>Static card</h4>
              <p style={{ color: "var(--sb-muted)", marginTop: "var(--sb-space-2)" }}>Plain surface with a soft border.</p>
            </Card>
            <Card padded onClick={() => setOpen(true)}>
              <h4>Interactive card</h4>
              <p style={{ color: "var(--sb-muted)", marginTop: "var(--sb-space-2)" }}>Click or press Enter to open the dialog.</p>
            </Card>
          </div>
        </Section>

        <Section title="Feedback states">
          <div style={{ display: "grid", gap: "var(--sb-space-3)" }}>
            <Alert tone="info">Orders are confirmed after your prepayment is received.</Alert>
            <Alert tone="success">Order placed. We will message you shortly.</Alert>
            <Alert tone="warning">Only 2 left in stock.</Alert>
            <Alert tone="error">Something went wrong. Please try again.</Alert>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sb-space-3)" }}>
              <Spinner /> <Skeleton width={160} height={14} />
            </div>
            <Card>
              <EmptyState title="Nothing here yet" action={<Button variant="secondary" size="sm">Browse the shop</Button>}>
                Items you add to your wishlist will show up here.
              </EmptyState>
            </Card>
          </div>
        </Section>

        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Dialog example"
          actions={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p style={{ color: "var(--sb-muted)" }}>
            Focus stays inside this dialog, Escape closes it, and focus returns to the button that opened it.
          </p>
        </Dialog>
      </div>
    </div>
  );
}
