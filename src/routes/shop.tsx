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
import { Reveal } from "@/components/Reveal";
import { MARKET_REGIONS } from "@/lib/markets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    channel: search.channel === "seller" || search.channel === "sourcing" ? search.channel : undefined,
    region: MARKET_REGIONS.some((market) => market.value === search.region) ? search.region as (typeof MARKET_REGIONS)[number]["value"] : undefined,
    country: typeof search.country === "string" && search.country.trim().length <= 80 ? search.country.trim() || undefined : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop — Shanta" },
      { name: "description", content: "Browse seller listings and sourcing products across markets worldwide, with transparent ETB prices." },
      { property: "og:title", content: "Shop — Shanta" },
      { property: "og:description", content: "Shop seller listings and products from markets around the world through Shanta." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { q, category, channel, region, country } = Route.useSearch();
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
    queryKey: ["products", "list", category, channel, region, q],
    queryFn: async () => {
      let query = supabase.from("products").select("id, slug, name, brand, image_url, price_etb_cents, deposit_percent, delivery_days, listing_type, market_region, market_country, market_city").eq("is_published", true);
      if (category) query = query.eq("category_id", category);
      if (channel) query = query.eq("listing_type", channel);
      if (region) query = query.eq("market_region", region);
      if (q?.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const countries = [...new Set((products ?? []).map((product) => product.market_country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const visibleProducts = products?.filter((product) => !country || product.market_country === country);

  const chip = (active: boolean) => cn(
    "min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/75 hover:border-foreground/30 hover:text-foreground",
  );
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ search: (previous) => ({ ...previous, q: searchInput.trim() || undefined }) });
  };
  const resultLabel = isLoading ? "Loading products" : `${visibleProducts?.length ?? 0} ${(visibleProducts?.length ?? 0) === 1 ? "product" : "products"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-9 md:px-8 md:pt-14">
      <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-9 text-background sm:px-10 sm:py-12 lg:px-14">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">The Shanta collection</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">Good things, <span className="italic">well found.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-background/70">Discover verified local sellers and sourcing partners across global markets. Dubai remains one market in our growing collection. Every listed price is in ETB.</p>
        </div>
        <form onSubmit={submitSearch} className="flex w-full gap-2 rounded-2xl border border-white/20 bg-white p-1.5 text-foreground shadow-elevated sm:max-w-sm" role="search">
          <label htmlFor="shop-search" className="sr-only">Search products by name</label>
          <Search className="ml-2 mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input id="shop-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products" className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button type="submit" size="sm" className="rounded-xl">Search</Button>
        </form>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-7 rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:h-fit" aria-label="Product filters">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" aria-hidden /> Choose a collection</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {([
                [undefined, "All products"],
                ["seller", "Local sellers"],
                ["sourcing", "Sourcing markets"],
              ] as const).map(([value, label]) => (
                <button key={label} className={cn("text-left lg:w-full", chip(channel === value))} aria-pressed={channel === value} onClick={() => navigate({ search: (previous) => ({ ...previous, channel: value }) })}>{label}</button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold">Market region</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button className={cn("text-left lg:w-full", chip(!region))} aria-pressed={!region} onClick={() => navigate({ search: (previous) => ({ ...previous, region: undefined }) })}>All regions</button>
              {MARKET_REGIONS.map((market) => (
                <button key={market.value} className={cn("text-left lg:w-full", chip(region === market.value))} aria-pressed={region === market.value} onClick={() => navigate({ search: (previous) => ({ ...previous, region: market.value, country: undefined }) })}>{market.label}</button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold">Country</h2>
            <Select value={country ?? "__all_countries__"} onValueChange={(value) => navigate({ search: (previous) => ({ ...previous, country: value === "__all_countries__" ? undefined : value }) })}>
              <SelectTrigger aria-label="Filter products by country"><SelectValue placeholder="All countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all_countries__">All countries</SelectItem>
                {countries.map((marketCountry) => <SelectItem key={marketCountry} value={marketCountry}>{marketCountry}</SelectItem>)}
                {country && !countries.includes(country) && <SelectItem value={country}>{country}</SelectItem>}
              </SelectContent>
            </Select>
            {!isLoading && countries.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Country choices appear when listings are available.</p>}
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
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{category ? categories.find((item) => item.id === category)?.name : "Curated for everyday life"}</p><h2 id="results-heading" className="mt-1 font-display text-3xl font-medium">{channel === "seller" ? "Local seller finds" : channel === "sourcing" ? "Global sourcing" : "Explore the collection"}</h2><p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{resultLabel}{region ? ` · ${MARKET_REGIONS.find((market) => market.value === region)?.label}` : ""}{country ? ` · ${country}` : ""}{q ? ` for “${q}”` : ""}</p></div>
            {(channel || category || region || country || q) && <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setSearchInput(""); navigate({ search: { q: undefined, category: undefined, channel: undefined, region: undefined, country: undefined } }); }}>Clear filters</Button>}
          </div>

          {isLoading ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />)}</div> : isError ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center"><h3 className="font-display text-2xl">We couldn’t load the collection.</h3><p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p><Button variant="outline" className="mt-5 rounded-full" onClick={() => void refetch()}>Try again</Button></div>
          ) : visibleProducts?.length ? (
            <Reveal><div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product, i) => <ProductCard key={product.id} p={product} index={i} />)}</div></Reveal>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center"><h3 className="font-display text-2xl">No products match this view yet.</h3><p className="mt-2 text-sm text-muted-foreground">Try another department, market, or Shanta channel.</p><Button asChild variant="outline" className="mt-5 rounded-full"><Link to="/shop" search={{ q: undefined, category: undefined, channel: undefined, region: undefined, country: undefined }}>Show all products</Link></Button></div>
          )}
        </section>
      </div>
    </div>
  );
}
