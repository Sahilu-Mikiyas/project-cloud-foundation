import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export function SiteHeader() {
  const { user, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();
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
  const link = "whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Shanta home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">S</span>
          <span className="font-display text-[1.45rem] font-semibold tracking-tight">Shanta</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/account" className="hidden text-sm font-medium text-foreground/70 hover:text-foreground sm:inline">My orders</Link>
              <Link to="/account" className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-sm font-semibold hover:bg-muted" aria-label={`Inbox, ${unreadNotifications} unread`}>
                <Bell className="h-4 w-4" aria-hidden />{unreadNotifications > 0 && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />}
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-background"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full px-5"><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
      <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-4 pb-3 md:px-8">
        <Link to="/shop" className={link}>Shop all</Link>
        <a href="/shop?channel=seller" className={link}>Local sellers</a>
        <a href="/shop?channel=sourcing" className={link}>Dubai sourcing</a>
        <Link to="/partner" className={link}>{isSupplier ? "Partner workspace" : "Sell with Shanta"}</Link>
        {isAdmin && <Link to="/admin" className={link}>Operations</Link>}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-muted-foreground md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-display text-2xl font-semibold text-foreground">Shanta</p>
          <p className="mt-2 max-w-sm">Good finds from trusted local sellers and verified Dubai sourcing partners.</p>
        </div>
        <div className="space-y-2"><p className="font-semibold text-foreground">Explore</p><p><Link to="/shop" className="hover:text-foreground">Shop all products</Link></p><p><a href="/shop?channel=seller" className="hover:text-foreground">Local sellers</a></p><p><a href="/shop?channel=sourcing" className="hover:text-foreground">Dubai sourcing</a></p></div>
        <div className="space-y-2"><p className="font-semibold text-foreground">For partners</p><p><Link to="/partner" className="hover:text-foreground">Sell or source with Shanta</Link></p><p className="pt-3 text-xs">Prices in ETB · Deposits shown before ordering</p></div>
        <div className="border-t border-border pt-5 text-xs md:col-span-3">© {new Date().getFullYear()} Shanta. Made for confident shopping.</div>
      </div>
    </footer>
  );
}
