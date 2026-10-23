import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEtb } from "@/lib/format";
import { productImage } from "@/lib/product-images";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ProductMediaGallery } from "@/components/ProductMediaGallery";
import { Reveal } from "@/components/Reveal";
import { marketLocation, marketRegionLabel } from "@/lib/markets";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product — Shanta" },
      { name: "description", content: "Explore Shanta listings by market with clear ETB prices and order terms." },
      { property: "og:title", content: "Product — Shanta" },
      { property: "og:description", content: "Explore product details, seller/source and transparent order terms." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const requestKeyRef = useRef<string | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(id, label, price_delta_etb_cents, is_available, sort_order, inventory_limit, inventory_committed)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const variants = [...(p?.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  useEffect(() => {
    if (!variantId && variants.length) setVariantId(variants.find((variant) =>
      variant.is_available && (variant.inventory_limit === null || variant.inventory_committed < variant.inventory_limit),
    )?.id ?? null);
  }, [variants, variantId]);

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-12 md:px-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-8"><h1 className="text-2xl font-bold">Product not found</h1><Link to="/shop" className="mt-4 inline-block underline">Back to shop</Link></div>;

  const v = variants.find((x) => x.id === variantId);
  // Display estimate only — the server recalculates the real amounts when the reservation is created.
  const unit = p.price_etb_cents + (v?.price_delta_etb_cents ?? 0);
  const subtotal = unit * qty;
  const deposit = Math.floor((subtotal * p.deposit_percent) / 100);
  const remaining = !v || v.inventory_limit === null
    ? null
    : Math.max(0, v.inventory_limit - v.inventory_committed);
  const maxQuantity = remaining === null ? 10 : Math.min(10, Math.max(1, remaining));
  const fallbackImage = productImage({ ...p, image_url: p.listing_type === "seller" ? null : p.image_url });

  const reserve = async () => {
    if (!user) { navigate({ to: "/auth", search: { next: `/product/${slug}` } }); return; }
    if (!variantId) return;
    setBusy(true);
    const storageKey = `shanta-order-request:${user.id}:${p.id}`;
    const requestKey = requestKeyRef.current ?? sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
    requestKeyRef.current = requestKey;
    sessionStorage.setItem(storageKey, requestKey);
    const { data, error } = p.listing_type === "seller"
      ? await supabase.rpc("reserve_seller_order", { _variant_id: variantId, _quantity: qty, _request_key: requestKey })
      : await supabase.rpc("reserve_sourcing_order", { _variant_id: variantId, _quantity: qty, _request_key: requestKey });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    sessionStorage.removeItem(storageKey);
    requestKeyRef.current = null;
    toast.success(p.listing_type === "seller" ? "Preorder created" : "Reservation created");
    navigate({ to: "/account/orders/$id", params: { id: data as string } });
  };

  const resetRequestKey = () => {
    requestKeyRef.current = null;
    if (user && p) sessionStorage.removeItem(`shanta-order-request:${user.id}:${p.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 md:pt-9">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">← Back to the collection</Link>
      <Reveal>
      <div className="grid gap-8 md:grid-cols-12 md:gap-12">
      <div className="md:col-span-7">
        <ProductMediaGallery productId={p.id} productSlug={p.slug} productName={p.name} variantId={variantId} fallback={fallbackImage} />
      </div>
      <div className="md:col-span-5 md:pt-5">
        <div className="flex flex-wrap items-center gap-2">
        <p className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/75">
          {p.listing_type === "seller" ? "Seller preorder" : "Shanta sourcing"}
        </p>
        {p.brand && <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{p.brand}</p>}
        </div>
        <h1 className="mt-4 text-balance font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{p.name}</h1>
        <p className="tabular mt-4 text-3xl font-semibold tracking-tight">{formatEtb(unit)}</p>
        <p className="mt-5 leading-7 text-muted-foreground">{p.description}</p>
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Market</p>
          <p className="mt-1 font-medium">{marketLocation(p.market_city, p.market_country)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{marketRegionLabel(p.market_region)}</p>
        </div>

        {variants.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-sm font-medium">Option</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((x) => (
                <button
                  key={x.id}
                  disabled={!x.is_available || (x.inventory_limit !== null && x.inventory_committed >= x.inventory_limit)}
                  onClick={() => { resetRequestKey(); setVariantId(x.id); setQty(1); }}
                  className={cn(
                    "min-h-11 rounded-md border px-4 text-sm transition-colors disabled:opacity-40",
                    variantId === x.id ? "border-ink bg-ink text-ink-foreground" : "hover:bg-sand",
                  )}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {p.listing_type === "seller" && remaining !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            {remaining === 0 ? "This option has reached its preorder limit." : `${remaining} available for preorder`}
          </p>
        )}

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium">Quantity</p>
          <div className="inline-flex items-center rounded-md border">
            <button className="p-3" aria-label="Decrease" onClick={() => { resetRequestKey(); setQty((q) => Math.max(1, q - 1)); }}><Minus className="h-4 w-4" /></button>
            <span className="tabular w-10 text-center">{qty}</span>
            <button className="p-3" aria-label="Increase" disabled={qty >= maxQuantity} onClick={() => { resetRequestKey(); setQty((q) => Math.min(maxQuantity, q + 1)); }}><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-8 space-y-3 rounded-3xl border border-border bg-card p-5 text-sm shadow-card sm:p-6">
          <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your order estimate</p><p className="mt-1 text-xs text-muted-foreground">{qty} {qty === 1 ? "item" : "items"} · ETB</p></div>
          <Row label="Order total" value={formatEtb(subtotal)} />
          <div className="my-2 border-t border-dashed border-border" />
          <Row label={`Deposit due (${p.deposit_percent}%)`} value={formatEtb(deposit)} strong />
          <Row label="Remaining balance" value={formatEtb(subtotal - deposit)} />
          <div className="mt-4 rounded-2xl bg-secondary/70 p-4">
            <p className="font-medium">Estimated delivery</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">About {p.delivery_days} days after a partner is assigned. Your order summary will include the final terms.</p>
          </div>
        </div>

        <Button size="lg" className="mt-6 h-12 w-full" disabled={busy || !variantId || (p.listing_type === "seller" && remaining === 0)} onClick={reserve}>
          {busy ? "Creating order…" : p.listing_type === "seller" ? user ? "Create preorder (deposit due)" : "Sign in to preorder" : user ? "Reserve order" : "Sign in to reserve"}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          {p.listing_type === "seller"
            ? "Creating this preorder records the seller’s listed price and deposit terms. It does not collect payment."
            : "This reservation records your request. Online deposit payment is not available yet."}
        </p>
      </div>
      </div>
      </Reveal>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular", strong && "font-semibold text-foreground")}>{value}</span>
    </div>
  );
}
