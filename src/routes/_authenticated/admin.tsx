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
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="catalog"><Catalog /></TabsContent>
        <TabsContent value="partners"><Partners /></TabsContent>
        <TabsContent value="sellers"><Sellers /></TabsContent>
        <TabsContent value="support"><SupportCases /></TabsContent>
      </Tabs>
    </div>
  );
}

function SupportCases() {
  const qc = useQueryClient();
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["admin-support-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_cases")
        .select("id, order_id, subject, category, status, created_at, orders(reference)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const setCaseStatus = async (caseId: string, status: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed") => {
    const { error } = await supabase.rpc("admin_set_support_case_status", {
      _case_id: caseId,
      _status: status,
      _note: `Status changed to ${status.replaceAll("_", " ")}`,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-support-cases"] });
  };
  return (
    <div className="mt-4 divide-y rounded-md border bg-card">
      {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading support cases…</p>}
      {!isLoading && cases.length === 0 && <p className="p-5 text-sm text-muted-foreground">No support cases have been opened.</p>}
      {cases.map((supportCase) => (
        <div key={supportCase.id} className="flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <Link to="/account/orders/$id" params={{ id: supportCase.order_id }} className="font-semibold underline">{supportCase.subject}</Link>
            <p className="text-xs text-muted-foreground">{supportCase.orders?.reference ?? "Order"} · {supportCase.category.replaceAll("_", " ")} · {supportCase.status.replaceAll("_", " ")}</p>
          </div>
          <Select value={supportCase.status} onValueChange={(value) => setCaseStatus(supportCase.id, value as "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed")}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="waiting_on_customer">Waiting on buyer</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("id, reference, order_type, status, subtotal_etb_cents, deposit_etb_cents, created_at, order_items(product_name, variant_label, quantity)").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("admin_set_order_status", { _order_id: id, _status: status as never, _note: "Updated by operations" });
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  return (
    <div className="mt-4 overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Reference</th><th className="p-3">Flow</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Deposit</th><th className="p-3">Status</th><th className="p-3">Change</th></tr></thead>
        <tbody className="divide-y">
          {data.length === 0 && <tr><td colSpan={7} className="p-6 text-muted-foreground">No orders yet.</td></tr>}
          {data.map((o) => (
            <tr key={o.id}>
              <td className="tabular p-3">{o.reference}</td>
              <td className="p-3">{o.order_type === "seller_listing" ? "Seller preorder" : "Dubai sourcing"}</td>
              <td className="p-3">{o.order_items.map((i) => `${i.product_name} (${i.variant_label}) × ${i.quantity}`).join(", ")}</td>
              <td className="tabular p-3 text-right">{formatEtb(o.subtotal_etb_cents)}</td>
              <td className="tabular p-3 text-right">{formatEtb(o.deposit_etb_cents)}</td>
              <td className="p-3"><StatusBadge status={o.status} /></td>
              <td className="p-3">
                <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ORDER_STATUS_LABEL)
                    .filter(([status]) => ["awaiting_customer_deposit", "cancelled", "expired", "disputed"].includes(status))
                    .map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
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
    queryFn: async () => (await supabase.from("products").select("id, slug, name, brand, image_url, price_etb_cents, listing_type, is_published, product_variants(id)").order("created_at", { ascending: false })).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(f.price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { toast.error("Enter a valid price"); return; }
    const slug = (f.slug || f.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await supabase.from("products").insert({
      name: f.name, slug, brand: f.brand || null, description: f.description || null, image_url: f.image_url || null,
      price_etb_cents: cents, deposit_percent: Number(f.deposit_percent), delivery_days: Number(f.delivery_days),
      category_id: f.category_id || null, is_published: false,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    const labels = (f.variants || "Standard").split(",").map((s) => s.trim()).filter(Boolean);
    await supabase.from("product_variants").insert(labels.map((label, i) => ({ product_id: data.id, label, sort_order: i })));
    toast.success("Product created as draft");
    setF(emptyProduct);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const togglePublish = async (id: string, v: boolean) => {
    const { error } = await supabase.from("products").update({ is_published: v }).eq("id", id);
    if (error) { toast.error(error.message); return; }
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
              <p className="tabular text-xs text-muted-foreground">{p.listing_type === "seller" ? "Seller listing" : "Dubai sourcing"} · {p.brand} · {formatEtb(p.price_etb_cents)} · {p.product_variants.length} options</p>
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
    if (error) { toast.error(error.message); return; }
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

function Sellers() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const review = async (id: string, status: "verified" | "rejected" | "suspended") => {
    const { error } = await supabase.rpc("admin_review_seller", { _seller_id: id, _status: status });
    if (error) { toast.error(error.message); return; }
    toast.success("Seller account updated");
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    qc.invalidateQueries({ queryKey: ["my-seller"] });
  };
  return (
    <div className="mt-4 divide-y rounded-md border bg-card">
      {data.length === 0 && <p className="p-6 text-muted-foreground">No seller applications yet.</p>}
      {data.map((seller) => (
        <div key={seller.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">{seller.business_name}</p>
            <p className="text-sm text-muted-foreground">{seller.phone || "No phone provided"} · Applied {new Date(seller.created_at).toLocaleDateString()}</p>
            {seller.description && <p className="mt-1 max-w-xl text-sm">{seller.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={seller.status} label={seller.status} />
            {seller.status !== "verified" && <Button size="sm" onClick={() => review(seller.id, "verified")}>Verify</Button>}
            {seller.status === "pending" && <Button size="sm" variant="outline" onClick={() => review(seller.id, "rejected")}>Reject</Button>}
            {seller.status === "verified" && <Button size="sm" variant="outline" onClick={() => review(seller.id, "suspended")}>Suspend</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
