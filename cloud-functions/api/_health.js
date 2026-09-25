import tls from "node:tls";

/**
 * 从 URL 中提取纯主机名 (hostname) 和根域名 (apex domain)
 */
export function extractHostnameAndDomain(inputUrl) {
  if (!inputUrl) return { hostname: "", domain: "" };
  let hostname = "";
  try {
    const clean = inputUrl.trim();
    const target = clean.includes("://") ? clean : "https://" + clean;
    hostname = new URL(target).hostname.toLowerCase();
  } catch {
    hostname = inputUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0].split(":")[0].trim().toLowerCase();
  }

  // 提取用于 RDAP 查询的根域名（兼容常见复合顶级域如 .com.cn / .org.cn / .co.uk / .edu.cn）
  let domain = hostname;
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    if (["com", "net", "org", "edu", "gov", "co"].includes(secondLast) && last.length <= 3) {
      domain = parts.slice(-3).join(".");
    } else {
      domain = parts.slice(-2).join(".");
    }
  }

  return { hostname, domain };
}

/**
 * 1. 检测站点 HTTP 连通性 (最低网络开销：首选 HEAD，超时 3.5 秒)
 */
export async function checkHttpAvailability(url) {
  const cleanUrl = url.includes("://") ? url : "https://" + url;
  const startTime = Date.now();
  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; EdgeOneLinksHealthBot/1.0; +https://links.manager)"
  };

  try {
    const res = await fetch(cleanUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(3500),
      headers
    });
    return {
      alive: res.ok || (res.status >= 200 && res.status < 400),
      statusCode: res.status,
      latency: Date.now() - startTime
    };
  } catch (headErr) {
    // 针对个别服务器禁用 HEAD (返回 405) 或异常，以 Range: bytes=0-0 超小 GET 回退尝试
    try {
      const res = await fetch(cleanUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(3000),
        headers: {
          ...headers,
          "Range": "bytes=0-0"
        }
      });
      return {
        alive: res.ok || (res.status >= 200 && res.status < 400),
        statusCode: res.status,
        latency: Date.now() - startTime
      };
    } catch (getErr) {
      return {
        alive: false,
        statusCode: 0,
        error: getErr.name === "TimeoutError" ? "TIMEOUT" : "CONNECT_FAIL",
        latency: Date.now() - startTime
      };
    }
  }
}

/**
 * 2. 检测 SSL 证书状态 (纯 TLS 握手，握手成功立刻销毁 Socket，零流量负载)
 */
export async function checkSslCertificate(hostname, port = 443) {
  return new Promise((resolve) => {
    let settled = false;
    let socket = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (socket) {
          try { socket.destroy(); } catch {}
        }
        resolve({
          valid: false,
          error: "TIMEOUT",
          daysRemaining: 0,
          issuer: "",
          validTo: null
        });
      }
    }, 4000);

    try {
      socket = tls.connect({
        host: hostname,
        port,
        servername: hostname,
        timeout: 3500,
        rejectUnauthorized: false // 允许获取过期或自签名证书的元数据
      }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        try {
          const cert = socket.getPeerCertificate();
          const isAuthorized = socket.authorized;
          const authError = socket.authorizationError;

          if (!cert || !cert.valid_to) {
            socket.destroy();
            return resolve({
              valid: false,
              error: "NO_CERT",
              daysRemaining: 0,
              issuer: "",
              validTo: null
            });
          }

          const validTo = new Date(cert.valid_to).getTime();
          const validFrom = cert.valid_from ? new Date(cert.valid_from).getTime() : null;
          const now = Date.now();
          const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
          const issuer = cert.issuer ? (cert.issuer.O || cert.issuer.CN || "Unknown") : "Unknown";

          socket.destroy();

          resolve({
            valid: isAuthorized && daysRemaining > 0,
            authorized: isAuthorized,
            authError: authError ? String(authError) : null,
            issuer,
            validFrom,
            validTo,
            daysRemaining
          });
        } catch (err) {
          socket.destroy();
          resolve({
            valid: false,
            error: err.message,
            daysRemaining: 0,
            issuer: "",
            validTo: null
          });
        }
      });

      socket.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (socket) {
          try { socket.destroy(); } catch {}
        }
        resolve({
          valid: false,
          error: err.code || err.message,
          daysRemaining: 0,
          issuer: "",
          validTo: null
        });
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          valid: false,
          error: err.message,
          daysRemaining: 0,
          issuer: "",
          validTo: null
        });
      }
    }
  });
}

/**
 * 3. 检测域名到期时间 (ICANN 标准 RDAP 协议，带 15 天本地长效缓存)
 */
