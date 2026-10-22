import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/partner")({
  head: () => ({
    meta: [
      { title: "Seller & partner portal — Shanta" },
      { name: "description", content: "Publish seller listings or apply as a Dubai sourcing partner." },
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
  const { data: openOrders = [] } = useQuery({
    queryKey: ["open-orders"],
    enabled: isSupplier,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, subtotal_etb_cents, created_at, order_items(product_name, variant_label, quantity)")
        .eq("status", "open_for_assignment")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [supplierForm, setSupplierForm] = useState({ business_name: "", phone: "", base_city: "Dubai", notes: "" });
  const [sellerForm, setSellerForm] = useState({ business_name: "", phone: "", description: "" });
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
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold">Seller & partner portal</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Sell products through your own published listings, source Dubai orders for Shanta customers, or do both. These are separate roles and order flows.
      </p>

      <section className="mt-10 rounded-md border bg-card p-5 md:p-7">
        <h2 className="text-xl font-bold">Sell your products</h2>
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
          <div className="mt-6 rounded-md bg-background p-4">
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

      <section className="mt-10 rounded-md border bg-card p-5 md:p-7">
        <h2 className="text-xl font-bold">Source Dubai orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Verified Dubai partners can take sourcing assignments and commit a separate fee for each order.</p>
        {!supplier ? (
          <form className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2" onSubmit={applySupplier}>
            <Field id="supplier-business" label="Business or trading name" required value={supplierForm.business_name} onChange={(value) => setSupplierForm({ ...supplierForm, business_name: value })} />
            <Field id="supplier-phone" label="Phone (WhatsApp)" required value={supplierForm.phone} onChange={(value) => setSupplierForm({ ...supplierForm, phone: value })} />
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
          <div className="mt-6 rounded-md bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{supplier.business_name}</p>
                <p className="text-sm text-muted-foreground">{supplier.base_city} · {supplier.phone}</p>
              </div>
              <StatusBadge status={supplier.status} label={statusLabel[supplier.status]} />
            </div>
            {supplier.status === "pending" && <p className="mt-3 text-sm text-muted-foreground">Your sourcing partner application is under review.</p>}
          </div>
        )}
        {isSupplier && (
          <div className="mt-8">
            <h3 className="font-semibold">Open sourcing orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">Order claims and per-assignment fee payments will be added in a later stage.</p>
            <div className="mt-4 divide-y rounded-md border bg-background">
              {openOrders.length === 0 && <p className="p-5 text-sm text-muted-foreground">No open sourcing orders right now.</p>}
              {openOrders.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="tabular text-xs text-muted-foreground">{o.reference}</p>
                    <p className="font-medium">{o.order_items.map((i) => `${i.product_name} (${i.variant_label}) × ${i.quantity}`).join(", ")}</p>
                  </div>
                  <span className="tabular text-sm">{formatEtb(o.subtotal_etb_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
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
  image_url: string;
  price: string;
  deposit_percent: string;
  delivery_days: string;
  category_id: string;
  variants: string;
};

const emptyListing: ListingForm = {
  name: "", brand: "", description: "", image_url: "", price: "", deposit_percent: "30", delivery_days: "7", category_id: "", variants: "Standard",
};

function SellerListings({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ListingForm>(emptyListing);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState({ price: "", deposit_percent: "" });
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, string>>({});
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, brand, price_etb_cents, deposit_percent, is_published, product_variants(id, label, inventory_limit, inventory_committed)")
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

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(Number(form.price) * 100);
    const depositPercent = Number(form.deposit_percent);
    const deliveryDays = Number(form.delivery_days);
    const labels = form.variants.split(",").map((label) => label.trim()).filter(Boolean);
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) { toast.error("Enter a valid price greater than zero"); return; }
    if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) { toast.error("Deposit must be between 1 and 100 percent"); return; }
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) { toast.error("Delivery estimate must be between 1 and 365 days"); return; }
    if (labels.length === 0 || labels.length > 20) { toast.error("Add between 1 and 20 options"); return; }

    const slugBase = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase || "product"}-${userId.slice(0, 6)}-${Date.now().toString(36)}`;
    setSaving(true);
    const { error } = await supabase.rpc("create_seller_listing", {
      _name: form.name,
      _slug: slug,
      _brand: form.brand,
      _description: form.description,
      _image_url: form.image_url,
      _price_etb_cents: priceCents,
      _deposit_percent: depositPercent,
      _delivery_days: deliveryDays,
      _category_id: form.category_id || null,
      _variant_labels: labels,
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

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-semibold">Your product listings</h3>
      <p className="mt-1 text-sm text-muted-foreground">Create a draft, choose its price and deposit, then publish it when ready. Images currently use an image URL.</p>
      <form onSubmit={createListing} className="mt-5 grid gap-3 rounded-md border bg-background p-4 md:grid-cols-2">
        <Field id="listing-name" label="Product name" required value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field id="listing-brand" label="Brand (optional)" value={form.brand} onChange={(brand) => setForm({ ...form, brand })} />
        <Field id="listing-price" label="Price (ETB)" required value={form.price} onChange={(price) => setForm({ ...form, price })} />
        <Field id="listing-image" label="Product image URL" value={form.image_url} onChange={(image_url) => setForm({ ...form, image_url })} />
        <Field id="listing-deposit" label="Deposit percentage (1–100)" value={form.deposit_percent} onChange={(deposit_percent) => setForm({ ...form, deposit_percent })} />
        <Field id="listing-delivery" label="Estimated delivery days" value={form.delivery_days} onChange={(delivery_days) => setForm({ ...form, delivery_days })} />
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category_id} onValueChange={(category_id) => setForm({ ...form, category_id })}>
            <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Field id="listing-variants" label="Options (comma separated)" value={form.variants} onChange={(variants) => setForm({ ...form, variants })} />
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="listing-description">Description</Label>
          <Textarea id="listing-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Button type="submit" className="h-11 md:col-span-2" disabled={saving}>{saving ? "Saving…" : "Save listing draft"}</Button>
      </form>
      <div className="mt-5 divide-y rounded-md border bg-background">
        {listings.length === 0 && <p className="p-5 text-sm text-muted-foreground">You have no listings yet.</p>}
        {listings.map((listing) => (
          <div key={listing.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{listing.name}</p>
              <p className="tabular text-sm text-muted-foreground">{formatEtb(listing.price_etb_cents)} · {listing.deposit_percent}% deposit · {listing.product_variants.length} options</p>
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
            <label className="flex items-center gap-2 text-sm">
              {listing.is_published ? "Published" : "Draft"}
              <Switch checked={listing.is_published} onCheckedChange={(checked) => toggleListing(listing.id, checked)} />
            </label>
          </div>
        ))}
      </div>
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
    </div>
  );
}
