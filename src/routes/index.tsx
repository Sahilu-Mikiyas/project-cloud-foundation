import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/Reveal";
import { heroImage, productImage } from "@/lib/product-images";
import type { ProductRow } from "@/components/ProductCard";
import watchImage from "@/assets/p-watch.jpg";
import oudImage from "@/assets/p-oud.jpg";

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
      const { data, error } = await supabase.from("products")
        .select("id, slug, name, brand, image_url, price_etb_cents, deposit_percent, delivery_days, listing_type")
        .eq("is_published", true).order("created_at", { ascending: false }).limit(4);
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
  const sellerFeature = products.find((product) => product.listing_type === "seller");
  const sourcingFeature = products.find((product) => product.listing_type === "sourcing");

  return (
    <>
      <section className="home-hero relative isolate flex min-h-[92svh] items-end overflow-hidden bg-sand" aria-labelledby="hero-heading">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroImage} alt="A leather travel bag available through Shanta" width={1920} height={1280} className="hero-photo size-full object-cover object-[58%_52%]" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/10" />
        </div>
        <div className="pointer-events-none absolute right-[8%] top-[28%] hidden rotate-3 rounded-2xl border border-white/70 bg-white/75 px-5 py-4 shadow-elevated backdrop-blur-xl lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">The Shanta edit</p>
          <p className="mt-1 font-display text-xl">Local finds. Dubai picks.</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-foreground/70"><span className="size-1.5 rounded-full bg-gold" /> Clear ETB prices and order terms</div>
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-10 pt-32 sm:px-8 sm:pb-14 lg:px-10 lg:pb-16">
          <div className="max-w-3xl">
            <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-foreground/75 shadow-sm backdrop-blur sm:text-xs">
              <span className="size-1.5 rounded-full bg-gold" aria-hidden /> Thoughtful finds for everyday living
            </div>
            <h1 id="hero-heading" className="hero-enter hero-enter-2 mt-6 max-w-3xl text-balance font-display text-5xl font-medium leading-[.98] tracking-[-.045em] sm:text-6xl lg:text-[5.4rem]">
              Good things,<br /><span className="italic">closer to home.</span>
            </h1>
            <p className="hero-enter hero-enter-3 mt-6 max-w-xl text-pretty text-base leading-7 text-foreground/70 sm:text-lg">
              Meet local sellers worth knowing and discover special finds sourced through our trusted Dubai partners.
            </p>
          </div>

          <form onSubmit={submitSearch} className="hero-enter hero-enter-4 mt-8 flex max-w-2xl gap-2 rounded-2xl border border-white/70 bg-background/95 p-2 shadow-elevated backdrop-blur-xl sm:rounded-full sm:p-2.5" role="search">
            <label htmlFor="home-search" className="sr-only">Search products</label>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground"><Search className="size-4" aria-hidden /></span>
            <Input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What are you looking for?" className="h-11 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" />
            <Button type="submit" className="h-11 shrink-0 rounded-full bg-foreground px-5 text-background transition-transform duration-300 hover:-translate-y-0.5 hover:bg-foreground/90">Find it <ArrowUpRight className="ml-2 size-4" aria-hidden /></Button>
          </form>

          <div className="hero-enter hero-enter-5 mt-5 flex flex-wrap items-center gap-2 text-xs" aria-label="Explore Shanta">
            <span className="mr-1 text-muted-foreground">Explore</span>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} className="rounded-full border border-border/80 bg-background/75 px-3.5 py-2 font-medium backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-background">Local sellers</Link>
            <Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} className="rounded-full border border-border/80 bg-background/75 px-3.5 py-2 font-medium backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-background">Dubai sourcing</Link>
            {categories.slice(0, 2).map((category) => <Link key={category.id} to="/shop" search={{ q: undefined, category: category.id, channel: undefined }} className="rounded-full border border-border/80 bg-background/75 px-3.5 py-2 font-medium backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-background">{category.name}</Link>)}
          </div>
          <a href="#featured" className="hero-enter hero-enter-5 mt-9 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">Scroll to explore <ArrowDown className="size-3.5 animate-bounce" aria-hidden /></a>
        </div>
      </section>

      <Reveal>
        <section id="featured" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-20 sm:px-8 md:pt-28 lg:px-10">
          <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">A considered collection</p><h2 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">Find your next favorite.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">A few good things, selected from across both Shanta channels.</p></div>
            <Link to="/shop" className="hidden shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/30 sm:inline-flex">Shop all <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          {isLoading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />)}</div> : isError ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center"><p className="font-display text-2xl">The collection is taking a moment.</p><p className="mt-1 text-sm text-muted-foreground">You can still browse the full shop.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
          ) : products.length ? <div className="reveal-stagger grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">{products.map((product, i) => <ProductCard key={product.id} p={product} index={i} />)}</div> : (
            <div className="rounded-3xl border border-border bg-card p-8 text-center"><p className="font-display text-2xl">New finds are on the way.</p><p className="mt-1 text-sm text-muted-foreground">Browse the shop to explore the catalog.</p><Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/shop">Browse products</Link></Button></div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="mx-auto mt-24 max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Explore the catalog</p><h2 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">A little of everything.</h2></div><p className="max-w-sm text-sm leading-6 text-muted-foreground">Choose a department, then keep your preferred shopping channel in view.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, i) => <Link key={category.id} to="/shop" search={{ q: undefined, category: category.id, channel: undefined }} className="editorial-card group flex min-h-28 flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:min-h-36 sm:p-5">
              <span className="font-display text-3xl text-gold/80">0{i + 1}</span><span className="flex items-center justify-between gap-2 text-sm font-medium">{category.name}<ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground" aria-hidden /></span>
            </Link>)}
            {!categories.length && <Link to="/shop" className="editorial-card flex min-h-28 items-end justify-between rounded-2xl border border-border bg-card p-5 text-sm font-medium">Explore all products <ArrowUpRight className="size-4" aria-hidden /></Link>}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mx-auto mt-24 max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-8 max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Two ways to find it</p><h2 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">Choose your kind of discovery.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Keep the original Shanta marketplace and Dubai sourcing journeys, with clear prices and terms in both.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChannelCard channel="seller" image={sellerFeature ? productImage(sellerFeature) : oudImage} eyebrow="From sellers in Ethiopia" title="Good finds, close to home." detail="Browse seller-set prices and preorder terms. The deposit due and remaining balance are clear before you create an order." link="Explore local sellers" />
            <ChannelCard channel="sourcing" image={sourcingFeature ? productImage(sourcingFeature) : watchImage} eyebrow="Sourced through Dubai" title="Looking for something special?" detail="Explore products Shanta sources through verified Dubai partners and follow your request as it moves forward." link="Discover Dubai sourcing" />
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="how-it-works" className="mx-auto mt-28 max-w-7xl scroll-mt-28 px-5 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Good to know</p><h2 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">Shop with the details in view.</h2></div><p className="max-w-xl text-sm leading-6 text-muted-foreground">Every channel has its own path. The product page tells you what is being offered, who it comes from, what is due now, and what happens next.</p></div>
          <div className="reveal-stagger mt-10 grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, title: "Verified sellers", detail: "Local listings come from reviewed Shanta sellers." },
              { icon: Sparkles, title: "Two distinct channels", detail: "Shop local listings or request a Dubai-sourced find." },
              { icon: ShieldCheck, title: "Terms before ordering", detail: "Review ETB price, deposit due and remaining balance." },
              { icon: Truck, title: "Order progress", detail: "Follow the next steps from your account." },
            ].map(({ icon: Icon, title, detail }) => <div key={title} className="bg-background p-6 sm:p-7 lg:p-8"><Icon className="size-5" strokeWidth={1.5} aria-hidden /><h3 className="mt-6 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p></div>)}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mx-auto mt-24 max-w-7xl px-5 pb-6 sm:px-8 lg:px-10">
          <div className="seller-cta relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-background sm:px-12 sm:py-14 lg:px-16 lg:py-16">
            <div className="pointer-events-none absolute -right-20 -top-28 size-96 rounded-full bg-gold/20 blur-3xl" aria-hidden />
            <div className="relative max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">For local sellers</p><h2 className="mt-4 text-balance font-display text-4xl font-medium leading-tight sm:text-6xl">Let people discover what you make.</h2><p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-background/70">Build a product listing, choose your ETB price and deposit terms, then share your products with Shanta shoppers.</p><Button asChild className="mt-7 h-11 rounded-full bg-gold px-5 text-gold-foreground shadow-gold transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold/90"><Link to="/partner">Start selling <ArrowUpRight className="ml-2 size-4" aria-hidden /></Link></Button></div>
          </div>
        </section>
      </Reveal>
    </>
  );
}

function ChannelCard({ channel, image, eyebrow, title, detail, link }: { channel: "seller" | "sourcing"; image: string; eyebrow: string; title: string; detail: string; link: string }) {
  const isSeller = channel === "seller";
  return (
    <Link to="/shop" search={{ q: undefined, category: undefined, channel }} className="editorial-card group relative flex min-h-[26rem] items-end overflow-hidden rounded-[1.75rem] bg-foreground text-background lg:min-h-[32rem]">
      <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-80 transition-transform duration-700 ease-smooth group-hover:scale-[1.045]" loading="lazy" />
      <div className={`absolute inset-0 ${isSeller ? "bg-gradient-to-t from-black/90 via-black/20 to-transparent" : "bg-gradient-to-t from-black/90 via-black/40 to-black/10"}`} />
      <div className="relative w-full p-6 sm:p-9 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        <h3 className="mt-3 max-w-lg font-display text-3xl font-medium leading-tight sm:text-4xl">{title}</h3>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">{detail}</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-300 group-hover:translate-x-1">{link}<ArrowRight className="size-4" aria-hidden /></span>
      </div>
    </Link>
  );
}
