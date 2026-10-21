import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb, ORDER_STATUS_LABEL } from "@/lib/format";
import { productImage } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Operations — Shanta" },
      { name: "description", content: "Shanta operations: catalog, orders and partner verification." },
      { property: "og:title", content: "Operations — Shanta" },
      { property: "og:description", content: "Shanta operations dashboard." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="mx-auto max-w-7xl px-4 py-12">Loading…</div>;
  if (!isAdmin) return <div className="mx-auto max-w-7xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Operations access only</h1><Link to="/" className="mt-4 inline-block underline">Go home</Link></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold">Operations</h1>
      <Tabs defaultValue="orders" className="mt-6">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="catalog"><Catalog /></TabsContent>
        <TabsContent value="partners"><Partners /></TabsContent>
      </Tabs>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("id, reference, status, subtotal_etb_cents, deposit_etb_cents, created_at, order_items(product_name, variant_label, quantity)").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("admin_set_order_status", { _order_id: id, _status: status as never, _note: "Updated by operations" });
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  return (
    <div className="mt-4 overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Reference</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Deposit</th><th className="p-3">Status</th><th className="p-3">Change</th></tr></thead>
        <tbody className="divide-y">
          {data.length === 0 && <tr><td colSpan={6} className="p-6 text-muted-foreground">No orders yet.</td></tr>}
          {data.map((o) => (
            <tr key={o.id}>
              <td className="tabular p-3">{o.reference}</td>
              <td className="p-3">{o.order_items.map((i) => `${i.product_name} (${i.variant_label}) × ${i.quantity}`).join(", ")}</td>
              <td className="tabular p-3 text-right">{formatEtb(o.subtotal_etb_cents)}</td>
              <td className="tabular p-3 text-right">{formatEtb(o.deposit_etb_cents)}</td>
              <td className="p-3"><StatusBadge status={o.status} /></td>
              <td className="p-3">
                <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ORDER_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const emptyProduct = { name: "", slug: "", brand: "", description: "", image_url: "", price: "", deposit_percent: "30", delivery_days: "14", category_id: "", variants: "" };

function Catalog() {
  const qc = useQueryClient();
  const [f, setF] = useState(emptyProduct);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("id, name").order("sort_order")).data ?? [] });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("id, slug, name, brand, image_url, price_etb_cents, is_published, product_variants(id)").order("created_at", { ascending: false })).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(f.price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return toast.error("Enter a valid price");
    const slug = (f.slug || f.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await supabase.from("products").insert({
      name: f.name, slug, brand: f.brand || null, description: f.description || null, image_url: f.image_url || null,
      price_etb_cents: cents, deposit_percent: Number(f.deposit_percent), delivery_days: Number(f.delivery_days),
      category_id: f.category_id || null, is_published: false,
    }).select("id").single();
    if (error) return toast.error(error.message);
    const labels = (f.variants || "Standard").split(",").map((s) => s.trim()).filter(Boolean);
    await supabase.from("product_variants").insert(labels.map((label, i) => ({ product_id: data.id, label, sort_order: i })));
    toast.success("Product created as draft");
    setF(emptyProduct);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const togglePublish = async (id: string, v: boolean) => {
    const { error } = await supabase.from("products").update({ is_published: v }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  };

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-12">
      <form onSubmit={create} className="space-y-3 rounded-md border bg-card p-5 lg:col-span-5">
        <h2 className="font-bold">New product</h2>
        {([["name", "Name"], ["brand", "Brand"], ["slug", "URL slug (optional)"], ["image_url", "Image URL"], ["description", "Description"]] as const).map(([k, l]) => (
          <div key={k} className="space-y-1"><Label htmlFor={k}>{l}</Label><Input id={k} required={k === "name"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label htmlFor="price">Price (ETB)</Label><Input id="price" inputMode="decimal" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="dep">Deposit %</Label><Input id="dep" type="number" min={0} max={100} value={f.deposit_percent} onChange={(e) => setF({ ...f, deposit_percent: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="days">Days</Label><Input id="days" type="number" min={1} value={f.delivery_days} onChange={(e) => setF({ ...f, delivery_days: e.target.value })} /></div>
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label htmlFor="vars">Options (comma separated)</Label><Input id="vars" placeholder="50 ml, 100 ml" value={f.variants} onChange={(e) => setF({ ...f, variants: e.target.value })} /></div>
        <Button type="submit" className="h-11 w-full">Save as draft</Button>
      </form>
      <div className="divide-y rounded-md border bg-card lg:col-span-7">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4">
            <img src={productImage(p)} alt="" className="h-16 w-14 rounded object-cover" />
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="tabular text-xs text-muted-foreground">{p.brand} · {formatEtb(p.price_etb_cents)} · {p.product_variants.length} options</p>
            </div>
            <label className="flex items-center gap-2 text-sm">{p.is_published ? "Live" : "Draft"}<Switch checked={p.is_published} onCheckedChange={(v) => togglePublish(p.id, v)} /></label>
          </div>
        ))}
      </div>
    </div>
  );
}

function Partners() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("created_at", { ascending: false })).data ?? [] });
  const review = async (id: string, status: "verified" | "rejected" | "suspended") => {
    const { error } = await supabase.rpc("admin_review_supplier", { _supplier_id: id, _status: status });
    if (error) return toast.error(error.message);
    toast.success("Partner updated");
    qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
  };
  return (
    <div className="mt-4 divide-y rounded-md border bg-card">
      {data.length === 0 && <p className="p-6 text-muted-foreground">No partner applications yet.</p>}
      {data.map((s) => (
        <div key={s.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">{s.business_name}</p>
            <p className="text-sm text-muted-foreground">{s.base_city} · {s.phone}</p>
            {s.notes && <p className="mt-1 max-w-xl text-sm">{s.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={s.status} label={s.status} />
            {s.status !== "verified" && <Button size="sm" onClick={() => review(s.id, "verified")}>Verify</Button>}
            {s.status === "pending" && <Button size="sm" variant="outline" onClick={() => review(s.id, "rejected")}>Reject</Button>}
            {s.status === "verified" && <Button size="sm" variant="outline" onClick={() => review(s.id, "suspended")}>Suspend</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
