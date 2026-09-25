import { getLinks, saveLinks } from "../_storage.js";
import { requireAuth } from "../_auth.js";

export async function onRequestGet(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const links = await getLinks();
    return Response.json({ links });
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
    if (!data.title || !data.url) {
      return Response.json({ error: "Title and URL are required" }, { status: 400 });
    }

    const links = await getLinks();
    const newId = data.id || `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newLink = {
      id: newId,
      title: data.title.trim(),
      author: data.author ? data.author.trim() : "",
      protocol: data.protocol || "https://",
      url: data.url.trim(),
      description: data.description ? data.description.trim() : "",
      avatarType: data.avatarType || "url", // gravatar | url | blob
      avatar: data.avatar ? data.avatar.trim() : "",
      avatarUrl: data.avatarUrl || "",
      favicon: data.favicon ? data.favicon.trim() : "",
      status: data.status || "active", // active | hidden
      pinned: Boolean(data.pinned || data.isTop),
      order: typeof data.order === "number" ? data.order : links.length + 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    links.push(newLink);
    await saveLinks(links);

    return Response.json({ success: true, link: newLink }, { status: 201 });
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
    if (Array.isArray(data.links)) {
      await saveLinks(data.links);
      return Response.json({ success: true, count: data.links.length, links: data.links });
    }

    const { id } = data;
    if (!id) {
      return Response.json({ error: "Missing link ID" }, { status: 400 });
    }

    const links = await getLinks();
    const index = links.findIndex((item) => item.id === id);
    if (index === -1) {
      return Response.json({ error: "Link not found" }, { status: 404 });
    }

    links[index] = {
      ...links[index],
      ...data,
      pinned: typeof data.pinned !== "undefined" ? Boolean(data.pinned) : (typeof data.isTop !== "undefined" ? Boolean(data.isTop) : Boolean(links[index].pinned || links[index].isTop)),
      id, // Preserve original id
      updatedAt: Date.now()
    };

    await saveLinks(links);
    return Response.json({ success: true, link: links[index] });
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
      return Response.json({ error: "Missing link ID" }, { status: 400 });
    }

    const links = await getLinks();
    const filtered = links.filter((item) => item.id !== id);

    if (filtered.length === links.length) {
      return Response.json({ error: "Link not found" }, { status: 404 });
    }

    await saveLinks(filtered);
    return Response.json({ success: true, deletedId: id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
