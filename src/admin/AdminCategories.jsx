import { useCallback, useState } from "react";
import { Alert, Badge, Button, Card, Input, Skeleton, Textarea } from "../ui/index.js";
import { CATEGORY_META } from "../categoryMeta.js";
import { mergeCategories } from "../shop/categoryLogic.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import ImageSelect from "./ImageSelect.jsx";
import { slugify } from "./productForm.js";

const blank = { id: "", label: "", description: "", image: "", order: "1000", active: true, showOnHome: true };

function CategoryForm({ initial, isNew, takenIds, onSaved, onCancel, service }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    const errs = {};
    const id = isNew ? slugify(f.label) : f.id;
    if (!f.label.trim()) errs.label = "Enter a name.";
    else if (f.label.length > 60) errs.label = "Keep the name under 60 characters.";
    if (isNew && id && takenIds.includes(id)) errs.label = "A category with that name already exists.";
    if (f.description.length > 300) errs.description = "Keep this under 300 characters.";
    if (!/^\d{1,5}$/.test(String(f.order).trim())) errs.order = "Enter a whole number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setProblem("");
    try {
      await service.saveCategory(id, {
        label: f.label.trim(), description: f.description.trim(), image: f.image || "",
        order: Number(f.order), active: f.active, showOnHome: f.showOnHome,
      });
      onSaved(isNew ? "Category created." : "Category saved.");
    } catch (e) {
      console.error(e);
      setProblem("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padded className="sb-adminsec">
      <h2>{isNew ? "New category" : `Edit ${initial.label}`}</h2>
      {problem && <Alert tone="error">{problem}</Alert>}
      <Input label="Name" value={f.label} onChange={set("label")} error={errors.label} maxLength={60} />
      {!isNew && <p className="sb-field__hint">Slug: {f.id} (can't be changed)</p>}
      <Textarea label="Description" rows={3} value={f.description} onChange={set("description")} error={errors.description} />
      <ImageSelect label="Cover photo" value={f.image} onChange={(v) => setF((x) => ({ ...x, image: v }))} hint="Leave empty to use a photo from one of its products." />
      <Input label="Sort order" inputMode="numeric" value={f.order} onChange={set("order")} error={errors.order} hint="Lower numbers appear first." />
      <label className="sb-check"><input type="checkbox" checked={f.active} onChange={set("active")} /><span>Active<small className="sb-check__sub">Inactive categories are hidden from the shop.</small></span></label>
      <label className="sb-check"><input type="checkbox" checked={f.showOnHome} onChange={set("showOnHome")} /><span>Show on home page</span></label>
      <div className="sb-adminsec__row">
        <Button loading={busy} onClick={save}>{isNew ? "Create category" : "Save changes"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function AdminCategories() {
  const service = useCatalogService();
  const load = useCallback(async () => {
    const [products, remote] = await Promise.all([service.listProducts(), service.listCategories().catch(() => [])]);
    return { products, categories: mergeCategories(CATEGORY_META, remote) };
  }, [service]);
  const { data, loading, error, retry, setData } = useAsync(load);
  const [editing, setEditing] = useState(null); // category | "new"
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const refresh = async (msg) => {
    setNotice(msg);
    setEditing(null);
    const remote = await service.listCategories().catch(() => []);
    setData({ ...data, categories: mergeCategories(CATEGORY_META, remote) });
  };
  const toggle = async (c) => {
    setProblem("");
    try {
      await service.saveCategory(c.id, { active: !c.active, label: c.label, order: c.order, showOnHome: c.showOnHome, description: c.description || "", image: c.image || "" });
      await refresh(c.active ? `${c.label} is hidden from the shop.` : `${c.label} is active.`);
    } catch (e) {
      console.error(e);
      setProblem("That didn't save. Try again.");
    }
  };
  const count = (id) => data.products.filter((p) => p.category === id).length;

  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Categories</p>
          <h1>Categories</h1>
          <p className="sb-account__lead">Group your products and choose what shows on the home page.</p>
        </div>
        {!editing && <Button onClick={() => { setNotice(""); setEditing("new"); }}>New category</Button>}
      </header>
      {notice && <Alert tone="success">{notice}</Alert>}
      {problem && <Alert tone="error">{problem}</Alert>}
      {error ? <Alert tone="error">We couldn't load categories. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
        : loading ? <Skeleton height={200} style={{ display: "block" }} />
        : editing ? (
          <CategoryForm key={editing === "new" ? "new" : editing.id} service={service} isNew={editing === "new"} initial={editing === "new" ? blank : { ...blank, ...editing, order: String(editing.order ?? 1000) }}
            takenIds={data.categories.map((c) => c.id)} onSaved={refresh} onCancel={() => setEditing(null)} />
        ) : (
          <div className="sb-orders">
            {data.categories.map((c) => (
              <div key={c.id} className="sb-prodrow">
                <div className="sb-prodrow__img">{c.image ? <img src={c.image} alt="" /> : <span>No cover</span>}</div>
                <div className="sb-prodrow__main">
                  <p className="sb-order__num">{c.label} <Badge tone={c.active ? "success" : "ink"}>{c.active ? "Active" : "Hidden"}</Badge></p>
                  <p className="sb-order__date">{count(c.id)} products · {c.showOnHome ? "Shown on home page" : "Not on home page"} · order {c.order}</p>
                </div>
                <div className="sb-prodrow__actions">
                  <Button size="sm" variant="secondary" onClick={() => { setNotice(""); setEditing(c); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(c)}>{c.active ? "Deactivate" : "Activate"}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
