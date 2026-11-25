import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Skeleton } from "../ui/index.js";
import { CATEGORY_META } from "../categoryMeta.js";
import { mergeCategories } from "../shop/categoryLogic.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { STATUSES, duplicateSlug, statusOfProduct, stockLabel } from "./productForm.js";

const STATUS_TONE = { published: "success", draft: "lavender", archived: "ink" };

export default function AdminProducts() {
  const service = useCatalogService();
  const navigate = useNavigate();
  const load = useCallback(async () => {
    const [products, remote] = await Promise.all([service.listProducts(), service.listCategories().catch(() => [])]);
    return { products, categories: mergeCategories(CATEGORY_META, remote) };
  }, [service]);
  const { data, loading, error, retry, setData } = useAsync(load);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [busySlug, setBusySlug] = useState("");

  const labelOf = (id) => data?.categories.find((c) => c.id === id)?.label || id || "No category";

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.products || [])
      .filter((p) => (status === "all" || statusOfProduct(p) === status) && (category === "all" || p.category === category))
      .filter((p) => !q || [p.name, p.slug].some((v) => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
  }, [data, search, status, category]);

  const act = async (p, fn, done) => {
    setBusySlug(p.slug);
    setProblem("");
    try {
      await fn();
      setNotice(done);
      setData({ ...data, products: await service.listProducts() });
    } catch (e) {
      console.error(e);
      setProblem("That didn't save. Check your connection and try again.");
    } finally {
      setBusySlug("");
    }
  };

  const duplicate = (p) => act(p, async () => {
    const taken = data.products.map((x) => x.slug);
    const slug = duplicateSlug(p.slug, taken);
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
    await service.saveProduct({ ...rest, slug, name: `${p.name} (copy)`, status: "draft" }, { isNew: true });
  }, `Duplicated as a draft: ${p.name} (copy).`);

  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Products</p>
          <h1>Products</h1>
          <p className="sb-account__lead">Add, edit, publish and archive everything you sell.</p>
        </div>
        <Button onClick={() => navigate("/admin/products/new")}>New product</Button>
      </header>

      <div className="sb-admin__filters sb-admin__filters--3">
        <Input label="Search" placeholder="Name or slug" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.id[0].toUpperCase() + s.id.slice(1)}</option>)}
        </Select>
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {(data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {problem && <Alert tone="error">{problem}</Alert>}
      {error ? (
        <Alert tone="error">We couldn't load products. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
      ) : loading ? (
        <div className="sb-orders" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} height={96} style={{ display: "block" }} />)}</div>
      ) : shown.length === 0 ? (
        <Card><EmptyState title={data.products.length ? "No products match" : "No products yet"} action={!data.products.length && <Link className="sb-btn sb-btn--primary sb-btn--sm" to="/admin/products/new">New product</Link>}>
          {data.products.length ? "Try another search or filter." : "Add your first product."}
        </EmptyState></Card>
      ) : (
        <div className="sb-orders">
          {shown.map((p) => {
            const st = statusOfProduct(p);
            const stock = stockLabel(p);
            const cover = p.image || (Array.isArray(p.images) && p.images[0]) || "";
            const busy = busySlug === p.slug;
            return (
              <div key={p.slug} className="sb-prodrow">
                <div className="sb-prodrow__img">{cover ? <img src={cover} alt="" /> : <span>No photo</span>}</div>
                <div className="sb-prodrow__main">
                  <p className="sb-order__num">{p.name} <Badge tone={STATUS_TONE[st]}>{st}</Badge></p>
                  <p className="sb-order__date">{labelOf(p.category)} · {Array.isArray(p.variants) && p.variants.length ? `from ₹${p.price}` : `₹${p.price}`}</p>
                  <Badge tone={stock.tone}>{stock.text}</Badge>
                </div>
                <div className="sb-prodrow__actions">
                  <Link className="sb-btn sb-btn--secondary sb-btn--sm" to={`/admin/products/${encodeURIComponent(p.slug)}`}>Edit</Link>
                  {st === "published"
                    ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(p, () => service.setProductStatus(p.slug, "draft"), `${p.name} is now a draft.`)}>Unpublish</Button>
                    : <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(p, () => service.setProductStatus(p.slug, "published"), `${p.name} is published.`)}>{st === "archived" ? "Restore and publish" : "Publish"}</Button>}
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => duplicate(p)}>Duplicate</Button>
                  {st !== "archived" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(p, () => service.setProductStatus(p.slug, "archived"), `${p.name} is archived. Past orders are not affected.`)}>Archive</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
