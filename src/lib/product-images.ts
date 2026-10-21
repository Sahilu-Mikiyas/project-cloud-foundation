import oud from "@/assets/p-oud.jpg";
import headphones from "@/assets/p-headphones.jpg";
import bag from "@/assets/p-bag.jpg";
import watch from "@/assets/p-watch.jpg";

const BUNDLED: Record<string, string> = {
  "oud-noir-eau-de-parfum": oud,
  "wireless-studio-headphones": headphones,
  "leather-weekender-bag": bag,
  "classic-steel-chronograph": watch,
};

export function productImage(p: { slug?: string | null; image_url?: string | null }) {
  return p.image_url || (p.slug ? BUNDLED[p.slug] : undefined) || bag;
}
export const heroImage = bag;
