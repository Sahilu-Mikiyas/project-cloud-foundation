import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, ChevronDown, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const navLink = "rounded-full px-3.5 py-2 text-sm font-medium text-foreground/65 transition-all duration-300 hover:bg-secondary hover:text-foreground";

export function SiteHeader() {
  const { user, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();
  const isHome = useRouterState({ select: (state) => state.location.pathname === "/" });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("user_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); setMobileOpen(false); navigate({ to: "/" }); };
  const closeMenus = () => { setMobileOpen(false); setDiscoverOpen(false); };

  return (
    <header className={`site-header ${isHome ? "site-header-home" : "site-header-inner"} ${scrolled ? "is-scrolled" : ""}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" onClick={closeMenus} className="group flex shrink-0 items-center gap-2.5" aria-label="Shanta home">
          <span className="grid size-9 place-items-center rounded-full bg-foreground font-display text-sm text-background transition-transform duration-500 group-hover:rotate-[-8deg]">S</span>
          <span className="font-display text-[1.45rem] font-medium tracking-tight">Shanta<span className="text-gold">.</span></span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-0.5 lg:flex">
          <Link to="/shop" className={navLink}>Shop</Link>
          <Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} className={navLink}>Local sellers</Link>
          <Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} className={navLink}>Dubai sourcing</Link>
          <div className="relative">
            <button type="button" aria-expanded={discoverOpen} onClick={() => setDiscoverOpen((open) => !open)} className={`${navLink} inline-flex items-center gap-1`}>
              Discover <ChevronDown className={`size-3.5 transition-transform duration-300 ${discoverOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {discoverOpen && <>
              <button type="button" aria-label="Close Discover menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setDiscoverOpen(false)} />
              <div className="menu-popover absolute left-0 top-full z-40 mt-2 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-elevated">
                <a href="/#how-it-works" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary">How Shanta works</a>
                <Link to="/partner" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary">{isSupplier ? "Partner workspace" : "Sell with Shanta"}</Link>
                {isAdmin && <Link to="/admin" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary">Operations</Link>}
              </div>
            </>}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {user ? <>
            <Link to="/account" className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground sm:inline">My orders</Link>
            <Link to="/account" hash="#notifications" className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-secondary" aria-label={`Inbox, ${unreadNotifications} unread`}>
              <Bell className="size-4" aria-hidden />
              {unreadNotifications > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-background bg-gold" />}
            </Link>
            <Button size="sm" variant="ghost" className="hidden rounded-full sm:inline-flex" onClick={signOut}>Sign out</Button>
          </> : <>
            <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm" className="hidden rounded-full bg-foreground px-4 text-background transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/90 sm:inline-flex"><Link to="/partner">Sell with Shanta <ArrowUpRight className="ml-1 size-3.5" aria-hidden /></Link></Button>
          </>}
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-secondary lg:hidden">
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && <nav aria-label="Mobile navigation" className="mobile-menu border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          <Link to="/shop" onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Shop all</Link>
          <Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Local sellers</Link>
          <Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Dubai sourcing</Link>
          <a href="/#how-it-works" onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">How Shanta works</a>
          <Link to="/partner" onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">{isSupplier ? "Partner workspace" : "Sell with Shanta"}</Link>
          {isAdmin && <Link to="/admin" onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">Operations</Link>}
          {user && <Link to="/account" onClick={closeMenus} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">My orders and support</Link>}
          {user && <Button variant="outline" className="mt-2 rounded-full" onClick={signOut}>Sign out</Button>}
        </div>
      </nav>}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer mt-24 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 border-b border-white/15 pb-12 md:grid-cols-[1.6fr_1fr_1fr] md:gap-16 md:pb-16">
          <div>
            <Link to="/" className="font-display text-3xl font-medium tracking-tight">Shanta<span className="text-gold">.</span></Link>
            <p className="mt-4 max-w-md font-display text-3xl leading-tight text-background/90 sm:text-4xl">Good finds for the life you’re building.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-background/60">A thoughtful marketplace for local seller preorders and special finds from Dubai.</p>
          </div>
          <div className="space-y-3 text-sm text-background/70"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Explore</p><p><Link to="/shop" className="transition-colors hover:text-white">Shop all</Link></p><p><Link to="/shop" search={{ q: undefined, category: undefined, channel: "seller" }} className="transition-colors hover:text-white">Local sellers</Link></p><p><Link to="/shop" search={{ q: undefined, category: undefined, channel: "sourcing" }} className="transition-colors hover:text-white">Dubai sourcing</Link></p><p><a href="/#how-it-works" className="transition-colors hover:text-white">How it works</a></p></div>
          <div className="space-y-3 text-sm text-background/70"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Join Shanta</p><p><Link to="/partner" className="transition-colors hover:text-white">Sell with Shanta</Link></p><p><Link to="/partner" className="transition-colors hover:text-white">Become a sourcing partner</Link></p><p><Link to="/account" className="transition-colors hover:text-white">Track an order</Link></p><p className="pt-3 text-xs text-background/45">Clear ETB prices · Deposit terms before you order</p></div>
        </div>
        <div className="flex flex-col justify-between gap-3 pt-6 text-xs text-background/45 sm:flex-row"><span>© {new Date().getFullYear()} Shanta</span><span>Made for confident shopping in Ethiopia.</span></div>
      </div>
    </footer>
  );
}
