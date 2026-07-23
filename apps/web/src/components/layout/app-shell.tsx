"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Briefcase,
  Megaphone,
  Search,
  Settings,
  Users,
  Kanban,
  Contact,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TrpcProvider } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TrpcProvider>{children}</TrpcProvider>
    </AuthProvider>
  );
}

const navItems = [
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/deals", label: "Deals", icon: Briefcase },
  { href: "/dashboard/buyers", label: "Buyers", icon: Contact },
];

const bottomNavItems = [
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
      title={compact ? label : undefined}
      className={cn(
        "flex items-center rounded-xl text-sm font-medium transition-all",
        compact
          ? "justify-center px-0 py-2.5"
          : "gap-3 px-3 py-2.5",
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
    <div className="flex h-full flex-col">
      <div className={cn("border-b border-slate-200", compact ? "px-2 py-4" : "px-5 py-5")}>
        <Link
          href="/dashboard/search"
          className={cn(
            "group flex items-center",
            compact ? "justify-center" : "gap-3",
          )}
          onClick={onNavigate}
          title="Aurora DealFlow"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/25">
            A
          </span>
          {!compact && (
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600">
                Aurora DealFlow
              </p>
              <p className="text-xs text-slate-500">Deal intelligence</p>
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
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
        )}
        {navItems.map((item) => (
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

        {!compact && (
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>
        )}
        {compact && <div className="my-2 border-t border-slate-200" />}
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
      </nav>

      {user && (
        <div className={cn("border-t border-slate-200", compact ? "p-2" : "p-4")}>
          {!compact && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/80">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.name ?? "Account"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(compact ? "w-full justify-center px-0" : "w-full justify-start")}
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
  const isSearch = pathname === "/dashboard/search";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className={cn("flex", isSearch ? "h-screen overflow-hidden" : "min-h-screen")}>
      {/* Desktop sidebar — icon rail on search for map-first layout */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white lg:flex",
          isSearch ? "w-16" : "w-64",
        )}
      >
        <SidebarContent compact={isSearch} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          isSearch ? "h-screen min-h-0" : "min-h-screen",
          isSearch ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:hidden",
            isSearch && "absolute inset-x-0 top-0 border-none bg-transparent",
          )}
        >
          <button
            type="button"
            className="rounded-lg bg-white/95 p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          {!isSearch && (
            <span className="text-sm font-semibold text-slate-900">
              Aurora DealFlow
            </span>
          )}
        </header>
        <main className={cn("flex-1", isSearch && "min-h-0 overflow-hidden")}>
          {children}
        </main>
      </div>
    </div>
  );
}

function PublicHeader({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/25">
              A
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
              Aurora DealFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {!user ? (
              <Button asChild size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/dashboard/search">Dashboard</Link>
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

  const isDashboard = pathname.startsWith("/dashboard") && user;

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  return children;
}
