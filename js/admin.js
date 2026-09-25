/* ==========================================================================
   Admin Dashboard Logic (Vanilla JS)
   ========================================================================== */

let adminToken = localStorage.getItem("admin_token") || "";
let currentLinks = [];
let currentUnions = [];
let currentSettings = {};
let currentHealthMap = {};
let activeTab = "links";

// Turnstile state for admin login
let adminTurnstileWidgetId = null;
let adminTurnstileToken = "";
let adminTurnstileSiteKey = "1x00000000000000000000AA";
let adminTurnstileEnabled = false;

// URL and Asset Helpers
function formatAssetUrl(str) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/api/file") || s.startsWith("data:")) {
    return s;
  }
  return `/api/file?key=${encodeURIComponent(s)}`;
}

function extractDomain(inputUrl) {
  if (!inputUrl) return "";
  try {
    const clean = inputUrl.trim();
    const target = clean.includes("://") ? clean : "https://" + clean;
    return new URL(target).hostname;
  } catch {
    return inputUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0].split(":")[0].trim();
  }
}

// Theme toggle
function initTheme() {
  const savedTheme = localStorage.getItem("links_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcons(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const target = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", target);
  localStorage.setItem("links_theme", target);
  updateThemeIcons(target);
  renderUnionsTable(); // Re-render to display the matching theme icon
}

function updateThemeIcons(theme) {
  document.querySelectorAll(".theme-toggle-icon").forEach(iconEl => {
    if (theme === "dark") {
      iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
      iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
  });
}

// Standard MD5 function for Gravatar calculation in browser
function md5(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    let wordToHexValue = "", wordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  }
  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// Toast helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Native Alert Override
window.alert = function(message) {
  showToast(String(message), "info");
};

// Custom Non-native Confirm Modal (Returns Promise<boolean>)
function showConfirm({
  title = "操作确认",
  message = "",
  confirmText = "确定",
  cancelText = "取消",
  isDanger = false
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const bodyEl = document.getElementById("confirm-modal-body");
    const okBtn = document.getElementById("confirm-modal-ok");
    const cancelBtn = document.getElementById("confirm-modal-cancel");
    const closeBtn = document.getElementById("confirm-modal-close");

    if (!modal) {
      resolve(false);
      return;
    }

    titleEl.textContent = title;
    bodyEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    if (isDanger) {
      okBtn.className = "btn btn-danger btn-sm";
    } else {
      okBtn.className = "btn btn-primary btn-sm";
    }

    const cleanup = () => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      closeBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onBackdrop = (e) => {
      if (e.target === modal) {
        onCancel();
      }
    };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    closeBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);

    modal.classList.add("active");
  });
}

