import { Link } from "@tanstack/react-router";
import { formatEtb } from "@/lib/format";
import { productImage } from "@/lib/product-images";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  price_etb_cents: number;
  delivery_days: number;
  listing_type?: "sourcing" | "seller";
};

export function ProductCard({ p, index = 0 }: { p: ProductRow; index?: number }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group block animate-rise rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        <img
          src={productImage({ ...p, image_url: p.listing_type === "seller" ? null : p.image_url })}
          alt={p.name}
          loading="lazy"
          width={1024}
          height={1280}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-foreground shadow-sm backdrop-blur">
          {p.listing_type === "seller" ? "LOCAL SELLER" : "DUBAI SOURCING"}
        </span>
      </div>
      <div className="mt-3 space-y-1 px-0.5">
        {p.brand && <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{p.brand}</p>}
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary sm:text-base">{p.name}</h3>
        <p className="tabular text-sm font-semibold">{formatEtb(p.price_etb_cents)}</p>
        <p className="text-xs text-muted-foreground">Estimated delivery · ~{p.delivery_days} days</p>
      </div>
    </Link>
  );
}
