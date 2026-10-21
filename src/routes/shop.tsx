import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Shanta" },
      { name: "description", content: "Browse fragrance, electronics, fashion and watches sourced from Dubai." },
      { property: "og:title", content: "Shop — Shanta" },
      { property: "og:description", content: "Browse products sourced from Dubai with transparent ETB prices." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [cat, setCat] = useState<string | null>(null);
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id, slug, name").order("sort_order")).data ?? [],
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "list", cat],
    queryFn: async () => {
      let q = supabase.from("products").select("id, slug, name, brand, image_url, price_etb_cents, delivery_days").eq("is_published", true);
      if (cat) q = q.eq("category_id", cat);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return data;
    },
  });

  const chip = (active: boolean) =>
    cn("rounded-full border px-4 py-2 text-sm transition-colors", active ? "border-ink bg-ink text-ink-foreground" : "hover:bg-sand");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-extrabold md:text-4xl">Shop</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <button className={chip(cat === null)} onClick={() => setCat(null)}>All</button>
        {categories.map((c) => (
          <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)
          : products?.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
      </div>
      {products?.length === 0 && <p className="mt-10 text-muted-foreground">No products in this category yet.</p>}
    </div>
  );
}
