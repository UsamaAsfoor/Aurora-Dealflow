"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Briefcase,
  LayoutDashboard,
  Megaphone,
  Palette,
  Search,
  Settings,
  Users,
  Kanban,
  Contact,
  Menu,
  X,
  Shield,
  Store,
  Plug,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { TrpcProvider } from "@/lib/trpc";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TrpcProvider>{children}</TrpcProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/deals", label: "Deals", icon: Briefcase },
  { href: "/dashboard/buyers", label: "Buyers", icon: Contact },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

const bottomNavItems = [
  { href: "/dashboard/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/dashboard/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/settings/billing", label: "Billing", icon: Settings },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  compact,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      prefetch
      title={compact ? label : undefined}
      className={cn(
        "flex items-center rounded-md text-sm font-medium transition-all",
        compact ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-[var(--color-accent)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/35"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && label}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
  compact,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-background)]">
      <div
        className={cn(
          "border-b border-[var(--color-border)]",
          compact ? "px-2 py-4" : "px-5 py-5",
        )}
      >
        <Link
          href="/dashboard"
          prefetch
          className={cn(
            "group flex items-center",
            compact ? "justify-center" : "gap-3",
          )}
          onClick={onNavigate}
          title="Aurora DealFlow"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">
            A
          </span>
          {!compact && (
            <div>
              <p className="text-sm font-bold tracking-tight text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                Aurora DealFlow
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Acquire · Dispo
              </p>
            </div>
          )}
        </Link>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto py-4",
          compact ? "px-1.5" : "px-3",
        )}
      >
        {!compact && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Workspace
          </p>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            compact={compact}
            active={
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
            }
            onNavigate={onNavigate}
          />
        ))}

        {!compact && (
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Account
          </p>
        )}
        {compact && <div className="my-2 border-t border-[var(--color-border)]" />}
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            compact={compact}
            active={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            }
            onNavigate={onNavigate}
          />
        ))}

        <div className={cn("mt-4", compact ? "px-0.5" : "px-1")}>
          <ThemeSwitcher compact={compact} />
        </div>
      </nav>

      {user && (
        <div
          className={cn(
            "border-t border-[var(--color-border)]",
            compact ? "p-2" : "p-4",
          )}
        >
          {!compact && (
            <div className="mb-3 flex items-center gap-3 rounded-md bg-[var(--color-muted)] px-3 py-2.5 ring-1 ring-[var(--color-border)]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-xs font-bold text-[var(--color-primary)]">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                  {user.name ?? "Account"}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              compact ? "w-full justify-center px-0" : "w-full justify-start",
            )}
            onClick={logout}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            {!compact && "Sign Out"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DashboardSidebarLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isSearch = pathname.startsWith("/dashboard/search");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex w-full",
        isSearch ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      {/* In-flow desktop sidebar — never overlays page content */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] lg:flex",
          isSearch ? "w-14" : "w-60",
        )}
      >
        <SidebarContent compact={isSearch} />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-[var(--color-border)] bg-[var(--color-background)] transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            type="button"
            className="rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isSearch ? "h-dvh min-h-0 overflow-hidden" : "min-h-dvh",
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 px-4 backdrop-blur-xl lg:hidden",
            isSearch && "absolute inset-x-0 top-0 z-30 border-none bg-transparent",
          )}
        >
          <button
            type="button"
            className="rounded-md bg-[var(--aurora-surface)]/95 p-2 text-[var(--color-foreground)] shadow-sm ring-1 ring-[var(--color-border)]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          {!isSearch && (
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Aurora DealFlow
            </span>
          )}
        </header>
        <main
          className={cn(
            "min-w-0 flex-1",
            isSearch && "flex min-h-0 flex-col overflow-hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function PublicHeader({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">
              A
            </span>
            <span className="text-base font-bold tracking-tight text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
              Aurora DealFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">Marketplace</Link>
            </Button>
            {!user ? (
              <Button asChild size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isDashboard = pathname.startsWith("/dashboard") && Boolean(user);

  if (isDashboard) {
    return <DashboardSidebarLayout>{children}</DashboardSidebarLayout>;
  }

  return <PublicHeader>{children}</PublicHeader>;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) {
      if (user && !token) logout();
      router.replace("/login");
    }
  }, [isLoading, user, token, router, logout]);

  if (isLoading || !user || !token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Loading your workspace...
        </p>
      </div>
    );
  }

  return children;
}
