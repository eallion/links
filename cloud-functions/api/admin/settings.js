import { getSettings, saveSettings } from "../_storage.js";
import { requireAuth } from "../_auth.js";

function extractMirrorDomain(val) {
  if (!val) return "gravatar.bluecdn.com";
  const m = String(val).trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/avatar\/?$/i, "")
    .replace(/\/+$/, "");
  return m || "gravatar.bluecdn.com";
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const settings = await getSettings();
    const safeSettings = {
      siteTitle: settings.siteTitle || "友情链接",
      siteDescription: settings.siteDescription || "连接彼此，共享价值",
      gravatarMirror: extractMirrorDomain(settings.gravatarMirror),
      favicon: settings.favicon || "",
      turnstileEnabled: Boolean(settings.turnstileEnabled),
      turnstileSiteKey: settings.turnstileSiteKey || "1x00000000000000000000AA",
      turnstileSecretKeyMasked: settings.turnstileSecretKey ? `${settings.turnstileSecretKey.slice(0, 6)}...${settings.turnstileSecretKey.slice(-4)}` : "",
      updatedAt: settings.updatedAt || Date.now()
    };
    return Response.json({ settings: safeSettings });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const data = await request.json();
    const settings = await getSettings();

    if (data.siteTitle !== undefined) settings.siteTitle = String(data.siteTitle).trim();
    if (data.siteDescription !== undefined) settings.siteDescription = String(data.siteDescription).trim();
    if (data.gravatarMirror !== undefined) {
      settings.gravatarMirror = extractMirrorDomain(data.gravatarMirror);
    }
    if (data.favicon !== undefined) {
      settings.favicon = String(data.favicon).trim();
    }
    if (data.turnstileEnabled !== undefined) {
      settings.turnstileEnabled = Boolean(data.turnstileEnabled);
    }
    if (data.turnstileSiteKey !== undefined && data.turnstileSiteKey.trim()) {
      settings.turnstileSiteKey = data.turnstileSiteKey.trim();
    }
    if (data.turnstileSecretKey !== undefined && data.turnstileSecretKey.trim()) {
      settings.turnstileSecretKey = data.turnstileSecretKey.trim();
    }

    settings.updatedAt = Date.now();
    await saveSettings(settings);

    return Response.json({
      success: true,
      settings: {
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        gravatarMirror: settings.gravatarMirror,
        favicon: settings.favicon,
        turnstileEnabled: Boolean(settings.turnstileEnabled),
        turnstileSiteKey: settings.turnstileSiteKey,
        turnstileSecretKeyMasked: settings.turnstileSecretKey ? `${settings.turnstileSecretKey.slice(0, 6)}...${settings.turnstileSecretKey.slice(-4)}` : "",
        updatedAt: settings.updatedAt
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
