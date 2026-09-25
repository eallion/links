import { getLinks, getHealthData, saveHealthData } from "../_storage.js";
import { requireAuth } from "../_auth.js";
import { inspectSingleLink, inspectLinksBatch } from "../_health.js";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const [links, healthMap] = await Promise.all([
      getLinks(),
      getHealthData()
    ]);

    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let unknownCount = 0;

    for (const link of links) {
      const h = healthMap[link.id];
      if (!h || !h.status) {
        unknownCount++;
      } else if (h.status === "healthy") {
        healthyCount++;
      } else if (h.status === "warning") {
        warningCount++;
      } else {
        errorCount++;
      }
    }

    return Response.json({
      success: true,
      stats: {
        total: links.length,
        healthy: healthyCount,
        warning: warningCount,
        error: errorCount,
        unknown: unknownCount
      },
      health: healthMap
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request } = context;

  // 1. 判断是否为 EdgeOne Schedules 定时任务调用
  const isScheduleTrigger = Boolean(
    request.headers.get("x-edgeone-schedule") ||
    request.headers.get("x-cron-trigger") ||
    request.headers.get("user-agent")?.toLowerCase().includes("edgeone-schedule")
  );

  // 若不是定时任务触发，则严格要求管理员登录凭证
  if (!isScheduleTrigger) {
    const auth = await requireAuth(context);
    if (!auth.authorized) {
      return auth.response;
    }
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {}

    const [links, oldHealthMap] = await Promise.all([
      getLinks(),
      getHealthData()
    ]);

    // 模式 A：单条链接检测
    if (body.linkId) {
      const targetLink = links.find(l => l.id === body.linkId);
      if (!targetLink) {
        return Response.json({ error: "Link not found" }, { status: 404 });
      }

      const cached = oldHealthMap[targetLink.id];
      const result = await inspectSingleLink(targetLink, cached);

      const updatedHealthMap = {
        ...oldHealthMap,
        [targetLink.id]: result
      };
      await saveHealthData(updatedHealthMap);

      return Response.json({
        success: true,
        linkId: targetLink.id,
        health: result
      });
    }

    // 模式 B：全量批量巡检 (受控并发度 4，兼顾安全与低开销)
    const newHealthMap = await inspectLinksBatch(links, oldHealthMap, 4);
    await saveHealthData(newHealthMap);

    return Response.json({
      success: true,
      checkedCount: links.length,
      updatedAt: Date.now(),
      health: newHealthMap
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
