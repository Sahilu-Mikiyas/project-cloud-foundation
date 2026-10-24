import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEtb, ORDER_FLOW, ORDER_STATUS_LABEL, SELLER_ORDER_FLOW } from "@/lib/format";
import { productImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account_/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Shanta" },
      { name: "description", content: "Track your Shanta sourcing reservation or seller preorder." },
      { property: "og:title", content: "Order details — Shanta" },
      { property: "og:description", content: "Track your Shanta sourcing reservation or seller preorder." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin, isSupplier } = useAuth();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportCategory, setSupportCategory] = useState("order_status");
  const [supportMessage, setSupportMessage] = useState("");
  const [replyByCase, setReplyByCase] = useState<Record<string, string>>({});
  const { data: o, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, order_type, seller_id, seller_response, seller_responded_at, status, subtotal_etb_cents, deposit_etb_cents, created_at, updated_at, market_region, market_country, market_city, order_items(*), order_events(id, status, note, created_at)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: supportCases = [] } = useQuery({
    queryKey: ["order-support-cases", id],
    enabled: !!user && !!o,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_cases")
        .select("id, subject, category, status, created_at, updated_at, support_case_messages(id, sender_id, body, created_at), support_case_events(id, status, note, created_at)")
        .eq("order_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancelOrder = async () => {
    const { error } = await supabase.rpc("cancel_unpaid_order", { _order_id: id, _reason: cancelReason });
    if (error) { toast.error(error.message); return; }
    toast.success("Order cancelled");
    setCancelReason("");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["order", id] }),
      queryClient.invalidateQueries({ queryKey: ["my-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
    ]);
  };

  const openSupportCase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { error } = await supabase.rpc("create_order_support_case", {
      _order_id: id,
      _subject: supportSubject,
      _category: supportCategory,
      _message: supportMessage,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Support request sent");
    setSupportSubject("");
    setSupportMessage("");
    await queryClient.invalidateQueries({ queryKey: ["order-support-cases", id] });
  };

  const replyToCase = async (caseId: string) => {
    const body = replyByCase[caseId]?.trim();
    if (!body) return;
    const { error } = await supabase.rpc("reply_to_order_support_case", { _case_id: caseId, _body: body });
    if (error) { toast.error(error.message); return; }
    setReplyByCase((current) => ({ ...current, [caseId]: "" }));
    await queryClient.invalidateQueries({ queryKey: ["order-support-cases", id] });
  };

  const updateCaseStatus = async (caseId: string, status: "in_progress" | "waiting_on_customer" | "resolved" | "closed") => {
    const { error } = await supabase.rpc("admin_set_support_case_status", {
      _case_id: caseId,
      _status: status,
      _note: `Status changed to ${status.replaceAll("_", " ")}`,
    });
    if (error) { toast.error(error.message); return; }
    await queryClient.invalidateQueries({ queryKey: ["order-support-cases", id] });
  };

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-12">Loading…</div>;
  if (!o) return <div className="mx-auto max-w-5xl px-4 py-12">Order not found. <Link to="/account" className="underline">Back</Link></div>;

  const isBuyer = !!user && !isAdmin && !isSupplier && user.id !== o.seller_id;
  const orderFlow: readonly string[] = o.order_type === "seller_listing" ? SELLER_ORDER_FLOW : ORDER_FLOW;
  const currentIdx = orderFlow.indexOf(o.status);
  const events = [...o.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="workspace-page mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <Link to="/account" className="text-sm text-muted-foreground transition-colors hover:text-foreground">← My orders</Link>
      <Reveal>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-foreground p-6 text-background shadow-elevated sm:p-9">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{o.order_type === "seller_listing" ? "Seller preorder" : "Shanta sourcing reservation"}</p><h1 className="tabular mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">{o.reference}</h1><p className="mt-2 text-sm text-background/60">Placed {new Date(o.created_at).toLocaleDateString()} · {o.market_city ? `${o.market_city}, ` : ""}{o.market_country}</p></div>
        <div className="rounded-full border border-white/15 bg-white/5 px-3 py-2"><StatusBadge status={o.status} /></div>
      </div>
      </Reveal>

      {isBuyer && o.status === "awaiting_customer_deposit" && (
        <section className="mt-6 rounded-3xl border border-destructive/30 bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-display text-2xl">Cancel this unpaid order</h2>
          <p className="mt-1 text-sm text-muted-foreground">You can cancel while the deposit is still pending. This releases any reserved seller preorder capacity.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Textarea aria-label="Cancellation reason" placeholder="Why are you cancelling?" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} />
            <Button variant="destructive" disabled={cancelReason.trim().length < 3} onClick={cancelOrder}>Cancel order</Button>
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="space-y-6 md:col-span-7">
          {o.order_items.map((i) => (
            <div key={i.id} className="flex gap-4 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5">
              <img src={productImage({ image_url: i.image_url, slug: null })} alt="" className="h-28 w-24 rounded-2xl object-cover" />
              <div>
                <p className="font-semibold">{i.product_name}</p>
                <p className="text-sm text-muted-foreground">{i.variant_label} · Qty {i.quantity}</p>
                <p className="tabular mt-1 text-sm">{formatEtb(i.unit_price_etb_cents)} each</p>
              </div>
            </div>
          ))}

          <div className="rounded-3xl border border-border bg-card p-5 text-sm shadow-card sm:p-6">
            <div className="flex justify-between"><span className="text-muted-foreground">Order total</span><span className="tabular">{formatEtb(o.subtotal_etb_cents)}</span></div>
            <div className="mt-2 flex justify-between font-semibold"><span>Reservation deposit</span><span className="tabular">{formatEtb(o.deposit_etb_cents)}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Balance on handover</span><span className="tabular">{formatEtb(o.subtotal_etb_cents - o.deposit_etb_cents)}</span></div>
            {o.status === "awaiting_customer_deposit" && (
              <p className="mt-4 rounded bg-muted p-3 text-xs text-muted-foreground">
                {o.order_type === "seller_listing"
                  ? "Deposit not yet paid. This preorder records the listing price and deposit due; online payment will be added in the payment stage."
                  : "Deposit not yet paid. Online deposit payment is coming soon — our team will contact you to confirm."}
              </p>
            )}
            {o.order_type === "seller_listing" && o.seller_response === "accepted" && (
              <p className="mt-3 rounded bg-muted p-3 text-xs text-muted-foreground">
                The seller confirmed availability at the listed terms. The deposit is still pending, so preparation and delivery have not started.
              </p>
            )}
            {o.order_type === "seller_listing" && o.seller_response === "declined" && (
              <p className="mt-3 rounded bg-muted p-3 text-xs text-muted-foreground">
                The seller could not accept this preorder. It has been cancelled; no deposit was collected.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:col-span-5 sm:p-6">
          <h2 className="font-display text-2xl">Order progress</h2>
          <ol className="mt-5 space-y-5">
            {orderFlow.map((s, idx) => {
              const done = currentIdx >= 0 && idx < currentIdx;
              const current = idx === currentIdx;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors duration-300", done && "border-success bg-success text-success-foreground", current && "border-primary bg-primary text-primary-foreground")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className={cn("text-sm", !done && !current && "text-muted-foreground", current && "font-semibold")}>{ORDER_STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
          <h2 className="mt-10 text-lg font-bold">History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between gap-4">
                <span>{ORDER_STATUS_LABEL[e.status]}{e.note ? ` — ${e.note}` : ""}</span>
                <span className="tabular shrink-0 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-12 border-t border-border pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Need a hand?</p><h2 className="mt-1 font-display text-3xl">Order support</h2>
        <p className="mt-1 text-sm text-muted-foreground">Messages are visible only to you, the seller for this order, and Shanta operations.</p>

        {isBuyer && !supportCases.some((supportCase) => ["open", "in_progress", "waiting_on_customer"].includes(supportCase.status)) && (
          <form onSubmit={openSupportCase} className="mt-4 grid gap-3 rounded-md border bg-card p-4">
            <label className="grid gap-1 text-sm font-medium">Subject
              <input className="h-10 rounded-md border bg-background px-3 font-normal" required minLength={4} maxLength={120} value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">Category
              <select className="h-10 rounded-md border bg-background px-3 font-normal" value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)}>
                <option value="order_status">Order status</option>
                <option value="listing_or_product">Product or listing</option>
                <option value="seller_communication">Seller communication</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">How can we help?
              <Textarea required maxLength={2000} value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} />
            </label>
            <Button type="submit" className="justify-self-start">Open support request</Button>
          </form>
        )}

        <div className="mt-5 space-y-4">
          {supportCases.map((supportCase) => (
            <article key={supportCase.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-semibold">{supportCase.subject}</h3><p className="text-xs text-muted-foreground">{supportCase.category.replaceAll("_", " ")} · {supportCase.status.replaceAll("_", " ")}</p></div>
                <time className="text-xs text-muted-foreground">{new Date(supportCase.created_at).toLocaleString()}</time>
              </div>
              <div className="mt-4 space-y-3 border-l-2 pl-3">
                {[...supportCase.support_case_messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((message) => (
                  <div key={message.id}>
                    <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{message.sender_id === user?.id ? "You" : "Support participant"} · {new Date(message.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {[...supportCase.support_case_events].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((history) => (
                  <li key={history.id}>{history.status.replaceAll("_", " ")} — {history.note} · {new Date(history.created_at).toLocaleString()}</li>
                ))}
              </ul>
              {!(["resolved", "closed"].includes(supportCase.status)) && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Textarea aria-label="Reply to support case" placeholder="Write a reply" value={replyByCase[supportCase.id] ?? ""} onChange={(event) => setReplyByCase((current) => ({ ...current, [supportCase.id]: event.target.value }))} maxLength={2000} />
                  <Button variant="outline" disabled={!replyByCase[supportCase.id]?.trim()} onClick={() => replyToCase(supportCase.id)}>Reply</Button>
                </div>
              )}
              {isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateCaseStatus(supportCase.id, "in_progress")}>In progress</Button>
                  <Button size="sm" variant="outline" onClick={() => updateCaseStatus(supportCase.id, "waiting_on_customer")}>Waiting on buyer</Button>
                  <Button size="sm" variant="outline" onClick={() => updateCaseStatus(supportCase.id, "resolved")}>Resolve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateCaseStatus(supportCase.id, "closed")}>Close</Button>
                </div>
              )}
            </article>
          ))}
          {supportCases.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No support requests have been opened for this order.</p>}
        </div>
      </section>
    </div>
  );
}
