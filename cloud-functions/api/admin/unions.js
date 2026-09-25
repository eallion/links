import { getUnions, saveUnions } from "../_storage.js";
import { requireAuth } from "../_auth.js";

export async function onRequestGet(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const unions = await getUnions();
    return Response.json({ unions });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const data = await request.json();
    if (!data.name || !data.url) {
      return Response.json({ error: "Name and URL are required" }, { status: 400 });
    }

    const unions = await getUnions();
    const newId = data.id || `union-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newUnion = {
      id: newId,
      name: data.name.trim(),
      officialUrl: data.officialUrl ? data.officialUrl.trim() : "",
      url: data.url.trim(),
      websiteIcon: data.websiteIcon ? data.websiteIcon.trim() : "",
      description: data.description ? data.description.trim() : "",
      iconType: data.iconType || "url", // url | blob
      iconLight: data.iconLight ? data.iconLight.trim() : "",
      iconDark: data.iconDark ? data.iconDark.trim() : "",
      order: typeof data.order === "number" ? data.order : unions.length + 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    unions.push(newUnion);
    await saveUnions(unions);

    return Response.json({ success: true, union: newUnion }, { status: 201 });
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

    // Support batch update
    if (Array.isArray(data.unions)) {
      await saveUnions(data.unions);
      return Response.json({ success: true, count: data.unions.length, unions: data.unions });
    }

    const { id } = data;
    if (!id) {
      return Response.json({ error: "Missing union ID" }, { status: 400 });
    }

    const unions = await getUnions();
    const index = unions.findIndex((item) => item.id === id);
    if (index === -1) {
      return Response.json({ error: "Union not found" }, { status: 404 });
    }

    unions[index] = {
      ...unions[index],
      ...data,
      id,
      updatedAt: Date.now()
    };

    await saveUnions(unions);
    return Response.json({ success: true, union: unions[index] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Missing union ID" }, { status: 400 });
    }

    const unions = await getUnions();
    const filtered = unions.filter((item) => item.id !== id);

    if (filtered.length === unions.length) {
      return Response.json({ error: "Union not found" }, { status: 404 });
    }

    await saveUnions(filtered);
    return Response.json({ success: true, deletedId: id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
