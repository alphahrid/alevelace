import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { InstagramBanner } from "@/components/InstagramBanner";

export function AppFooter() {
  return (
    <footer className="border-t mt-12 py-8 px-6 text-center bg-muted/20">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <GraduationCap className="size-3.5" />
        </div>
        <span className="font-semibold tracking-tight text-sm">A-Level Ace</span>
      </div>
      <p className="text-sm font-medium">
        Founded by Tasfia Tahmid Hridita <span className="text-muted-foreground">| Founder &amp; Lead Developer</span>
      </p>
      <div className="mt-3 flex justify-center">
        <InstagramBanner compact />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Built for Cambridge (CAIE) &amp; Edexcel A-Level students · <Link to="/about" className="hover:text-foreground underline underline-offset-2">About</Link>
      </p>
    </footer>
  );
}
