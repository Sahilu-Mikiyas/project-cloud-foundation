import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type GalleryImage = { id: string; variant_id: string | null; alt_text: string; url: string };

export function ProductMediaGallery({
  productId,
  productSlug,
  productName,
  variantId,
  fallback,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string | null;
  fallback: string;
}) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: media = [] } = useQuery({
    queryKey: ["approved-product-media", productId],
    staleTime: 4 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media")
        .select("id, variant_id, object_path, alt_text")
        .eq("product_id", productId)
        .eq("moderation_status", "approved")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const signed = await Promise.all((data ?? []).map(async (item) => {
        const { data: urlData, error: urlError } = await supabase.storage
          .from("seller-listing-media").createSignedUrl(item.object_path, 5 * 60);
        if (urlError || !urlData) return null;
        return { id: item.id, variant_id: item.variant_id, alt_text: item.alt_text, url: urlData.signedUrl };
      }));
      return signed.filter((item): item is GalleryImage => item !== null);
    },
  });
  const specific = media.filter((item) => item.variant_id === variantId && variantId !== null);
  const common = media.filter((item) => item.variant_id === null);
  const images = variantId
    ? [...common, ...specific]
    : common.length ? common : media;
  const selected = images.find((item) => item.id === selectedId) ?? images[0];

  const report = async () => {
    if (!selected) return;
    const reason = window.prompt("Why should this listing image be reviewed?")?.trim();
    if (!reason) return;
    const { error } = await supabase.rpc("report_product_media", { _media_id: selected.id, _reason: reason });
    if (error) { toast.error(error.message); return; }
    toast.success("Image reported for review");
  };

  return (
    <div className="space-y-3">
      <img src={selected?.url ?? fallback} alt={selected?.alt_text ?? productName} width={1024} height={1280} className="aspect-[4/5] w-full rounded-md bg-sand object-cover" />
      {images.length > 1 && <div className="flex flex-wrap gap-2">{images.map((image) => <button key={image.id} type="button" onClick={() => setSelectedId(image.id)} aria-label={`Show ${image.alt_text}`} aria-pressed={selected?.id === image.id} className={`h-16 w-14 overflow-hidden rounded border ${selected?.id === image.id ? "border-primary" : "border-transparent"}`}><img src={image.url} alt="" className="h-full w-full object-cover" /></button>)}</div>}
      {selected && (user
        ? <Button type="button" variant="ghost" size="sm" className="px-0 text-xs text-muted-foreground" onClick={report}>Report this image</Button>
        : <Link to="/auth" search={{ next: `/product/${productSlug}` }} className="text-xs text-muted-foreground underline">Sign in to report this image</Link>)}
    </div>
  );
}
