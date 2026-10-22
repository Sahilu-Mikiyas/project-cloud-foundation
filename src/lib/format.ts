/** Money is stored as integer santim (1 ETB = 100 santim). Never use floats for amounts. */
export function formatEtb(cents: number | bigint | null | undefined): string {
  const n = Number(cents ?? 0) / 100;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  awaiting_customer_deposit: "Awaiting deposit",
  confirmed: "Deposit confirmed",
  open_for_assignment: "Open for assignment",
  assignment_payment_pending: "Assignment fee pending",
  assigned: "Assigned",
  purchased: "Purchased",
  in_transit: "In transit",
  arrived: "Arrived",
  ready_for_handover: "Ready for handover",
  seller_preparing: "Seller preparing",
  seller_in_delivery: "Seller delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired: "Expired",
  disputed: "Disputed",
};

export const ORDER_FLOW = [
  "awaiting_customer_deposit",
  "open_for_assignment",
  "assigned",
  "purchased",
  "in_transit",
  "arrived",
  "ready_for_handover",
  "delivered",
] as const;

export const SELLER_ORDER_FLOW = [
  "awaiting_customer_deposit",
  "confirmed",
  "seller_preparing",
  "seller_in_delivery",
  "delivered",
] as const;
