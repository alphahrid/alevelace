import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

/** Public marketing header used on the homepage, blog and past papers pages. */
export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-semibold tracking-tight">A-Level Ace</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/past-papers" className="hover:text-foreground">Past papers</Link>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button size="sm">Get started</Button></Link>
        </div>
      </div>
    </header>
  );
}
