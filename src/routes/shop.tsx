import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    channel: search.channel === "seller" || search.channel === "sourcing" ? search.channel : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop — Shanta" },
      { name: "description", content: "Browse seller listings and Dubai sourcing products with transparent ETB prices." },
      { property: "og:title", content: "Shop — Shanta" },
      { property: "og:description", content: "Shop seller listings or products sourced from Dubai through Shanta." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { q, category, channel } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(q ?? "");
  useEffect(() => setSearchInput(q ?? ""), [q]);
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, slug, name").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", "list", category, channel, q],
    queryFn: async () => {
      let query = supabase.from("products").select("id, slug, name, brand, image_url, price_etb_cents, delivery_days, listing_type").eq("is_published", true);
      if (category) query = query.eq("category_id", category);
      if (channel) query = query.eq("listing_type", channel);
      if (q?.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const chip = (active: boolean) => cn(
    "min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/75 hover:border-foreground/30 hover:text-foreground",
  );
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ search: (previous) => ({ ...previous, q: searchInput.trim() || undefined }) });
  };
  const resultLabel = isLoading ? "Loading products" : `${products?.length ?? 0} ${products?.length === 1 ? "product" : "products"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-9 md:px-8 md:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Shanta collection</p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Find something good.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Explore local seller listings and products sourced through our Dubai partners. Prices are shown in ETB.</p>
        </div>
        <form onSubmit={submitSearch} className="flex w-full gap-2 rounded-2xl border border-border bg-card p-1.5 sm:max-w-sm" role="search">
          <label htmlFor="shop-search" className="sr-only">Search products by name</label>
          <Search className="ml-2 mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input id="shop-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products" className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button type="submit" size="sm" className="rounded-xl">Search</Button>
        </form>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="space-y-7" aria-label="Product filters">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" aria-hidden /> Shop by channel</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {([
                [undefined, "All products"],
                ["seller", "Local sellers"],
                ["sourcing", "Dubai sourcing"],
              ] as const).map(([value, label]) => (
                <button key={label} className={cn("text-left lg:w-full", chip(channel === value))} aria-pressed={channel === value} onClick={() => navigate({ search: (previous) => ({ ...previous, channel: value }) })}>{label}</button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold">Departments</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button className={cn("text-left lg:w-full", chip(!category))} aria-pressed={!category} onClick={() => navigate({ search: (previous) => ({ ...previous, category: undefined }) })}>All departments</button>
              {categories.map((item) => (
                <button key={item.id} className={cn("text-left lg:w-full", chip(category === item.id))} aria-pressed={category === item.id} onClick={() => navigate({ search: (previous) => ({ ...previous, category: item.id }) })}>{item.name}</button>
              ))}
            </div>
          </section>
        </aside>

        <section aria-labelledby="results-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 id="results-heading" className="font-display text-2xl font-medium">{channel === "seller" ? "Local seller finds" : channel === "sourcing" ? "Dubai sourcing" : "All products"}</h2><p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{resultLabel}{q ? ` for “${q}”` : ""}</p></div>
            {(channel || category || q) && <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setSearchInput(""); navigate({ search: { q: undefined, category: undefined, channel: undefined } }); }}>Clear filters</Button>}
          </div>

          {isLoading ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />)}</div> : isError ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center"><h3 className="font-display text-2xl">We couldn’t load the collection.</h3><p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p><Button variant="outline" className="mt-5 rounded-full" onClick={() => void refetch()}>Try again</Button></div>
          ) : products?.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">{products.map((product, i) => <ProductCard key={product.id} p={product} index={i} />)}</div>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center"><h3 className="font-display text-2xl">No products match this view yet.</h3><p className="mt-2 text-sm text-muted-foreground">Try another department or browse both Shanta channels.</p><Button asChild variant="outline" className="mt-5 rounded-full"><Link to="/shop" search={{ q: undefined, category: undefined, channel: undefined }}>Show all products</Link></Button></div>
          )}
        </section>
      </div>
    </div>
  );
}
