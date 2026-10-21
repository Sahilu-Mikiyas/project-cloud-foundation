import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Plane, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { heroImage } from "@/lib/product-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shanta — Your access to the Dubai market" },
      { name: "description", content: "Reserve products from Dubai with a deposit. Verified partners source and bring them to Ethiopia, tracked end to end." },
      { property: "og:title", content: "Shanta — Your access to the Dubai market" },
      { property: "og:description", content: "Curated cross-border shopping with transparent prices and verified sourcing partners." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, brand, image_url, price_etb_cents, delivery_days")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 md:grid-cols-12 md:px-8 md:pt-20">
        <div className="flex flex-col justify-center md:col-span-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Dubai → Addis Ababa</p>
          <h1 className="text-[34px] font-extrabold leading-[1.05] md:text-[64px]">
            Your access to the Dubai market.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            A curated cross-border shopping experience built around transparent prices, verified sourcing partners, and tracked fulfillment.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg" className="h-12 px-6"><Link to="/shop">Shop the collection</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6"><Link to="/partner">Source with us</Link></Button>
          </div>
        </div>
        <div className="md:col-span-6">
          <img src={heroImage} alt="Leather weekender bag sourced from Dubai" width={1024} height={1280} className="aspect-[4/5] w-full rounded-md object-cover md:aspect-[5/5]" />
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-8">
          {[
            { icon: Receipt, t: "Reserve with a deposit", d: "Lock the price with a partial deposit. The full price is shown upfront in ETB." },
            { icon: ShieldCheck, t: "Verified partners", d: "Every sourcing partner in Dubai is reviewed and commits a fee per order they take." },
            { icon: Plane, t: "Tracked to your hands", d: "Follow each milestone — purchased, in transit, arrived, ready for handover." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 md:px-8">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">New from Dubai</h2>
          <Link to="/shop" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      </section>
    </>
  );
}
