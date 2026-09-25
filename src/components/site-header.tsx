import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/progress", label: "My Progress" },
] as const;

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[0.95rem] font-extrabold tracking-tight">Level 3 Academic Hub</span>
            <span className="block text-[0.7rem] text-muted-foreground">
              Level 3 • Faculty of Artificial Intelligence · student platform
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary"
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" className="ml-2" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>

        <button
          className="ml-auto rounded-md border border-border p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
              >
                Admin
              </Link>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold">Built by students, for students.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Independent student platform — not affiliated with the university.
        </p>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string; params?: Record<string, string> }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-border">/</span>}
          {item.to ? (
            <Link
              to={item.to}
              {...(item.params ? { params: item.params } : {})}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
