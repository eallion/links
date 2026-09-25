import { getLinksStore } from "./_storage.js";
import { requireAuth } from "./_auth.js";

export async function onRequestPost(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  const store = getLinksStore();
  const contentType = request.headers.get("content-type") || "";

  try {
    let filename = "";
    let buffer = null;
    let category = "avatars"; // avatars | icons | misc

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      category = formData.get("category") || "avatars";

      if (!file || typeof file === "string") {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      filename = file.name || "upload.png";
      buffer = await file.arrayBuffer();
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      category = body.category || "avatars";
      filename = body.name || "upload.png";

      if (!body.base64) {
        return Response.json({ error: "Missing base64 data" }, { status: 400 });
      }

      // Strip data:image/...;base64, prefix if present
      const cleanBase64 = body.base64.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, "");
      const binaryStr = atob(cleanBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      buffer = bytes.buffer;
    } else {
      return Response.json({ error: "Unsupported Content-Type" }, { status: 400 });
    }

    // Sanitize extension
    const ext = filename.split(".").pop()?.toLowerCase() || "png";
    const allowedExts = ["png", "jpg", "jpeg", "svg", "webp", "gif", "ico"];
    const finalExt = allowedExts.includes(ext) ? ext : "png";

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const key = `uploads/${category}/${uniqueId}.${finalExt}`;

    await store.set(key, buffer);

    const publicUrl = `/api/file?key=${encodeURIComponent(key)}`;

    return Response.json({
      success: true,
      key,
      url: publicUrl,
      filename
    });
  } catch (err) {
    return Response.json({ error: "Upload failed: " + err.message }, { status: 500 });
  }
}
