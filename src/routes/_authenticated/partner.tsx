import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEtb } from "@/lib/format";
import { SellerListingMediaManager } from "@/components/SellerListingMediaManager";
import { Reveal } from "@/components/Reveal";
import { BadgeCheck, Store, Truck } from "lucide-react";
import { MARKET_REGIONS, marketRegionLabel } from "@/lib/markets";
import type { Json } from "@/integrations/supabase/types";

type CategoryFacet = { key: string; label: string; options: string[] };

function readCategoryFacets(value: Json): CategoryFacet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const facet = item as { key?: Json; label?: Json; options?: Json };
    if (typeof facet.key !== "string" || typeof facet.label !== "string" || !Array.isArray(facet.options)) return [];
    return [{ key: facet.key, label: facet.label, options: facet.options.filter((option): option is string => typeof option === "string") }];
  });
}

export const Route = createFileRoute("/_authenticated/partner")({
  head: () => ({
    meta: [
      { title: "Seller & partner portal — Shanta" },
      { name: "description", content: "Publish seller listings or apply as a sourcing partner for a market you serve." },
      { property: "og:title", content: "Seller & partner portal — Shanta" },
      { property: "og:description", content: "Manage seller listings or join Shanta as a sourcing partner." },
    ],
  }),
  component: Partner,
});

const statusLabel = { pending: "Under review", verified: "Verified", rejected: "Not approved", suspended: "Suspended" } as const;

