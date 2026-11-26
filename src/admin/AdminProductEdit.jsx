import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Input, Select, Skeleton, Textarea } from "../ui/index.js";
import { CATEGORY_META } from "../categoryMeta.js";
import { mergeCategories } from "../shop/categoryLogic.js";
import { useCatalogService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import ImageSelect from "./ImageSelect.jsx";
import { STATUSES, emptyProduct, productToForm, slugify, validateProduct } from "./productForm.js";
import { CatalogError } from "./catalogService.js";

function Editor({ service, product, categories: initialCategories, takenSlugs }) {
  const navigate = useNavigate();
  const isNew = !product;
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState(() => (product ? productToForm(product) : emptyProduct(initialCategories[0]?.id)));
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setVariant = (i, key) => (e) => setForm((f) => ({ ...f, variants: f.variants.map((v, n) => (n === i ? { ...v, [key]: e.target.value } : v)) }));
  const setExtra = (i, v) => setForm((f) => ({ ...f, extraImages: f.extraImages.map((x, n) => (n === i ? v : x)) }));

  const onName = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: isNew && !slugTouched ? slugify(name) : f.slug }));
  };

  const save = async (forceStatus) => {
    const next = forceStatus ? { ...form, status: forceStatus } : form;
    const res = validateProduct(next, { isNew, takenSlugs, categoryIds: categories.map((c) => c.id) });
    setNotice("");
    setProblem("");
    if (res.errors) {
      setErrors(res.errors);
      setProblem("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await service.saveProduct(res.data, { isNew });
      setForm(next);
      if (isNew) navigate(`/admin/products/${encodeURIComponent(res.data.slug)}`, { replace: true, state: { saved: true } });
      else setNotice(next.status === "published" ? "Saved. Customers see the change now." : "Saved.");
    } catch (e) {
      if (!(e instanceof CatalogError)) console.error(e);
      setProblem(e instanceof CatalogError ? e.message : "That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async () => {
    const label = newCat.trim();
    const id = slugify(label);
    if (!label || !id) return setCatError("Enter a name.");
    if (categories.some((c) => c.id === id)) return setCatError("A category with that name already exists.");
    try {
      await service.saveCategory(id, { label, active: true, showOnHome: true, order: 1000 });
      setCategories((c) => [...c, { id, label }]);
      setForm((f) => ({ ...f, category: id }));
      setNewCat("");
      setCatError("");
    } catch (e) {
      console.error(e);
      setCatError("Couldn't create it. Try again.");
    }
  };

  const priceShown = form.hasVariants ? form.variants.map((v) => Number(v.price)).filter((n) => n > 0) : [Number(form.price)];
  const previewPrice = priceShown.length && Math.min(...priceShown) ? `${form.hasVariants ? "From " : ""}₹${Math.min(...priceShown)}` : "";
  const err = (k) => errors[k];

  return (
    <>
      <Link className="sb-linkbtn sb-linkbtn--strong" to="/admin/products">Back to products</Link>
      <header className="sb-account__head sb-admin__orderhead">
        <div>
          <p className="sb-eyebrow">{isNew ? "New product" : "Edit product"}</p>
          <h1>{form.name || (isNew ? "New product" : "Product")}</h1>
          <p className="sb-account__lead">Changes appear on the shop as soon as you save a published product.</p>
        </div>
      </header>
      {notice && <Alert tone="success">{notice}</Alert>}
      {problem && <Alert tone="error">{problem}</Alert>}

      <div className="sb-admin__editor">
        <div className="sb-admin__stack">
          <Card padded className="sb-adminsec">
            <h2>Basics</h2>
            <Input label="Name" value={form.name} onChange={onName} error={err("name")} maxLength={100} />
            <Input label="Slug" value={form.slug} disabled={!isNew} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
              error={err("slug")} hint={isNew ? "Used in the web address: /product/your-slug. It can't be changed after saving." : "The slug can't be changed after saving. Duplicate the product to use a new one."} />
            <Select label="Category" value={form.category} onChange={set("category")} error={err("category")}>
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
            <div className="sb-adminsec__newcat">
              <p>Need a new category?</p>
              <div className="sb-adminsec__row">
                <Input label="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} error={catError} maxLength={60} />
                <Button variant="secondary" onClick={createCategory}>Create and select</Button>
              </div>
            </div>
            <Textarea label="Description" value={form.description} onChange={set("description")} rows={6} error={err("description")} hint="Write only what is true about this product." />
          </Card>

          <Card padded className="sb-adminsec">
            <h2>Photos</h2>
            <ImageSelect label="Cover photo" value={form.image} onChange={(v) => setForm((f) => ({ ...f, image: v }))} error={err("image")}
              hint="Pick from the files in public/products. To add a new photo, put the file in that folder and deploy." />
            {form.extraImages.map((src, i) => (
              <div key={i} className="sb-adminsec__row sb-adminsec__row--top">
                <div className="sb-adminsec__grow"><ImageSelect label={`Extra photo ${i + 1}`} value={src} onChange={(v) => setExtra(i, v)} /></div>
                <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, extraImages: f.extraImages.filter((_, n) => n !== i) }))}>Remove</Button>
              </div>
            ))}
            <div><Button variant="secondary" size="sm" onClick={() => setForm((f) => ({ ...f, extraImages: [...f.extraImages, ""] }))}>Add another photo</Button></div>
          </Card>

          <Card padded className="sb-adminsec">
            <h2>Price and stock</h2>
            <label className="sb-check">
              <input type="checkbox" checked={form.hasVariants} onChange={set("hasVariants")} />
              <span>This product has options<small className="sb-check__sub">For different sizes or pack counts, each with its own price. Stock is shared across the options.</small></span>
            </label>
            {form.hasVariants ? (
              <div className="sb-adminsec">
                {form.variants.map((v, i) => (
                  <div key={i} className="sb-adminsec__row sb-adminsec__row--top">
                    <div className="sb-adminsec__grow"><Input label={`Option ${i + 1} name`} value={v.label} onChange={setVariant(i, "label")} maxLength={60} /></div>
                    <div className="sb-adminsec__price"><Input label="Price (₹)" inputMode="numeric" value={v.price} onChange={setVariant(i, "price")} /></div>
                    <Button variant="ghost" size="sm" disabled={form.variants.length === 1} onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, n) => n !== i) }))}>Remove</Button>
                  </div>
                ))}
                {err("variants") && <p className="sb-field__error">{err("variants")}</p>}
                <div><Button variant="secondary" size="sm" onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { label: "", price: "" }] }))}>Add option</Button></div>
              </div>
            ) : (
              <div className="sb-formgrid sb-formgrid--2">
                <Input label="Price (₹)" inputMode="numeric" value={form.price} onChange={set("price")} error={err("price")} />
                <Input label="Original price (₹), optional" inputMode="numeric" value={form.originalPrice} onChange={set("originalPrice")} error={err("originalPrice")} hint="Fill this to show a discount. Use the earlier price you really charged." />
              </div>
            )}
            <div className="sb-formgrid sb-formgrid--2">
              <Input label="Stock quantity" inputMode="numeric" value={form.stock} onChange={set("stock")} error={err("stock")} hint="Leave empty if you don't track stock." />
              <Input label="Low-stock alert at" inputMode="numeric" value={form.lowStockAt} onChange={set("lowStockAt")} error={err("lowStockAt")} hint="Shows a low-stock label at or below this number." />
            </div>
            <label className="sb-check">
              <input type="checkbox" checked={form.inStock} onChange={set("inStock")} />
              <span>Available to order<small className="sb-check__sub">Turn off to pause this product even when stock is left.</small></span>
            </label>
          </Card>

          <Card padded className="sb-adminsec">
            <h2>Care</h2>
            <Textarea label="Care and storage instructions" value={form.careInstructions} onChange={set("careInstructions")} rows={4} error={err("careInstructions")} hint="Shown on the product page. Add only instructions you are sure about." />
          </Card>
        </div>

        <aside className="sb-admin__side2">
          <Card padded className="sb-adminsec">
            <h2>Publish</h2>
            <Select label="Status" value={form.status} onChange={set("status")} error={err("status")}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Input label="Sort order" inputMode="numeric" value={form.order} onChange={set("order")} error={err("order")} hint="Lower numbers appear first." />
            <label className="sb-check">
              <input type="checkbox" checked={form.featured} onChange={set("featured")} />
              <span>Feature on home page<small className="sb-check__sub">Shows in the Featured row, up to 8 products.</small></span>
            </label>
            <Button loading={busy} onClick={() => save("published")}>Save and publish</Button>
            <Button variant="secondary" loading={busy} onClick={() => save()}>{isNew ? "Save" : "Save changes"}</Button>
            {!isNew && form.status === "published" && <a className="sb-linkbtn sb-linkbtn--strong" href={`/product/${encodeURIComponent(form.slug)}`} target="_blank" rel="noopener noreferrer">View on the shop</a>}
          </Card>
          <Card padded className="sb-adminsec">
            <h2>Card preview</h2>
            <div className="sb-prodprev">
              <div className="sb-prodprev__img">{form.image ? <img src={form.image} alt="" /> : <span>No photo</span>}</div>
              <p className="sb-prodprev__name">{form.name || "Product name"}</p>
              <p className="sb-prodprev__price">{previewPrice}{!form.hasVariants && Number(form.originalPrice) > Number(form.price) && Number(form.price) > 0 ? <s>₹{form.originalPrice}</s> : null}</p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function AdminProductEdit() {
  const { slug } = useParams();
  const service = useCatalogService();
  const load = useCallback(async () => {
    const [product, all, remote] = await Promise.all([
      slug === "new" ? null : service.getProduct(slug), service.listProducts(), service.listCategories().catch(() => []),
    ]);
    return { product, takenSlugs: all.map((p) => p.slug), categories: mergeCategories(CATEGORY_META, remote) };
  }, [service, slug]);
  const { data, loading, error, retry } = useAsync(load);

  if (loading) return <div aria-busy="true"><Skeleton height={60} style={{ display: "block", marginBottom: 16 }} /><Skeleton height={360} style={{ display: "block" }} /></div>;
  if (error) return <Alert tone="error">We couldn't load this product. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>;
  if (slug !== "new" && !data.product) return <Alert tone="warning">We couldn't find that product. <Link className="sb-linkbtn sb-linkbtn--strong" to="/admin/products">Back to products</Link></Alert>;
  return <Editor key={slug} service={service} product={data.product} categories={data.categories} takenSlugs={data.takenSlugs} />;
}
