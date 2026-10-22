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
import { Reveal } from "@/components/Reveal";
import { Activity } from "lucide-react";

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
    <div className="workspace-page mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <Reveal>
      <div className="flex flex-col justify-between gap-5 rounded-[2rem] bg-foreground p-6 text-background shadow-elevated sm:flex-row sm:items-end sm:p-9 md:p-11">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Shanta back office</p><h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Operations overview</h1><p className="mt-3 max-w-xl text-sm leading-6 text-background/65">Review orders, sellers, sourcing partners and support activity from one workspace.</p></div>
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-background/70"><Activity className="size-4 text-gold" aria-hidden /> Live operations</div>
      </div>
      </Reveal>
      <Reveal delay={100}>
      <Tabs defaultValue="orders" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-card">
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="operations">Queue</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="orders">Orders</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="catalog">Catalog</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="partners">Partners</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="sellers">Sellers</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="support">Support</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background" value="media">Media review</TabsTrigger>
        </TabsList>
        <TabsContent value="operations"><OperationsQueue /></TabsContent>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="catalog"><Catalog /></TabsContent>
        <TabsContent value="partners"><Partners /></TabsContent>
        <TabsContent value="sellers"><Sellers /></TabsContent>
        <TabsContent value="support"><SupportCases /></TabsContent>
        <TabsContent value="media"><MediaModeration /></TabsContent>
      </Tabs>
      </Reveal>
    </div>
  );
}