function Partner() {
  const { user, isSupplier } = useAuth();
  const qc = useQueryClient();
  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ["my-supplier", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ["my-seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: openOrders = [], isLoading: openOrdersLoading } = useQuery({
    queryKey: ["open-orders"],
    enabled: isSupplier && supplier?.status === "verified",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, subtotal_etb_cents, created_at, market_region, market_country, market_city, order_items(product_name, variant_label, quantity)")
        .eq("status", "open_for_assignment")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [supplierForm, setSupplierForm] = useState({ business_name: "", phone: "", base_city: "Dubai", market_region: "middle_east", market_country: "United Arab Emirates", notes: "" });
  const [sellerForm, setSellerForm] = useState({ business_name: "", phone: "", description: "" });
  const [supplierView, setSupplierView] = useState<"overview" | "orders" | "profile">("overview");
  const [submitting, setSubmitting] = useState<"supplier" | "seller" | null>(null);

  if (loadingSupplier || loadingSeller) return <div className="mx-auto max-w-4xl px-4 py-12">Loading partner portal…</div>;

  const applySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("supplier");
    const { error } = await supabase.from("suppliers").insert({ ...supplierForm, user_id: user!.id });
    setSubmitting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Sourcing partner application submitted");
    qc.invalidateQueries({ queryKey: ["my-supplier"] });
  };

  const applySeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("seller");
    const { error } = await supabase.from("seller_profiles").insert({ ...sellerForm, user_id: user!.id });
    setSubmitting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Seller application submitted");
    qc.invalidateQueries({ queryKey: ["my-seller"] });
  };

  return (
    <div className="workspace-page mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <Reveal>
      <div className="relative overflow-hidden rounded-[2rem] bg-foreground p-6 text-background shadow-elevated sm:p-9 md:p-12">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Your Shanta workspace</p><h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Make your next move.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-background/65">Build a local seller storefront, source orders in the markets you serve, or take part in both. Each channel keeps its own order flow and terms.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"><span className="grid size-9 place-items-center rounded-full bg-gold text-foreground"><Store className="size-4" /></span><span className="text-xs font-medium">List products by market</span></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"><span className="grid size-9 place-items-center rounded-full bg-white/10"><BadgeCheck className="size-4" /></span><span className="text-xs font-medium">Set price and deposit</span></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"><span className="grid size-9 place-items-center rounded-full bg-white/10"><Truck className="size-4" /></span><span className="text-xs font-medium">Source across regions</span></div></div>
        </div>
      </div>
      </Reveal>

      <Reveal delay={90}>
      <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-card md:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">For local sellers</p><h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Sell your products</h2>
        <p className="mt-1 text-sm text-muted-foreground">Apply to publish products, set your ETB price and deposit percentage, and manage your listings.</p>
        {!seller ? (
          <form className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2" onSubmit={applySeller}>
            <Field id="seller-business" label="Business or seller name" required value={sellerForm.business_name} onChange={(value) => setSellerForm({ ...sellerForm, business_name: value })} />
            <Field id="seller-phone" label="Phone (WhatsApp)" value={sellerForm.phone} onChange={(value) => setSellerForm({ ...sellerForm, phone: value })} />
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="seller-description">About your products</Label>
              <Textarea id="seller-description" value={sellerForm.description} onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })} />
            </div>
            <Button type="submit" className="h-11 md:col-span-2" disabled={submitting !== null}>
              {submitting === "seller" ? "Submitting…" : "Apply to sell on Shanta"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl bg-secondary/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{seller.business_name}</p>
                <p className="text-sm text-muted-foreground">{seller.description || "Seller account"}</p>
              </div>
              <StatusBadge status={seller.status} label={statusLabel[seller.status]} />
            </div>
            {seller.status === "pending" && <p className="mt-3 text-sm text-muted-foreground">Your application is under review. You can create and publish listings after verification.</p>}
            {seller.status === "rejected" && <p className="mt-3 text-sm text-muted-foreground">This application was not approved. Contact Shanta support if you need help.</p>}
            {seller.status === "suspended" && <p className="mt-3 text-sm text-muted-foreground">Seller publishing is paused while this account is suspended.</p>}
            {seller.status === "verified" && <SellerListings userId={user!.id} />}
          </div>
        )}
      </section>
      </Reveal>

      <Reveal delay={140}>
      <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-card md:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">For sourcing partners</p><h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Source orders by market</h2>
        <p className="mt-1 text-sm text-muted-foreground">Verified partners can take eligible sourcing assignments in the countries they serve and commit a separate fee for each order.</p>
        {!supplier ? (
          <form className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2" onSubmit={applySupplier}>
            <Field id="supplier-business" label="Business or trading name" required value={supplierForm.business_name} onChange={(value) => setSupplierForm({ ...supplierForm, business_name: value })} />
            <Field id="supplier-phone" label="Phone (WhatsApp)" required value={supplierForm.phone} onChange={(value) => setSupplierForm({ ...supplierForm, phone: value })} />
            <div className="space-y-1.5"><Label htmlFor="supplier-market-region">Market region</Label><Select value={supplierForm.market_region} onValueChange={(market_region) => setSupplierForm({ ...supplierForm, market_region })}><SelectTrigger id="supplier-market-region"><SelectValue /></SelectTrigger><SelectContent>{MARKET_REGIONS.map((market) => <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>)}</SelectContent></Select></div>
            <Field id="supplier-market-country" label="Market country" required value={supplierForm.market_country} onChange={(market_country) => setSupplierForm({ ...supplierForm, market_country })} />
            <Field id="supplier-city" label="Base city" value={supplierForm.base_city} onChange={(value) => setSupplierForm({ ...supplierForm, base_city: value })} />
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="supplier-notes">Experience & travel schedule</Label>
              <Textarea id="supplier-notes" value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
            </div>
            <Button type="submit" className="h-11 md:col-span-2" disabled={submitting !== null}>
              {submitting === "supplier" ? "Submitting…" : "Apply as a sourcing partner"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl bg-secondary/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{supplier.business_name}</p>
                <p className="text-sm text-muted-foreground">{supplier.base_city}, {supplier.market_country} · {supplier.phone}</p>
              </div>
              <StatusBadge status={supplier.status} label={statusLabel[supplier.status]} />
            </div>
            {supplier.status === "pending" && <p className="mt-3 text-sm text-muted-foreground">Your sourcing partner application is under review.</p>}
            {supplier.status === "rejected" && <p className="mt-3 text-sm text-muted-foreground">This application was not approved. Contact Shanta support if you need help.</p>}
            {supplier.status === "suspended" && <p className="mt-3 text-sm text-muted-foreground">Sourcing assignments are unavailable while this account is suspended.</p>}
          </div>
        )}
        {isSupplier && supplier?.status === "verified" && (
          <div className="mt-6 overflow-hidden rounded-3xl border bg-background">
            <div className="grid gap-5 border-b p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{marketRegionLabel(supplier.market_region)} · {supplier.market_country}</p><h3 className="mt-1 font-display text-2xl">Partner workspace</h3><p className="mt-1 text-sm text-muted-foreground">Review eligible sourcing requests and keep your partner details current.</p></div>
              <div className="rounded-2xl bg-secondary/60 px-4 py-3"><p className="text-xs text-muted-foreground">Open requests</p><p className="mt-1 font-display text-2xl tabular-nums">{openOrdersLoading ? "—" : openOrders.length}</p></div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-b px-4" role="tablist" aria-label="Sourcing partner workspace">
              {([["overview", "Overview"], ["orders", "Open requests"], ["profile", "Partner profile"]] as const).map(([tab, label]) => (
                <button key={tab} type="button" role="tab" aria-selected={supplierView === tab} aria-controls={`supplier-panel-${tab}`} onKeyDown={(event) => {
                  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
                  const currentIndex = tabs.indexOf(event.currentTarget);
                  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
                  tabs[nextIndex]?.focus();
                  tabs[nextIndex]?.click();
                }} onClick={() => setSupplierView(tab)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${supplierView === tab ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>
              ))}
            </div>
            <section id="supplier-panel-overview" role="tabpanel" hidden={supplierView !== "overview"} className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your sourcing path</p><p className="mt-2 font-display text-xl">A request at a time.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Review the order details and delivery expectations before taking part in an eligible sourcing request in your market.</p></div>
              <div className="rounded-2xl border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current access</p><p className="mt-2 font-medium">{supplier.business_name}</p><p className="mt-1 text-sm text-muted-foreground">{supplier.base_city}, {supplier.market_country} · verified partner</p><Button className="mt-4" variant="outline" onClick={() => setSupplierView("orders")}>View open requests</Button></div>
              <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Request claiming and assignment fee payments are not available in this workspace yet. Existing order and payment rules remain unchanged.</p>
            </section>
            <section id="supplier-panel-orders" role="tabpanel" hidden={supplierView !== "orders"} className="p-5 md:p-6">
              <h4 className="font-display text-xl">Requests open for assignment</h4><p className="mt-1 text-sm text-muted-foreground">These requests match your registered market. Seller preorders are handled in the seller workspace.</p>
              <div className="mt-4 divide-y rounded-2xl border">
                {openOrdersLoading && <p className="p-5 text-sm text-muted-foreground">Loading open sourcing requests…</p>}
                {!openOrdersLoading && openOrders.length === 0 && <p className="p-5 text-sm text-muted-foreground">No open sourcing requests right now.</p>}
                {openOrders.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div><p className="tabular text-xs text-muted-foreground">{o.reference} · {[o.market_city, o.market_country].filter(Boolean).join(", ")}</p><p className="font-medium">{o.order_items.map((i) => `${i.product_name} (${i.variant_label}) × ${i.quantity}`).join(", ")}</p></div>
                    <span className="tabular text-sm">{formatEtb(o.subtotal_etb_cents)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section id="supplier-panel-profile" role="tabpanel" hidden={supplierView !== "profile"} className="grid gap-4 p-5 sm:grid-cols-2 md:p-6">
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Business name</p><p className="mt-1 font-medium">{supplier.business_name}</p></div>
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Market</p><p className="mt-1 font-medium">{marketRegionLabel(supplier.market_region)} · {supplier.market_country}</p></div>
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Base city</p><p className="mt-1 font-medium">{supplier.base_city}</p></div>
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Partner phone</p><p className="mt-1 font-medium">{supplier.phone}</p></div>
              <div className="rounded-2xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Application notes</p><p className="mt-1 font-medium">{supplier.notes || "No notes provided"}</p></div>
              <Link to="/account" className="text-sm font-medium underline-offset-4 hover:underline sm:col-span-2">Go to account, orders and notifications</Link>
            </section>
          </div>
        )}
      </section>
      </Reveal>
    </div>
  );
}

function Field({ id, label, value, onChange, required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="h-11" />
    </div>
  );
}

type ListingForm = {
  name: string;
  brand: string;
  description: string;
  price: string;
  deposit_percent: string;
  delivery_days: string;
  category_id: string;
  catalog_attributes: Record<string, string>;
  variants: string;
  market_region: string;
  market_country: string;
  market_city: string;
};

const emptyListing: ListingForm = {
  name: "", brand: "", description: "", price: "", deposit_percent: "30", delivery_days: "7", category_id: "", catalog_attributes: {}, variants: "Standard", market_region: "africa", market_country: "Ethiopia", market_city: "",
};

function SellerListings({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "listings" | "preorders" | "support">("overview");
  const [form, setForm] = useState<ListingForm>(emptyListing);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState({ price: "", deposit_percent: "" });
  const [marketEditingId, setMarketEditingId] = useState<string | null>(null);
  const [marketEdit, setMarketEdit] = useState({ market_region: "africa", market_country: "Ethiopia", market_city: "" });
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, string>>({});
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, filter_definitions").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const selectedCategory = categories.find((category) => category.id === form.category_id);
  const categoryFacets = selectedCategory ? readCategoryFacets(selectedCategory.filter_definitions) : [];
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, brand, description, delivery_days, price_etb_cents, deposit_percent, is_published, market_region, market_country, market_city, product_variants(id, label, inventory_limit, inventory_committed)")
        .eq("seller_user_id", userId)
        .eq("listing_type", "seller")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: sellerOrders = [] } = useQuery({
    queryKey: ["seller-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, status, seller_response, seller_responded_at, subtotal_etb_cents, deposit_etb_cents, created_at, order_items(product_name, variant_label, quantity)")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: sellerSupportCases = [] } = useQuery({
    queryKey: ["seller-support-cases", userId, sellerOrders.map((order) => order.id).join(",")],
    enabled: sellerOrders.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_cases")
        .select("id, order_id, subject, category, status, updated_at")
        .in("order_id", sellerOrders.map((order) => order.id))
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(Number(form.price) * 100);
    const depositPercent = Number(form.deposit_percent);
    const deliveryDays = Number(form.delivery_days);
    const labels = form.variants.split(",").map((label) => label.trim()).filter(Boolean);
    if (!form.category_id) {
      toast.error("Choose a category for this listing");
      return;
    }
    if (categoryFacets.some((facet) => !form.catalog_attributes[facet.key])) {
      toast.error("Choose the category details before saving this listing");
      return;
    }
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) { toast.error("Enter a valid price greater than zero"); return; }
    if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) { toast.error("Deposit must be between 1 and 100 percent"); return; }
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) { toast.error("Delivery estimate must be between 1 and 365 days"); return; }
    if (labels.length === 0 || labels.length > 20) { toast.error("Add between 1 and 20 options"); return; }

    const slugBase = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase || "product"}-${userId.slice(0, 6)}-${Date.now().toString(36)}`;
    setSaving(true);
    const { error } = await supabase.rpc("create_seller_listing_with_market", {
      _name: form.name,
      _slug: slug,
      _brand: form.brand,
      _description: form.description,
      _image_url: "",
      _price_etb_cents: priceCents,
      _deposit_percent: depositPercent,
      _delivery_days: deliveryDays,
      _category_id: form.category_id || null,
      _variant_labels: labels,
      _market_region: form.market_region,
      _market_country: form.market_country.trim(),
      _market_city: form.market_city.trim() || null,
      _catalog_attributes: Object.fromEntries(categoryFacets.map((facet) => [facet.key, form.catalog_attributes[facet.key]])),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Listing saved as a draft");
    setForm(emptyListing);
    qc.invalidateQueries({ queryKey: ["seller-listings", userId] });
  };

  const toggleListing = async (id: string, published: boolean) => {
    const { error } = await supabase.from("products").update({ is_published: published }).eq("id", id).eq("seller_user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(published ? "Listing published" : "Listing paused");
    qc.invalidateQueries({ queryKey: ["seller-listings", userId] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const savePrice = async (id: string) => {
    const priceCents = Math.round(Number(priceEdit.price) * 100);
    const depositPercent = Number(priceEdit.deposit_percent);
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) { toast.error("Enter a valid price greater than zero"); return; }
    if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) { toast.error("Deposit must be between 1 and 100 percent"); return; }
    const { error } = await supabase.from("products").update({ price_etb_cents: priceCents, deposit_percent: depositPercent }).eq("id", id).eq("seller_user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Listing price updated");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["seller-listings", userId] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const saveMarket = async (id: string) => {
    const country = marketEdit.market_country.trim();
    const city = marketEdit.market_city.trim();
    if (country.length < 2 || country.length > 80) { toast.error("Enter a country between 2 and 80 characters"); return; }
    if (city && (city.length < 2 || city.length > 80)) { toast.error("Enter a city between 2 and 80 characters"); return; }
    const { data, error } = await supabase.from("products").update({
      market_region: marketEdit.market_region,
      market_country: country,
      market_city: city || null,
    }).eq("id", id).eq("seller_user_id", userId).eq("listing_type", "seller").select("id").maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!data) { toast.error("This listing could not be updated. Refresh and try again."); return; }
    toast.success("Listing market updated");
    setMarketEditingId(null);
    qc.invalidateQueries({ queryKey: ["seller-listings", userId] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const saveInventoryLimit = async (variant: { id: string; inventory_committed: number; inventory_limit: number | null }) => {
    const raw = inventoryEdits[variant.id] ?? "";
    const limit = raw.trim() === "" ? null : Number(raw);
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < variant.inventory_committed)) {
      toast.error(`Capacity must be at least ${variant.inventory_committed} committed units`);
      return;
    }
    const { error } = await supabase.from("product_variants").update({ inventory_limit: limit }).eq("id", variant.id);
    if (error) { toast.error(error.message); return; }
    toast.success(limit === null ? "Preorder limit removed" : "Preorder limit updated");
    setInventoryEdits((current) => { const next = { ...current }; delete next[variant.id]; return next; });
    qc.invalidateQueries({ queryKey: ["seller-listings", userId] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  };

  const respondToOrder = async (orderId: string, response: "accepted" | "declined") => {
    const { error } = await supabase.rpc("seller_respond_to_order", {
      _order_id: orderId,
      _response: response,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(response === "accepted" ? "Preorder availability confirmed" : "Preorder declined and cancelled");
    qc.invalidateQueries({ queryKey: ["seller-orders", userId] });
    qc.invalidateQueries({ queryKey: ["order"] });
    qc.invalidateQueries({ queryKey: ["my-orders", userId] });
    qc.invalidateQueries({ queryKey: ["my-notifications", userId] });
    qc.invalidateQueries({ queryKey: ["unread-notifications", userId] });
  };

  const publishedListings = listings.filter((listing) => listing.is_published).length;
  const waitingForSeller = sellerOrders.filter((order) => order.status === "awaiting_customer_deposit" && order.seller_response === "pending").length;
  const activeSupportCases = sellerSupportCases.filter((supportCase) => supportCase.status === "open" || supportCase.status === "in_progress").length;

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Seller studio</p>
          <h3 className="mt-1 font-display text-2xl font-medium sm:text-3xl">Your local storefront</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Advertise products before they are ready, set your price and deposit terms, and review incoming preorder requests. A preorder records interest; it does not collect payment.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs text-muted-foreground">All listings</p><p className="mt-1 font-display text-3xl tabular-nums">{listings.length}</p></div>
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs text-muted-foreground">Currently advertised</p><p className="mt-1 font-display text-3xl tabular-nums">{publishedListings}</p></div>
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs text-muted-foreground">Need your response</p><p className="mt-1 font-display text-3xl tabular-nums">{waitingForSeller}</p></div>
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs text-muted-foreground">Active support cases</p><p className="mt-1 font-display text-3xl tabular-nums">{activeSupportCases}</p></div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b" role="tablist" aria-label="Seller workspace">
        {([
          ["overview", "Overview"],
          ["listings", "Listings"],
          ["preorders", `Preorders${waitingForSeller ? ` · ${waitingForSeller}` : ""}`],
          ["support", `Support${activeSupportCases ? ` · ${activeSupportCases}` : ""}`],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" role="tab" aria-selected={workspaceTab === tab} aria-controls={`seller-panel-${tab}`} onKeyDown={(event) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
            const currentIndex = tabs.indexOf(event.currentTarget);
            const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
            tabs[nextIndex]?.focus();
            tabs[nextIndex]?.click();
          }} onClick={() => setWorkspaceTab(tab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${workspaceTab === tab ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <section id="seller-panel-overview" role="tabpanel" hidden={workspaceTab !== "overview"} className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border bg-background p-5 md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your next steps</p>
            <h4 className="mt-2 font-display text-2xl">Keep your storefront moving.</h4>
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-secondary/55 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-xs font-semibold">01</span><div><p className="text-sm font-medium">Create and advertise a product</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Add photos, options, delivery estimates, your ETB price and the deposit percentage buyers will see.</p></div></div>
              <div className="flex items-start gap-3 rounded-2xl bg-secondary/55 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-xs font-semibold">02</span><div><p className="text-sm font-medium">Review each preorder request</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Accept to confirm availability at the saved terms, or decline to cancel the unpaid request.</p></div></div>
              <div className="flex items-start gap-3 rounded-2xl bg-secondary/55 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-xs font-semibold">03</span><div><p className="text-sm font-medium">Keep buyers informed</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Order updates and support conversations are available from each preorder.</p></div></div>
            </div>
            <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs leading-5 text-muted-foreground">Online deposit collection is not enabled yet. Buyers can submit a preorder and see the deposit due, but it is not marked paid.</p>
          </div>
          <div className="rounded-3xl border bg-background p-5 md:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action queue</p><h4 className="mt-1 font-display text-2xl">Preorders to review</h4></div><BadgeCheck className="size-5 text-gold" aria-hidden /></div>
            {waitingForSeller === 0 ? <p className="mt-5 rounded-2xl bg-secondary/55 p-4 text-sm text-muted-foreground">You are all caught up. New preorder requests will appear here.</p> : (
              <div className="mt-4 space-y-3">{sellerOrders.filter((order) => order.status === "awaiting_customer_deposit" && order.seller_response === "pending").slice(0, 3).map((order) => (
                <div key={order.id} className="rounded-2xl border p-4"><p className="tabular text-xs text-muted-foreground">{order.reference} · {new Date(order.created_at).toLocaleDateString()}</p><p className="mt-1 text-sm font-medium">{order.order_items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}</p><p className="mt-1 text-xs text-muted-foreground">Deposit due: {formatEtb(order.deposit_etb_cents)} · not yet paid</p></div>
              ))}</div>
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => setWorkspaceTab("preorders")}>Open preorder queue</Button>
            <Button className="mt-2 w-full" onClick={() => setWorkspaceTab("listings")}>Manage product listings</Button>
            <Link to="/account" className="mt-4 block text-center text-sm font-medium underline-offset-4 hover:underline">Account, orders and notifications</Link>
          </div>
        </section>

      <section id="seller-panel-listings" role="tabpanel" hidden={workspaceTab !== "listings"} className="mt-5">
      <h3 className="font-display text-2xl font-medium">Your product listings</h3>
      <p className="mt-1 text-sm text-muted-foreground">Create a draft, choose its price and deposit, add listing details, then upload images for review before publishing.</p>
      <form onSubmit={createListing} className="mt-5 grid gap-3 rounded-md border bg-background p-4 md:grid-cols-2">
        <Field id="listing-name" label="Product name" required value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field id="listing-brand" label="Brand (optional)" value={form.brand} onChange={(brand) => setForm({ ...form, brand })} />
        <Field id="listing-price" label="Price (ETB)" required value={form.price} onChange={(price) => setForm({ ...form, price })} />
        <Field id="listing-deposit" label="Deposit percentage (1–100)" value={form.deposit_percent} onChange={(deposit_percent) => setForm({ ...form, deposit_percent })} />
        <Field id="listing-delivery" label="Estimated delivery days" value={form.delivery_days} onChange={(delivery_days) => setForm({ ...form, delivery_days })} />
        <div className="space-y-1.5"><Label htmlFor="listing-market-region">Market region</Label><Select value={form.market_region} onValueChange={(market_region) => setForm({ ...form, market_region })}><SelectTrigger id="listing-market-region"><SelectValue /></SelectTrigger><SelectContent>{MARKET_REGIONS.map((market) => <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>)}</SelectContent></Select></div>
        <Field id="listing-market-country" label="Market country" required value={form.market_country} onChange={(market_country) => setForm({ ...form, market_country })} />
        <Field id="listing-market-city" label="Market city (optional)" value={form.market_city} onChange={(market_city) => setForm({ ...form, market_city })} />
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category_id} onValueChange={(category_id) => setForm({ ...form, category_id, catalog_attributes: {} })}>
            <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {categoryFacets.map((facet) => <div key={facet.key} className="space-y-1.5">
          <Label htmlFor={`listing-facet-${facet.key}`}>{facet.label}</Label>
          <Select value={form.catalog_attributes[facet.key] ?? "__choose__"} onValueChange={(value) => setForm({ ...form, catalog_attributes: { ...form.catalog_attributes, [facet.key]: value === "__choose__" ? "" : value } })}>
            <SelectTrigger id={`listing-facet-${facet.key}`}><SelectValue placeholder={`Choose ${facet.label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent><SelectItem value="__choose__">Choose {facet.label.toLowerCase()}</SelectItem>{facet.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
          </Select>
        </div>)}
        <Field id="listing-variants" label="Options (comma separated)" value={form.variants} onChange={(variants) => setForm({ ...form, variants })} />
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="listing-description">Description</Label>
          <Textarea id="listing-description" maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <p className="text-right text-xs text-muted-foreground">{form.description.length}/3000</p>
        </div>
        <div className="rounded-md border bg-muted/40 p-4 md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Customer preview</p><p className="mt-2 font-semibold">{form.name || "Your product name"}</p><p className="mt-1 text-xs text-muted-foreground">{form.brand || "Brand"} · {form.delivery_days || "—"} day delivery estimate</p><p className="mt-2 text-sm text-muted-foreground">{form.description || "Add a clear description of the product and its condition."}</p></div>
        <Button type="submit" className="h-11 md:col-span-2" disabled={saving}>{saving ? "Saving…" : "Save listing draft"}</Button>
      </form>
      <div className="mt-5 divide-y rounded-md border bg-background">
        {listings.length === 0 && <p className="p-5 text-sm text-muted-foreground">You have no listings yet.</p>}
        {listings.map((listing) => (
          <div key={listing.id} className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{listing.name}</p>
              <p className="tabular text-sm text-muted-foreground">{formatEtb(listing.price_etb_cents)} · {listing.deposit_percent}% deposit · {listing.product_variants.length} options</p>
              <p className="mt-1 text-xs text-muted-foreground">{listing.market_city ? `${listing.market_city}, ` : ""}{listing.market_country} · {marketRegionLabel(listing.market_region)}</p>
              {marketEditingId === listing.id && (
                <div className="mt-3 grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2">
                  <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">This changes the market shown on your listing. Orders already placed keep their saved market details.</p>
                  <div className="space-y-1.5"><Label htmlFor={`market-region-${listing.id}`}>Market region</Label><Select value={marketEdit.market_region} onValueChange={(market_region) => setMarketEdit({ ...marketEdit, market_region })}><SelectTrigger id={`market-region-${listing.id}`}><SelectValue /></SelectTrigger><SelectContent>{MARKET_REGIONS.map((market) => <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label htmlFor={`market-country-${listing.id}`}>Country</Label><Input id={`market-country-${listing.id}`} maxLength={80} value={marketEdit.market_country} onChange={(event) => setMarketEdit({ ...marketEdit, market_country: event.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor={`market-city-${listing.id}`}>City (optional)</Label><Input id={`market-city-${listing.id}`} maxLength={80} value={marketEdit.market_city} onChange={(event) => setMarketEdit({ ...marketEdit, market_city: event.target.value })} /></div>
                  <div className="flex items-end gap-2"><Button type="button" size="sm" onClick={() => void saveMarket(listing.id)}>Save market</Button><Button type="button" size="sm" variant="ghost" onClick={() => setMarketEditingId(null)}>Cancel</Button></div>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {listing.product_variants.map((variant) => (
                  <div key={variant.id} className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                    <span>{variant.label}</span>
                    <span className="text-muted-foreground">{variant.inventory_limit === null ? "Unlimited" : `${variant.inventory_committed}/${variant.inventory_limit} committed`}</span>
                    <Input
                      aria-label={`Preorder limit for ${variant.label}`}
                      className="h-8 w-24 bg-background"
                      type="number"
                      min={variant.inventory_committed}
                      step={1}
                      placeholder="Unlimited"
                      value={inventoryEdits[variant.id] ?? (variant.inventory_limit === null ? "" : String(variant.inventory_limit))}
                      onChange={(event) => setInventoryEdits((current) => ({ ...current, [variant.id]: event.target.value }))}
                    />
                    <Button size="sm" variant="outline" onClick={() => saveInventoryLimit(variant)}>Save limit</Button>
                  </div>
                ))}
              </div>
              {editingId === listing.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="w-36 space-y-1"><Label htmlFor={`price-${listing.id}`}>Price (ETB)</Label><Input id={`price-${listing.id}`} inputMode="decimal" value={priceEdit.price} onChange={(e) => setPriceEdit({ ...priceEdit, price: e.target.value })} /></div>
                  <div className="w-36 space-y-1"><Label htmlFor={`deposit-${listing.id}`}>Deposit (%)</Label><Input id={`deposit-${listing.id}`} type="number" min={1} max={100} value={priceEdit.deposit_percent} onChange={(e) => setPriceEdit({ ...priceEdit, deposit_percent: e.target.value })} /></div>
                  <Button size="sm" onClick={() => savePrice(listing.id)}>Save price</Button>
                </div>
              )}
            </div>
            {editingId !== listing.id && (
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(listing.id);
                setPriceEdit({ price: (listing.price_etb_cents / 100).toFixed(2), deposit_percent: String(listing.deposit_percent) });
              }}>Edit price</Button>
            )}
            {marketEditingId !== listing.id && (
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setMarketEditingId(listing.id);
                setMarketEdit({ market_region: listing.market_region, market_country: listing.market_country, market_city: listing.market_city ?? "" });
              }}>Edit market</Button>
            )}
            <label className="flex items-center gap-2 text-sm">
              {listing.is_published ? "Published" : "Draft"}
              <Switch checked={listing.is_published} onCheckedChange={(checked) => toggleListing(listing.id, checked)} />
            </label>
            </div>
            <SellerListingMediaManager productId={listing.id} sellerId={userId} productName={listing.name} description={listing.description} deliveryDays={listing.delivery_days} variants={listing.product_variants.map(({ id, label }) => ({ id, label }))} />
          </div>
        ))}
      </div>
      </section>

      <section id="seller-panel-preorders" role="tabpanel" hidden={workspaceTab !== "preorders"} className="mt-5">
      <section className="mt-8">
        <h4 className="font-semibold">Orders for your listings</h4>
        <p className="mt-1 text-sm text-muted-foreground">Confirm whether you can fulfill a preorder at its listed terms. Acceptance does not mean the deposit was paid or that fulfillment has started. Customer contact details are not shown here.</p>
        <div className="mt-4 divide-y rounded-md border bg-background">
          {sellerOrders.length === 0 && <p className="p-5 text-sm text-muted-foreground">No preorders yet.</p>}
          {sellerOrders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="tabular text-xs text-muted-foreground">{order.reference} · {new Date(order.created_at).toLocaleDateString()}</p>
                <p className="font-medium">{order.order_items.map((item) => `${item.product_name} (${item.variant_label}) × ${item.quantity}`).join(", ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Deposit due: {formatEtb(order.deposit_etb_cents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seller response: {order.seller_response === "accepted" ? "Availability confirmed" : order.seller_response === "declined" ? "Declined" : "Waiting for your response"}
                </p>
                <Link to="/account/orders/$id" params={{ id: order.id }} className="mt-2 inline-block text-xs underline">Open order and support conversation</Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm">{formatEtb(order.subtotal_etb_cents)}</span>
                <StatusBadge status={order.status} />
                {order.seller_response === "pending" && order.status === "awaiting_customer_deposit" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => respondToOrder(order.id, "declined")}>Decline</Button>
                    <Button size="sm" onClick={() => respondToOrder(order.id, "accepted")}>Accept preorder</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      </section>

      <section id="seller-panel-support" role="tabpanel" hidden={workspaceTab !== "support"} className="mt-5">
        <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Customer care</p><h3 className="mt-1 font-display text-2xl font-medium">Order support</h3><p className="mt-1 text-sm text-muted-foreground">Continue private conversations attached to your seller orders. Buyer contact details are not shown in this queue.</p></div>
        <div className="divide-y rounded-2xl border bg-background">
          {sellerSupportCases.length === 0 && <p className="p-5 text-sm text-muted-foreground">No support conversations are attached to your orders.</p>}
          {sellerSupportCases.map((supportCase) => (
              <div key={supportCase.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0"><p className="tabular text-xs text-muted-foreground">{sellerOrders.find((order) => order.id === supportCase.order_id)?.reference ?? "Seller order"} · Updated {new Date(supportCase.updated_at).toLocaleDateString()}</p><p className="mt-1 font-medium">{supportCase.subject}</p><p className="mt-1 text-xs text-muted-foreground">{supportCase.category.replaceAll("_", " ")}</p></div>
              <div className="flex items-center gap-3"><StatusBadge status={supportCase.status} /><Link to="/account/orders/$id" params={{ id: supportCase.order_id }} className="text-sm font-medium underline-offset-4 hover:underline">Open conversation</Link></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

