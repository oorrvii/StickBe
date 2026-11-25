import { useCallback, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Skeleton } from "../ui/index.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { DEFAULT_LOW_STOCK, stockLabel } from "./productForm.js";

function Row({ p, service, onSaved }) {
  const [v, setV] = useState(p.stock == null ? "" : String(p.stock));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState("");
  const st = stockLabel(p);
  const dirty = v !== (p.stock == null ? "" : String(p.stock));
  const save = async () => {
    if (!/^\d{1,6}$/.test(v.trim())) return setBad("Whole number, 0 or more.");
    setBad("");
    setBusy(true);
    try {
      await service.setStock(p.slug, Number(v));
      setMsg("Saved");
      onSaved();
    } catch (e) {
      console.error(e);
      setBad("Didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sb-prodrow">
      <div className="sb-prodrow__img">{p.image ? <img src={p.image} alt="" /> : <span>No photo</span>}</div>
      <div className="sb-prodrow__main">
        <p className="sb-order__num">{p.name}</p>
        <Badge tone={st.tone}>{st.text}</Badge>
        {p.stock == null && <p className="sb-order__date">Stock isn't tracked. Set a number to start tracking.</p>}
      </div>
      <div className="sb-prodrow__actions sb-prodrow__actions--stock">
        <Input label="Stock" inputMode="numeric" value={v} error={bad} onChange={(e) => { setV(e.target.value); setMsg(""); }} />
        <Button size="sm" disabled={!dirty} loading={busy} onClick={save}>Set stock</Button>
        {msg && !dirty && <span className="sb-order__date" role="status">{msg}</span>}
      </div>
    </div>
  );
}

export default function AdminInventory() {
  const service = useCatalogService();
  const load = useCallback(() => service.listProducts(), [service]);
  const { data, loading, error, retry, setData } = useAsync(load);
  const [filter, setFilter] = useState("low");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || [])
      .filter((p) => p.status !== "archived")
      .filter((p) => {
        if (filter === "all") return true;
        if (p.stock == null) return false;
        if (filter === "out") return p.stock <= 0;
        return p.stock <= (p.lowStockAt ?? DEFAULT_LOW_STOCK);
      })
      .filter((p) => !q || String(p.name).toLowerCase().includes(q))
      .sort((a, b) => (a.stock ?? 1e9) - (b.stock ?? 1e9));
  }, [data, filter, search]);

  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Inventory</p>
          <h1>Inventory</h1>
          <p className="sb-account__lead">Check what's running low and correct stock counts. Orders reduce stock automatically.</p>
        </div>
      </header>
      <div className="sb-admin__filters">
        <Select label="Show" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="low">Low or out of stock</option>
          <option value="out">Out of stock</option>
          <option value="all">Everything</option>
        </Select>
        <Input label="Search" placeholder="Product name" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {error ? <Alert tone="error">We couldn't load inventory. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
        : loading ? <Skeleton height={200} style={{ display: "block" }} />
        : shown.length === 0 ? <Card><EmptyState title={filter === "all" ? "No products" : "Nothing needs attention"}>{filter === "all" ? "Add a product first." : "No product is low or out of stock."}</EmptyState></Card>
        : <div className="sb-orders">{shown.map((p) => <Row key={p.slug} p={p} service={service} onSaved={async () => setData(await service.listProducts())} />)}</div>}
    </>
  );
}
