import "server-only";

import { getSiteRole } from "@/lib/site-role";
import { SiteNavLink } from "./site-nav";

export async function SettingsLink() {
  const role = await getSiteRole();
  if (role !== "admin" && role !== "owner") return null;

  return <SiteNavLink href="/settings">Setting</SiteNavLink>;
}
