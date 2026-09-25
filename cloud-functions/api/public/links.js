import crypto from "node:crypto";
import { getLinks, getUnions, getSettings, getHealthData } from "../_storage.js";

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

function formatAvatarUrl(link, mirror) {
  let m = String(mirror || "gravatar.bluecdn.com").trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/avatar\/?$/i, "")
    .replace(/\/+$/, "");
  if (!m) m = "gravatar.bluecdn.com";
  const baseUrl = `https://${m}/avatar/`;

  const domain = extractDomain(link?.url || "");
  const defaultHash = domain
    ? crypto.createHash("md5").update(domain.toLowerCase()).digest("hex")
    : "00000000000000000000000000000000";
  const fallbackAvatar = `${baseUrl}${defaultHash}?d=mp`;

  const raw = String(link?.avatar || link?.avatarUrl || link?.email || link?.mail || "").trim();
  if (!raw) {
    return fallbackAvatar;
  }

  // 1. QQ number (5 to 12 digits): fetch from q.qlogo.cn (spec=640)
  if (/^[1-9]\d{4,11}$/.test(raw)) {
    return `https://q.qlogo.cn/g?b=qq&nk=${raw}&s=640`;
  }

  // 2. Gravatar / Cravatar / WeAvatar / BlueCDN URL (extract hash and replace domain with mirror)
  const gravatarMatch = raw.match(/\/avatar\/([a-f0-9]{32,64})/i);
  if (gravatarMatch) {
    const hash = gravatarMatch[1].toLowerCase();
    let search = "?d=mp";
    try {
      if (raw.includes("?")) {
        search = "?" + raw.split("?")[1];
      }
    } catch {}
    return `${baseUrl}${hash}${search}`;
  }

  // 3. Existing MD5/SHA256 hex hash (32-64 chars): skip MD5 calculation
  if (/^[a-f0-9]{32,64}$/i.test(raw)) {
    return `${baseUrl}${raw.toLowerCase()}?d=mp`;
  }

  // 4. Email: lowercase and MD5
  if (raw.includes("@")) {
    const cleanEmail = raw.toLowerCase();
    const hash = crypto.createHash("md5").update(cleanEmail).digest("hex");
    return `${baseUrl}${hash}?d=mp`;
  }

  // 5. Custom image URL (http/https/data)
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }

  // 6. Blob asset key
  if (raw.startsWith("/api/file")) {
    return raw;
  }
  if (raw.startsWith("avatars/") || raw.startsWith("favicons/") || raw.includes(".")) {
    return `/api/file?key=${encodeURIComponent(raw)}`;
  }

  // Fallback: lowercase & MD5 as identifier for mirror
  const clean = raw.toLowerCase();
  const hash = crypto.createHash("md5").update(clean).digest("hex");
  return `${baseUrl}${hash}?d=mp`;
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
        const rawAvatar = String(link.avatar || link.avatarUrl || link.email || link.mail || "").trim();

        if (link.avatarType === "blob") {
          displayAvatar = resolveAssetUrl(link.avatar || link.avatarUrl);
        } else if (
          link.avatarType === "url" &&
          rawAvatar.startsWith("http") &&
          !/\/avatar\/([a-f0-9]{32,64})/i.test(rawAvatar) &&
          !rawAvatar.includes("@")
        ) {
          // Genuine external image URL (not Gravatar)
          displayAvatar = resolveAssetUrl(rawAvatar);
        } else {
          // Gravatar, email, hash, gravatar-urls, or empty/fallback
          displayAvatar = formatAvatarUrl(link, settings.gravatarMirror);
        }

        let displayFavicon = resolveAssetUrl(link.favicon || "");

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

    // Format blog unions (exclude hidden)
    const unions = (allUnions || [])
      .filter((u) => u.status !== "hidden")
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map((union) => {
        let iconLight = resolveAssetUrl(union.iconLight || union.iconDark || "");
        let iconDark = resolveAssetUrl(union.iconDark || union.iconLight || "");

        let websiteIcon = resolveAssetUrl(union.websiteIcon || "");

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

    const mirrorDomain = String(settings.gravatarMirror || "gravatar.bluecdn.com").trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/avatar\/?$/i, "")
      .replace(/\/+$/, "") || "gravatar.bluecdn.com";

    const shuffleEnabled = settings.shuffleEnabled !== undefined ? Boolean(settings.shuffleEnabled) : true;
    const fingerprintData = JSON.stringify({
      title: settings.siteTitle || "",
      description: settings.siteDescription || "",
      favicon: settings.favicon || "",
      gravatarMirror: mirrorDomain,
      shuffleEnabled,
      unions,
      links: activeLinks
    });
    const versionHash = crypto.createHash("md5").update(fingerprintData).digest("hex").slice(0, 16);
    const etag = `"${versionHash}"`;

    const clientEtag = req ? (req.headers?.get?.("if-none-match") || "") : "";
    if (clientEtag && clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    let payload = {};
    if (category === "links") {
      payload = { links: activeLinks, shuffleEnabled, gravatarMirror: mirrorDomain, version: versionHash };
    } else if (category === "unions") {
      payload = { unions, version: versionHash };
    } else {
      payload = {
        title: settings.siteTitle || "友情链接",
        description: settings.siteDescription || "",
        favicon: settings.favicon || "",
        gravatarMirror: mirrorDomain,
        shuffleEnabled,
        unions: unions,
        links: activeLinks,
        version: versionHash,
        updatedAt: settings.updatedAt || versionHash
      };
    }

    return Response.json(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "ETag": etag,
        "Cache-Control": "no-cache, must-revalidate"
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
