import type { MetadataRoute } from "next";
import { getSiteUrl, isPreviewDeployment } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // Utility pages must remain crawlable so crawlers can discover their noindex.
  // Robots directives are not access control.
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: getSiteUrl("/sitemap.xml"),
  };
}
