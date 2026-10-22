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
      className="group block animate-rise"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[4/5] overflow-hidden rounded-md bg-sand">
        <img
          src={productImage(p)}
          alt={p.name}
          loading="lazy"
          width={1024}
          height={1280}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
          {p.listing_type === "seller" ? "Seller listing" : "Dubai sourcing"}
        </p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.brand}</p>
        <h3 className="text-base font-semibold">{p.name}</h3>
        <p className="tabular text-sm">{formatEtb(p.price_etb_cents)}</p>
        <p className="text-xs text-muted-foreground">Delivered in ~{p.delivery_days} days</p>
      </div>
    </Link>
  );
}
