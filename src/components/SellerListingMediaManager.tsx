import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Variant = { id: string; label: string };
type ListingMediaManagerProps = {
  productId: string;
  sellerId: string;
  productName: string;
  description: string | null;
  deliveryDays: number;
  variants: Variant[];
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function SellerListingMediaManager(props: ListingMediaManagerProps) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [altText, setAltText] = useState(props.productName);
  const [variantId, setVariantId] = useState("common");
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(props.description ?? "");
  const [deliveryDays, setDeliveryDays] = useState(String(props.deliveryDays));
  const [savingDetails, setSavingDetails] = useState(false);
  const { data: images = [] } = useQuery({
    queryKey: ["seller-listing-media", props.productId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media")
        .select("id, object_path, alt_text, moderation_status, moderation_note, variant_id, sort_order")
        .eq("product_id", props.productId).order("sort_order", { ascending: true });
      if (error) throw error;
      const signed = await Promise.all((data ?? []).map(async (item) => {
        const { data: urlData } = await supabase.storage.from("seller-listing-media").createSignedUrl(item.object_path, 5 * 60);
        return urlData ? { ...item, url: urlData.signedUrl } : null;
      }));
      return signed.filter((item): item is NonNullable<typeof item> => item !== null);
    },
  });

  const upload = async () => {
    if (!files.length) { toast.error("Choose at least one image"); return; }
    if (images.length + files.length > 21) { toast.error("A listing can have at most 21 images"); return; }
    if (altText.trim().length < 3 || altText.trim().length > 160) { toast.error("Alt text must be 3–160 characters"); return; }
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES || !(await hasValidImageSignature(file))) {
        toast.error(`${file.name} must be a valid JPEG, PNG, or WebP image under 5 MB`);
        return;
      }
    }
    setSaving(true);
    for (const [index, file] of files.entries()) {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const objectPath = `${props.sellerId}/${props.productId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("seller-listing-media").upload(objectPath, file, {
        contentType: file.type, cacheControl: "3600", upsert: false,
      });
      if (uploadError) { toast.error(uploadError.message); setSaving(false); return; }
      const { error: rowError } = await supabase.from("product_media").insert({
        product_id: props.productId,
        seller_user_id: props.sellerId,
        object_path: objectPath,
        alt_text: files.length === 1 ? altText.trim() : `${altText.trim()} ${index + 1}`,
        sort_order: images.length + index,
        variant_id: variantId === "common" ? null : variantId,
      });
      if (rowError) {
        await supabase.storage.from("seller-listing-media").remove([objectPath]);
        toast.error(rowError.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setFiles([]);
    toast.success("Images uploaded for moderation");
    qc.invalidateQueries({ queryKey: ["seller-listing-media", props.productId] });
  };

  const remove = async (id: string, objectPath: string) => {
    const { error: storageError } = await supabase.storage.from("seller-listing-media").remove([objectPath]);
    if (storageError) { toast.error(storageError.message); return; }
    const { error } = await supabase.from("product_media").delete().eq("id", id).eq("seller_user_id", props.sellerId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["seller-listing-media", props.productId] });
  };

  const saveDetails = async () => {
    const days = Number(deliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) { toast.error("Delivery estimate must be from 1 to 365 days"); return; }
    if (description.trim().length > 3000) { toast.error("Description must be 3,000 characters or less"); return; }
    setSavingDetails(true);
    const { error } = await supabase.from("products").update({ description: description.trim() || null, delivery_days: days }).eq("id", props.productId).eq("seller_user_id", props.sellerId);
    setSavingDetails(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Listing details updated");
    qc.invalidateQueries({ queryKey: ["seller-listings", props.sellerId] });
    qc.invalidateQueries({ queryKey: ["product"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="grid gap-5 rounded-md bg-muted/40 p-4 lg:grid-cols-2">
      <section className="space-y-3">
        <div><h4 className="font-semibold">Listing images</h4><p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 5 MB each · hidden from shoppers until approved.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor={`media-files-${props.productId}`}>Choose images</Label><Input id={`media-files-${props.productId}`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></div>
          <div className="space-y-1"><Label htmlFor={`media-alt-${props.productId}`}>Image description</Label><Input id={`media-alt-${props.productId}`} maxLength={160} value={altText} onChange={(event) => setAltText(event.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Applies to</Label><Select value={variantId} onValueChange={setVariantId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="common">All options</SelectItem>{props.variants.map((variant) => <SelectItem key={variant.id} value={variant.id}>{variant.label}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <Button type="button" size="sm" onClick={upload} disabled={saving}>{saving ? "Uploading…" : "Upload for review"}</Button>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => <div key={image.id} className="space-y-1 rounded border bg-background p-2"><img src={image.url} alt={image.alt_text} className="aspect-square w-full rounded object-cover" /><p className="text-xs font-medium">{image.moderation_status.replaceAll("_", " ")}{image.variant_id ? ` · ${props.variants.find((variant) => variant.id === image.variant_id)?.label ?? "Option"}` : " · All options"}</p>{image.moderation_note && <p className="text-xs text-muted-foreground">{image.moderation_note}</p>}<Button type="button" size="sm" variant="ghost" onClick={() => remove(image.id, image.object_path)}>Remove</Button></div>)}
        </div>
      </section>
      <section className="space-y-3">
        <div><h4 className="font-semibold">Listing details and preview</h4><p className="text-xs text-muted-foreground">Keep descriptions clear and delivery estimates realistic.</p></div>
        <div className="space-y-1"><Label htmlFor={`description-${props.productId}`}>Description</Label><Textarea id={`description-${props.productId}`} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} /><p className="text-right text-xs text-muted-foreground">{description.length}/3000</p></div>
        <div className="space-y-1"><Label htmlFor={`delivery-${props.productId}`}>Estimated delivery days</Label><Input id={`delivery-${props.productId}`} type="number" min={1} max={365} value={deliveryDays} onChange={(event) => setDeliveryDays(event.target.value)} /></div>
        <div className="rounded border bg-background p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Customer preview</p>{images[0]?.url && <img src={images[0].url} alt={images[0].alt_text} className="mt-3 aspect-[4/3] w-full rounded object-cover" />}<p className="mt-2 font-semibold">{props.productName}</p><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{description || "Add a clear description of the product and its condition."}</p><p className="mt-2 text-xs text-muted-foreground">Estimated delivery: {deliveryDays || "—"} days</p></div>
        <Button type="button" size="sm" variant="outline" onClick={saveDetails} disabled={savingDetails}>{savingDetails ? "Saving…" : "Save listing details"}</Button>
      </section>
    </div>
  );
}