function OperationsQueue() {
  const [queue, setQueue] = useState("seller_decisions");
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["operations-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id, reference, status, order_type, seller_response, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ["operations-suspended-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_profiles")
        .select("id, business_name, status, reviewed_at")
        .eq("status", "suspended").order("reviewed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: supportCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["operations-open-support"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_cases")
        .select("id, order_id, subject, status, created_at, orders(reference)")
        .in("status", ["open", "in_progress", "waiting_on_customer"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: audit = [], isLoading: auditLoading } = useQuery({
    queryKey: ["operations-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_action_events")
        .select("id, actor_id, action, entity_type, entity_id, reason, created_at")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  const staleBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const pendingSeller = orders.filter((o) => o.order_type === "seller_listing" && o.seller_response === "pending" && o.status === "awaiting_customer_deposit");
  const stalled = orders.filter((o) => ["assigned", "purchased", "in_transit", "arrived", "ready_for_handover", "seller_preparing", "seller_in_delivery"].includes(o.status) && new Date(o.created_at).getTime() < staleBefore);
  const cancellations = orders.filter((o) => o.status === "cancelled");
  const queues = [
    { id: "seller_decisions", label: "Seller decisions", count: pendingSeller.length },
    { id: "stalled", label: "Stalled fulfillment · 7+ days", count: stalled.length },
    { id: "suspended", label: "Suspended sellers", count: sellers.length },
    { id: "cancellations", label: "Cancellations", count: cancellations.length },
    { id: "support", label: "Open support cases", count: supportCases.length },
    { id: "audit", label: "Recent admin actions", count: audit.length },
  ];
  const activeOrders = queue === "seller_decisions" ? pendingSeller : queue === "stalled" ? stalled : cancellations;
  const loading = (queue === "suspended" && sellersLoading) || (queue === "support" && casesLoading) || (queue === "audit" && auditLoading) || (!(["suspended", "support", "audit"].includes(queue)) && ordersLoading);
  return (
    <section className="mt-4 space-y-5">
      <div><h2 className="text-lg font-bold">Operational queues</h2><p className="text-sm text-muted-foreground">Review pending work and items that need follow-up.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {queues.map((item) => <Button key={item.id} type="button" variant={queue === item.id ? "default" : "outline"} className="h-auto justify-between gap-3 p-4" onClick={() => setQueue(item.id)}><span className="text-left whitespace-normal">{item.label}</span><span className="tabular-nums">{item.count}</span></Button>)}
      </div>
      <div className="divide-y rounded-md border bg-card">
        {loading && <p className="p-5 text-sm text-muted-foreground">Loading queue…</p>}
        {!loading && queue === "suspended" && (sellers.length ? sellers.map((seller) => <div key={seller.id} className="flex items-center justify-between gap-4 p-4"><span className="font-medium">{seller.business_name}</span><span className="text-sm text-muted-foreground">Suspended {seller.reviewed_at ? new Date(seller.reviewed_at).toLocaleDateString() : ""}</span></div>) : <p className="p-5 text-sm text-muted-foreground">No suspended sellers.</p>)}
        {!loading && queue === "support" && (supportCases.length ? supportCases.map((c) => <div key={c.id} className="flex items-center justify-between gap-4 p-4"><div><Link to="/account/orders/$id" params={{ id: c.order_id }} className="font-medium underline">{c.subject}</Link><p className="text-xs text-muted-foreground">{c.orders?.reference ?? "Order"} · {c.status.replaceAll("_", " ")}</p></div><span className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span></div>) : <p className="p-5 text-sm text-muted-foreground">No open support cases.</p>)}
        {!loading && queue === "audit" && (audit.length ? audit.map((event) => <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div><p className="font-medium">{event.action.replaceAll("_", " ")} · {event.entity_type.replaceAll("_", " ")}</p><p className="text-sm">{event.reason}</p><p className="text-xs text-muted-foreground">Admin {event.actor_id.slice(0, 8)} · Record {event.entity_id}</p></div><time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time></div>) : <p className="p-5 text-sm text-muted-foreground">No operational actions have been recorded.</p>)}
        {!loading && !(["suspended", "support", "audit"].includes(queue)) && (activeOrders.length ? activeOrders.map((o) => <div key={o.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{o.reference}</p><p className="text-xs text-muted-foreground">{o.status.replaceAll("_", " ")} · {o.order_type === "seller_listing" ? "Seller preorder" : "Dubai sourcing"}</p></div><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span><Link to="/account/orders/$id" params={{ id: o.id }} className="text-sm underline">View</Link></div></div>) : <p className="p-5 text-sm text-muted-foreground">Nothing in this queue.</p>)}
      </div>
    </section>
  );
}

function MediaModeration() {
  const qc = useQueryClient();
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["admin-listing-media-review"],
    queryFn: async () => {
      const [{ data: pending, error: pendingError }, { data: reports, error: reportError }] = await Promise.all([
        supabase.from("product_media").select("id, product_id, object_path, alt_text, moderation_status, moderation_note, created_at, products(name), product_variants(label)").eq("moderation_status", "pending").order("created_at", { ascending: true }),
        supabase.from("product_media_reports").select("id, media_id, reason, created_at").eq("status", "open").order("created_at", { ascending: true }),
      ]);
      if (pendingError) throw pendingError;
      if (reportError) throw reportError;
      const reportedIds = [...new Set((reports ?? []).map((report) => report.media_id))];
      const { data: reported, error: reportedError } = reportedIds.length
        ? await supabase.from("product_media").select("id, product_id, object_path, alt_text, moderation_status, moderation_note, created_at, products(name), product_variants(label)").in("id", reportedIds)
        : { data: [], error: null };
      if (reportedError) throw reportedError;
      const rows = new Map((pending ?? []).map((item) => [item.id, item]));
      for (const item of reported ?? []) rows.set(item.id, item);
      const signed = await Promise.all([...rows.values()].map(async (item) => {
        const { data: urlData } = await supabase.storage.from("seller-listing-media").createSignedUrl(item.object_path, 5 * 60);
        return urlData ? {
          ...item,
          url: urlData.signedUrl,
          productName: item.products?.name ?? "Seller listing",
          variantLabel: item.product_variants?.label ?? null,
          reports: (reports ?? []).filter((report) => report.media_id === item.id),
        } : null;
      }));
      return signed.filter((item) => item !== null);
    },
  });
  const moderate = async (id: string, status: "approved" | "rejected") => {
    const note = window.prompt(`Reason for marking this image ${status}:`)?.trim();
    if (!note) return;
    const { error } = await supabase.rpc("admin_review_product_media", { _media_id: id, _status: status, _note: note });
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Image approved" : "Image rejected and hidden");
    qc.invalidateQueries({ queryKey: ["admin-listing-media-review"] });
    qc.invalidateQueries({ queryKey: ["approved-product-media"] });
    qc.invalidateQueries({ queryKey: ["operations-audit"] });
  };
  return (
    <section className="mt-4 space-y-4">
      <div><h2 className="text-lg font-bold">Listing image review</h2><p className="text-sm text-muted-foreground">Images remain private until approved. Reported approved images appear here for review and can be taken down.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading images…</p>}
        {!isLoading && media.length === 0 && <p className="text-sm text-muted-foreground">No images need review.</p>}
        {media.map((item) => (
          <article key={item.id} className="space-y-3 rounded-md border bg-card p-4">
            <img src={item.url} alt={item.alt_text} className="aspect-square w-full rounded object-cover" />
            <div><p className="font-semibold">{item.productName}</p><p className="text-sm">{item.alt_text}</p><p className="text-xs text-muted-foreground">{item.variantLabel ? `Option: ${item.variantLabel}` : "All options"} · {item.moderation_status}</p></div>
            {item.reports.length > 0 && <div className="space-y-1 rounded bg-muted p-3"><p className="text-xs font-semibold">Open reports</p>{item.reports.map((report) => <p key={report.id} className="text-xs">{report.reason}</p>)}</div>}
            <div className="flex gap-2"><Button type="button" size="sm" onClick={() => moderate(item.id, "approved")}>Approve</Button><Button type="button" size="sm" variant="outline" onClick={() => moderate(item.id, "rejected")}>Reject / take down</Button></div>
          </article>
        ))}
      </div>
    </section>
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
    const note = window.prompt("Reason for this support case status change:")?.trim();
    if (!note) return;
    const { error } = await supabase.rpc("admin_set_support_case_status", {
      _case_id: caseId,
      _status: status,
      _note: note,
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
    const note = window.prompt(`Reason for changing this order to ${status.replaceAll("_", " ")}:`)?.trim();
    if (!note) return;
    const { error } = await supabase.rpc("admin_set_order_status", { _order_id: id, _status: status as never, _note: note });
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
                    .filter(([status]) => ["cancelled", "expired"].includes(status))
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
    const note = window.prompt(`Reason for ${status.replaceAll("_", " ")} this partner:`)?.trim();
    if (!note) return;
    const { error } = await supabase.rpc("admin_review_supplier", { _supplier_id: id, _status: status, _note: note });
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
    const note = window.prompt(`Reason for ${status.replaceAll("_", " ")} this seller:`)?.trim();
    if (!note) return;
    const { error } = await supabase.rpc("admin_review_seller", { _seller_id: id, _status: status, _note: note });
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
