import { CheckCircle2, Clock, AlertTriangle, Circle } from "lucide-react";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const DONE = new Set(["delivered", "confirmed", "assigned", "purchased", "arrived", "ready_for_handover", "verified"]);
const BAD = new Set(["cancelled", "expired", "disputed", "rejected", "suspended"]);

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = DONE.has(status) ? "ok" : BAD.has(status) ? "bad" : status.includes("pending") || status.includes("awaiting") ? "wait" : "neutral";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "bad" ? AlertTriangle : tone === "wait" ? Clock : Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "ok" && "bg-success/10 text-success",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "wait" && "bg-muted text-muted-foreground",
        tone === "neutral" && "bg-ink text-ink-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label ?? ORDER_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}