export async function checkDomainExpiration(domain, cachedDomainInfo) {
  const CACHE_TTL = 15 * 24 * 60 * 60 * 1000; // 15 天缓存
  const now = Date.now();

  // 若已有缓存且缓存时间小于 15 天，且包含有效过期时间，直接基于当前时间重新计算剩余天数
  if (cachedDomainInfo && cachedDomainInfo.expiresAt && cachedDomainInfo.checkedAt) {
    if (now - cachedDomainInfo.checkedAt < CACHE_TTL) {
      const daysRemaining = Math.floor((cachedDomainInfo.expiresAt - now) / (1000 * 60 * 60 * 24));
      return {
        ...cachedDomainInfo,
        daysRemaining,
        cached: true
      };
    }
  }

  // 缓存过期或首次检测时，发起一次轻量 RDAP RESTful 查询
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "Accept": "application/rdap+json, application/json",
        "User-Agent": "EdgeOneLinksHealthBot/1.0"
      }
    });

    if (!res.ok) {
      return {
        expiresAt: cachedDomainInfo?.expiresAt || null,
        daysRemaining: cachedDomainInfo?.expiresAt ? Math.floor((cachedDomainInfo.expiresAt - now) / (1000 * 60 * 60 * 24)) : null,
        error: `HTTP_${res.status}`,
        checkedAt: now
      };
    }

    const rdapData = await res.json();
    const events = rdapData.events || [];
    let expirationDateStr = null;

    for (const evt of events) {
      const action = String(evt.eventAction || "").toLowerCase();
      if (action === "expiration" || action === "registration expiration") {
        expirationDateStr = evt.eventDate;
        break;
      }
    }

    if (!expirationDateStr) {
      return {
        expiresAt: cachedDomainInfo?.expiresAt || null,
        daysRemaining: cachedDomainInfo?.expiresAt ? Math.floor((cachedDomainInfo.expiresAt - now) / (1000 * 60 * 60 * 24)) : null,
        error: "NO_EXPIRATION_FIELD",
        checkedAt: now
      };
    }

    const expiresAt = new Date(expirationDateStr).getTime();
    const daysRemaining = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

    return {
      expiresAt,
      daysRemaining,
      checkedAt: now
    };
  } catch (err) {
    return {
      expiresAt: cachedDomainInfo?.expiresAt || null,
      daysRemaining: cachedDomainInfo?.expiresAt ? Math.floor((cachedDomainInfo.expiresAt - now) / (1000 * 60 * 60 * 24)) : null,
      error: err.name === "TimeoutError" ? "TIMEOUT" : err.message,
      checkedAt: now
    };
  }
}

/**
 * 4. 针对单条友链的综合巡检 (带短路保护与状态评估)
 */
export async function inspectSingleLink(link, cachedHealth) {
  const { hostname, domain } = extractHostnameAndDomain(link.url);
  if (!hostname) {
    return {
      status: "error",
      http: { alive: false, statusCode: 0, error: "INVALID_URL" },
      ssl: null,
      domain: null,
      checkedAt: Date.now()
    };
  }

  // 1. HTTP 连通性测试
  const httpRes = await checkHttpAvailability(link.url);

  // 短路保护：若完全无法连通或发生严重网络错误，保留已有证书/域名历史，标记错误并提前返回
  if (!httpRes.alive && httpRes.error === "CONNECT_FAIL") {
    return {
      status: "error",
      http: httpRes,
      ssl: cachedHealth?.ssl || null,
      domain: cachedHealth?.domain || null,
      checkedAt: Date.now()
    };
  }

  // 2. SSL 证书检测 (仅对 https 协议执行)
  const isHttps = !link.url.toLowerCase().startsWith("http://");
  let sslRes = null;
  if (isHttps) {
    sslRes = await checkSslCertificate(hostname);
  }

  // 3. 域名过期时间检测 (RDAP)
  const domainRes = await checkDomainExpiration(domain, cachedHealth?.domain);

  // 4. 综合健康度评估: healthy | warning | error
  let overallStatus = "healthy";
  if (!httpRes.alive || (sslRes && !sslRes.valid)) {
    overallStatus = "error";
  } else if (
    (sslRes && sslRes.daysRemaining <= 15) ||
    (domainRes && typeof domainRes.daysRemaining === "number" && domainRes.daysRemaining <= 30)
  ) {
    overallStatus = "warning";
  }

  return {
    status: overallStatus,
    http: httpRes,
    ssl: sslRes,
    domain: domainRes,
    checkedAt: Date.now()
  };
}

/**
 * 5. 批量受控并发巡检池 (默认并发度 4，兼顾高效与低负载)
 */
export async function inspectLinksBatch(links, oldHealthMap = {}, concurrency = 4) {
  const newHealthMap = { ...oldHealthMap };
  const items = (links || []).filter(item => item && item.url);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const link = items[idx];
      const { hostname, domain } = extractHostnameAndDomain(link.url);
      const cached = oldHealthMap[link.id] || oldHealthMap[hostname] || oldHealthMap[domain];

      try {
        const itemResult = await inspectSingleLink(link, cached);
        newHealthMap[link.id] = itemResult;
        if (hostname) newHealthMap[hostname] = itemResult;
      } catch (err) {
        newHealthMap[link.id] = {
          status: "error",
          http: { alive: false, statusCode: 0, error: err.message },
          ssl: null,
          domain: null,
          checkedAt: Date.now()
        };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length || 1);
  const workers = Array(workerCount).fill(0).map(() => worker());
  await Promise.all(workers);

  return newHealthMap;
}
