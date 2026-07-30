import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpen, Home, GraduationCap, Settings, LogOut, Sparkles, Timer, BookMarked, Trophy, Users } from "lucide-react";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DonationButton } from "@/components/DonationModal";
import { AppFooter } from "@/components/AppFooter";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/notes", label: "Notes", icon: BookMarked },
  { to: "/tutor", label: "AI Tutor", icon: Sparkles },
  { to: "/mock", label: "Mock exams", icon: Timer },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/social", label: "Study circle", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const mobileNav = nav.filter((n) => ["/dashboard", "/subjects", "/notes", "/tutor", "/leaderboard"].includes(n.to));


export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">A-Level Ace</div>
            <div className="text-xs text-muted-foreground">Master every subject</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
                )}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Link to="/tutor" className="block rounded-md bg-accent/50 p-3 text-xs text-accent-foreground hover:bg-accent transition-colors">
            <div className="flex items-center gap-1 font-medium mb-1">
              <Sparkles className="size-3" /> AI Tutor
            </div>
            Ask any question from any topic. Worked solutions for maths included.
          </Link>
          <div className="flex items-center gap-1">
            <DonationButton />
            <ThemeToggle />
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 backdrop-blur px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="size-4" />
            </div>
            A-Level Ace
          </Link>
          <div className="flex items-center gap-1">
            <DonationButton />
            <ThemeToggle />
          </div>
        </div>
        <Outlet />
        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur">
          {nav.map((n) => {
            const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-0.5 py-2 text-xs",
                active ? "text-primary" : "text-muted-foreground")}>
                <n.icon className="size-5" />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
