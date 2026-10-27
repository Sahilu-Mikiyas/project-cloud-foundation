import { Link } from "@tanstack/react-router";
import { formatEtb } from "@/lib/format";
import { marketLocation, marketRegionLabel } from "@/lib/markets";
import { productImage } from "@/lib/product-images";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  price_etb_cents: number;
  deposit_percent?: number;
  delivery_days: number;
  listing_type?: "sourcing" | "seller";
  market_region?: string;
  market_country?: string;
  market_city?: string | null;
  is_catalog_sample?: boolean;
};

export function ProductCard({ p, index = 0 }: { p: ProductRow; index?: number }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="editorial-card group block animate-rise rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand transition-shadow group-hover:shadow-card">
        <img
          src={productImage({ ...p, image_url: p.listing_type === "seller" ? null : p.image_url })}
          alt={p.name}
          loading="lazy"
          width={1024}
          height={1280}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-foreground shadow-sm backdrop-blur">
          {p.is_catalog_sample ? "SAMPLE PREVIEW" : p.listing_type === "seller" ? "SELLER PREORDER" : "SHANTA SOURCING"}
        </span>
      </div>
      <div className="mt-3 space-y-1 px-0.5">
        {p.brand && <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{p.brand}</p>}
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary sm:text-base">{p.name}</h3>
        {p.market_country && <p className="text-xs text-muted-foreground">{marketLocation(p.market_city ?? null, p.market_country)}{p.market_region ? ` · ${marketRegionLabel(p.market_region)}` : ""}</p>}
        <p className="tabular text-sm font-semibold">{p.is_catalog_sample ? "Illustrative · " : ""}{formatEtb(p.price_etb_cents)}</p>
        {p.listing_type === "seller" && p.deposit_percent !== undefined && <p className="text-xs font-medium text-foreground/70">Deposit due · {formatEtb(Math.floor(p.price_etb_cents * p.deposit_percent / 100))}</p>}
        <p className="text-xs text-muted-foreground">Estimated delivery · ~{p.delivery_days} days</p>
      </div>
    </Link>
  );
}
