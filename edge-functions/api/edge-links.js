// Edge Function - Ultra-low latency edge read utilizing EdgeOne KV
// Variable name `links_kv` is bound in the EdgeOne Makers console under KV Storage.

export async function onRequest({ request }) {
  try {
    // If links_kv global is bound in console
    if (typeof links_kv !== "undefined" && links_kv) {
      const cached = await links_kv.get("cache:public_links", "json");
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60, s-maxage=300",
            "X-Edge-Cache": "HIT"
          }
        });
      }
    }
  } catch {
    // Graceful fallback if KV is not yet configured or during local mock
  }

  // Fallback: proxy to Cloud Function
  const originUrl = new URL(request.url);
  originUrl.pathname = "/api/public/links";
  return fetch(originUrl.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": request.headers.get("User-Agent") || "EdgeOne-Edge-Function"
    }
  });
}
