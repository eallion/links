import crypto from "node:crypto";
import { getLinks, getUnions, getSettings, getHealthData } from "../_storage.js";

function formatAvatarUrl(avatar, mirror) {
  if (!avatar) return "";
  const raw = String(avatar).trim();
  // 1. QQ number (5 to 12 digits): fetch from q.qlogo.cn (spec=640)
  if (/^[1-9]\d{4,11}$/.test(raw)) {
    return `https://q.qlogo.cn/g?b=qq&nk=${raw}&s=640`;
  }
  // Extract pure domain, default to gravatar.bluecdn.com
  let m = String(mirror || "gravatar.bluecdn.com").trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/avatar\/?$/i, "")
    .replace(/\/+$/, "");
  if (!m) m = "gravatar.bluecdn.com";
  const baseUrl = `https://${m}/avatar/`;

  // 2. Existing MD5/SHA256 hex hash (32-64 chars): skip MD5 calculation
  if (/^[a-f0-9]{32,64}$/i.test(raw)) {
    return `${baseUrl}${raw.toLowerCase()}`;
  }
  // 3. Email: lowercase and MD5
  const cleanEmail = raw.toLowerCase();
  const hash = crypto.createHash("md5").update(cleanEmail).digest("hex");
  return `${baseUrl}${hash}`;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequestGet(context) {
  try {
    const req = context?.request || (context?.url ? context : null);
    let category = "all";
    if (req) {
      try {
        const url = new URL(req.url);
        category = url.searchParams.get("category") || "all";
      } catch {}
    }

    const [allLinks, allUnions, settings, healthMap] = await Promise.all([
      getLinks(),
      getUnions(),
      getSettings(),
      getHealthData()
    ]);

    function resolveAssetUrl(str) {
      if (!str) return "";
      const s = String(str).trim();
      if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/api/file") || s.startsWith("data:")) {
        return s;
      }
      return `/api/file?key=${encodeURIComponent(s)}`;
    }

    function extractDomain(inputUrl) {
      if (!inputUrl) return "";
      try {
        const clean = inputUrl.trim();
        const target = clean.includes("://") ? clean : "https://" + clean;
        return new URL(target).hostname;
      } catch {
        return inputUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0].split(":")[0].trim();
      }
    }

    // Format friend links
    const activeLinks = (allLinks || [])
      .filter((item) => item.status === "active")
      .sort((a, b) => {
        const aPinned = Boolean(a.pinned || a.isTop);
        const bPinned = Boolean(b.pinned || b.isTop);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return (a.order || 999) - (b.order || 999);
      })
      .map((link) => {
        let displayAvatar = "";
        if (link.avatarType === "gravatar") {
          displayAvatar = formatAvatarUrl(link.avatar, settings.gravatarMirror);
        } else if (link.avatarType === "url") {
          displayAvatar = resolveAssetUrl(link.avatar || link.avatarUrl);
        } else if (link.avatarType === "blob") {
          displayAvatar = resolveAssetUrl(link.avatar || link.avatarUrl);
        } else if (link.avatar) {
          displayAvatar = resolveAssetUrl(link.avatar);
        } else if (link.avatarUrl) {
          displayAvatar = resolveAssetUrl(link.avatarUrl);
        }

        let displayFavicon = resolveAssetUrl(link.favicon || "");
        if (!displayFavicon) {
          const domain = extractDomain(link.url || "");
          if (domain) {
            displayFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
          }
        }

        const domain = extractDomain(link.url || "");
        const healthRaw = (healthMap && (healthMap[link.id] || healthMap[domain])) || null;
        let health = null;
        if (healthRaw) {
          health = {
            status: healthRaw.status || "healthy",
            httpCode: healthRaw.http?.statusCode || (healthRaw.http?.alive ? 200 : 0),
            sslValid: Boolean(healthRaw.ssl?.valid),
            sslDays: typeof healthRaw.ssl?.daysRemaining === "number" ? healthRaw.ssl.daysRemaining : null,
            domainDays: typeof healthRaw.domain?.daysRemaining === "number" ? healthRaw.domain.daysRemaining : null,
            checkedAt: healthRaw.checkedAt || null
          };
        }

        return {
          id: link.id,
          title: link.title,
          author: link.author || "",
          url: link.url,
          description: link.description || "",
          avatar: displayAvatar,
          favicon: displayFavicon,
          pinned: Boolean(link.pinned || link.isTop),
          order: link.order || 0,
          health
        };
      });

    // Format blog unions
    const unions = (allUnions || [])
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map((union) => {
        let iconLight = resolveAssetUrl(union.iconLight || union.iconDark || "");
        let iconDark = resolveAssetUrl(union.iconDark || union.iconLight || "");

        let websiteIcon = resolveAssetUrl(union.websiteIcon || "");
        if (!websiteIcon) {
          const domain = extractDomain(union.officialUrl || union.url || "");
          if (domain) {
            websiteIcon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
          }
        }

        return {
          id: union.id,
          name: union.name,
          officialUrl: union.officialUrl || "",
          url: union.url,
          websiteIcon,
          iconLight,
          iconDark,
          description: union.description || "",
          order: union.order || 0
        };
      });

    let payload = {};
    if (category === "links") {
      payload = { links: activeLinks };
    } else if (category === "unions") {
      payload = { unions };
    } else {
      payload = {
        title: settings.siteTitle || "友情链接",
        description: settings.siteDescription || "",
        favicon: settings.favicon || "",
        unions: unions,
        links: activeLinks,
        updatedAt: Date.now()
      };
    }

    return Response.json(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err) {
    return Response.json({ error: "Failed to load public links: " + err.message }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }
}
