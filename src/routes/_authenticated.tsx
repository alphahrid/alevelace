import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // Ensure onboarded — if not, route to onboarding
    if (!location.pathname.startsWith("/onboarding")) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof && !prof.onboarded) {
        throw redirect({ to: "/onboarding" });
      }
    }
  },
  component: AppShell,
});
