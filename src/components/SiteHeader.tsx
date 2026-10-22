import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const link = "whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground";

export function SiteHeader() {
  const { user, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Shanta home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">S</span>
          <span className="font-display text-[1.45rem] font-medium tracking-tight">Shanta</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
          <Link to="/shop" className={link}>Shop</Link>
          <a href="/shop?channel=seller" className={link}>Local sellers</a>
          <a href="/shop?channel=sourcing" className={link}>Dubai sourcing</a>
          <details className="group relative">
            <summary className={`${link} flex cursor-pointer list-none items-center gap-1`}>
              Discover <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute left-0 top-full z-50 mt-4 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-elevated" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
              <a href="/#how-it-works" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">How Shanta works</a>
              <a href="/shop?channel=seller" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">Seller preorder guide</a>
              <a href="/shop?channel=sourcing" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">Dubai sourcing</a>
            </div>
          </details>
          <Link to="/partner" className={link}>{isSupplier ? "Partner workspace" : "Sell with Shanta"}</Link>
          {isAdmin && <Link to="/admin" className={link}>Operations</Link>}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link to="/account" className="hidden text-sm font-medium text-foreground/70 hover:text-foreground sm:inline">My orders</Link>
              <Link to="/account" className="relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-secondary" aria-label={`Inbox, ${unreadNotifications} unread`}>
                <Bell className="h-4 w-4" aria-hidden />
                {unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-gold" />}
              </Link>
              <Button size="sm" variant="ghost" className="hidden rounded-full sm:inline-flex" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm" className="hidden rounded-full bg-gold text-gold-foreground hover:bg-gold/90 sm:inline-flex"><Link to="/partner">Sell with Shanta</Link></Button>
            </>
          )}
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary lg:hidden">
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            <Link to="/shop" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Shop all</Link>
            <a href="/shop?channel=seller" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Local sellers</a>
            <a href="/shop?channel=sourcing" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Dubai sourcing</a>
            <a href="/#how-it-works" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">How Shanta works</a>
            <Link to="/partner" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">{isSupplier ? "Partner workspace" : "Sell with Shanta"}</Link>
            {isAdmin && <Link to="/admin" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Operations</Link>}
            {user && <Link to="/account" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">My orders and support</Link>}
            {user && <Button variant="outline" className="mt-2 rounded-full" onClick={async () => { await supabase.auth.signOut(); closeMobile(); navigate({ to: "/" }); }}>Sign out</Button>}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-muted-foreground md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-display text-2xl font-medium text-foreground">Shanta</p>
          <p className="mt-2 max-w-sm">Good finds from trusted local sellers and verified Dubai sourcing partners.</p>
        </div>
        <div className="space-y-2"><p className="font-semibold text-foreground">Explore</p><p><Link to="/shop" className="hover:text-foreground">Shop all products</Link></p><p><a href="/shop?channel=seller" className="hover:text-foreground">Local sellers</a></p><p><a href="/shop?channel=sourcing" className="hover:text-foreground">Dubai sourcing</a></p></div>
        <div className="space-y-2"><p className="font-semibold text-foreground">For partners</p><p><Link to="/partner" className="hover:text-foreground">Sell or source with Shanta</Link></p><p className="pt-3 text-xs">Prices in ETB · Deposits shown before ordering</p></div>
        <div className="border-t border-border pt-5 text-xs md:col-span-3">© {new Date().getFullYear()} Shanta. Made for confident shopping.</div>
      </div>
    </footer>
  );
}
