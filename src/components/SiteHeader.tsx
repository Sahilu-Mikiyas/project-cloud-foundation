import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();
  const link = "text-sm text-ink-foreground/75 hover:text-ink-foreground transition-colors";
  return (
    <header className="sticky top-0 z-40 bg-ink text-ink-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link to="/" className="font-display text-xl font-extrabold tracking-[0.2em]">SHANTA</Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/shop" className={link} activeProps={{ className: "text-ink-foreground" }}>Shop</Link>
          <Link to="/partner" className={link}>{isSupplier ? "Sell or source" : "Sell or source with us"}</Link>
          {isAdmin && <Link to="/admin" className={link}>Operations</Link>}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/account" className={link}>My orders</Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-ink-foreground hover:bg-sidebar-accent hover:text-ink-foreground"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-sand/50">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground md:flex-row md:justify-between md:px-8">
        <p><span className="font-display font-bold tracking-[0.2em] text-foreground">SHANTA</span> — Your access to the Dubai market.</p>
        <p>Seller listings · Verified Dubai sourcing · Transparent prices</p>
      </div>
    </footer>
  );
}