// Authorized API Fetch
async function apiFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`,
    ...(options.headers || {})
  };

  const res = await fetch(endpoint, { ...options, headers });
  if (res.status === 401) {
    showToast("登录会话已过期，请重新登录", "error");
    logout();
    throw new Error("Unauthorized");
  }
  return res;
}

// Check session
async function checkAuth() {
  if (!adminToken) {
    showAuthScreen();
    return;
  }

  try {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ action: "verify" })
    });

    if (res.ok) {
      showDashboard();
      loadAllData();
    } else {
      logout();
    }
  } catch {
    logout();
  }
}

async function checkAdminTurnstile() {
  try {
    const res = await fetch("/api/admin/auth");
    if (res.ok) {
      const data = await res.json();
      adminTurnstileEnabled = Boolean(data.turnstileEnabled);
      if (data.turnstileSiteKey) {
        adminTurnstileSiteKey = data.turnstileSiteKey;
      }
    }
  } catch {
    adminTurnstileEnabled = false;
  }

  const wrapper = document.getElementById("admin-turnstile-wrapper");
  if (!wrapper) return;

  if (!adminTurnstileEnabled) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "flex";
  const poll = setInterval(() => {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      clearInterval(poll);
      if (adminTurnstileWidgetId === null) {
        try {
          const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
          adminTurnstileWidgetId = window.turnstile.render("#admin-turnstile-container", {
            sitekey: adminTurnstileSiteKey,
            theme: currentTheme === "dark" ? "dark" : "light",
            callback: function (t) {
              adminTurnstileToken = t;
              const input = document.getElementById("admin-cf-turnstile-token");
              if (input) input.value = t;
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, 100);
  setTimeout(() => clearInterval(poll), 10000);
}

function showAuthScreen() {
  const dash = document.getElementById("admin-dashboard");
  if (dash) dash.style.display = "none";
  const auth = document.getElementById("auth-screen");
  if (auth) auth.style.display = "block";
  const authTheme = document.getElementById("auth-theme-toggle");
  if (authTheme) authTheme.style.display = "block";
  checkAdminTurnstile();
}

function showDashboard() {
  const dash = document.getElementById("admin-dashboard");
  if (dash) dash.style.display = "block";
  const auth = document.getElementById("auth-screen");
  if (auth) auth.style.display = "none";
  const authTheme = document.getElementById("auth-theme-toggle");
  if (authTheme) authTheme.style.display = "none";
}

function logout() {
  adminToken = "";
  localStorage.removeItem("admin_token");
  window.location.replace("/");
}

// Login Submit
async function handleLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById("admin-password");
  const password = passwordInput ? passwordInput.value : "";
  const errorEl = document.getElementById("admin-login-error");
  if (errorEl) errorEl.style.display = "none";

  if (adminTurnstileEnabled && !adminTurnstileToken) {
    if (errorEl) {
      errorEl.textContent = "请先完成 Cloudflare Turnstile 人机验证";
      errorEl.style.display = "block";
    }
    return;
  }

  const submitBtn = document.getElementById("admin-login-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "正在验证...";
  }

  try {
    const payload = {
      action: "login",
      password
    };
    if (adminTurnstileEnabled && adminTurnstileToken) {
      payload.turnstileToken = adminTurnstileToken;
    }

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok && data.token) {
      adminToken = data.token;
      localStorage.setItem("admin_token", adminToken);
      showToast("登录成功");
      if (passwordInput) passwordInput.value = "";
      showDashboard();
      loadAllData();
    } else {
      const errMsg = data.error || "登录失败，密码错误";
      if (errorEl) {
        errorEl.textContent = errMsg;
        errorEl.style.display = "block";
      }
      showToast(errMsg, "error");
      if (window.turnstile && adminTurnstileWidgetId !== null) {
        window.turnstile.reset(adminTurnstileWidgetId);
        adminTurnstileToken = "";
      }
    }
  } catch (err) {
    showToast("请求异常：" + err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "登 录";
    }
  }
}

// Load data for all tabs
async function loadAllData() {
  await Promise.all([loadLinks(), loadUnions(), loadSettings(), loadHealthData()]);
}

// Health Data Loading
async function loadHealthData() {
  try {
    const res = await apiFetch("/api/admin/health");
    if (res.ok) {
      const data = await res.json();
      currentHealthMap = data.health || {};
      renderLinksTable();
    }
  } catch (err) {
    console.warn("加载健康巡检数据失败:", err);
  }
}

// Links Management
async function loadLinks() {
  try {
    const res = await apiFetch("/api/admin/links");
    const data = await res.json();
    currentLinks = data.links || [];
    renderLinksTable();
  } catch (err) {
    console.error(err);
  }
}

function renderLinksTable() {
  const tbody = document.getElementById("links-table-body");
  if (!tbody) return;

  if (currentLinks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">暂无友情链接，点击右上角添加。</td></tr>`;
    return;
  }

  // Sort: pinned links first, then by order asc
  currentLinks.sort((a, b) => {
    const aPinned = Boolean(a.pinned || a.isTop);
    const bPinned = Boolean(b.pinned || b.isTop);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return (a.order || 999) - (b.order || 999);
  });

  tbody.innerHTML = currentLinks.map(link => {
    const rawAvatar = link.avatarUrl || link.avatar || link.favicon || "";
    const avatar = formatAssetUrl(rawAvatar);
    const favicon = formatAssetUrl(link.favicon || "");
    const isHidden = link.status === "hidden";

    // 提取健康数据（仅用于获取 SSL 状态）
    const domain = extractDomain(link.url);
    const health = currentHealthMap[link.id] || (domain ? currentHealthMap[domain] : null);

    // SSL 状态图标（Google Material 锁图标，不在列表上显示域名和 http 状态）
    let sslIconHtml = "";
    const sslSvg = `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align: -2px;"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;

    if (health && health.ssl) {
      if (health.ssl.valid) {
        sslIconHtml = `<span title="SSL 证书正常 (剩余 ${health.ssl.daysRemaining} 天)" style="display: inline-flex; align-items: center; color: #10b981; cursor: help;">${sslSvg}</span>`;
      } else {
        sslIconHtml = `<span title="SSL 证书异常: ${escapeHtml(health.ssl.error || '证书失效或过期')}" style="display: inline-flex; align-items: center; color: #ef4444; cursor: help;">${sslSvg}</span>`;
      }
    } else {
      sslIconHtml = `<span title="未检测到有效 SSL 证书" style="display: inline-flex; align-items: center; color: #94a3b8; opacity: 0.6; cursor: help;">${sslSvg}</span>`;
    }

    return `
      <tr id="row-link-${escapeHtml(link.id)}">
        <td class="col-order" style="font-weight: 600; color: var(--text-muted); white-space: nowrap !important; word-break: keep-all !important; width: 70px; min-width: 70px; text-align: center;">${escapeHtml(link.order)}</td>
        <td>
          <div class="table-cell-link">
            <div style="position: relative; width: 40px; height: 40px; flex-shrink: 0;">
              <img class="table-avatar" src="${escapeHtml(avatar)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'36\\' height=\\'36\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2364748b\\' stroke-width=\\'2\\'><path d=\\'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>'">
              ${favicon ? `<img src="${escapeHtml(favicon)}" title="网站图标" style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); object-fit: contain;">` : ""}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 700; color: var(--text-primary);">${escapeHtml(link.title)}</span>
                ${Boolean(link.pinned || link.isTop) ? `<span style="display: inline-block; font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); font-weight: 600; line-height: 1.4;">置顶</span>` : ""}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(link.author || '未填写作者')}</div>
            </div>
          </div>
        </td>
        <td>
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none; font-size: 0.85rem;">
            ${escapeHtml(link.url)}
          </a>
        </td>
        <td style="max-width: 220px; font-size: 0.82rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(link.description || '-')}
        </td>
        <td style="white-space: nowrap !important; word-break: keep-all !important; width: 110px; min-width: 110px;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="status-badge ${isHidden ? 'status-hidden' : 'status-active'}" style="white-space: nowrap !important; word-break: keep-all !important; display: inline-block;">
              ${isHidden ? '隐藏' : '已发布'}
            </span>
            ${sslIconHtml}
          </div>
        </td>
        <td style="white-space: nowrap !important; word-break: keep-all !important; width: 130px; min-width: 130px;">
          <div class="table-actions" style="white-space: nowrap !important; display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" style="white-space: nowrap !important; padding: 0.25rem 0.5rem;" onclick="openEditLinkModal('${escapeHtml(link.id)}')">编辑</button>
            <button class="btn btn-danger btn-sm" style="white-space: nowrap !important; padding: 0.25rem 0.5rem;" onclick="deleteLink('${escapeHtml(link.id)}')">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// 单条友链即时体检
async function checkSingleLinkHealth(linkId, btn) {
  if (!linkId) return;
  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "检测中...";
  }

  try {
    const res = await apiFetch("/api/admin/health", {
      method: "POST",
      body: JSON.stringify({ linkId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "体检失败");

    currentHealthMap[linkId] = data.health;
    renderLinksTable();
    showToast("友链体检完成", "success");
  } catch (err) {
    showToast("体检异常: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// 全量友链健康巡检
async function checkAllLinksHealth() {
  const btn = document.getElementById("btn-health-check-links");
  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "巡检中...";
  }

  showToast("开始全面巡检，请稍候...", "info");

  try {
    const res = await apiFetch("/api/admin/health", {
      method: "POST",
      body: JSON.stringify({ mode: "all" })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "巡检失败");

    currentHealthMap = data.health || {};
    renderLinksTable();
    showToast(`全站巡检完成，已检测 ${data.checkedCount || currentLinks.length} 个站点`, "success");
  } catch (err) {
    showToast("巡检失败: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// Blog Unions Management
async function loadUnions() {
  try {
    const res = await apiFetch("/api/admin/unions");
    const data = await res.json();
    currentUnions = data.unions || [];
    renderUnionsTable();
  } catch (err) {
    console.error(err);
  }
}

function renderUnionsTable() {
  const tbody = document.getElementById("unions-table-body");
  if (!tbody) return;

  if (currentUnions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">暂无博客联盟，点击右上角添加。</td></tr>`;
    return;
  }

  currentUnions.sort((a, b) => (a.order || 999) - (b.order || 999));

  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";

  tbody.innerHTML = currentUnions.map(union => {
    let rawBadge = "";
    if (currentTheme === "dark") {
      rawBadge = union.iconDark || union.iconLight || "";
    } else {
      rawBadge = union.iconLight || union.iconDark || "";
    }
    const displayBadgeIcon = formatAssetUrl(rawBadge);

    const domain = extractDomain(union.officialUrl || union.url || "");
    const googleFavicon = domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : "";
    const duckFavicon = domain ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico` : "";
    const websiteIcon = formatAssetUrl(union.websiteIcon || "") || googleFavicon || duckFavicon;

    return `
      <tr id="row-union-${escapeHtml(union.id)}">
        <td class="col-order" style="font-weight: 600; color: var(--text-muted); white-space: nowrap !important; word-break: keep-all !important; width: 70px; min-width: 70px; text-align: center;">${escapeHtml(union.order)}</td>
        <td>
          <div class="table-cell-link">
            <img class="table-avatar" src="${escapeHtml(websiteIcon)}" title="${escapeHtml(union.name)}" onerror="if(!this.dataset.fallbackTried){this.dataset.fallbackTried='1';this.src='${escapeHtml(duckFavicon)}';}else{this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'36\\' height=\\'36\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2364748b\\' stroke-width=\\'2\\'><rect width=\\'18\\' height=\\'18\\' x=\\'3\\' y=\\'3\\' rx=\\'2\\'/></svg>';}">
            <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(union.name)}</div>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">
              <span style="color: var(--text-muted); font-size: 0.76rem;">专属:</span>
              <a href="${escapeHtml(union.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none;">
                ${escapeHtml(union.url)} ↗
              </a>
            </div>
            ${union.officialUrl ? `
              <div style="font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">
                <span style="color: var(--text-muted); font-size: 0.76rem;">官网:</span>
                <a href="${escapeHtml(union.officialUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-secondary); text-decoration: none;">
                  ${escapeHtml(union.officialUrl)} ↗
                </a>
              </div>
            ` : ""}
          </div>
        </td>
        <td>
          ${displayBadgeIcon ? `
            <div style="height: 34px; padding: 0 8px; border-radius: 4px; background: var(--tag-bg); border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center;">
              <img src="${escapeHtml(displayBadgeIcon)}" alt="徽章" style="max-height: 22px; max-width: 120px; object-fit: contain;">
            </div>
          ` : `<span style="font-size: 0.78rem; color: var(--text-muted);">未配置</span>`}
        </td>
        <td style="max-width: 220px; font-size: 0.82rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(union.description || '-')}
        </td>
        <td style="white-space: nowrap !important; word-break: keep-all !important; width: 140px; min-width: 140px;">
          <div class="table-actions" style="white-space: nowrap !important; display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" style="white-space: nowrap !important;" onclick="openEditUnionModal('${escapeHtml(union.id)}')">编辑</button>
            <button class="btn btn-danger btn-sm" style="white-space: nowrap !important;" onclick="deleteUnion('${escapeHtml(union.id)}')">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Settings
async function loadSettings() {
  try {
    const res = await apiFetch("/api/admin/settings");
    const data = await res.json();
    currentSettings = data.settings || {};

    const titleEl = document.getElementById("setting-site-title");
    const descEl = document.getElementById("setting-site-desc");
    const mirrorEl = document.getElementById("setting-gravatar-mirror");
    const turnstileEnabledEl = document.getElementById("setting-turnstile-enabled");
    const turnstileSiteKeyEl = document.getElementById("setting-turnstile-sitekey");
    const turnstileSecretKeyEl = document.getElementById("setting-turnstile-secretkey");

    const faviconEl = document.getElementById("setting-favicon");
    const faviconPreview = document.getElementById("setting-favicon-preview");
    const faviconPreviewBox = document.getElementById("favicon-preview-box");

    if (titleEl) titleEl.value = currentSettings.siteTitle || "";
    if (descEl) descEl.value = currentSettings.siteDescription || "";
    if (faviconEl) {
      faviconEl.value = currentSettings.favicon || "";
      if (currentSettings.favicon) {
        if (faviconPreview) faviconPreview.src = currentSettings.favicon;
        if (faviconPreviewBox) faviconPreviewBox.style.display = "flex";
      } else {
        if (faviconPreviewBox) faviconPreviewBox.style.display = "none";
      }
    }
    const adminFav = document.getElementById("admin-favicon-link");
    if (adminFav && currentSettings.favicon) {
      adminFav.href = currentSettings.favicon;
    }

    if (mirrorEl) {
      const rawM = (currentSettings.gravatarMirror || "gravatar.bluecdn.com").trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/avatar\/?$/i, "")
        .replace(/\/+$/, "");
      mirrorEl.value = rawM || "gravatar.bluecdn.com";
    }
    if (turnstileEnabledEl) turnstileEnabledEl.checked = Boolean(currentSettings.turnstileEnabled);
    if (turnstileSiteKeyEl) turnstileSiteKeyEl.value = currentSettings.turnstileSiteKey || "";
    if (turnstileSecretKeyEl) {
      turnstileSecretKeyEl.value = "";
      turnstileSecretKeyEl.placeholder = currentSettings.turnstileSecretKeyMasked 
        ? `已配置 (${currentSettings.turnstileSecretKeyMasked})，留空不修改` 
        : "输入 Cloudflare Turnstile Secret Key";
    }
  } catch (err) {
    console.error(err);
  }
}

async function uploadFaviconToBlob(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "favicon");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Favicon 成功上传！");
      const faviconUrl = data.url || (data.key?.startsWith("/api/file") ? data.key : `/api/file?key=${encodeURIComponent(data.key)}`);
      const faviconInput = document.getElementById("setting-favicon");
      if (faviconInput) faviconInput.value = faviconUrl;
      const preview = document.getElementById("setting-favicon-preview");
      const previewBox = document.getElementById("favicon-preview-box");
      if (preview) preview.src = faviconUrl;
      if (previewBox) previewBox.style.display = "flex";
      const adminFav = document.getElementById("admin-favicon-link");
      if (adminFav) adminFav.href = faviconUrl;
    } else {
      showToast(data.error || "上传失败", "error");
    }
  } catch (err) {
    showToast("上传异常：" + err.message, "error");
  }
}

async function saveSettingsForm(e) {
  e.preventDefault();
  const siteTitle = document.getElementById("setting-site-title").value;
  const siteDescription = document.getElementById("setting-site-desc").value;
  const favicon = document.getElementById("setting-favicon") ? document.getElementById("setting-favicon").value.trim() : "";
  let gravatarMirror = document.getElementById("setting-gravatar-mirror").value.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/avatar\/?$/i, "")
    .replace(/\/+$/, "");
  if (!gravatarMirror) gravatarMirror = "gravatar.bluecdn.com";
  const turnstileEnabled = document.getElementById("setting-turnstile-enabled") ? document.getElementById("setting-turnstile-enabled").checked : false;
  const turnstileSiteKey = document.getElementById("setting-turnstile-sitekey").value.trim();
  const turnstileSecretKey = document.getElementById("setting-turnstile-secretkey").value.trim();

  const payload = { siteTitle, siteDescription, favicon, gravatarMirror, turnstileEnabled };
  if (turnstileSiteKey) payload.turnstileSiteKey = turnstileSiteKey;
  if (turnstileSecretKey) payload.turnstileSecretKey = turnstileSecretKey;

  try {
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("系统设置已更新");
      loadSettings();
    } else {
      showToast("更新设置失败", "error");
    }
  } catch (err) {
    showToast("请求失败：" + err.message, "error");
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById("setting-old-password").value;
  const newPassword = document.getElementById("setting-new-password").value;

  try {
    const res = await apiFetch("/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "change-password", oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("密码修改成功，新令牌已更新");
      adminToken = data.token;
      localStorage.setItem("admin_token", adminToken);
      document.getElementById("setting-old-password").value = "";
      document.getElementById("setting-new-password").value = "";
    } else {
      showToast(data.error || "修改密码失败", "error");
    }
  } catch (err) {
    showToast("操作失败：" + err.message, "error");
  }
}

// Backup & Export/Import
async function exportData(type = "all") {
  try {
    const res = await apiFetch("/api/admin/sync-kv", {
      method: "POST",
      body: JSON.stringify({ action: "export", type })
    });
    const resData = await res.json();
    if (res.ok) {
      let downloadObj = null;
      let filenamePrefix = "all";
      let friendlyName = "全量数据";

      if (type === "links") {
        downloadObj = {
          version: resData.version || "1.0.0",
          type: "links",
          exportedAt: resData.exportedAt || new Date().toISOString(),
          count: typeof resData.count === "number" ? resData.count : (resData.links ? resData.links.length : 0),
          links: resData.links || []
        };
        filenamePrefix = "friends";
        friendlyName = "友情链接";
      } else if (type === "unions") {
        downloadObj = {
          version: resData.version || "1.0.0",
          type: "unions",
          exportedAt: resData.exportedAt || new Date().toISOString(),
          count: typeof resData.count === "number" ? resData.count : (resData.unions ? resData.unions.length : 0),
          unions: resData.unions || []
        };
        filenamePrefix = "unions";
        friendlyName = "博客联盟";
      } else {
        downloadObj = resData.data;
        filenamePrefix = "all";
        friendlyName = "全量数据";
      }

      const blob = new Blob([JSON.stringify(downloadObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edgeone-links-${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${friendlyName}已成功导出为 JSON`);
    } else {
      showToast(resData.error || "导出失败", "error");
    }
  } catch (err) {
    showToast("导出异常：" + err.message, "error");
  }
}

// Download Import Templates
function downloadJsonTemplate(type = "full") {
  let templateObj = null;
  let filename = "";
  let friendlyName = "";

  if (type === "links") {
    friendlyName = "友情链接导入模板";
    filename = "template-friends.json";
    templateObj = {
      "$schema_description": "友情链接导入模板。可直接修改本示例数据，然后通过后台「导入友情链接 JSON」上传导入。支持增量合并或完全覆盖。",
      "version": "1.0.0",
      "links": [
        {
          "title": "示例博客（URL 头像）",
          "author": "博主昵称",
          "protocol": "https://",
          "url": "https://example.com",
          "description": "专注于现代 Web 开发与全栈技术分享的独立博客。",
          "avatarType": "url",
          "avatar": "https://example.com/avatar.png",
          "favicon": "https://example.com/favicon.ico",
          "status": "active",
          "order": 1
        },
        {
          "title": "示例博客（邮箱计算 Gravatar）",
          "author": "开发者",
          "protocol": "https://",
          "url": "https://blog.example.org",
          "description": "记录个人思考与技术实践，探索数字生活与效率工具。",
          "avatarType": "gravatar",
          "avatar": "user@example.com",
          "favicon": "https://blog.example.org/favicon.ico",
          "status": "active",
          "order": 2
        },
        {
          "title": "示例博客（QQ 高清头像）",
          "author": "QQ友",
          "protocol": "https://",
          "url": "https://qq.example.com",
          "description": "QQ号输入自动匹配 q.qlogo.cn 640px 高清头像。",
          "avatarType": "gravatar",
          "avatar": "10001",
          "favicon": "https://qq.example.com/favicon.ico",
          "status": "active",
          "order": 3
        }
      ]
    };
  } else if (type === "unions") {
    friendlyName = "博客联盟导入模板";
    filename = "template-unions.json";
    templateObj = {
      "$schema_description": "博客联盟导入模板。可直接修改本示例数据，然后通过后台「导入博客联盟 JSON」上传导入。支持增量合并或完全覆盖。",
      "version": "1.0.0",
      "unions": [
        {
          "name": "十年之约",
          "officialUrl": "https://www.foreverblog.cn",
          "url": "https://www.foreverblog.cn/blog/example.html",
          "websiteIcon": "https://www.foreverblog.cn/favicon.ico",
          "description": "一个人的寂寞，一群人的狂欢。记录独立博客的十年坚守。",
          "iconType": "url",
          "iconLight": "https://example.com/foreverblog-light.png",
          "iconDark": "https://example.com/foreverblog-dark.png",
          "order": 1
        },
        {
          "name": "博友圈",
          "officialUrl": "https://www.boyouquan.com",
          "url": "https://www.boyouquan.com/blog/example",
          "websiteIcon": "https://www.boyouquan.com/favicon.ico",
          "description": "中文独立博客导航与聚合。",
          "iconType": "url",
          "iconLight": "https://example.com/boyouquan.png",
          "iconDark": "",
          "order": 2
        }
      ]
    };
  } else {
    friendlyName = "全量数据备份导入模板";
    filename = "template-links-full.json";
    templateObj = {
      "$schema_description": "全量数据备份导入模板。包含站点基本设置、全体友情链接及博客联盟。修改后可通过后台「导入全量备份 JSON」恢复。",
      "version": "1.0.0",
      "site": {
        "title": "我的友情链接",
        "description": "记录常来常往的朋友们",
        "favicon": "https://example.com/favicon.ico",
        "gravatarMirror": "gravatar.bluecdn.com"
      },
      "links": [
        {
          "title": "示例博客",
          "author": "博主昵称",
          "protocol": "https://",
          "url": "https://example.com",
          "description": "独立博客技术分享。",
          "avatarType": "url",
          "avatar": "https://example.com/avatar.png",
          "favicon": "https://example.com/favicon.ico",
          "status": "active",
          "order": 1
        }
      ],
      "unions": [
        {
          "name": "十年之约",
          "officialUrl": "https://www.foreverblog.cn",
          "url": "https://www.foreverblog.cn/blog/example.html",
          "websiteIcon": "https://www.foreverblog.cn/favicon.ico",
          "description": "一个人的寂寞，一群人的狂欢。",
          "iconType": "url",
          "iconLight": "https://example.com/foreverblog-light.png",
          "iconDark": "https://example.com/foreverblog-dark.png",
          "order": 1
        }
      ]
    };
  }

  const blob = new Blob([JSON.stringify(templateObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${friendlyName}已生成并开始下载`);
}

async function importData(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const confirmed = await showConfirm({
    title: "导入全量备份",
    message: "导入全量备份将合并并更新现有数据与系统配置，确定继续导入吗？",
    confirmText: "继续导入"
  });
  if (!confirmed) {
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      const res = await apiFetch("/api/admin/sync-kv", {
        method: "POST",
        body: JSON.stringify({ action: "import", data: json })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "导入成功");
        loadAllData();
      } else {
        showToast(data.error || "导入失败", "error");
      }
    } catch (err) {
      showToast("文件解析失败：" + err.message, "error");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

function getSelectedImportMode(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "merge";
}

async function importLinksData(e, mode = "merge") {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (mode === "replace") {
    const confirmed = await showConfirm({
      title: "危险操作确认",
      message: "警告：覆盖导入将会清空当前已有的全部友情链接并替换为导入文件中的内容，确定继续吗？",
      confirmText: "清空并覆盖",
      isDanger: true
    });
    if (!confirmed) {
      e.target.value = "";
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      const res = await apiFetch("/api/admin/sync-kv", {
        method: "POST",
        body: JSON.stringify({ action: "import-links", data: json, mode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "友情链接导入成功");
        await loadLinks();
      } else {
        showToast(data.error || "友情链接导入失败", "error");
      }
    } catch (err) {
      showToast("文件解析失败：" + err.message, "error");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

async function importUnionsData(e, mode = "merge") {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (mode === "replace") {
    const confirmed = await showConfirm({
      title: "危险操作确认",
      message: "警告：覆盖导入将会清空当前已有的全部博客联盟并替换为导入文件中的内容，确定继续吗？",
      confirmText: "清空并覆盖",
      isDanger: true
    });
    if (!confirmed) {
      e.target.value = "";
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      const res = await apiFetch("/api/admin/sync-kv", {
        method: "POST",
        body: JSON.stringify({ action: "import-unions", data: json, mode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "博客联盟导入成功");
        await loadUnions();
      } else {
        showToast(data.error || "博客联盟导入失败", "error");
      }
    } catch (err) {
      showToast("文件解析失败：" + err.message, "error");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

// Friend Link Protocol Helpers
function setLinkProtocol(protocol) {
  const select = document.getElementById("link-protocol");
  const customGroup = document.getElementById("group-protocol-custom");
  const customInput = document.getElementById("link-protocol-custom");
  if (!select) return;

  const standardProtos = ["https://", "http://", "ipfs://"];
  const lower = (protocol || "").toLowerCase();
  const matched = standardProtos.find(p => p.toLowerCase() === lower);

  if (matched) {
    select.value = matched;
    if (customGroup) customGroup.style.display = "none";
    if (customInput) customInput.value = "";
  } else if (protocol) {
    select.value = "custom";
    if (customGroup) customGroup.style.display = "block";
    if (customInput) customInput.value = protocol;
  } else {
    select.value = "https://";
    if (customGroup) customGroup.style.display = "none";
    if (customInput) customInput.value = "";
  }
}

function getLinkProtocol() {
  const select = document.getElementById("link-protocol");
  if (!select) return "https://";
  if (select.value === "custom") {
    let customVal = document.getElementById("link-protocol-custom").value.trim();
    if (!customVal) return "https://";
    if (!customVal.includes("://")) customVal += "://";
    return customVal;
  }
  return select.value;
}

// Update Friend Link Favicon Preview
function updateLinkFaviconPreview() {
  const val = document.getElementById("link-favicon-val").value.trim();
  const preview = document.getElementById("link-favicon-preview");
  const box = document.getElementById("link-favicon-preview-box");
  if (!preview || !box) return;

  const urlInput = document.getElementById("link-url") ? document.getElementById("link-url").value.trim() : "";
  const domain = extractDomain(urlInput);

  let src = "";
  if (val) {
    src = formatAssetUrl(val);
  } else if (domain) {
    src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  }

  if (src) {
    preview.dataset.fallbackTried = "";
    preview.onerror = function() {
      if (domain && !this.dataset.fallbackTried) {
        this.dataset.fallbackTried = "1";
        this.src = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
      } else {
        this.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
      }
    };
    preview.src = src;
    box.style.display = "flex";
  } else {
    box.style.display = "none";
  }
}

// Upload Friend Link Favicon to Blob
async function uploadLinkFavicon(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "favicons");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("网站图标成功上传到 EdgeOne Blob！");
      document.getElementById("link-favicon-val").value = data.key;
      updateLinkFaviconPreview();
    } else {
      showToast(data.error || "网站图标上传失败", "error");
    }
  } catch (err) {
    showToast("上传异常：" + err.message, "error");
  }
}

// Friend Link Modal
function openAddLinkModal() {
  document.getElementById("link-modal-title").textContent = "添加友情链接";
  document.getElementById("link-id").value = "";
  document.getElementById("link-title").value = "";
  document.getElementById("link-author").value = "";
  setLinkProtocol("https://");
  document.getElementById("link-url").value = "";
  document.getElementById("link-desc").value = "";

  // 1. Reset Website Favicon
  document.getElementById("link-favicon-val").value = "";
  updateLinkFaviconPreview();

  // 2. Reset Webmaster Avatar
  document.getElementById("link-avatar-val").value = "";
  document.getElementById("link-avatar-url-val").value = "";
  const emailInput = document.getElementById("link-avatar-email");
  if (emailInput) emailInput.value = "";
  const detectedBadge = document.getElementById("link-avatar-detected-badge");
  if (detectedBadge) detectedBadge.textContent = "";
  const urlInput = document.getElementById("link-avatar-url-input");
  if (urlInput) urlInput.value = "";
  setAvatarType("gravatar");
  updateAvatarPreview();

  document.getElementById("link-status").value = "active";
  document.getElementById("link-order").value = currentLinks.length + 1;
  if (document.getElementById("link-pinned")) document.getElementById("link-pinned").checked = false;

  const healthCard = document.getElementById("link-health-details-card");
  if (healthCard) healthCard.style.display = "none";

  openModal("link-modal");
}

// 安全格式化健康检查相关日期（时间戳或ISO字符串）
function formatHealthDate(val) {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(val);
  }
}

// 渲染编辑弹窗中的健康监控详情卡片
function renderModalHealthDetails(linkId) {
  const card = document.getElementById("link-health-details-card");
  if (!card) return;

  const link = currentLinks.find(item => String(item.id) === String(linkId));
  if (!link) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  const domain = extractDomain(link.url);
  const health = currentHealthMap[link.id] || (domain ? currentHealthMap[domain] : null);

  const checkTimeEl = document.getElementById("link-health-check-time");
  const contentEl = document.getElementById("link-health-content");
  const emptyHintEl = document.getElementById("link-health-empty-hint");
  const httpEl = document.getElementById("modal-health-http");
  const latencyEl = document.getElementById("modal-health-latency");
  const sslEl = document.getElementById("modal-health-ssl");
  const sslDetailEl = document.getElementById("modal-health-ssl-detail");
  const domainEl = document.getElementById("modal-health-domain");
  const domainDetailEl = document.getElementById("modal-health-domain-detail");
  const recheckBtn = document.getElementById("btn-recheck-modal-link");

  if (recheckBtn) {
    recheckBtn.onclick = async () => {
      const origText = recheckBtn.textContent;
      recheckBtn.disabled = true;
      recheckBtn.textContent = "检测中...";
      try {
        const res = await apiFetch("/api/admin/health", {
          method: "POST",
          body: JSON.stringify({ linkId: link.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "体检失败");
        currentHealthMap[link.id] = data.health;
        renderModalHealthDetails(link.id);
        renderLinksTable();
        showToast("体检完成", "success");
      } catch (err) {
        showToast("体检失败: " + err.message, "error");
      } finally {
        recheckBtn.disabled = false;
        recheckBtn.textContent = origText;
      }
    };
  }

  if (!health || !health.checkedAt) {
    if (checkTimeEl) checkTimeEl.textContent = "";
    if (contentEl) contentEl.style.display = "none";
    if (emptyHintEl) emptyHintEl.style.display = "block";
    return;
  }

  if (emptyHintEl) emptyHintEl.style.display = "none";
  if (contentEl) contentEl.style.display = "grid";

  if (checkTimeEl) {
    const d = new Date(health.checkedAt);
    if (!isNaN(d.getTime())) {
      checkTimeEl.textContent = `检测时间: ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } else {
      checkTimeEl.textContent = "";
    }
  }

  // 1. HTTP 连通性
  if (httpEl) {
    const isAlive = health.http?.alive;
    const code = health.http?.statusCode || (isAlive ? 200 : "离线");
    if (isAlive) {
      httpEl.innerHTML = `<span style="color: #10b981;">Code ${code} (正常)</span>`;
    } else {
      httpEl.innerHTML = `<span style="color: #ef4444;">Code ${code} (异常)</span>`;
    }
  }
  if (latencyEl) {
    const ms = health.http?.latency;
    latencyEl.textContent = typeof ms === "number" ? `响应耗时: ${ms}ms` : "响应耗时: 未知";
  }

  // 2. SSL 证书
  const sslSvg = `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align: -2px;"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
  if (sslEl) {
    if (!health.ssl) {
      sslEl.innerHTML = `<span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">${sslSvg} 未检测到证书</span>`;
    } else if (health.ssl.valid) {
      const warn = health.ssl.daysRemaining <= 15;
      const color = warn ? "#f59e0b" : "#10b981";
      sslEl.innerHTML = `<span style="color: ${color}; display: inline-flex; align-items: center; gap: 4px;">${sslSvg} 有效 (剩余 ${health.ssl.daysRemaining} 天)</span>`;
    } else {
      sslEl.innerHTML = `<span style="color: #ef4444; display: inline-flex; align-items: center; gap: 4px;">${sslSvg} 异常: ${escapeHtml(health.ssl.error || "证书失效")}</span>`;
    }
  }
  if (sslDetailEl) {
    if (health.ssl) {
      const issuer = health.ssl.issuer ? `颁发者: ${escapeHtml(health.ssl.issuer)}` : "";
      const dateStr = formatHealthDate(health.ssl.validTo);
      const validTo = dateStr ? `到期: ${escapeHtml(dateStr)}` : "";
      sslDetailEl.textContent = [issuer, validTo].filter(Boolean).join(" | ") || (health.ssl.protocol || "-");
    } else {
      sslDetailEl.textContent = "未配置或非 HTTPS 协议";
    }
  }

  // 3. 域名到期 (WHOIS)
  if (domainEl) {
    const dom = health.domain;
    if (dom && typeof dom.daysRemaining === "number") {
      if (dom.daysRemaining < 0) {
        domainEl.innerHTML = `<span style="color: #ef4444;">已过期 (${Math.abs(dom.daysRemaining)} 天前)</span>`;
      } else if (dom.daysRemaining <= 30) {
        domainEl.innerHTML = `<span style="color: #f59e0b;">剩余 ${dom.daysRemaining} 天 (即将到期)</span>`;
      } else {
        domainEl.innerHTML = `<span style="color: var(--text-primary);">剩余 ${dom.daysRemaining} 天</span>`;
      }
    } else {
      domainEl.innerHTML = `<span style="color: var(--text-muted);">${dom?.error ? escapeHtml(dom.error) : "未获取到信息"}</span>`;
    }
  }
  if (domainDetailEl) {
    const dom = health.domain;
    if (dom) {
      const dateStr = formatHealthDate(dom.expiresAt);
      const exp = dateStr ? `到期: ${escapeHtml(dateStr)}` : "";
      const reg = dom.registrar ? `注册商: ${escapeHtml(dom.registrar)}` : "";
      domainDetailEl.textContent = [exp, reg].filter(Boolean).join(" | ") || "-";
    } else {
      domainDetailEl.textContent = "-";
    }
  }
}

function openEditLinkModal(id) {
  const link = currentLinks.find(item => String(item.id) === String(id));
  if (!link) return;

  document.getElementById("link-modal-title").textContent = "编辑友情链接";
  document.getElementById("link-id").value = link.id;
  document.getElementById("link-title").value = link.title;
  document.getElementById("link-author").value = link.author || "";

  let initialUrl = link.url || "";
  let initialProtocol = link.protocol || "https://";
  const match = initialUrl.match(/^([a-zA-Z0-9+.-]+:\/\/)(.*)$/);
  if (match) {
    initialProtocol = match[1];
    initialUrl = match[2];
  }
  setLinkProtocol(initialProtocol);
  document.getElementById("link-url").value = initialUrl;
  document.getElementById("link-desc").value = link.description || "";

  // 1. Restore Website Favicon
  document.getElementById("link-favicon-val").value = link.favicon || "";
  updateLinkFaviconPreview();

  // 2. Restore Webmaster Avatar
  const avatarType = link.avatarType || "gravatar";
  document.getElementById("link-avatar-val").value = link.avatar || "";
  document.getElementById("link-avatar-url-val").value = link.avatarUrl || "";

  const emailInput = document.getElementById("link-avatar-email");
  const urlInput = document.getElementById("link-avatar-url-input");
  if (avatarType === "gravatar" && emailInput) {
    emailInput.value = link.avatar || "";
  } else if (avatarType === "url" && urlInput) {
    urlInput.value = link.avatar || "";
  }

  setAvatarType(avatarType);
  updateAvatarPreview();

  document.getElementById("link-status").value = link.status || "active";
  document.getElementById("link-order").value = link.order || 1;
  if (document.getElementById("link-pinned")) document.getElementById("link-pinned").checked = Boolean(link.pinned || link.isTop);

  // 打开弹窗
  openModal("link-modal");

  // 渲染健康与监控详情（通过 try-catch 保护，确保即使有脏数据也绝不阻断界面）
  try {
    renderModalHealthDetails(link.id);
  } catch (err) {
    console.error("renderModalHealthDetails error:", err);
  }
}

function handleLinkUrlInput(e) {
  let val = e.target.value;
  const match = val.match(/^([a-zA-Z0-9+.-]+:\/\/)(.*)$/);
  if (match) {
    setLinkProtocol(match[1]);
    e.target.value = match[2];
  }
}

function setAvatarType(type) {
  document.getElementById("link-avatar-type").value = type;
  document.querySelectorAll("#link-avatar-segmented .segmented-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const gravatarGroup = document.getElementById("group-avatar-gravatar");
  const urlGroup = document.getElementById("group-avatar-url");
  const blobGroup = document.getElementById("group-avatar-blob");

  gravatarGroup.style.display = type === "gravatar" ? "block" : "none";
  urlGroup.style.display = type === "url" ? "block" : "none";
  blobGroup.style.display = type === "blob" ? "block" : "none";

  updateAvatarPreview();
}

// Helper to get normalized Gravatar base URL from system settings domain
function getGravatarBaseUrl(customDomain) {
  let domain = (customDomain || (currentSettings && currentSettings.gravatarMirror) || "gravatar.bluecdn.com").trim();
  domain = domain.replace(/^https?:\/\//i, "").replace(/\/avatar\/?$/i, "").replace(/\/+$/, "");
  if (!domain) domain = "gravatar.bluecdn.com";
  return `https://${domain}/avatar/`;
}

// Resolve 3 types of {ID} input: QQ, Hex Hash, Email
function resolveAvatarIdentifier(rawInput, customDomain) {
  const val = (rawInput || "").trim();
  if (!val) {
    return {
      type: "empty",
      typeLabel: "",
      id: "",
      url: ""
    };
  }

  // 1. QQ number: 5 to 12 digits, fetch from q.qlogo.cn (spec=640)
  if (/^[1-9]\d{4,11}$/.test(val)) {
    const qqUrl = `https://q.qlogo.cn/g?b=qq&nk=${val}&s=640`;
    return {
      type: "qq",
      typeLabel: "QQ 号 (高清 640px)",
      id: val,
      url: qqUrl
    };
  }

  const baseUrl = getGravatarBaseUrl(customDomain);

  // 2. Existing MD5 / SHA256 hex hash (32-64 chars): skip MD5 calculation
  if (/^[a-f0-9]{32,64}$/i.test(val)) {
    const hash = val.toLowerCase();
    return {
      type: "hash",
      typeLabel: "MD5/SHA256 哈希",
      id: hash,
      url: `${baseUrl}${hash}`
    };
  }

  // 3. Email (recommend): lowercase and MD5
  const cleanEmail = val.toLowerCase();
  const hash = md5(cleanEmail);
  return {
    type: "email",
    typeLabel: `邮箱 (MD5: ${hash.substring(0, 8)}...)`,
    id: cleanEmail,
    url: `${baseUrl}${hash}`
  };
}

function updateAvatarPreview() {
  const type = document.getElementById("link-avatar-type").value;
  const previewImg = document.getElementById("link-avatar-preview");
  const avatarValInput = document.getElementById("link-avatar-val");
  const avatarUrlVal = document.getElementById("link-avatar-url-val");
  const badgeEl = document.getElementById("link-avatar-detected-badge");
  const hintEl = document.getElementById("link-avatar-preview-hint");

  if (type === "gravatar") {
    const rawInputEl = document.getElementById("link-avatar-email");
    const rawVal = (rawInputEl ? rawInputEl.value : "").trim();
    const resolved = resolveAvatarIdentifier(rawVal);

    if (avatarValInput) avatarValInput.value = rawVal;
    if (badgeEl) badgeEl.textContent = resolved.typeLabel;
    if (avatarUrlVal) avatarUrlVal.value = resolved.url;

    if (resolved.url) {
      previewImg.onerror = () => {
        previewImg.onerror = null;
        previewImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";
        if (hintEl) hintEl.textContent = "镜像源未收录或网络异常，显示默认占位";
      };
      previewImg.src = resolved.url;
      if (hintEl) {
        hintEl.textContent = resolved.type === "qq" 
          ? "已拉取 QQ 640px 高清头像" 
          : `已调用设置镜像 (${(currentSettings && currentSettings.gravatarMirror) || "gravatar.bluecdn.com"})`;
      }
    } else {
      previewImg.onerror = null;
      previewImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";
      if (hintEl) hintEl.textContent = "请输入 邮箱 / MD5哈希 / QQ号 预览头像";
    }

  } else if (type === "url") {
    if (badgeEl) badgeEl.textContent = "";
    const urlInput = document.getElementById("link-avatar-url-input");
    const url = urlInput ? urlInput.value.trim() : "";
    if (avatarValInput) avatarValInput.value = url;
    if (avatarUrlVal) avatarUrlVal.value = url;
    previewImg.onerror = null;
    previewImg.src = url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
    if (hintEl) hintEl.textContent = "网络图片 URL 实时预览";
  } else if (type === "blob") {
    if (badgeEl) badgeEl.textContent = "";
    const key = avatarValInput ? avatarValInput.value.trim() : "";
    previewImg.onerror = null;
    if (key) {
      const src = key.startsWith("/api/file") ? key : `/api/file?key=${encodeURIComponent(key)}`;
      previewImg.src = src;
      if (avatarUrlVal) avatarUrlVal.value = src;
    } else {
      previewImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";
      if (avatarUrlVal) avatarUrlVal.value = "";
    }
    if (hintEl) hintEl.textContent = "EdgeOne Blob 存储头像回显";
  }
}

// Google Favicon fetch and cache to Blob (strictly for website icon)
async function cacheGoogleFavicon() {
  let url = document.getElementById("link-url").value.trim();
  if (!url) {
    showToast("请先填写网站 URL", "error");
    return;
  }

  const protocol = getLinkProtocol();
  if (!url.includes("://")) {
    url = protocol + url;
  }

  const btn = document.getElementById("btn-fetch-favicon");
  btn.disabled = true;
  btn.textContent = "缓存中...";

  try {
    const res = await apiFetch("/api/favicon", {
      method: "POST",
      body: JSON.stringify({ url })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast("网站 Favicon 成功缓存到 EdgeOne Blob！");
      document.getElementById("link-favicon-val").value = data.key;
      updateLinkFaviconPreview();
    } else {
      showToast(data.error || "获取并缓存 Favicon 失败", "error");
    }
  } catch (err) {
    showToast("操作失败：" + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "抓取 Google Favicon 到 Blob";
  }
}

// Batch cache friend links favicons to Blob
async function batchCacheLinksFavicons(btn) {
  if (!currentLinks || currentLinks.length === 0) {
    showToast("当前暂无友情链接可供缓存", "error");
    return;
  }

  const uncachedList = currentLinks.filter(l => !l.favicon);
  const isOnlyUncached = uncachedList.length > 0;
  const promptMsg = isOnlyUncached
    ? `当前共有 ${currentLinks.length} 条友链，其中 ${uncachedList.length} 条尚未缓存网站图标。\n\n点击「确定」将自动补充抓取这 ${uncachedList.length} 条的 Favicon 并持久化到 EdgeOne Blob（已缓存项保持不变）。`
    : `当前全部 ${currentLinks.length} 条友链均已设置网站图标。\n\n点击「确定」将对所有友链重新抓取最新 Favicon 并更新覆盖到 EdgeOne Blob。`;

  const confirmedLinks = await showConfirm({
    title: "批量缓存友链图标",
    message: promptMsg,
    confirmText: "开始缓存"
  });
  if (!confirmedLinks) return;

  const originalText = btn ? btn.textContent : "批量缓存图标";
  const allBtns = [
    document.getElementById("btn-batch-cache-links"),
    document.getElementById("btn-batch-cache-links-pane")
  ].filter(Boolean);

  allBtns.forEach(b => {
    b.disabled = true;
    b.textContent = "准备中...";
  });

  const targets = isOnlyUncached ? uncachedList : currentLinks;
  let successCount = 0;
  let failCount = 0;
  let processed = 0;
  const total = targets.length;

  const updateProgress = () => {
    const text = `缓存中 (${processed}/${total})...`;
    allBtns.forEach(b => { b.textContent = text; });
  };
  updateProgress();

  const concurrency = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const link = targets[idx];
      if (!link || !link.url) {
        processed++;
        updateProgress();
        continue;
      }

      try {
        const res = await apiFetch("/api/favicon", {
          method: "POST",
          body: JSON.stringify({ url: link.url })
        });
        const data = await res.json();
        if (res.ok && data.success && data.key) {
          link.favicon = data.key;
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      } finally {
        processed++;
        updateProgress();
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(workers);

  try {
    allBtns.forEach(b => { b.textContent = "保存中..."; });
    const saveRes = await apiFetch("/api/admin/links", {
      method: "PUT",
      body: JSON.stringify({ links: currentLinks })
    });
    const saveData = await saveRes.json();
    if (saveRes.ok && saveData.success) {
      showToast(`批量缓存完成：成功缓存 ${successCount} 个图标${failCount > 0 ? `，失败 ${failCount} 个` : ""}`);
      renderLinksTable();
    } else {
      showToast("图标已抓取，但更新保存失败：" + (saveData.error || "未知错误"), "error");
    }
  } catch (err) {
    showToast("保存异常：" + err.message, "error");
  } finally {
    allBtns.forEach(b => {
      b.disabled = false;
      b.textContent = originalText;
    });
  }
}

// Batch cache blog unions favicons to Blob
async function batchCacheUnionsFavicons(btn) {
  if (!currentUnions || currentUnions.length === 0) {
    showToast("当前暂无博客联盟可供缓存", "error");
    return;
  }

  const uncachedList = currentUnions.filter(u => !u.websiteIcon);
  const isOnlyUncached = uncachedList.length > 0;
  const promptMsg = isOnlyUncached
    ? `当前共有 ${currentUnions.length} 个博客联盟，其中 ${uncachedList.length} 个尚未缓存官网图标。\n\n点击「确定」将自动抓取这 ${uncachedList.length} 个联盟官网的 Favicon 并持久化到 EdgeOne Blob。`
    : `当前全部 ${currentUnions.length} 个博客联盟均已设置官网图标。\n\n点击「确定」将对所有联盟重新抓取最新 Favicon 并更新覆盖到 EdgeOne Blob。`;

  const confirmedUnions = await showConfirm({
    title: "批量缓存联盟官网图标",
    message: promptMsg,
    confirmText: "开始缓存"
  });
  if (!confirmedUnions) return;

  const originalText = btn ? btn.textContent : "批量缓存图标";
  const allBtns = [
    document.getElementById("btn-batch-cache-unions"),
    document.getElementById("btn-batch-cache-unions-pane")
  ].filter(Boolean);

  allBtns.forEach(b => {
    b.disabled = true;
    b.textContent = "准备中...";
  });

  const targets = isOnlyUncached ? uncachedList : currentUnions;
  let successCount = 0;
  let failCount = 0;
  let processed = 0;
  const total = targets.length;

  const updateProgress = () => {
    const text = `缓存中 (${processed}/${total})...`;
    allBtns.forEach(b => { b.textContent = text; });
  };
  updateProgress();

  const concurrency = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const union = targets[idx];
      const targetUrl = union ? (union.officialUrl || union.url) : "";
      if (!union || !targetUrl) {
        processed++;
        updateProgress();
        continue;
      }

      try {
        const res = await apiFetch("/api/favicon", {
          method: "POST",
          body: JSON.stringify({ url: targetUrl })
        });
        const data = await res.json();
        if (res.ok && data.success && data.key) {
          union.websiteIcon = data.key;
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      } finally {
        processed++;
        updateProgress();
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(workers);

  try {
    allBtns.forEach(b => { b.textContent = "保存中..."; });
    const saveRes = await apiFetch("/api/admin/unions", {
      method: "PUT",
      body: JSON.stringify({ unions: currentUnions })
    });
    const saveData = await saveRes.json();
    if (saveRes.ok && saveData.success) {
      showToast(`批量缓存完成：成功缓存 ${successCount} 个联盟官网图标${failCount > 0 ? `，失败 ${failCount} 个` : ""}`);
      renderUnionsTable();
    } else {
      showToast("图标已抓取，但更新保存失败：" + (saveData.error || "未知错误"), "error");
    }
  } catch (err) {
    showToast("保存异常：" + err.message, "error");
  } finally {
    allBtns.forEach(b => {
      b.disabled = false;
      b.textContent = originalText;
    });
  }
}

// Upload Webmaster Avatar to Blob
async function uploadAvatarToBlob(file) {
  if (!file) return;

  const btn = document.getElementById("link-avatar-file-label");
  if (btn) btn.textContent = "上传中...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "avatars");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("头像成功上传到 EdgeOne Blob！");
      document.getElementById("link-avatar-val").value = data.key;
      updateAvatarPreview();
    } else {
      showToast(data.error || "头像上传失败", "error");
    }
  } catch (err) {
    showToast("上传异常：" + err.message, "error");
  } finally {
    if (btn) btn.textContent = "选择头像上传至 EdgeOne Blob";
  }
}

// Save Link Form
async function saveLinkForm(e) {
  e.preventDefault();
  const id = document.getElementById("link-id").value;
  const title = document.getElementById("link-title").value.trim();
  const author = document.getElementById("link-author").value.trim();
  const protocol = getLinkProtocol();
  let url = document.getElementById("link-url").value.trim();
  const description = document.getElementById("link-desc").value.trim();
  const avatarType = document.getElementById("link-avatar-type").value;
  const avatar = document.getElementById("link-avatar-val").value.trim();
  const avatarUrl = document.getElementById("link-avatar-url-val").value.trim();
  const favicon = document.getElementById("link-favicon-val").value.trim();
  const status = document.getElementById("link-status").value;
  const order = parseInt(document.getElementById("link-order").value, 10) || 1;
  const pinned = document.getElementById("link-pinned") ? document.getElementById("link-pinned").checked : false;

  if (!title || !url) {
    showToast("请填写网站名称和 URL", "error");
    return;
  }

  // Strip protocol prefix from url if user still has it
  const match = url.match(/^([a-zA-Z0-9+.-]+:\/\/)(.*)$/);
  if (match) {
    url = match[2];
  }
  const fullUrl = protocol + url;

  const payload = {
    id: id || undefined,
    title,
    author,
    protocol,
    url: fullUrl,
    description,
    avatarType,
    avatar,
    avatarUrl,
    favicon,
    status,
    pinned,
    order
  };

  try {
    const method = id ? "PUT" : "POST";
    const res = await apiFetch("/api/admin/links", {
      method,
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast(id ? "链接已更新" : "链接已添加");
      closeModal("link-modal");
      loadLinks();
    } else {
      showToast(data.error || "保存失败", "error");
    }
  } catch (err) {
    showToast("请求失败：" + err.message, "error");
  }
}

async function deleteLink(id) {
  const confirmed = await showConfirm({
    title: "删除友情链接",
    message: "确定要删除此友情链接吗？此操作不可撤销。",
    confirmText: "确认删除",
    isDanger: true
  });
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/api/admin/links?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("已删除链接");
      loadLinks();
    } else {
      showToast(data.error || "删除失败", "error");
    }
  } catch (err) {
    showToast("操作失败：" + err.message, "error");
  }
}

// Blog Union Modal
function openAddUnionModal() {
  document.getElementById("union-modal-title").textContent = "添加博客联盟";
  document.getElementById("union-id").value = "";
  document.getElementById("union-name").value = "";
  document.getElementById("union-official-url").value = "";
  document.getElementById("union-url").value = "";
  document.getElementById("union-desc").value = "";

  // 1. Reset Website Favicon
  document.getElementById("union-website-icon").value = "";
  updateUnionWebsiteIconPreview();

  // 2. Reset Badge Icon (Light / Dark)
  document.getElementById("union-icon-type").value = "url";
  document.getElementById("union-icon-light").value = "";
  document.getElementById("union-icon-dark").value = "";
  document.getElementById("union-order").value = currentUnions.length + 1;

  setUnionIconType("url");
  openModal("union-modal");
}

function openEditUnionModal(id) {
  const union = currentUnions.find(item => item.id === id);
  if (!union) return;

  document.getElementById("union-modal-title").textContent = "编辑博客联盟";
  document.getElementById("union-id").value = union.id;
  document.getElementById("union-name").value = union.name;
  document.getElementById("union-official-url").value = union.officialUrl || "";
  document.getElementById("union-url").value = union.url;
  document.getElementById("union-desc").value = union.description || "";

  // 1. Restore Website Favicon
  document.getElementById("union-website-icon").value = union.websiteIcon || "";
  updateUnionWebsiteIconPreview();

  // 2. Restore Badge Icon (Light / Dark)
  document.getElementById("union-icon-type").value = union.iconType || "url";
  document.getElementById("union-icon-light").value = union.iconLight || "";
  document.getElementById("union-icon-dark").value = union.iconDark || "";
  document.getElementById("union-order").value = union.order || 1;

  setUnionIconType(union.iconType || "url");
  openModal("union-modal");
}

// Union Website Favicon Preview
function updateUnionWebsiteIconPreview() {
  const val = document.getElementById("union-website-icon").value.trim();
  const preview = document.getElementById("union-website-icon-preview");
  const box = document.getElementById("union-website-icon-preview-box");
  if (!preview || !box) return;

  const offUrl = document.getElementById("union-official-url") ? document.getElementById("union-official-url").value.trim() : "";
  const uUrl = document.getElementById("union-url") ? document.getElementById("union-url").value.trim() : "";
  const domain = extractDomain(offUrl || uUrl);

  let src = "";
  if (val) {
    src = formatAssetUrl(val);
  } else if (domain) {
    src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  }

  if (src) {
    preview.dataset.fallbackTried = "";
    preview.onerror = function() {
      if (domain && !this.dataset.fallbackTried) {
        this.dataset.fallbackTried = "1";
        this.src = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
      } else {
        this.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
      }
    };
    preview.src = src;
    box.style.display = "flex";
  } else {
    box.style.display = "none";
  }
}

// Fetch Union Website Favicon via Google API to Blob
async function fetchUnionFaviconToBlob() {
  const offUrl = document.getElementById("union-official-url") ? document.getElementById("union-official-url").value.trim() : "";
  const uUrl = document.getElementById("union-url") ? document.getElementById("union-url").value.trim() : "";
  const targetUrl = offUrl || uUrl;

  if (!targetUrl) {
    showToast("请先填写联盟官网链接或专属展示链接", "error");
    return;
  }

  const btn = document.getElementById("btn-fetch-union-favicon");
  btn.disabled = true;
  btn.textContent = "缓存中...";

  try {
    const res = await apiFetch("/api/favicon", {
      method: "POST",
      body: JSON.stringify({ url: targetUrl })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("联盟网站 Favicon 成功缓存到 EdgeOne Blob！");
      document.getElementById("union-website-icon").value = data.key;
      updateUnionWebsiteIconPreview();
    } else {
      showToast(data.error || "获取并缓存 Favicon 失败", "error");
    }
  } catch (err) {
    showToast("操作失败：" + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "抓取 Google Favicon 到 Blob";
  }
}

// Upload Union Website Favicon to Blob
async function uploadUnionWebsiteIcon(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "favicons");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("联盟网站图标已成功上传到 Blob！");
      document.getElementById("union-website-icon").value = data.key;
      updateUnionWebsiteIconPreview();
    } else {
      showToast(data.error || "图标上传失败", "error");
    }
  } catch (err) {
    showToast("上传异常：" + err.message, "error");
  }
}

function setUnionIconType(type) {
  document.getElementById("union-icon-type").value = type;
  document.querySelectorAll("#union-icon-segmented .segmented-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const urlGroup = document.getElementById("group-union-icon-url");
  const blobGroup = document.getElementById("group-union-icon-blob");

  urlGroup.style.display = type === "url" ? "block" : "none";
  blobGroup.style.display = type === "blob" ? "block" : "none";

  updateUnionIconPreview();
}

function updateUnionIconPreview() {
  const light = document.getElementById("union-icon-light").value;
  const dark = document.getElementById("union-icon-dark").value;

  const lightImg = document.getElementById("union-preview-light");
  const darkImg = document.getElementById("union-preview-dark");

  const lightUrl = light ? (light.startsWith("/api/file") ? light : (light.startsWith("http") ? light : `/api/file?key=${encodeURIComponent(light)}`)) : "";
  const darkUrl = dark ? (dark.startsWith("/api/file") ? dark : (dark.startsWith("http") ? dark : `/api/file?key=${encodeURIComponent(dark)}`)) : lightUrl;

  lightImg.src = lightUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
  darkImg.src = darkUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
}

// Upload Union Badge Icon to Blob (Light / Dark)
async function uploadUnionIcon(file, theme = "light") {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", `icons_${theme}`);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`${theme === "light" ? "浅色" : "深色"}徽章图标已成功上传到 Blob！`);
      if (theme === "light") {
        document.getElementById("union-icon-light").value = data.key;
      } else {
        document.getElementById("union-icon-dark").value = data.key;
      }
      updateUnionIconPreview();
    } else {
      showToast(data.error || "图标上传失败", "error");
    }
  } catch (err) {
    showToast("上传异常：" + err.message, "error");
  }
}

// Save Union Form
async function saveUnionForm(e) {
  e.preventDefault();
  const id = document.getElementById("union-id").value;
  const name = document.getElementById("union-name").value.trim();
  const officialUrl = document.getElementById("union-official-url") ? document.getElementById("union-official-url").value.trim() : "";
  const url = document.getElementById("union-url").value.trim();
  const websiteIcon = document.getElementById("union-website-icon") ? document.getElementById("union-website-icon").value.trim() : "";
  const description = document.getElementById("union-desc").value.trim();
  const iconType = document.getElementById("union-icon-type").value;
  const iconLight = document.getElementById("union-icon-light").value.trim();
  const iconDark = document.getElementById("union-icon-dark").value.trim();
  const order = parseInt(document.getElementById("union-order").value, 10) || 1;

  if (!name || !url) {
    showToast("请填写联盟名称和专属 URL", "error");
    return;
  }

  const payload = {
    id: id || undefined,
    name,
    officialUrl,
    url,
    websiteIcon,
    description,
    iconType,
    iconLight,
    iconDark,
    order
  };

  try {
    const method = id ? "PUT" : "POST";
    const res = await apiFetch("/api/admin/unions", {
      method,
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast(id ? "博客联盟已更新" : "博客联盟已添加");
      closeModal("union-modal");
      loadUnions();
    } else {
      showToast(data.error || "保存失败", "error");
    }
  } catch (err) {
    showToast("请求失败：" + err.message, "error");
  }
}

async function deleteUnion(id) {
  const confirmed = await showConfirm({
    title: "删除博客联盟",
    message: "确定要删除此博客联盟吗？此操作不可撤销。",
    confirmText: "确认删除",
    isDanger: true
  });
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/api/admin/unions?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("已删除博客联盟");
      loadUnions();
    } else {
      showToast(data.error || "删除失败", "error");
    }
  } catch (err) {
    showToast("操作失败：" + err.message, "error");
  }
}

// Modal generic
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

// Tab Switching
function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.style.display = pane.id === `pane-${tabName}` ? "block" : "none";
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// DOM Setup
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
    btn.addEventListener("click", toggleTheme);
  });

  checkAuth();

  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // Logout button
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Tab buttons
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Link Form
  const linkForm = document.getElementById("link-form");
  if (linkForm) linkForm.addEventListener("submit", saveLinkForm);

  // Link Protocol switch
  const linkProtoSelect = document.getElementById("link-protocol");
  if (linkProtoSelect) {
    linkProtoSelect.addEventListener("change", (e) => {
      const customGroup = document.getElementById("group-protocol-custom");
      const customInput = document.getElementById("link-protocol-custom");
      if (e.target.value === "custom") {
        if (customGroup) customGroup.style.display = "block";
        if (customInput) customInput.focus();
      } else {
        if (customGroup) customGroup.style.display = "none";
      }
    });
  }

  // Link URL input protocol auto-match
  const linkUrlInput = document.getElementById("link-url");
  if (linkUrlInput) {
    linkUrlInput.addEventListener("input", handleLinkUrlInput);
  }

  // Link Favicon input & preview & upload & google fetch
  const linkFaviconInput = document.getElementById("link-favicon-val");
  if (linkFaviconInput) {
    linkFaviconInput.addEventListener("input", updateLinkFaviconPreview);
  }

  const linkFaviconFile = document.getElementById("link-favicon-file");
  if (linkFaviconFile) {
    linkFaviconFile.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadLinkFavicon(e.target.files[0]);
    });
  }

  const faviconBtn = document.getElementById("btn-fetch-favicon");
  if (faviconBtn) {
    faviconBtn.addEventListener("click", cacheGoogleFavicon);
  }

  // Link Avatar Segmented Control
  document.querySelectorAll("#link-avatar-segmented .segmented-btn").forEach(btn => {
    btn.addEventListener("click", () => setAvatarType(btn.dataset.type));
  });

  // Link Avatar inputs
  const avatarEmailInput = document.getElementById("link-avatar-email");
  if (avatarEmailInput) {
    avatarEmailInput.addEventListener("input", updateAvatarPreview);
  }

  const avatarUrlInput = document.getElementById("link-avatar-url-input");
  if (avatarUrlInput) {
    avatarUrlInput.addEventListener("input", updateAvatarPreview);
  }

  // File upload for avatar
  const avatarFileInput = document.getElementById("link-avatar-file");
  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadAvatarToBlob(e.target.files[0]);
    });
  }

  // Union Form
  const unionForm = document.getElementById("union-form");
  if (unionForm) unionForm.addEventListener("submit", saveUnionForm);

  // Union Website Favicon inputs & events
  const unionOfficialUrlInput = document.getElementById("union-official-url");
  if (unionOfficialUrlInput) {
    unionOfficialUrlInput.addEventListener("blur", updateUnionWebsiteIconPreview);
  }

  const unionUrlInput = document.getElementById("union-url");
  if (unionUrlInput) {
    unionUrlInput.addEventListener("blur", updateUnionWebsiteIconPreview);
  }

  const unionWebsiteIconInput = document.getElementById("union-website-icon");
  if (unionWebsiteIconInput) {
    unionWebsiteIconInput.addEventListener("input", updateUnionWebsiteIconPreview);
  }

  const unionWebsiteIconFile = document.getElementById("union-website-icon-file");
  if (unionWebsiteIconFile) {
    unionWebsiteIconFile.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadUnionWebsiteIcon(e.target.files[0]);
    });
  }

  const unionFetchFaviconBtn = document.getElementById("btn-fetch-union-favicon");
  if (unionFetchFaviconBtn) {
    unionFetchFaviconBtn.addEventListener("click", fetchUnionFaviconToBlob);
  }

  // Union Badge Icon Segmented Control
  document.querySelectorAll("#union-icon-segmented .segmented-btn").forEach(btn => {
    btn.addEventListener("click", () => setUnionIconType(btn.dataset.type));
  });

  // Union Badge Icon inputs change
  const unionLightInput = document.getElementById("union-icon-light");
  const unionDarkInput = document.getElementById("union-icon-dark");
  if (unionLightInput) unionLightInput.addEventListener("input", updateUnionIconPreview);
  if (unionDarkInput) unionDarkInput.addEventListener("input", updateUnionIconPreview);

  // Union Badge Icon uploads
  const unionLightFile = document.getElementById("union-icon-light-file");
  const unionDarkFile = document.getElementById("union-icon-dark-file");
  if (unionLightFile) {
    unionLightFile.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadUnionIcon(e.target.files[0], "light");
    });
  }
  if (unionDarkFile) {
    unionDarkFile.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadUnionIcon(e.target.files[0], "dark");
    });
  }

  // Settings Forms
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) settingsForm.addEventListener("submit", saveSettingsForm);

  // Favicon setting input & upload
  const faviconInput = document.getElementById("setting-favicon");
  if (faviconInput) {
    faviconInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const preview = document.getElementById("setting-favicon-preview");
      const previewBox = document.getElementById("favicon-preview-box");
      if (preview && previewBox) {
        if (val) {
          preview.src = val;
          previewBox.style.display = "flex";
        } else {
          previewBox.style.display = "none";
        }
      }
    });
  }

  const faviconFileInput = document.getElementById("setting-favicon-file");
  if (faviconFileInput) {
    faviconFileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) uploadFaviconToBlob(e.target.files[0]);
    });
  }

  const passwordForm = document.getElementById("password-form");
  if (passwordForm) passwordForm.addEventListener("submit", handleChangePassword);

  // Backup and Export/Import bindings
  // 1. Full Backup
  const exportBtn = document.getElementById("btn-export-data");
  if (exportBtn) exportBtn.addEventListener("click", () => exportData("all"));

  const importFile = document.getElementById("import-file-input");
  if (importFile) importFile.addEventListener("change", importData);

  // 2. Friend Links (Action bar & Pane)
  const exportLinksBtn = document.getElementById("btn-export-links");
  if (exportLinksBtn) exportLinksBtn.addEventListener("click", () => exportData("links"));

  const exportLinksPaneBtn = document.getElementById("btn-export-links-pane");
  if (exportLinksPaneBtn) exportLinksPaneBtn.addEventListener("click", () => exportData("links"));

  const importLinksFile = document.getElementById("import-links-file");
  if (importLinksFile) importLinksFile.addEventListener("change", (e) => importLinksData(e, "merge"));

  const importLinksFilePane = document.getElementById("import-links-file-pane");
  if (importLinksFilePane) {
    importLinksFilePane.addEventListener("change", (e) => {
      const mode = getSelectedImportMode("import-links-mode");
      importLinksData(e, mode);
    });
  }

  // 3. Blog Unions (Action bar & Pane)
  const exportUnionsBtn = document.getElementById("btn-export-unions");
  if (exportUnionsBtn) exportUnionsBtn.addEventListener("click", () => exportData("unions"));

  const exportUnionsPaneBtn = document.getElementById("btn-export-unions-pane");
  if (exportUnionsPaneBtn) exportUnionsPaneBtn.addEventListener("click", () => exportData("unions"));

  const importUnionsFile = document.getElementById("import-unions-file");
  if (importUnionsFile) importUnionsFile.addEventListener("change", (e) => importUnionsData(e, "merge"));

  const importUnionsFilePane = document.getElementById("import-unions-file-pane");
  if (importUnionsFilePane) {
    importUnionsFilePane.addEventListener("change", (e) => {
      const mode = getSelectedImportMode("import-unions-mode");
      importUnionsData(e, mode);
    });
  }

  // 4. Download Import Template buttons
  const tplFullBtn = document.getElementById("btn-template-full");
  if (tplFullBtn) tplFullBtn.addEventListener("click", () => downloadJsonTemplate("full"));

  const tplLinksBtn = document.getElementById("btn-template-links");
  if (tplLinksBtn) tplLinksBtn.addEventListener("click", () => downloadJsonTemplate("links"));

  const tplUnionsBtn = document.getElementById("btn-template-unions");
  if (tplUnionsBtn) tplUnionsBtn.addEventListener("click", () => downloadJsonTemplate("unions"));

  const healthCheckBtn = document.getElementById("btn-health-check-links");
  if (healthCheckBtn) healthCheckBtn.addEventListener("click", checkAllLinksHealth);

  const tplLinksTopBtn = document.getElementById("btn-template-links-top");
  if (tplLinksTopBtn) tplLinksTopBtn.addEventListener("click", () => downloadJsonTemplate("links"));

  const tplUnionsTopBtn = document.getElementById("btn-template-unions-top");
  if (tplUnionsTopBtn) tplUnionsTopBtn.addEventListener("click", () => downloadJsonTemplate("unions"));

  // 5. Batch Cache Favicons to Blob
  const batchLinksBtn = document.getElementById("btn-batch-cache-links");
  if (batchLinksBtn) batchLinksBtn.addEventListener("click", (e) => batchCacheLinksFavicons(e.currentTarget));

  const batchLinksPaneBtn = document.getElementById("btn-batch-cache-links-pane");
  if (batchLinksPaneBtn) batchLinksPaneBtn.addEventListener("click", (e) => batchCacheLinksFavicons(e.currentTarget));

  const batchUnionsBtn = document.getElementById("btn-batch-cache-unions");
  if (batchUnionsBtn) batchUnionsBtn.addEventListener("click", (e) => batchCacheUnionsFavicons(e.currentTarget));

  const batchUnionsPaneBtn = document.getElementById("btn-batch-cache-unions-pane");
  if (batchUnionsPaneBtn) batchUnionsPaneBtn.addEventListener("click", (e) => batchCacheUnionsFavicons(e.currentTarget));
});
