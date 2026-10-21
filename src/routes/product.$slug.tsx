import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEtb } from "@/lib/format";
import { productImage } from "@/lib/product-images";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product — Shanta" },
      { name: "description", content: "Reserve this product from Dubai with a deposit on Shanta." },
      { property: "og:title", content: "Product — Shanta" },
      { property: "og:description", content: "Reserve this product from Dubai with a deposit." },
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

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(id, label, price_delta_etb_cents, is_available, sort_order)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const variants = [...(p?.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  useEffect(() => {
    if (!variantId && variants.length) setVariantId(variants.find((v) => v.is_available)?.id ?? null);
  }, [variants, variantId]);

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-12 md:px-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-8"><h1 className="text-2xl font-bold">Product not found</h1><Link to="/shop" className="mt-4 inline-block underline">Back to shop</Link></div>;

  const v = variants.find((x) => x.id === variantId);
  // Display estimate only — the server recalculates the real amounts when the reservation is created.
  const unit = p.price_etb_cents + (v?.price_delta_etb_cents ?? 0);
  const subtotal = unit * qty;
  const deposit = Math.floor((subtotal * p.deposit_percent) / 100);

  const reserve = async () => {
    if (!user) { navigate({ to: "/auth", search: { next: `/product/${slug}` } }); return; }
    if (!variantId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("reserve_order", { _variant_id: variantId, _quantity: qty });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reservation created");
    navigate({ to: "/account/orders/$id", params: { id: data as string } });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-12 md:px-8">
      <div className="md:col-span-7">
        <img src={productImage(p)} alt={p.name} width={1024} height={1280} className="aspect-[4/5] w-full rounded-md object-cover" />
      </div>
      <div className="md:col-span-5 md:pt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.brand}</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{p.name}</h1>
        <p className="tabular mt-4 text-2xl font-semibold">{formatEtb(unit)}</p>
        <p className="mt-6 text-muted-foreground">{p.description}</p>

        {variants.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-sm font-medium">Option</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((x) => (
                <button
                  key={x.id}
                  disabled={!x.is_available}
                  onClick={() => setVariantId(x.id)}
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

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium">Quantity</p>
          <div className="inline-flex items-center rounded-md border">
            <button className="p-3" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
            <span className="tabular w-10 text-center">{qty}</span>
            <button className="p-3" aria-label="Increase" onClick={() => setQty((q) => Math.min(10, q + 1))}><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-8 space-y-2 rounded-md bg-card p-5 text-sm">
          <Row label="Order total" value={formatEtb(subtotal)} />
          <Row label={`Reservation deposit (${p.deposit_percent}%)`} value={formatEtb(deposit)} strong />
          <Row label="Balance on handover" value={formatEtb(subtotal - deposit)} />
          <p className="pt-2 text-xs text-muted-foreground">Estimated delivery ~{p.delivery_days} days after a partner is assigned.</p>
        </div>

        <Button size="lg" className="mt-6 h-12 w-full" disabled={busy || !variantId} onClick={reserve}>
          {busy ? "Reserving…" : user ? "Reserve order" : "Sign in to reserve"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Deposit payment will be available soon. Your reservation is saved now.</p>
      </div>
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
