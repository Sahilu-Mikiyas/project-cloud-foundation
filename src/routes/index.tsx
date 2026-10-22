import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { heroImage } from "@/lib/product-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shanta — Good finds, closer to home" },
      { name: "description", content: "Shop trusted Ethiopian sellers and products sourced from Dubai through verified partners." },
      { property: "og:title", content: "Shanta — Good finds, closer to home" },
      { property: "og:description", content: "Explore local seller listings and Dubai sourcing with clear ETB prices." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, brand, image_url, price_etb_cents, delivery_days, listing_type")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, slug, name").order("sort_order").limit(6);
      if (error) throw error;
      return data;
    },
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ to: "/shop", search: { q: search.trim() || undefined, category: undefined, channel: undefined } });
  };

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:gap-16 md:px-8 md:pb-24 md:pt-16">
        <div className="order-2 md:order-1">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden /> CURATED HERE & SOURCED FROM DUBAI
          </p>
          <h1 className="max-w-xl text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.6rem]">
            Good finds, <span className="text-primary">closer</span> to home.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            Shop thoughtful listings from trusted local sellers, or request something special through Shanta’s Dubai sourcing partners.
          </p>
          <form onSubmit={submitSearch} className="mt-8 flex max-w-xl gap-2 rounded-2xl border border-border bg-card p-2 shadow-[0_12px_40px_-28px_rgba(36,28,18,0.35)]" role="search">
            <label htmlFor="home-search" className="sr-only">Search products</label>
            <Search className="ml-3 mt-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What are you looking for?" className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0" />
            <Button type="submit" className="h-11 shrink-0 rounded-xl px-5">Search</Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Shop by channel">
            <span className="mr-1">Explore:</span>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} className="rounded-full bg-secondary px-3 py-1.5 font-medium text-secondary-foreground transition-colors hover:bg-accent">Local sellers</Link>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} className="rounded-full bg-secondary px-3 py-1.5 font-medium text-secondary-foreground transition-colors hover:bg-accent">Dubai sourcing</Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-success" aria-hidden /> Trusted sellers</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Clear ETB prices</span>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <div className="absolute -left-5 top-12 hidden h-28 w-28 rounded-full bg-secondary md:block" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] bg-secondary">
            <img src={heroImage} alt="A curated product available through Shanta" width={1024} height={1280} className="aspect-[5/4] w-full object-cover md:aspect-[4/5]" fetchPriority="high" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur md:inset-x-5 md:bottom-5 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Shop with confidence</p><p className="mt-1 font-display text-xl font-medium">Chosen with care.</p></div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card" aria-label="Shanta shopping benefits">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:grid-cols-3 md:px-8">
          {[
            { icon: BadgeCheck, title: "Trusted local sellers", detail: "Shop listings from reviewed seller partners." },
            { icon: Sparkles, title: "Dubai finds", detail: "Request selected products through our sourcing network." },
            { icon: Truck, title: "Clear order updates", detail: "See pricing, deposit due and progress before you order." },
          ].map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="h-4.5 w-4.5" aria-hidden /></span>
              <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Find your next favorite</p><h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Browse by category</h2></div>
          <Link to="/shop" className="hidden items-center gap-2 text-sm font-semibold hover:text-primary sm:inline-flex">All products <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {categories.map((category) => (
            <Link key={category.id} to="/shop" search={{ q: undefined, category: category.id, channel: undefined }} className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary">{category.name}<span className="sr-only"> products</span></Link>
          ))}
          {!categories.length && <p className="text-sm text-muted-foreground">Explore the full collection to find products for you.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8 md:pb-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Fresh from our partners</p><h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Latest finds</h2><p className="mt-2 text-sm text-muted-foreground">A little something from both sides of the marketplace.</p></div>
          <Link to="/shop" className="hidden items-center gap-2 text-sm font-semibold hover:text-primary sm:inline-flex">View all <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {isLoading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />)}</div> : isError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">The latest finds could not load.</p><p className="mt-1 text-sm text-muted-foreground">You can still browse the full collection.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
        ) : products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">{products.map((product, i) => <ProductCard key={product.id} p={product} index={i} />)}</div> : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">New finds are on the way.</p><p className="mt-1 text-sm text-muted-foreground">Browse the shop to explore the catalog.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8 md:pb-24">
        <div className="grid gap-4 md:grid-cols-2">
          <ChannelCard eyebrow="Listed close to home" title="Discover local sellers" detail="Explore products, transparent ETB prices and preorder details from verified Ethiopian sellers." link="Browse seller listings" href="/shop?channel=seller" tone="warm" />
          <ChannelCard eyebrow="Sourced across the water" title="Looking for a Dubai find?" detail="Browse Shanta-managed sourcing products and place a reservation through our verified partner network." link="Explore Dubai sourcing" href="/shop?channel=sourcing" tone="dark" />
        </div>
      </section>
    </>
  );
}

function ChannelCard({ eyebrow, title, detail, link, href, tone }: { eyebrow: string; title: string; detail: string; link: string; href: string; tone: "warm" | "dark" }) {
  return (
    <div className={tone === "dark" ? "rounded-[1.75rem] bg-ink p-7 text-ink-foreground sm:p-9" : "rounded-[1.75rem] bg-secondary p-7 text-foreground sm:p-9"}>
      <p className={tone === "dark" ? "text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/65" : "text-xs font-semibold uppercase tracking-[0.18em] text-primary"}>{eyebrow}</p>
      <h2 className="mt-4 max-w-md font-display text-3xl font-medium leading-tight sm:text-4xl">{title}</h2>
      <p className={tone === "dark" ? "mt-3 max-w-lg text-sm leading-6 text-ink-foreground/70" : "mt-3 max-w-lg text-sm leading-6 text-foreground/70"}>{detail}</p>
      <Button asChild variant={tone === "dark" ? "secondary" : "default"} className="mt-6 rounded-full">
        <a href={href}>{link}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></a>
      </Button>
    </div>
  );
}
