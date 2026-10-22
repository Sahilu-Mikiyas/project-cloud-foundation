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
        .select("id, slug, name, brand, image_url, price_etb_cents, deposit_percent, delivery_days, listing_type")
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
      const { data, error } = await supabase.from("categories").select("id, slug, name").order("sort_order").limit(8);
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
      <section className="relative flex min-h-[82vh] items-end overflow-hidden md:min-h-[90vh]" aria-labelledby="hero-heading">
        <div className="absolute inset-0 bg-secondary">
          <img src={heroImage} alt="A curated product available through Shanta" width={1920} height={1280} className="size-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/15" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-32 md:px-8 md:pb-16 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden /> LOCAL FINDS · DUBAI SOURCING
            </span>
            <h1 id="hero-heading" className="mt-5 max-w-3xl text-balance font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Good finds for <span className="italic">everyday life.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-foreground/75 sm:text-lg">
              Discover useful, beautiful things from trusted local sellers, or request a special find through our Dubai sourcing partners.
            </p>
          </div>

          <form onSubmit={submitSearch} className="mt-8 flex max-w-2xl gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-elevated backdrop-blur" role="search">
            <label htmlFor="home-search" className="sr-only">Search products</label>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background"><Search className="h-4 w-4" aria-hidden /></span>
            <Input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What are you looking for?" className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0" />
            <Button type="submit" className="h-10 shrink-0 rounded-xl px-5">Search</Button>
          </form>

          <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-2 text-xs" aria-label="Explore Shanta">
            <span className="mr-1 text-muted-foreground">Explore:</span>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} className="rounded-full border border-border bg-background/75 px-3 py-1.5 font-medium backdrop-blur transition hover:bg-background">Local sellers</Link>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} className="rounded-full border border-border bg-background/75 px-3 py-1.5 font-medium backdrop-blur transition hover:bg-background">Dubai sourcing</Link>
            {categories.slice(0, 3).map((category) => <Link key={category.id} to="/shop" search={{ q: undefined, category: category.id, channel: undefined }} className="rounded-full border border-border bg-background/75 px-3 py-1.5 font-medium backdrop-blur transition hover:bg-background">{category.name}</Link>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 md:px-8 md:pt-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Picked for you</p><h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Featured finds</h2><p className="mt-2 text-sm text-muted-foreground">Fresh products from our seller and sourcing partners.</p></div>
          <Link to="/shop" className="hidden items-center gap-2 text-sm font-medium sm:inline-flex">View all <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {isLoading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />)}</div> : isError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">Featured products could not load.</p><p className="mt-1 text-sm text-muted-foreground">You can still browse the full collection.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
        ) : products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">{products.map((product, i) => <ProductCard key={product.id} p={product} index={i} />)}</div> : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">New finds are on the way.</p><p className="mt-1 text-sm text-muted-foreground">Browse the shop to explore the catalog.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-8">
        <div className="mb-7"><h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Browse by department</h2><p className="mt-2 text-sm text-muted-foreground">Shop across both Shanta product channels.</p></div>
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {categories.map((category) => <Link key={category.id} to="/shop" search={{ q: undefined, category: category.id, channel: undefined }} className="shrink-0 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-foreground/40 hover:bg-secondary">{category.name}<span className="sr-only"> products</span></Link>)}
          {!categories.length && <Link to="/shop" className="shrink-0 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary">Explore all products</Link>}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-8">
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Two ways to shop</p><h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Find it your way.</h2></div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChannelCard eyebrow="Listed close to home" title="Discover local sellers" detail="Explore seller-listed products, clear ETB prices and preorder terms from verified partners." link="Browse seller listings" href="/shop?channel=seller" tone="light" />
          <ChannelCard eyebrow="Sourced across the water" title="Looking for a Dubai find?" detail="Explore Shanta-managed products and reserve through our verified Dubai sourcing network." link="Explore Dubai sourcing" href="/shop?channel=sourcing" tone="dark" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto mt-24 max-w-7xl scroll-mt-28 px-4 md:px-8">
        <div className="max-w-2xl"><h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">A better way to shop with confidence.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Clear choices and dependable partners make every order easier to understand.</p></div>
        <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: "Verified partners", detail: "Seller listings and sourcing partners are reviewed." },
            { icon: Sparkles, title: "Two clear channels", detail: "Choose local seller products or Dubai sourcing." },
            { icon: ShieldCheck, title: "Transparent ETB prices", detail: "See price, deposit due and balance before ordering." },
            { icon: Truck, title: "Order progress", detail: "Follow your order through the available milestones." },
          ].map(({ icon: Icon, title, detail }) => <div key={title} className="bg-background p-6 sm:p-7"><Icon className="h-5 w-5" aria-hidden /><h3 className="mt-5 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p></div>)}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 pb-8 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-8 text-background sm:p-12 lg:p-16">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" aria-hidden />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">For local sellers</p>
            <h2 className="mt-4 text-balance font-display text-4xl font-medium tracking-tight sm:text-5xl">Have something good to share?</h2>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-background/75">Create a listing, set your ETB price and deposit terms, and introduce your products to shoppers on Shanta.</p>
            <Button asChild className="mt-7 rounded-full bg-gold px-5 text-gold-foreground hover:bg-gold/90"><Link to="/partner">Sell with Shanta <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}

function ChannelCard({ eyebrow, title, detail, link, href, tone }: { eyebrow: string; title: string; detail: string; link: string; href: string; tone: "light" | "dark" }) {
  return (
    <div className={tone === "dark" ? "rounded-3xl bg-foreground p-7 text-background sm:p-9" : "rounded-3xl border border-border bg-card p-7 sm:p-9"}>
      <p className={tone === "dark" ? "text-xs font-semibold uppercase tracking-[0.18em] text-gold" : "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"}>{eyebrow}</p>
      <h3 className="mt-4 max-w-md font-display text-3xl font-medium leading-tight sm:text-4xl">{title}</h3>
      <p className={tone === "dark" ? "mt-3 max-w-lg text-sm leading-6 text-background/75" : "mt-3 max-w-lg text-sm leading-6 text-muted-foreground"}>{detail}</p>
      <Button asChild variant={tone === "dark" ? "secondary" : "default"} className={tone === "dark" ? "mt-6 rounded-full bg-gold text-gold-foreground hover:bg-gold/90" : "mt-6 rounded-full"}>
        <a href={href}>{link}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></a>
      </Button>
    </div>
  );
}

