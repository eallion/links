import { getSettings, saveSettings } from "../_storage.js";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  generateTurnstileTicket,
  verifyTurnstileTicket
} from "../_auth.js";

async function verifyTurnstile(token, secret, clientIp) {
  if (!token) return false;
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    if (clientIp) formData.append("remoteip", clientIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const outcome = await res.json();
    return !!outcome.success;
  } catch (err) {
    console.error("Turnstile verify network error:", err);
    return false;
  }
}

// GET /api/admin/auth: returns public auth config (such as Turnstile site key & enabled status)
export async function onRequestGet(context) {
  try {
    const settings = await getSettings();
    // System setting strictly decides whether turnstile is enabled
    const turnstileEnabled = Boolean(settings.turnstileEnabled);
    const siteKey = settings.turnstileSiteKey || context.env?.TURNSTILE_SITE_KEY || process.env?.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
    return Response.json({
      turnstileEnabled,
      turnstileSiteKey: siteKey
    });
  } catch {
    return Response.json({ turnstileEnabled: false, turnstileSiteKey: "1x00000000000000000000AA" });
  }
}

export async function onRequestPost(context) {
  const { request, env, clientIp } = context;

  try {
    const body = await request.json();
    const action = body.action || "login";
    const settings = await getSettings();
    const isTurnstileEnabled = Boolean(settings.turnstileEnabled);
    const secretKey = settings.turnstileSecretKey || env?.TURNSTILE_SECRET_KEY || process.env?.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";

    // Action: exchange turnstile token for ticket
    if (action === "turnstile-verify") {
      if (!isTurnstileEnabled) {
        return Response.json({ success: true, turnstileTicket: "bypass" });
      }
      const turnstileToken = body.turnstileToken || body["cf-turnstile-response"];
      const isValid = await verifyTurnstile(turnstileToken, secretKey, clientIp);
      if (isValid) {
        const ticket = generateTurnstileTicket(secretKey);
        return Response.json({ success: true, turnstileTicket: ticket });
      }
      return Response.json({ error: "Turnstile 验证无效或已过期" }, { status: 400 });
    }

    if (action === "login") {
      const { password } = body;
      const turnstileToken = body.turnstileToken || body["cf-turnstile-response"];
      const turnstileTicket = body.turnstileTicket || "";

      let isHumanVerified = !isTurnstileEnabled; // If Turnstile is disabled in system settings, bypass
      let activeTicket = "";

      if (isTurnstileEnabled) {
        // 1. Check if user already holds a valid Turnstile ticket (< 10 min)
        if (turnstileTicket && verifyTurnstileTicket(turnstileTicket, secretKey)) {
          isHumanVerified = true;
          activeTicket = turnstileTicket;
        } else if (turnstileToken) {
          // 2. Otherwise verify with Cloudflare Turnstile API
          const isValid = await verifyTurnstile(turnstileToken, secretKey, clientIp);
          if (isValid) {
            isHumanVerified = true;
            activeTicket = generateTurnstileTicket(secretKey);
          }
        }

        if (!isHumanVerified) {
          return Response.json({ error: "请先完成 Cloudflare Turnstile 人机验证" }, { status: 400 });
        }
      }

      if (!password) {
        return Response.json({
          error: "请输入管理密码",
          turnstileTicket: activeTicket
        }, { status: 400 });
      }

      // Check environment variables ADMIN_SECRET_KEY / ADMIN_PASSWORD / ADMIN_KEY
      const envSecret = (
        env?.ADMIN_SECRET_KEY ||
        process.env?.ADMIN_SECRET_KEY ||
        env?.ADMIN_PASSWORD ||
        process.env?.ADMIN_PASSWORD ||
        env?.ADMIN_KEY ||
        process.env?.ADMIN_KEY ||
        ""
      ).trim();

      const isMatch = verifyPassword(password, settings.adminPasswordHash, envSecret);

      if (!isMatch) {
        return Response.json({
          error: "密码错误，请核对后重试",
          turnstileTicket: activeTicket // Return active ticket so frontend does not need to re-verify Turnstile!
        }, { status: 401 });
      }

      const activeHash = hashPassword(password.trim());
      const token = generateToken(activeHash);
      return Response.json({
        success: true,
        token,
        message: "Login successful"
      });
    }

    if (action === "verify") {
      const auth = await requireAuth(context);
      if (!auth.authorized) {
        return auth.response;
      }
      return Response.json({
        success: true,
        valid: true
      });
    }

    if (action === "change-password") {
      const auth = await requireAuth(context);
      if (!auth.authorized) {
        return auth.response;
      }

      const { oldPassword, newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return Response.json({ error: "新密码长度不得少于 6 位" }, { status: 400 });
      }

      const envSecret = (
        env?.ADMIN_SECRET_KEY ||
        process.env?.ADMIN_SECRET_KEY ||
        env?.ADMIN_PASSWORD ||
        process.env?.ADMIN_PASSWORD ||
        env?.ADMIN_KEY ||
        process.env?.ADMIN_KEY ||
        ""
      ).trim();

      const isOldMatch = verifyPassword(oldPassword, settings.adminPasswordHash, envSecret);

      if (!isOldMatch) {
        return Response.json({ error: "原密码不正确" }, { status: 400 });
      }

      const newHash = hashPassword(newPassword.trim());
      settings.adminPasswordHash = newHash;
      settings.updatedAt = Date.now();
      await saveSettings(settings);

      const newToken = generateToken(newHash);
      return Response.json({
        success: true,
        token: newToken,
        message: "Password changed successfully"
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: "Auth operation failed: " + err.message }, { status: 500 });
  }
}
