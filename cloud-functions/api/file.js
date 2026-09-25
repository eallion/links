import { getLinksStore } from "./_storage.js";

const MIME_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  json: "application/json"
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  // Security check: prevent directory traversal and disallow access to internal data files
  if (key.includes("..") || key.startsWith("/") || (!key.startsWith("uploads/") && !key.startsWith("favicons/"))) {
    return new Response("Forbidden: Access denied", { status: 403 });
  }

  try {
    const store = getLinksStore();
    const buffer = await store.get(key, { type: "arrayBuffer" });

    if (!buffer) {
      return new Response("Not found", { status: 404 });
    }

    const ext = key.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response("Error reading file: " + err.message, { status: 500 });
  }
}
