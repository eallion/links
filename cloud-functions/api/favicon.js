import { getLinksStore } from "./_storage.js";
import { requireAuth } from "./_auth.js";

function extractDomain(inputUrl) {
  try {
    let clean = inputUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname;
  } catch {
    return inputUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0].trim();
  }
}

export async function onRequestPost(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { url, domain: explicitDomain } = await request.json();
    const domain = explicitDomain || extractDomain(url || "");

    if (!domain) {
      return Response.json({ error: "Missing domain or url" }, { status: 400 });
    }

    const store = getLinksStore();
    const key = `favicons/${domain}.png`;

    // Fetch from Google Favicon API (sz=128 for high resolution)
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    
    let res = null;
    try {
      res = await fetch(googleFaviconUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      // Fallback to gstatic favicon service if s2 times out
      const fallbackUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(domain)}&size=128`;
      res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
    }

    if (!res || !res.ok) {
      return Response.json({ error: "Failed to fetch favicon from Google Favicon API" }, { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Received empty favicon from provider" }, { status: 502 });
    }

    // Persist to EdgeOne Blob
    await store.set(key, arrayBuffer);

    const publicUrl = `/api/file?key=${encodeURIComponent(key)}`;

    return Response.json({
      success: true,
      domain,
      key,
      url: publicUrl,
      size: arrayBuffer.byteLength
    });
  } catch (err) {
    return Response.json({ error: "Favicon caching failed: " + err.message }, { status: 500 });
  }
}
