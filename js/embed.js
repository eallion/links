/**
 * EdgeOne Links - Standalone Self-Contained Embed Script
 * 纯内联样式与多参数配置，像现代评论系统（Waline / Twikoo）一样即插即用
 *
 * 最简用法：
 * <div id="links"></div>
 * <script src="https://<你的域名>/js/embed.js" defer></script>
 *
 * 自定义参数用法（支持 HTML 属性或 JS 编程式调用）：
 * <div id="links"
 *      data-style="detailed"
 *      data-shuffle="true"
 *      data-columns="detailed:3,simple:4,app:6"
 *      data-show-switcher="true"
 *      data-show-unions="true"
 *      data-theme="auto"></div>
 * <script src="https://<你的域名>/js/embed.js" defer></script>
 */

(function () {
  'use strict';

  // 1. 完整内嵌样式表 (100% 复刻 index.html & style.css 视觉体系，严格作用域隔离)
  const EMBED_CSS = `
#links,
.links-page-wrapper {
  --bg-primary: #0a0d14;
  --bg-secondary: #121722;
  --bg-card: rgba(22, 28, 42, 0.75);
  --bg-card-hover: rgba(30, 38, 56, 0.9);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-highlight: rgba(79, 134, 247, 0.3);
  --text-primary: #f0f4fc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent-primary: #3b82f6;
  --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  --accent-glow: rgba(59, 130, 246, 0.25);
  --badge-bg: rgba(59, 130, 246, 0.12);
  --badge-text: #60a5fa;
  --tag-bg: rgba(255, 255, 255, 0.06);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.35);
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.15);
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-full: 9999px;
  --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  width: 100%;
  margin: 1.5rem 0 3.5rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
}

/* 博客主题适配：浅色模式 */
[data-theme="light"] #links,
[data-theme="light"] .links-page-wrapper,
html.light #links,
html.light .links-page-wrapper,
html:not(.dark):not([data-theme="dark"]) #links:not(.theme-dark),
html:not(.dark):not([data-theme="dark"]) .links-page-wrapper:not(.theme-dark),
#links.theme-light,
.links-page-wrapper.theme-light {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.85);
  --bg-card-hover: rgba(255, 255, 255, 0.98);
  --border-color: rgba(0, 0, 0, 0.08);
  --border-highlight: rgba(59, 130, 246, 0.35);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-primary: #2563eb;
  --accent-gradient: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  --accent-glow: rgba(37, 99, 235, 0.18);
  --badge-bg: rgba(37, 99, 235, 0.08);
  --badge-text: #2563eb;
  --tag-bg: rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.1);
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 博客主题适配：深色模式强制覆盖 */
[data-theme="dark"] #links,
[data-theme="dark"] .links-page-wrapper,
html.dark #links,
html.dark .links-page-wrapper,
#links.theme-dark,
.links-page-wrapper.theme-dark {
  --bg-primary: #0a0d14;
  --bg-secondary: #121722;
  --bg-card: rgba(22, 28, 42, 0.75);
  --bg-card-hover: rgba(30, 38, 56, 0.9);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-highlight: rgba(79, 134, 247, 0.3);
  --text-primary: #f0f4fc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent-primary: #3b82f6;
  --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  --accent-glow: rgba(59, 130, 246, 0.25);
  --badge-bg: rgba(59, 130, 246, 0.12);
  --badge-text: #60a5fa;
  --tag-bg: rgba(255, 255, 255, 0.06);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.35);
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.15);
}

/* 消除宿主博客 prose / 全局样式的干扰 */
#links *,
.links-page-wrapper * {
  box-sizing: border-box;
}

#links a,
.links-page-wrapper a {
  text-decoration: none !important;
  color: inherit !important;
}

#links a:hover,
.links-page-wrapper a:hover {
  text-decoration: none !important;
}

#links img,
.links-page-wrapper img {
  border-style: none;
  max-width: 100%;
  margin: 0 !important;
}

#links .content-section,
.links-page-wrapper .content-section {
  position: relative;
  z-index: 1;
}

#links .section-head,
.links-page-wrapper .section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  margin-top: 3.5rem;
}

#links .section-title,
.links-page-wrapper .section-title {
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  line-height: 1.2;
}

#links .section-count,
.links-page-wrapper .section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--badge-text);
  background: var(--badge-bg);
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-full);
}


/* 博客联盟徽章 */
#links .unions-badges,
.links-page-wrapper .unions-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

#links .union-badge,
.links-page-wrapper .union-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  text-decoration: none;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-xs);
  flex-shrink: 0;
  box-sizing: border-box;
}

#links .union-badge:hover,
.links-page-wrapper .union-badge:hover {
  transform: translateY(-2px) scale(1.05);
  border-color: var(--border-highlight);
  background: var(--bg-card-hover);
  box-shadow: 0 4px 14px var(--accent-glow);
}

#links .union-badge-img,
.links-page-wrapper .union-badge-img {
  height: 24px;
  max-height: 24px;
  width: auto;
  object-fit: contain;
  display: block;
}

/* 联盟图标昼夜切换 */
html.dark #links .union-badge-light,
html.dark .links-page-wrapper .union-badge-light,
html[data-theme="dark"] #links .union-badge-light,
html[data-theme="dark"] .links-page-wrapper .union-badge-light,
#links.theme-dark .union-badge-light,
.links-page-wrapper.theme-dark .union-badge-light {
  display: none !important;
}
html.dark #links .union-badge-dark,
html.dark .links-page-wrapper .union-badge-dark,
html[data-theme="dark"] #links .union-badge-dark,
html[data-theme="dark"] .links-page-wrapper .union-badge-dark,
#links.theme-dark .union-badge-dark,
.links-page-wrapper.theme-dark .union-badge-dark {
  display: block !important;
}

html:not(.dark):not([data-theme="dark"]) #links:not(.theme-dark) .union-badge-dark,
html:not(.dark):not([data-theme="dark"]) .links-page-wrapper:not(.theme-dark) .union-badge-dark,
#links.theme-light .union-badge-dark,
.links-page-wrapper.theme-light .union-badge-dark {
  display: none !important;
}
html:not(.dark):not([data-theme="dark"]) #links:not(.theme-dark) .union-badge-light,
html:not(.dark):not([data-theme="dark"]) .links-page-wrapper:not(.theme-dark) .union-badge-light,
#links.theme-light .union-badge-light,
.links-page-wrapper.theme-light .union-badge-light {
  display: block !important;
}

#links .union-badge-mini-icon,
.links-page-wrapper .union-badge-mini-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: contain;
  margin-right: 0.45rem;
}

#links .union-badge-text,
.links-page-wrapper .union-badge-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 风格切换器 (简约 | 详情 | 应用) */
#links .style-switcher,
.links-page-wrapper .style-switcher {
  display: inline-flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 3px;
  border-radius: var(--radius-sm);
  gap: 2px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

#links .style-btn,
.links-page-wrapper .style-btn {
  padding: 0.3rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
  outline: none;
  line-height: 1.2;
}

#links .style-btn:hover,
.links-page-wrapper .style-btn:hover {
  color: var(--text-primary);
}

#links .style-btn.active,
.links-page-wrapper .style-btn.active {
  background: var(--accent-primary);
  color: #ffffff;
  box-shadow: 0 2px 8px var(--accent-glow);
}

/* 空状态与加载状态 */
#links .empty-box,
.links-page-wrapper .empty-box {
  text-align: center;
  padding: 3.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  grid-column: 1 / -1;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  width: 100%;
}

/* 基础卡片样式 */
#links .link-card,
.links-page-wrapper .link-card {
  display: flex;
  flex-direction: column;
  padding: 1.35rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition: var(--transition);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  position: relative;
  box-sizing: border-box;
}

#links .link-card:hover,
.links-page-wrapper .link-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-highlight);
  box-shadow: var(--shadow-lg);
  background: var(--bg-card-hover);
}

/* 友链健康状态微点 */
#links .health-indicator,
.links-page-wrapper .health-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  pointer-events: auto;
  transition: all 0.25s ease;
  z-index: 10;
  cursor: pointer;
}

#links .health-indicator.status-healthy,
.links-page-wrapper .health-indicator.status-healthy {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.45);
}

#links .health-indicator.status-warning,
.links-page-wrapper .health-indicator.status-warning {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.45);
}

#links .health-indicator.status-error,
.links-page-wrapper .health-indicator.status-error {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.45);
}

#links .health-indicator:hover,
.links-page-wrapper .health-indicator:hover {
  transform: scale(1.3);
}

/* Tooltip: 正上方居中 */
#links .health-indicator::after,
.links-page-wrapper .health-indicator::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%) translateY(2px);
  background: rgba(15, 23, 42, 0.95);
  color: #f8fafc;
  padding: 3px 7px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  z-index: 30;
  line-height: 1.2;
}

#links .health-indicator::before,
.links-page-wrapper .health-indicator::before {
  content: "";
  position: absolute;
  bottom: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%) translateY(2px);
  border-width: 4px 4px 0 4px;
  border-style: solid;
  border-color: rgba(15, 23, 42, 0.95) transparent transparent transparent;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  z-index: 30;
}

#links .health-indicator:hover::after,
#links .health-indicator:hover::before,
.links-page-wrapper .health-indicator:hover::after,
.links-page-wrapper .health-indicator:hover::before {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}


#links .card-top,
.links-page-wrapper .card-top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

#links .link-avatar-wrap,
.links-page-wrapper .link-avatar-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  padding: 2px;
  background: var(--accent-gradient);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

#links .link-avatar,
.links-page-wrapper .link-avatar {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--bg-secondary);
  display: block;
}

#links .link-favicon-mini,
.links-page-wrapper .link-favicon-mini {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1.5px solid var(--bg-card);
  box-shadow: var(--shadow-xs);
  object-fit: contain;
}

#links .link-title-group,
.links-page-wrapper .link-title-group {
  flex: 1;
  min-width: 0;
}

#links .link-title,
.links-page-wrapper .link-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  margin: 0 !important;
}

#links .link-title-favicon,
.links-page-wrapper .link-title-favicon {
  display: none;
}

#links .link-meta,
.links-page-wrapper .link-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

#links .link-author,
.links-page-wrapper .link-author {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
}

#links .link-url-text,
.links-page-wrapper .link-url-text {
  font-size: 0.78rem;
  color: var(--accent-primary);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0.9;
}

#links .link-url-text span,
.links-page-wrapper .link-url-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#links .ssl-lock-icon,
.links-page-wrapper .ssl-lock-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}

#links .ssl-lock-icon.valid,
.links-page-wrapper .ssl-lock-icon.valid {
  color: #10b981;
}

#links .ssl-lock-icon.invalid,
.links-page-wrapper .ssl-lock-icon.invalid {
  color: #ef4444;
}

#links .domain-expired-icon,
.links-page-wrapper .domain-expired-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
  color: #ef4444;
  stroke: #ef4444;
  margin-left: 2px;
}

#links .link-pinned-badge,
.links-page-wrapper .link-pinned-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
  font-weight: 600;
  line-height: 1.3;
  margin-left: 0.35rem;
  flex-shrink: 0;
  vertical-align: middle;
}


#links .link-desc,
.links-page-wrapper .link-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
  margin: 0 !important;
}

/* 风格 1：详情风格 (Detailed - 默认) */
#links .links-grid.style-detailed,
#links .links-grid:not(.style-simple):not(.style-app),
.links-page-wrapper .links-grid.style-detailed,
.links-page-wrapper .links-grid:not(.style-simple):not(.style-app) {
  display: grid;
  grid-template-columns: var(--links-grid-cols-detailed, var(--links-grid-cols, repeat(auto-fill, minmax(280px, 1fr))));
  gap: 1.25rem;
}

/* 风格 2：简约风格 (Simple) */
#links .links-grid.style-simple,
.links-page-wrapper .links-grid.style-simple {
  display: grid;
  grid-template-columns: var(--links-grid-cols-simple, var(--links-grid-cols, repeat(auto-fill, minmax(220px, 1fr))));
  gap: 0.85rem;
}

#links .links-grid.style-simple .link-card,
.links-page-wrapper .links-grid.style-simple .link-card {
  flex-direction: row;
  align-items: center;
  padding: 0.8rem 1rem;
  gap: 0.85rem;
  border-radius: var(--radius-sm);
}

#links .links-grid.style-simple .link-card:hover,
.links-page-wrapper .links-grid.style-simple .link-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

#links .links-grid.style-simple .card-top,
.links-page-wrapper .links-grid.style-simple .card-top {
  margin-bottom: 0;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

#links .links-grid.style-simple .link-avatar-wrap,
.links-page-wrapper .links-grid.style-simple .link-avatar-wrap {
  width: 38px;
  height: 38px;
  background: none;
  padding: 0;
  flex-shrink: 0;
}

#links .links-grid.style-simple .link-avatar,
.links-page-wrapper .links-grid.style-simple .link-avatar {
  border-radius: var(--radius-sm);
}

#links .links-grid.style-simple .link-title,
.links-page-wrapper .links-grid.style-simple .link-title {
  font-size: 0.95rem;
  font-weight: 600;
}

#links .links-grid.style-simple .link-author,
.links-page-wrapper .links-grid.style-simple .link-author {
  display: none;
}

/* 简约风格不显示 link-desc */
#links .links-grid.style-simple .link-desc,
.links-page-wrapper .links-grid.style-simple .link-desc {
  display: none !important;
}

/* 风格 3：应用风格 (App) */
#links .links-grid.style-app,
.links-page-wrapper .links-grid.style-app {
  display: grid;
  grid-template-columns: var(--links-grid-cols-app, var(--links-grid-cols, repeat(auto-fill, minmax(130px, 1fr))));
  gap: 1.15rem;
}

#links .links-grid.style-app .link-card,
.links-page-wrapper .links-grid.style-app .link-card {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.35rem 0.85rem 1.1rem;
  gap: 0.75rem;
  border-radius: var(--radius-lg);
  min-height: auto;
}

#links .links-grid.style-app .card-top,
.links-page-wrapper .links-grid.style-app .card-top {
  flex-direction: column;
  align-items: center;
  margin-bottom: 0;
  gap: 0.75rem;
  width: 100%;
}

#links .links-grid.style-app .link-avatar-wrap,
.links-page-wrapper .links-grid.style-app .link-avatar-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  padding: 0;
  background: transparent;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

#links .links-grid.style-app .link-card:hover .link-avatar-wrap,
.links-page-wrapper .links-grid.style-app .link-card:hover .link-avatar-wrap {
  transform: scale(1.08) translateY(-2px);
}

#links .links-grid.style-app .link-avatar,
.links-page-wrapper .links-grid.style-app .link-avatar {
  border-radius: 16px;
}

/* favicon 不显示在头像右下角 */
#links .links-grid.style-app .link-favicon-mini,
.links-page-wrapper .links-grid.style-app .link-favicon-mini {
  display: none !important;
}

#links .links-grid.style-app .link-title-group,
.links-page-wrapper .links-grid.style-app .link-title-group {
  text-align: center;
  width: 100%;
  margin: 0;
}

/* 第二行只显示 favicon 和网站名 */
#links .links-grid.style-app .link-title,
.links-page-wrapper .links-grid.style-app .link-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  width: 100%;
  margin: 0 !important;
}

#links .links-grid.style-app .link-title-favicon,
.links-page-wrapper .links-grid.style-app .link-title-favicon {
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
}

#links .links-grid.style-app .link-title span,
.links-page-wrapper .links-grid.style-app .link-title span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 应用风格其他内容全部隐藏 */
#links .links-grid.style-app .link-meta,
#links .links-grid.style-app .link-author,
#links .links-grid.style-app .link-url-text,
#links .links-grid.style-app .link-desc,
.links-page-wrapper .links-grid.style-app .link-meta,
.links-page-wrapper .links-grid.style-app .link-author,
.links-page-wrapper .links-grid.style-app .link-url-text,
.links-page-wrapper .links-grid.style-app .link-desc {
  display: none !important;
}

/* 响应式移动端断点适配 */
@media (max-width: 640px) {
  #links .links-grid.style-detailed,
  .links-page-wrapper .links-grid.style-detailed,
  #links .links-grid.style-simple,
  .links-page-wrapper .links-grid.style-simple {
    grid-template-columns: 1fr !important;
  }
  #links .links-grid.style-app,
  .links-page-wrapper .links-grid.style-app {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important;
  }
}
`;

  // 2. 注入内联样式，无需依赖外部 css 文件
  function injectStyles() {
    if (document.getElementById('edgeone-links-style')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'edgeone-links-style';
    styleEl.textContent = EMBED_CSS;
    document.head.appendChild(styleEl);
  }

  // 3. 解析布尔与数字配置工具
  function parseBool(val, defaultVal) {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'boolean') return val;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }

  function parseNumber(val, defaultVal) {
    if (val === undefined || val === null || val === '') return defaultVal;
    const n = Number(val);
    return isNaN(n) ? defaultVal : n;
  }

  // 4. HTML 字符转义工具
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 5. 格式化友链展示域名
  function formatDisplayUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      return u.hostname + (u.pathname === '/' ? '' : u.pathname);
    } catch (e) {
      return (rawUrl || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
  }

  // 6. 查找目标容器
  function getContainer(selector) {
    if (selector) {
      if (typeof selector === 'string') return document.querySelector(selector);
      if (selector instanceof HTMLElement) return selector;
    }
    return (
      document.getElementById('links') ||
      document.getElementById('links-container') ||
      document.getElementById('eallion-links') ||
      document.querySelector('[data-links-mount]')
    );
  }

  // 7. 合并配置项（优先级：显式入参 > 容器 data-* > 脚本 data-* > 默认值）
  function resolveOptions(userOpts = {}) {
    const curScript = document.currentScript;
    let scriptOrigin = '';
    let scriptDataset = {};

    if (curScript) {
      if (curScript.src) {
        try {
          scriptOrigin = new URL(curScript.src).origin;
        } catch (e) {}
      }
      scriptDataset = curScript.dataset || {};
    }

    if (!scriptOrigin && typeof window !== 'undefined' && window.location) {
      scriptOrigin = window.location.origin || '';
    }

    const mountEl = getContainer(userOpts.el || scriptDataset.el);
    const containerDataset = mountEl ? (mountEl.dataset || {}) : {};

    // 参数优先级聚合
    const getVal = (key, defaultVal) => {
      if (userOpts[key] !== undefined) return userOpts[key];
      if (containerDataset[key] !== undefined) return containerDataset[key];
      if (scriptDataset[key] !== undefined) return scriptDataset[key];
      return defaultVal;
    };

    const api = String(getVal('api', scriptOrigin)).replace(/\/+$/, '');
    const shuffle = parseBool(getVal('shuffle', true), true);
    const style = String(getVal('style', 'detailed')).toLowerCase();
    const showSwitcher = parseBool(getVal('showSwitcher', true), true);
    const showUnions = parseBool(getVal('showUnions', true), true);
    const showLinks = parseBool(getVal('showLinks', true), true);
    const rememberStyle = parseBool(getVal('rememberStyle', true), true);
    const theme = String(getVal('theme', 'auto')).toLowerCase();
    const limit = parseNumber(getVal('limit', 0), 0);
    const target = String(getVal('target', '_blank'));
    const rel = String(getVal('rel', 'noopener noreferrer'));
    const showHealth = parseBool(getVal('showHealth', true), true);

    // 列数配置（支持模式联动、独立设置与复合规则）
    const columns = getVal('columns', 'auto');
    const columnsDetailed = getVal('columnsDetailed', null);
    const columnsSimple = getVal('columnsSimple', null);
    const columnsApp = getVal('columnsApp', null);

    return {
      mountEl,
      api,
      shuffle,
      style: ['simple', 'detailed', 'app'].includes(style) ? style : 'detailed',
      showSwitcher,
      showUnions,
      showLinks,
      rememberStyle,
      theme: ['auto', 'dark', 'light'].includes(theme) ? theme : 'auto',
      limit,
      target,
      rel,
      showHealth,
      columns,
      columnsDetailed,
      columnsSimple,
      columnsApp
    };
  }

  // 8. 解析多风格列数配置（支持模式联动与独立定制）
  function parseColumnsConfig(userCols, colsDetailed, colsSimple, colsApp) {
    let d = colsDetailed;
    let s = colsSimple;
    let a = colsApp;

    if (userCols && userCols !== 'auto') {
      if (typeof userCols === 'object' && userCols !== null) {
        if (userCols.detailed !== undefined) d = userCols.detailed;
        if (userCols.simple !== undefined) s = userCols.simple;
        if (userCols.app !== undefined) a = userCols.app;
      } else {
        const str = String(userCols).trim();
        if (str.includes(':')) {
          // 格式: detailed:3,simple:4,app:6 或 detailed:3; simple:4
          str.split(/[,;]/).forEach(function (part) {
            const kv = part.split(':').map(function (x) { return x.trim(); });
            if (kv.length === 2) {
              const k = kv[0].toLowerCase();
              const v = kv[1];
              if (k === 'detailed' || k === 'details') d = v;
              else if (k === 'simple') s = v;
              else if (k === 'app') a = v;
            }
          });
        } else if (str.includes(',')) {
          // 格式: 3,4,6 (对应 detailed, simple, app)
          const parts = str.split(',').map(function (x) { return x.trim(); });
          if (parts[0]) d = parts[0];
          if (parts[1]) s = parts[1];
          if (parts[2]) a = parts[2];
        } else if (/^\d+$/.test(str)) {
          // 单一纯数字 "3" 或 3: 作为详细风格基准，简约与应用风格智能递增推导
          const n = parseInt(str, 10);
          if (n > 0) {
            d = n;
            s = Math.min(n + 1, 6);
            a = Math.min(Math.max(n * 2, 4), 8);
          }
        } else {
          d = str;
        }
      }
    }

    function formatGridCol(val) {
      if (!val || val === 'auto') return null;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0 && String(num) === String(val).trim()) {
        return `repeat(${num}, minmax(0, 1fr))`;
      }
      return String(val);
    }

    return {
      detailed: formatGridCol(d),
      simple: formatGridCol(s),
      app: formatGridCol(a)
    };
  }

  // 9. 核心挂载与渲染逻辑
  async function mount(userOpts = {}) {
    injectStyles();

    const opts = resolveOptions(userOpts);
    const mountEl = opts.mountEl;

    if (!mountEl) {
      console.warn('[EdgeOne Links] 未找到挂载容器 (#links 或指定选择器)');
      return;
    }

    // 补全绝对域名
    function resolveAssetUrl(str) {
      if (!str) return '';
      const s = String(str).trim();
      if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) {
        return s;
      }
      if (s.startsWith('/api/file')) {
        return `${opts.api}${s}`;
      }
      if (s.startsWith('/')) {
        return `${opts.api}${s}`;
      }
      return `${opts.api}/api/file?key=${encodeURIComponent(s)}`;
    }

    // 主题样式类注入
    mountEl.classList.add('links-page-wrapper');
    mountEl.classList.remove('theme-dark', 'theme-light');
    if (opts.theme === 'dark') mountEl.classList.add('theme-dark');
    if (opts.theme === 'light') mountEl.classList.add('theme-light');

    // 多风格列数自定义计算与注入（CSS Variables）
    const parsedCols = parseColumnsConfig(
      opts.columns,
      opts.columnsDetailed,
      opts.columnsSimple,
      opts.columnsApp
    );

    if (parsedCols.detailed) {
      mountEl.style.setProperty('--links-grid-cols-detailed', parsedCols.detailed);
    } else {
      mountEl.style.removeProperty('--links-grid-cols-detailed');
    }

    if (parsedCols.simple) {
      mountEl.style.setProperty('--links-grid-cols-simple', parsedCols.simple);
    } else {
      mountEl.style.removeProperty('--links-grid-cols-simple');
    }

    if (parsedCols.app) {
      mountEl.style.setProperty('--links-grid-cols-app', parsedCols.app);
    } else {
      mountEl.style.removeProperty('--links-grid-cols-app');
    }

    // 默认展示骨架
    let htmlBuilder = '';

    if (opts.showUnions) {
      htmlBuilder += `
        <!-- 博客联盟 -->
        <section id="section-unions" class="content-section" style="margin-bottom: 3.5rem;">
          <div class="section-head" style="margin-top: 0;">
            <h2 class="section-title">
              <span>博客联盟</span>
              <span id="unions-count" class="section-count">0</span>
            </h2>
          </div>
          <div id="unions-container" class="unions-badges">
            <div class="empty-box">正在加载博客联盟...</div>
          </div>
        </section>
      `;
    }

    if (opts.showLinks) {
      htmlBuilder += `
        <!-- 友情链接 -->
        <section id="section-links" class="content-section">
          <div class="section-head" style="${opts.showUnions ? '' : 'margin-top: 0;'}">
            <h2 class="section-title">
              <span>友情链接</span>
              <span id="links-count" class="section-count">0</span>
            </h2>

            ${opts.showSwitcher ? `
              <div class="style-switcher" id="links-style-switcher">
                <button type="button" class="style-btn" data-style="simple" title="简约风格">简约</button>
                <button type="button" class="style-btn active" data-style="detailed" title="详情风格">详情</button>
                <button type="button" class="style-btn" data-style="app" title="应用风格">应用</button>
              </div>
            ` : ''}
          </div>

          <div id="links-grid-box" class="links-grid style-${opts.style}">
            <div class="empty-box">正在加载友情链接...</div>
          </div>
        </section>
      `;
    }

    mountEl.innerHTML = htmlBuilder;

    // 风格偏好记忆
    let currentStyle = opts.style;
    if (opts.rememberStyle && opts.showSwitcher) {
      try {
        const saved = localStorage.getItem('edgeone_links_style');
        if (saved && ['simple', 'detailed', 'app'].includes(saved)) {
          currentStyle = saved;
        }
      } catch (e) {}
    }

    function applyStyle(styleName) {
      if (!['simple', 'detailed', 'app'].includes(styleName)) return;
      currentStyle = styleName;
      if (opts.rememberStyle && opts.showSwitcher) {
        try {
          localStorage.setItem('edgeone_links_style', styleName);
        } catch (e) {}
      }

      mountEl.querySelectorAll('.style-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.style === styleName);
      });

      const gridBox = mountEl.querySelector('#links-grid-box');
      if (gridBox) {
        gridBox.className = `links-grid style-${styleName}`;
      }
    }

    try {
      // 简单跨域请求，零预检损耗
      const res = await fetch(`${opts.api}/api/public/links?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // 1. 渲染博客联盟
      if (opts.showUnions) {
        const uBox = mountEl.querySelector('#unions-container');
        const uCount = mountEl.querySelector('#unions-count');
        const unions = data.unions || [];
        if (uCount) uCount.textContent = unions.length;

        if (uBox && unions.length > 0) {
          uBox.innerHTML = unions.map(function (union) {
            const lightIcon = resolveAssetUrl(union.iconLight || union.iconDark || '');
            const darkIcon = resolveAssetUrl(union.iconDark || union.iconLight || '');
            const websiteIcon = resolveAssetUrl(union.websiteIcon || '');
            const hasBadge = !!(lightIcon || darkIcon);
            const hasBothThemes = !!(lightIcon && darkIcon && lightIcon !== darkIcon);

            return `
              <a href="${escapeHtml(union.url)}" target="${escapeHtml(opts.target)}" rel="${escapeHtml(opts.rel)}" title="${escapeHtml(union.name)}" class="union-badge">
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
          }).join('');
        } else if (uBox) {
          uBox.innerHTML = '<div class="empty-box">暂未加入博客联盟</div>';
        }
      }

      // 2. 渲染友情链接
      if (opts.showLinks) {
        const lBox = mountEl.querySelector('#links-grid-box');
        const lCount = mountEl.querySelector('#links-count');
        let rawLinks = (data.links || []).slice();

        // 置顶链接始终在最前面按 order 排序
        const pinnedList = rawLinks.filter(function (l) { return Boolean(l.pinned || l.isTop); });
        const normalList = rawLinks.filter(function (l) { return !Boolean(l.pinned || l.isTop); });

        pinnedList.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });

        if (opts.shuffle) {
          normalList.sort(function () { return Math.random() - 0.5; });
        } else {
          normalList.sort(function (a, b) { return (a.order || 999) - (b.order || 999); });
        }

        rawLinks = pinnedList.concat(normalList);

        // 数量限制
        if (opts.limit > 0 && rawLinks.length > opts.limit) {
          rawLinks = rawLinks.slice(0, opts.limit);
        }

        if (lCount) lCount.textContent = rawLinks.length;

        if (lBox && rawLinks.length > 0) {
          lBox.innerHTML = rawLinks.map(function (link) {
            const rawAvatar = link.avatar || link.avatarUrl || '';
            const rawFavicon = link.favicon || '';
            const avatarSrc = resolveAssetUrl(rawAvatar || rawFavicon || '/favicon.ico');
            const faviconSrc = resolveAssetUrl(rawFavicon);
            const displayUrl = formatDisplayUrl(link.url);

            let healthDotHtml = '';
            if (opts.showHealth && link.health) {
              const h = link.health;
              const httpCode = h.httpCode || 0;
              const isHealthy = httpCode >= 200 && httpCode < 400;
              const dotStatus = isHealthy ? 'healthy' : 'error';
              const titleText = httpCode ? `Code ${httpCode}` : 'Code 异常';
              healthDotHtml = `<span class="health-indicator status-${dotStatus}" data-tooltip="${escapeHtml(titleText)}"></span>`;
            }

            let sslLockHtml = '';
            if (link.health) {
              const isSslValid = Boolean(link.health.sslValid && (link.health.sslDays === null || link.health.sslDays > 0));
              const sslClass = isSslValid ? 'valid' : 'invalid';
              const sslTitle = isSslValid ? 'SSL 证书有效' : 'SSL 证书无效或已过期';
              sslLockHtml = `<svg class="ssl-lock-icon ${sslClass}" width="13" height="13" viewBox="0 0 24 24" title="${sslTitle}"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
            } else if (link.url) {
              const isHttps = link.url.toLowerCase().startsWith('https://') || !link.url.toLowerCase().startsWith('http://');
              const sslClass = isHttps ? 'valid' : 'invalid';
              const sslTitle = isHttps ? 'SSL 证书有效' : '无 SSL 证书';
              sslLockHtml = `<svg class="ssl-lock-icon ${sslClass}" width="13" height="13" viewBox="0 0 24 24" title="${sslTitle}"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`;
            }

            let domainExpiredHtml = '';
            if (link.health && typeof link.health.domainDays === 'number' && link.health.domainDays <= 0) {
              domainExpiredHtml = `<svg class="domain-expired-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" title="域名已过期"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            }

            return `
              <a href="${escapeHtml(link.url)}" target="${escapeHtml(opts.target)}" rel="${escapeHtml(opts.rel)}" class="link-card" id="link-card-${escapeHtml(link.id)}">
                ${healthDotHtml}
                <div class="card-top">
                  <div class="link-avatar-wrap">
                    <img class="link-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(link.title)}" loading="lazy" onerror="this.onerror=null;this.src='${opts.api}/favicon.ico';">
                    ${faviconSrc && rawAvatar ? `<img class="link-favicon-mini" src="${escapeHtml(faviconSrc)}" alt="" loading="lazy">` : ''}
                  </div>
                  <div class="link-title-group">
                    <div class="link-title" title="${escapeHtml(link.title)}">
                      ${faviconSrc ? `<img class="link-title-favicon" src="${escapeHtml(faviconSrc)}" alt="" loading="lazy">` : ''}
                      <span>${escapeHtml(link.title)}</span>
                      ${Boolean(link.pinned || link.isTop) ? `<span class="link-pinned-badge" title="置顶链接">置顶</span>` : ''}
                    </div>
                    <div class="link-meta">
                      ${link.author ? `<span class="link-author">@${escapeHtml(link.author)}</span>` : ''}
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
          }).join('');

          // 绑定风格切换按钮事件
          if (opts.showSwitcher) {
            mountEl.querySelectorAll('.style-btn').forEach(function (btn) {
              btn.addEventListener('click', function () {
                applyStyle(btn.dataset.style);
              });
            });
          }

          // 应用初始/持久化风格
          applyStyle(currentStyle);

        } else if (lBox) {
          lBox.innerHTML = '<div class="empty-box">暂未添加友情链接</div>';
        }
      }

    } catch (err) {
      console.error('[EdgeOne Links] 加载数据失败:', err);
      const lBox = mountEl.querySelector('#links-grid-box') || mountEl.querySelector('#unions-container');
      if (lBox) {
        lBox.innerHTML = '<div class="empty-box">加载链接数据失败，请检查网络或稍后刷新重试</div>';
      }
    }
  }

  // 暴露全局 API
  window.EdgeOneLinks = {
    init: mount,
    mount: mount
  };

  // 自动检测并初始化（若页面中存在容器元素）
  function autoInit() {
    const defaultEl = getContainer();
    if (defaultEl) {
      mount();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
