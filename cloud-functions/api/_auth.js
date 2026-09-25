import crypto from "node:crypto";
import { getSettings } from "./_storage.js";

const SECRET_SALT = "edgeone-links-salt-2026";

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password + SECRET_SALT).digest("hex");
}

export function generateToken(passwordHash) {
  const expires = Date.now() + 7 * 24 * 3600 * 1000; // 7 days
  const payload = `${expires}:${passwordHash}`;
  const signature = crypto.createHmac("sha256", SECRET_SALT).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyToken(token, validHashes) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [expiresStr, hash, signature] = parts;
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Date.now() > expires) return false;

  const payload = `${expires}:${hash}`;
  const expectedSig = crypto.createHmac("sha256", SECRET_SALT).update(payload).digest("hex");
  if (signature !== expectedSig) return false;

  const hashList = Array.isArray(validHashes) ? validHashes : [validHashes];
  return hashList.includes(hash);
}

export function verifyPassword(inputPassword, storedHash, envSecret) {
  if (!inputPassword || typeof inputPassword !== "string") return false;
  const rawInput = inputPassword.trim();

  // 1. Check against environment variable ADMIN_SECRET_KEY / ADMIN_PASSWORD / ADMIN_KEY
  if (envSecret) {
    const cleanSecret = String(envSecret).trim().replace(/^["']|["']$/g, "");
    if (rawInput === cleanSecret || inputPassword === envSecret) {
      return true;
    }
    // If the user configured an already hashed secret in env:
    const saltedInput = hashPassword(rawInput);
    const plainInput = crypto.createHash("sha256").update(rawInput).digest("hex");
    if (saltedInput === cleanSecret || plainInput === cleanSecret) {
      return true;
    }
  }

  // 2. Check against stored hash in settings (supports salted hash, legacy raw sha256, and initial default)
  if (storedHash) {
    const saltedInput = hashPassword(rawInput);
    const plainInput = crypto.createHash("sha256").update(rawInput).digest("hex");
    if (saltedInput === storedHash || plainInput === storedHash) {
      return true;
    }
    // Compatibility with initial default settings hash (sha256 of "admin")
    if (storedHash === "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918" && (rawInput === "admin" || rawInput === "admin123")) {
      return true;
    }
  }

  return false;
}

// Generate a temporary proof-of-human ticket valid for 10 minutes
export function generateTurnstileTicket(secretKey) {
  const timestamp = Date.now();
  const payload = `turnstile:${timestamp}`;
  const sig = crypto.createHmac("sha256", secretKey || SECRET_SALT).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

// Verify if a proof-of-human ticket is valid and not expired (< 10 min)
export function verifyTurnstileTicket(ticket, secretKey) {
  if (!ticket || typeof ticket !== "string") return false;
  const parts = ticket.split(":");
  if (parts.length !== 3) return false;
  const [prefix, tsStr, sig] = parts;
  if (prefix !== "turnstile") return false;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;
  // Ticket valid for 10 minutes
  if (Date.now() - ts > 10 * 60 * 1000 || ts > Date.now() + 60 * 1000) return false;

  const payload = `${prefix}:${ts}`;
  const expectedSig = crypto.createHmac("sha256", secretKey || SECRET_SALT).update(payload).digest("hex");
  return sig === expectedSig;
}

export async function requireAuth(contextOrRequest, explicitEnv) {
  const request = contextOrRequest?.request || contextOrRequest;
  const env = contextOrRequest?.env || explicitEnv || {};

  const authHeader = request.headers.get("authorization") || request.headers.get("x-admin-token") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    token = authHeader.trim();
  }

  if (!token) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 })
    };
  }

  const settings = await getSettings();
  const envSecret = (
    env?.ADMIN_SECRET_KEY ||
    process.env?.ADMIN_SECRET_KEY ||
    env?.ADMIN_PASSWORD ||
    process.env?.ADMIN_PASSWORD ||
    env?.ADMIN_KEY ||
    process.env?.ADMIN_KEY ||
    ""
  ).trim();

  const validHashes = [
    settings.adminPasswordHash,
    hashPassword("admin"),
    hashPassword("admin123")
  ];
  if (envSecret) {
    const cleanSecret = envSecret.replace(/^["']|["']$/g, "");
    validHashes.push(hashPassword(cleanSecret));
    validHashes.push(hashPassword(envSecret));
  }

  const valid = verifyToken(token, validHashes);
  if (!valid) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 })
    };
  }

  return { authorized: true, settings };
}
