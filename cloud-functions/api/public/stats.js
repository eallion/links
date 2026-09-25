import { getLinks, getUnions } from "../_storage.js";
import { requireAuth } from "../_auth.js";

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const [links, unions] = await Promise.all([getLinks(), getUnions()]);
    const activeLinksCount = (links || []).filter((l) => l.status === "active").length;
    const totalLinksCount = (links || []).length;
    const unionsCount = (unions || []).length;

    return Response.json({
      links: {
        active: activeLinksCount,
        total: totalLinksCount
      },
      unions: unionsCount,
      timestamp: Date.now()
    }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=120"
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
