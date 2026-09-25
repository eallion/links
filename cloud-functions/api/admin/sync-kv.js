import { getLinks, saveLinks, getUnions, saveUnions, getSettings, saveSettings } from "../_storage.js";
import { requireAuth } from "../_auth.js";

function normalizeUrlKey(urlStr) {
  if (!urlStr) return "";
  return urlStr.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function onRequestPost(context) {
  const { request } = context;
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const action = body.action || "export";
    const mode = body.mode || "merge"; // "merge" | "replace"

    // 1. Export (All / Links / Unions)
    if (action === "export") {
      const type = body.type || "all";

      if (type === "links") {
        const links = await getLinks();
        return Response.json({
          success: true,
          type: "links",
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          count: links.length,
          links
        });
      }

      if (type === "unions") {
        const unions = await getUnions();
        return Response.json({
          success: true,
          type: "unions",
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          count: unions.length,
          unions
        });
      }

      // Default: export all
      const [links, unions, settings] = await Promise.all([
        getLinks(),
        getUnions(),
        getSettings()
      ]);

      const exportData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        site: {
          title: settings.siteTitle,
          description: settings.siteDescription,
          favicon: settings.favicon,
          gravatarMirror: settings.gravatarMirror
        },
        links,
        unions
      };

      return Response.json({
        success: true,
        type: "all",
        data: exportData
      });
    }

    // 2. Separate Import: Friend Links
    if (action === "import-links") {
      let rawList = null;
      if (Array.isArray(body.data)) {
        rawList = body.data;
      } else if (body.data && Array.isArray(body.data.links)) {
        rawList = body.data.links;
      } else if (body.data && body.data.data && Array.isArray(body.data.data.links)) {
        rawList = body.data.data.links;
      }

      if (!rawList || !Array.isArray(rawList)) {
        return Response.json({ error: "无效的友情链接数据格式，未找到有效链接数组" }, { status: 400 });
      }

      const validLinks = rawList
        .filter(item => item && (item.title || item.name) && item.url)
        .map((item, idx) => {
          const rawUrl = (item.url || "").trim();
          let protocol = item.protocol;
          if (!protocol) {
            if (rawUrl.startsWith("http://")) protocol = "http://";
            else if (rawUrl.startsWith("ipfs://")) protocol = "ipfs://";
            else protocol = "https://";
          }
          const rawAvatar = (item.avatar || "").trim();
          const isQQ = /^[1-9]\d{4,11}$/.test(rawAvatar);
          const isHexHash = /^[a-f0-9]{32,64}$/i.test(rawAvatar);
          const isEmail = rawAvatar.includes("@");
          const avatarType = item.avatarType || (isQQ || isHexHash || isEmail ? "gravatar" : (rawAvatar.includes("://") ? "url" : (rawAvatar ? "gravatar" : "url")));
          let avatarUrl = item.avatarUrl || "";
          if (!avatarUrl) {
            if (isQQ) {
              avatarUrl = `https://q.qlogo.cn/g?b=qq&nk=${rawAvatar}&s=640`;
            } else if (avatarType === "gravatar" && isHexHash) {
              avatarUrl = `https://gravatar.bluecdn.com/avatar/${rawAvatar.toLowerCase()}`;
            } else if (avatarType === "url") {
              avatarUrl = rawAvatar;
            }
          }

          return {
            id: item.id ? String(item.id).startsWith("link-") ? item.id : `link-${item.id}` : `link-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            title: (item.title || item.name || "").trim(),
            author: (item.author || item.name || "").trim(),
            protocol,
            url: rawUrl,
            description: (item.description || item.desc || item.biography || "").trim(),
            avatarType,
            avatar: rawAvatar,
            avatarUrl,
            favicon: (item.favicon || "").trim(),
            status: item.status === "hidden" ? "hidden" : "active",
            pinned: Boolean(item.pinned || item.isTop),
            order: typeof item.order === "number" ? item.order : (typeof item.id === "number" ? item.id : idx + 1),
            createdAt: item.createdAt || Date.now(),
            updatedAt: Date.now()
          };
        });

      if (validLinks.length === 0) {
        return Response.json({ error: "数据中未包含有效的链接项（每项必须包含名称与网址）" }, { status: 400 });
      }

      let finalLinks = [];
      let added = 0;
      let updated = 0;

      if (mode === "replace") {
        finalLinks = validLinks;
        added = validLinks.length;
      } else {
        const existingLinks = await getLinks();
        finalLinks = [...existingLinks];

        validLinks.forEach(newItem => {
          const newUrlKey = normalizeUrlKey(newItem.url);
          const existIndex = finalLinks.findIndex(e => e.id === newItem.id || normalizeUrlKey(e.url) === newUrlKey);

          if (existIndex !== -1) {
            finalLinks[existIndex] = {
              ...finalLinks[existIndex],
              ...newItem,
              id: finalLinks[existIndex].id,
              updatedAt: Date.now()
            };
            updated++;
          } else {
            newItem.order = finalLinks.length + 1;
            finalLinks.push(newItem);
            added++;
          }
        });
      }

      await saveLinks(finalLinks);

      return Response.json({
        success: true,
        count: finalLinks.length,
        added,
        updated,
        message: mode === "replace"
          ? `已成功覆盖导入 ${added} 条友情链接`
          : `成功导入友情链接：新增 ${added} 条，更新 ${updated} 条，共计 ${finalLinks.length} 条`
      });
    }

    // 3. Separate Import: Blog Unions
    if (action === "import-unions") {
      let rawList = null;
      if (Array.isArray(body.data)) {
        rawList = body.data;
      } else if (body.data && Array.isArray(body.data.unions)) {
        rawList = body.data.unions;
      } else if (body.data && body.data.data && Array.isArray(body.data.data.unions)) {
        rawList = body.data.data.unions;
      }

      if (!rawList || !Array.isArray(rawList)) {
        return Response.json({ error: "无效的博客联盟数据格式，未找到有效联盟数组" }, { status: 400 });
      }

      const validUnions = rawList
        .filter(item => item && (item.name || item.title) && (item.url || item.officialUrl))
        .map((item, idx) => ({
          id: item.id || `union-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          name: (item.name || item.title || "").trim(),
          officialUrl: (item.officialUrl || "").trim(),
          url: (item.url || item.officialUrl || "").trim(),
          websiteIcon: (item.websiteIcon || "").trim(),
          description: (item.description || item.desc || "").trim(),
          iconType: item.iconType || "url",
          iconLight: (item.iconLight || "").trim(),
          iconDark: (item.iconDark || "").trim(),
          order: typeof item.order === "number" ? item.order : idx + 1,
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now()
        }));

      if (validUnions.length === 0) {
        return Response.json({ error: "数据中未包含有效的博客联盟项（每项必须包含联盟名称与链接）" }, { status: 400 });
      }

      let finalUnions = [];
      let added = 0;
      let updated = 0;

      if (mode === "replace") {
        finalUnions = validUnions;
        added = validUnions.length;
      } else {
        const existingUnions = await getUnions();
        finalUnions = [...existingUnions];

        validUnions.forEach(newItem => {
          const newUrlKey = normalizeUrlKey(newItem.url || newItem.officialUrl);
          const existIndex = finalUnions.findIndex(e => e.id === newItem.id || normalizeUrlKey(e.url || e.officialUrl) === newUrlKey);

          if (existIndex !== -1) {
            finalUnions[existIndex] = {
              ...finalUnions[existIndex],
              ...newItem,
              id: finalUnions[existIndex].id,
              updatedAt: Date.now()
            };
            updated++;
          } else {
            newItem.order = finalUnions.length + 1;
            finalUnions.push(newItem);
            added++;
          }
        });
      }

      await saveUnions(finalUnions);

      return Response.json({
        success: true,
        count: finalUnions.length,
        added,
        updated,
        message: mode === "replace"
          ? `已成功覆盖导入 ${added} 个博客联盟`
          : `成功导入博客联盟：新增 ${added} 个，更新 ${updated} 个，共计 ${finalUnions.length} 个`
      });
    }

    // 4. Full Import (Backup Restore)
    if (action === "import") {
      const { data } = body;
      const backupData = data?.data || data;

      if (!backupData || !Array.isArray(backupData.links) || !Array.isArray(backupData.unions)) {
        return Response.json({ error: "无效的全量备份数据结构，缺少 links 或 unions 列表" }, { status: 400 });
      }

      if (mode === "replace") {
        await Promise.all([
          saveLinks(backupData.links),
          saveUnions(backupData.unions)
        ]);
      } else {
        const [existLinks, existUnions] = await Promise.all([getLinks(), getUnions()]);
        const finalLinks = [...existLinks];
        const finalUnions = [...existUnions];

        backupData.links.forEach(item => {
          const key = normalizeUrlKey(item.url);
          const idx = finalLinks.findIndex(e => e.id === item.id || normalizeUrlKey(e.url) === key);
          if (idx !== -1) {
            finalLinks[idx] = { ...finalLinks[idx], ...item, id: finalLinks[idx].id };
          } else {
            finalLinks.push(item);
          }
        });

        backupData.unions.forEach(item => {
          const key = normalizeUrlKey(item.url || item.officialUrl);
          const idx = finalUnions.findIndex(e => e.id === item.id || normalizeUrlKey(e.url || e.officialUrl) === key);
          if (idx !== -1) {
            finalUnions[idx] = { ...finalUnions[idx], ...item, id: finalUnions[idx].id };
          } else {
            finalUnions.push(item);
          }
        });

        await Promise.all([
          saveLinks(finalLinks),
          saveUnions(finalUnions)
        ]);
      }

      if (backupData.site) {
        const settings = await getSettings();
        if (backupData.site.title) settings.siteTitle = backupData.site.title;
        if (backupData.site.description) settings.siteDescription = backupData.site.description;
        if (backupData.site.favicon) settings.favicon = backupData.site.favicon;
        if (backupData.site.gravatarMirror) {
          settings.gravatarMirror = String(backupData.site.gravatarMirror).trim()
            .replace(/^https?:\/\//i, "")
            .replace(/\/avatar\/?$/i, "")
            .replace(/\/+$/, "") || "gravatar.bluecdn.com";
        }
        await saveSettings(settings);
      }

      return Response.json({
        success: true,
        message: `全量数据导入成功（友情链接 ${backupData.links.length} 条，博客联盟 ${backupData.unions.length} 个）`
      });
    }

    return Response.json({ error: "未知操作类型" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
