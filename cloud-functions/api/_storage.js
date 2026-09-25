import { getStore } from "@edgeone/pages-blob";

export const STORE_NAME = "links_store";

export function getLinksStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

// Default initial data when Blob is empty (no sample data)
export const DEFAULT_LINKS = [];

export const DEFAULT_UNIONS = [];

export const DEFAULT_SETTINGS = {
  siteTitle: "友情链接",
  siteDescription: "连接彼此，共享价值",
  gravatarMirror: "gravatar.bluecdn.com",
  favicon: "",
  adminPasswordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // default: admin123
  turnstileEnabled: false,
  turnstileSiteKey: "1x00000000000000000000AA", // Cloudflare test sitekey (always passes)
  turnstileSecretKey: "1x0000000000000000000000000000000AA", // Cloudflare test secret key
  updatedAt: 1711360000000
};

export async function getLinks() {
  try {
    const store = getLinksStore();
    let data = await store.get("data/links.json", { type: "json", consistency: "strong" });
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {}
    }
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.filter(item => !item.id?.startsWith("link-default-"));
  } catch (err) {
    console.error("getLinks error:", err);
    return [];
  }
}

export async function saveLinks(links) {
  const store = getLinksStore();
  await store.setJSON("data/links.json", links);
}

export async function getUnions() {
  try {
    const store = getLinksStore();
    let data = await store.get("data/unions.json", { type: "json", consistency: "strong" });
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {}
    }
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.filter(item => !item.id?.startsWith("union-default-"));
  } catch (err) {
    console.error("getUnions error:", err);
    return [];
  }
}

export async function saveUnions(unions) {
  const store = getLinksStore();
  await store.setJSON("data/unions.json", unions);
}

export async function getSettings() {
  try {
    const store = getLinksStore();
    let data = await store.get("data/settings.json", { type: "json", consistency: "strong" });
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {}
    }
    if (!data) {
      return DEFAULT_SETTINGS;
    }
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      favicon: data.favicon || "",
      turnstileEnabled: Boolean(data.turnstileEnabled ?? DEFAULT_SETTINGS.turnstileEnabled)
    };
  } catch (err) {
    console.error("getSettings error:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings) {
  const store = getLinksStore();
  await store.setJSON("data/settings.json", settings);
}

export async function getHealthData() {
  try {
    const store = getLinksStore();
    let data = await store.get("data/health.json", { type: "json", consistency: "strong" });
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {}
    }
    if (!data || typeof data !== "object") {
      return {};
    }
    return data;
  } catch (err) {
    console.error("getHealthData error:", err);
    return {};
  }
}

export async function saveHealthData(healthData) {
  const store = getLinksStore();
  await store.setJSON("data/health.json", healthData);
}

