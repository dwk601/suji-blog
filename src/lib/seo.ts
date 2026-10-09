import type { Metadata } from "next";

export const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

function getConfiguredSiteUrl(): URL {
  const configuredUrl = process.env.SITE_URL?.trim();

  if (!configuredUrl) {
    if (process.env.VERCEL_ENV === "production" || isPreviewDeployment) {
      throw new Error("SITE_URL must be set to the confirmed HTTPS production origin before deploying.");
    }
    return new URL("http://localhost:3000");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("SITE_URL must be a valid absolute HTTPS production origin.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username || url.password || url.port ||
    url.pathname !== "/" || url.search || url.hash ||
    !hostname.includes(".") ||
    hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
    hostname.endsWith(".test") || hostname.endsWith(".invalid") ||
    /^[\d.]+$/.test(hostname) || hostname.includes(":") ||
    (isPreviewDeployment &&
      (hostname === process.env.VERCEL_URL || hostname === process.env.VERCEL_BRANCH_URL))
  ) {
    throw new Error("SITE_URL must be the confirmed public HTTPS production origin, without a path, port, credentials, query, or fragment; localhost and preview origins are not allowed.");
  }

  return url;
}

const siteUrl = getConfiguredSiteUrl();

export function getSiteUrl(path: string): string {
  const url = new URL(path, siteUrl);
  if (url.origin !== siteUrl.origin) {
    throw new Error("SEO URLs must stay on the configured SITE_URL origin.");
  }
  return url.toString();
}

export function getPublicPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const url = getSiteUrl(path);
  const image = {
    url: getSiteUrl("/og-image.png"),
    width: 1200,
    height: 630,
    alt: "Suji Blog — A little space for life, in words.",
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Suji Blog",
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
