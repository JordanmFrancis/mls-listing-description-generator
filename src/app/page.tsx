/**
 * Root route — branches on auth state:
 *   - Signed in  → GeneratorApp (the existing client app: form, drafts, archive)
 *   - Signed out → Landing (editorial marketing page with sign-in CTA)
 *
 * Public route. Middleware allows /; this server component decides what
 * to render. Other protected routes (/guidelines) still redirect via
 * middleware.
 */

import { createClient } from "@/lib/supabase/server";
import GeneratorApp from "@/components/GeneratorApp";
import Landing from "@/components/Landing";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? <GeneratorApp /> : <Landing />;
}
