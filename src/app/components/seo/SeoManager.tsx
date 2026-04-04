import { useEffect } from "react";
import { useLocation } from "react-router";
import { getFiberById } from "../../data/atlas-data";
import {
  absoluteUrl,
  defaultOgImageUrl,
  getDefaultMetaDescription,
  getSiteOrigin,
} from "../../config/site";
import { applyDocumentSeo } from "../../utils/document-seo";
import { parseFiberPath } from "../../utils/hash-routing";

const SITE_NAME = "Natural Fiber Atlas";

function pathWithQuery(pathname: string, search: string): string {
  if (!search || search === "?") return pathname;
  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
}

export function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const origin = getSiteOrigin();
    const defaultDescription = getDefaultMetaDescription();
    const ogImage = defaultOgImageUrl();
    const path = pathWithQuery(location.pathname, location.search);
    const canonicalHref = origin ? new URL(path, origin).href : path;

    let title = SITE_NAME;
    let pageDescription = defaultDescription;
    let ogType: "website" | "article" = "website";
    let robots: string | null | undefined = undefined;
    let jsonLd: Record<string, unknown> | null = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      description: defaultDescription,
      url: origin ? `${origin}/` : "/",
    };

    if (location.pathname === "/about") {
      title = `About — ${SITE_NAME}`;
      robots = null;
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description: defaultDescription,
        url: canonicalHref,
        isPartOf: { "@type": "WebSite", name: SITE_NAME },
      };
    } else {
      const fiberId = parseFiberPath(location.pathname);
      const fiber = fiberId ? getFiberById(fiberId) : undefined;
      if (fiberId && !fiber) {
        title = `Page not found — ${SITE_NAME}`;
        pageDescription = defaultDescription;
        ogType = "website";
        robots = "noindex, nofollow";
        jsonLd = null;
      } else if (fiber) {
        title = `${fiber.name} — ${SITE_NAME}`;
        pageDescription = `${fiber.name}: ${fiber.subtitle}`.slice(0, 200);
        ogType = "article";
        robots = null;
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: fiber.name,
          description: pageDescription,
          url: canonicalHref,
          isPartOf: { "@type": "WebSite", name: SITE_NAME },
        };
      } else {
        robots = null;
      }
    }

    applyDocumentSeo(
      {
        title,
        description: pageDescription,
        canonicalHref: canonicalHref.startsWith("http") ? canonicalHref : absoluteUrl(path),
        ogImage,
        ogType,
        robots,
      },
      jsonLd,
    );
  }, [location.pathname, location.search]);

  return null;
}
