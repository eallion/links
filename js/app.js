/* ==========================================================================
   Public Entrance & Links Showcase (Theme, Unions, Links, 3 Styles & Auth)
   ========================================================================== */

let cachedLinks = [];
let cachedUnions = [];
let cachedSettings = {};

let currentStyle = localStorage.getItem("links_style") || "detailed";
let turnstileWidgetId = null;
let turnstileToken = "";
let turnstileTicket = "";
let turnstileSiteKey = "1x00000000000000000000AA";
let turnstileEnabled = false;

// Safe HTML escape helper
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAssetUrl(str) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/api/file") || s.startsWith("data:")) {
    return s;
  }
  return `/api/file?key=${encodeURIComponent(s)}`;
}

// ==========================================================================
// Theme Management (Light & Dark)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("links_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const target = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", target);
  localStorage.setItem("links_theme", target);
  updateThemeIcon(target);
}

function updateThemeIcon(theme) {
  const iconEl = document.getElementById("theme-toggle-icon");
  if (!iconEl) return;
  if (theme === "dark") {
    iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  } else {
    iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  }
}

// ==========================================================================
// Public Links & Unions Loading (Requirement 1 & 5)
// ==========================================================================
async function loadPublicData() {
  try {
    const res = await fetch(`/api/public/links?_t=${Date.now()}`);
    if (!res.ok) throw new Error("无法获取链接数据");
    const data = await res.json();

    cachedLinks = data.links || [];
    cachedUnions = data.unions || [];

    // Site Title & Description
    if (data.title) {
      document.title = `${data.title} - 友情链接`;
      const brandEl = document.getElementById("site-brand-title");
      if (brandEl) brandEl.textContent = data.title;
      const heroTitleEl = document.getElementById("hero-title");
      if (heroTitleEl) heroTitleEl.textContent = data.title;
    }
    if (data.description) {
      const heroDescEl = document.getElementById("hero-desc");
      if (heroDescEl) heroDescEl.textContent = data.description;
      const metaDescEl = document.getElementById("page-desc");
      if (metaDescEl) metaDescEl.setAttribute("content", data.description);
    }
    if (data.favicon) {
      let fav = document.getElementById("site-favicon-link");
      if (!fav) {
        fav = document.createElement("link");
        fav.rel = "icon";
        fav.id = "site-favicon-link";
        document.head.appendChild(fav);
      }
      fav.href = formatAssetUrl(data.favicon);
    }

    renderUnions();
    renderLinks();
  } catch (err) {
    console.error("加载公开数据失败:", err);
    renderUnions();
    renderLinks();
  }
}

// Top Part: 联盟 (Unions - Matching https://www.eallion.com/links/#联盟)
function renderUnions() {
  const container = document.getElementById("unions-container");
  const countEl = document.getElementById("unions-count");
  if (countEl) countEl.textContent = cachedUnions.length;
  if (!container) return;

  if (cachedUnions.length === 0) {
    container.innerHTML = `<div class="empty-box" style="width: 100%;">暂未加入博客联盟</div>`;
    return;
  }

  container.innerHTML = cachedUnions.map(union => {
    const lightIcon = formatAssetUrl(union.iconLight || union.iconDark || "");
    const darkIcon = formatAssetUrl(union.iconDark || union.iconLight || "");
    const websiteIcon = formatAssetUrl(union.websiteIcon || "");

    const hasBadge = !!(lightIcon || darkIcon);
    const hasBothThemes = !!(lightIcon && darkIcon && lightIcon !== darkIcon);

    return `
      <a href="${escapeHtml(union.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(union.name)}" class="union-badge" id="union-badge-${escapeHtml(union.id)}">
        ${hasBadge ? (
          hasBothThemes ? `
            <img class="union-badge-img union-badge-light" src="${escapeHtml(lightIcon)}" alt="${escapeHtml(union.name)}" loading="lazy">
            <img class="union-badge-img union-badge-dark" src="${escapeHtml(darkIcon)}" alt="${escapeHtml(union.name)}" loading="lazy">
          ` : `
            <img class="union-badge-img" src="${escapeHtml(lightIcon || darkIcon)}" alt="${escapeHtml(union.name)}" loading="lazy">
          `
        ) : (
          websiteIcon ? `
            <img class="union-badge-mini-icon" src="${escapeHtml(websiteIcon)}" alt="${escapeHtml(union.name)}" onerror="this.style.display='none';">
            <span class="union-badge-text">${escapeHtml(union.name)}</span>
          ` : `
            <span class="union-badge-text">${escapeHtml(union.name)}</span>
          `
        )}
      </a>
    `;
  }).join("");
}

function formatDisplayUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return (rawUrl || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

// Bottom Part: 友情链接 (Friend Links with 3 Styles: 简约, 详情, 应用)
function renderLinks() {
  const container = document.getElementById("links-container");
  const countEl = document.getElementById("links-count");
  if (countEl) countEl.textContent = cachedLinks.length;
  if (!container) return;

  // Apply current style class
  container.className = `links-grid style-${currentStyle}`;

  if (cachedLinks.length === 0) {
    container.innerHTML = `<div class="empty-box">暂未添加友情链接</div>`;
    return;
  }

  // Sort: pinned links first, then by order asc
  const sortedLinks = [...cachedLinks].sort((a, b) => {
    const aPinned = Boolean(a.pinned || a.isTop);
    const bPinned = Boolean(b.pinned || b.isTop);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return (a.order || 999) - (b.order || 999);
  });

  container.innerHTML = sortedLinks.map(link => {
    const avatarSrc = link.avatar || link.favicon || "/favicon.ico";
    const displayUrl = formatDisplayUrl(link.url);
    const faviconSrc = link.favicon || "";

    const health = link.health;
    let healthDotHtml = "";
    if (health) {
      const httpCode = health.httpCode || 0;
      const isHealthy = httpCode >= 200 && httpCode < 400;
      const dotStatus = isHealthy ? "healthy" : "error";
      const titleText = httpCode ? `Code ${httpCode}` : "Code 异常";
      healthDotHtml = `<span class="health-indicator status-${dotStatus}" data-tooltip="${escapeHtml(titleText)}"></span>`;
    }

    let sslLockHtml = "";
    if (health) {
      const isSslValid = Boolean(health.sslValid && (health.sslDays === null || health.sslDays > 0));
      const sslClass = isSslValid ? "valid" : "invalid";
      const sslTitle = isSslValid ? "SSL 证书有效" : "SSL 证书无效或已过期";
      sslLockHtml = `<svg class="ssl-lock-icon ${sslClass}" width="13" height="13" viewBox="0 0 24 24" title="${sslTitle}"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
    } else if (link.url) {
      const isHttps = link.url.toLowerCase().startsWith("https://") || !link.url.toLowerCase().startsWith("http://");
      const sslClass = isHttps ? "valid" : "invalid";
      const sslTitle = isHttps ? "SSL 证书有效" : "无 SSL 证书";
      sslLockHtml = `<svg class="ssl-lock-icon ${sslClass}" width="13" height="13" viewBox="0 0 24 24" title="${sslTitle}"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
    }

    let domainExpiredHtml = "";
    if (health && typeof health.domainDays === "number" && health.domainDays <= 0) {
      domainExpiredHtml = `<svg class="domain-expired-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" title="域名已过期"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }

    return `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-card" id="link-card-${escapeHtml(link.id)}">
        ${healthDotHtml}
        <div class="card-top">
          <div class="link-avatar-wrap">
            <img class="link-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(link.title)}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'36\\' height=\\'36\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2364748b\\' stroke-width=\\'2\\'><rect width=\\'18\\' height=\\'18\\' x=\\'3\\' y=\\'3\\' rx=\\'2\\'/></svg>'">
            ${link.favicon && link.avatar ? `<img class="link-favicon-mini" src="${escapeHtml(link.favicon)}" alt="" loading="lazy">` : ""}
          </div>
          <div class="link-title-group">
            <div class="link-title" title="${escapeHtml(link.title)}">
              ${faviconSrc ? `<img class="link-title-favicon" src="${escapeHtml(faviconSrc)}" alt="" loading="lazy">` : ""}
              <span>${escapeHtml(link.title)}</span>
              ${Boolean(link.pinned || link.isTop) ? `<span class="link-pinned-badge" title="置顶链接">置顶</span>` : ""}
            </div>
            <div class="link-meta">
              ${link.author ? `<span class="link-author">@${escapeHtml(link.author)}</span>` : ""}
            </div>
            <div class="link-url-text" title="${escapeHtml(link.url)}">
              ${sslLockHtml}
              <span>${escapeHtml(displayUrl)}</span>
              ${domainExpiredHtml}
            </div>
          </div>
        </div>
        <div class="link-desc" title="${escapeHtml(link.description || '暂无描述')}">${escapeHtml(link.description || '暂无描述')}</div>
      </a>
    `;
  }).join("");
}

// Style Switcher Handling
function setLinkStyle(style) {
  if (!["simple", "detailed", "app"].includes(style)) return;
  currentStyle = style;
  localStorage.setItem("links_style", style);

  // Update switcher buttons active state
  document.querySelectorAll("#links-style-switcher .style-btn").forEach(btn => {
    if (btn.dataset.style === style) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const container = document.getElementById("links-container");
  if (container) {
    container.className = `links-grid style-${style}`;
  }
}

// ==========================================================================
// Login Entry & Modal (Requirement 2 & 6)
// ==========================================================================
function openLoginModal() {
  const modal = document.getElementById("login-modal");
  if (modal) {
    modal.classList.add("active");
    hideError();
    const pwd = document.getElementById("portal-password");
    if (pwd) {
      pwd.value = "";
      setTimeout(() => pwd.focus(), 150);
    }
    // Fetch auth settings for Turnstile
    initAuthStatus();
  }
}

function closeLoginModal() {
  const modal = document.getElementById("login-modal");
  if (modal) {
    modal.classList.remove("active");
    hideError();
  }
}

async function initAuthStatus() {
  try {
    const res = await fetch("/api/admin/auth");
    if (res.ok) {
      const data = await res.json();
      turnstileEnabled = Boolean(data.turnstileEnabled);
      if (data.turnstileSiteKey) {
        turnstileSiteKey = data.turnstileSiteKey;
      }
    }
  } catch {
    turnstileEnabled = false;
  }

  const group = document.getElementById("turnstile-group");
  if (!group) return;

  if (!turnstileEnabled) {
    group.style.display = "none";
    return;
  }

  group.style.display = "flex";
  // Poll until Turnstile script is ready
  const checkTurnstileReady = setInterval(() => {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      clearInterval(checkTurnstileReady);
      renderTurnstileWidget();
    }
  }, 100);
  setTimeout(() => clearInterval(checkTurnstileReady), 10000);
}

function renderTurnstileWidget() {
  const container = document.getElementById("turnstile-container");
  if (!container || turnstileWidgetId !== null) return;

  try {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "auto";
    turnstileWidgetId = window.turnstile.render("#turnstile-container", {
      sitekey: turnstileSiteKey,
      theme: currentTheme === "dark" ? "dark" : "light",
      callback: function (token) {
        turnstileToken = token;
        turnstileTicket = "";
        const hiddenTokenInput = document.getElementById("cf-turnstile-token");
        if (hiddenTokenInput) hiddenTokenInput.value = token;
        hideError();
      },
      "expired-callback": function () {
        turnstileToken = "";
        turnstileTicket = "";
        const hiddenTokenInput = document.getElementById("cf-turnstile-token");
        if (hiddenTokenInput) hiddenTokenInput.value = "";
      },
      "error-callback": function () {
        showError("Turnstile 验证组件加载异常，请刷新重试");
      }
    });
  } catch (err) {
    console.error("Turnstile render error:", err);
  }
}

function showError(msg) {
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = "block";
  }
}

function hideError() {
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.style.display = "none";
  }
}

async function handlePortalLogin(e) {
  e.preventDefault();
  hideError();

  const passwordInput = document.getElementById("portal-password");
  const password = passwordInput ? passwordInput.value : "";
  const submitBtn = document.getElementById("portal-submit-btn");

  if (turnstileEnabled && !turnstileTicket && !turnstileToken) {
    showError("请先完成 Cloudflare Turnstile 人机验证");
    return;
  }

  if (!password) {
    showError("请输入管理密码");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "正在验证...";
  }

  try {
    const payload = {
      action: "login",
      password
    };
    if (turnstileEnabled) {
      if (turnstileToken) payload.turnstileToken = turnstileToken;
      if (turnstileTicket) payload.turnstileTicket = turnstileTicket;
    }

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.token) {
      localStorage.setItem("admin_token", data.token);
      if (submitBtn) submitBtn.textContent = "验证成功，跳转中...";
      window.location.replace("/admin.html");
    } else {
      showError(data.error || "登录失败，密码错误");

      if (data.turnstileTicket) {
        turnstileTicket = data.turnstileTicket;
        turnstileToken = "";
        if (passwordInput) {
          passwordInput.select();
          passwordInput.focus();
        }
      } else {
        if (window.turnstile && turnstileWidgetId !== null) {
          window.turnstile.reset(turnstileWidgetId);
          turnstileToken = "";
          turnstileTicket = "";
        }
      }
    }
  } catch (err) {
    showError("请求失败：" + err.message);
  } finally {
    if (submitBtn && submitBtn.textContent !== "验证成功，跳转中...") {
      submitBtn.disabled = false;
      submitBtn.textContent = "登 录";
    }
  }
}

// ==========================================================================
// DOM Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // Style buttons initial state
  document.querySelectorAll("#links-style-switcher .style-btn").forEach(btn => {
    if (btn.dataset.style === currentStyle) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    btn.addEventListener("click", () => setLinkStyle(btn.dataset.style));
  });

  // Load public data
  loadPublicData();

  // Theme toggle button
  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  // Login entry button
  const loginEntryBtn = document.getElementById("btn-login-entry");
  if (loginEntryBtn) {
    loginEntryBtn.addEventListener("click", () => {
      // If already has token, directly navigate to admin
      const token = localStorage.getItem("admin_token");
      if (token) {
        window.location.href = "/admin.html";
      } else {
        openLoginModal();
      }
    });
  }

  // Modal close buttons
  const modalCloseBtn = document.getElementById("modal-close-btn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeLoginModal);
  }

  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) closeLoginModal();
    });
  }

  // Login Form
  const form = document.getElementById("portal-login-form");
  if (form) {
    form.addEventListener("submit", handlePortalLogin);
  }

  const passwordInput = document.getElementById("portal-password");
  if (passwordInput) {
    passwordInput.addEventListener("input", hideError);
  }
});
