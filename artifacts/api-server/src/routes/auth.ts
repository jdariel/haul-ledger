import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import {
  db, usersTable, expensesTable, incomeTable, tripsTable,
  fuelEntriesTable, assetsTable, savedRoutesTable, quickExpensesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { authLimiter } from "../middleware/rateLimits";
import { requireAuth } from "../middleware/auth";
import { config } from "../config";

const router = Router();

const { jwtSecret: JWT_SECRET, resendApiKey } = config;
const JWT_EXPIRES = "30d";
const MIN_PASSWORD_LENGTH = 8;
const FROM_EMAIL = "HaulLedger <onboarding@resend.dev>";

function getResend() {
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(resendApiKey);
}

function signToken(payload: { id: number; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function sanitizeEmail(email: unknown): string {
  if (typeof email !== "string") throw new Error("Invalid email.");
  return email.trim().toLowerCase();
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── In-memory OTP + reset token stores ───────────────────────────────────────

interface OtpEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

interface ResetEntry {
  email: string;
  expiresAt: Date;
}

const otpStore = new Map<string, OtpEntry>();
const resetStore = new Map<string, ResetEntry>();

setInterval(() => {
  const now = new Date();
  for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
  for (const [k, v] of resetStore) if (v.expiresAt < now) resetStore.delete(k);
}, 10 * 60 * 1000);

// Cryptographically secure 6-digit OTP
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ── Auth routes ───────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, password } = req.body;
    let email: string;
    try { email = sanitizeEmail(req.body.email); } catch {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ name: name.trim(), email, passwordHash })
      .returning();

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    let email: string;
    try { email = sanitizeEmail(req.body.email); } catch {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    // Use constant-time compare even on not-found to prevent timing attacks
    const dummyHash = "$2b$12$notarealhashatallXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    let email: string;
    try { email = sanitizeEmail(req.body.email); } catch {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    // Always return success to prevent email enumeration
    if (!user) return res.json({ sent: true });

    // Rate-limit: block if sent < 60s ago
    const existing = otpStore.get(email);
    const now = new Date();
    if (existing && existing.expiresAt > now) {
      const ageMs = 15 * 60 * 1000 - (existing.expiresAt.getTime() - now.getTime());
      if (ageMs < 60_000) {
        return res.status(429).json({ error: "Please wait a moment before requesting another code." });
      }
    }

    const code = generateOtp();
    otpStore.set(email, { code, expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 });

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your HaulLedger password reset code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#3b82f6;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-1px">HL</span>
          </div>
          <h2 style="color:#111;margin:0 0 8px">Password Reset Code</h2>
          <p style="color:#666;margin:0 0 24px">Hi ${user.name}, use the code below to reset your HaulLedger password. It expires in <strong>15 minutes</strong>.</p>
          <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#111">${code}</span>
          </div>
          <p style="color:#999;font-size:13px">If you didn't request this, you can safely ignore this email. Your password will not be changed.</p>
        </div>
      `,
    });

    res.json({ sent: true });
  } catch {
    res.status(500).json({ error: "Failed to send reset code. Please try again." });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", authLimiter, async (req, res) => {
  try {
    let email: string;
    try { email = sanitizeEmail(req.body.email); } catch {
      return res.status(400).json({ error: "Email and code are required." });
    }
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Email and code are required." });

    const entry = otpStore.get(email);
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(entry.code);
    const received = Buffer.from(code.trim().padEnd(entry.code.length));
    const match = expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!match) {
      const remaining = 5 - entry.attempts;
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    otpStore.delete(email);
    const resetToken = crypto.randomBytes(32).toString("hex");
    resetStore.set(resetToken, { email, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    res.json({ resetToken });
  } catch {
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const entry = resetStore.get(resetToken);
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ error: "This reset link has expired. Please start over." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, entry.email));
    if (!user) return res.status(404).json({ error: "Account not found." });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
    resetStore.delete(resetToken);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// PATCH /api/auth/profile — update display name
router.patch("/profile", requireAuth, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters." });
    return;
  }
  try {
    const [updated] = await db
      .update(usersTable)
      .set({ name: name.trim() })
      .where(eq(usersTable.id, req.user!.id))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
    if (!updated) { res.status(404).json({ error: "User not found." }); return; }
    const newToken = signToken({ id: updated.id, email: updated.email, name: updated.name });
    res.json({ token: newToken, user: updated });
  } catch (err) {
    console.error("profile update error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// PATCH /api/auth/push-token — register or clear the device's Expo push token
router.patch("/push-token", requireAuth, async (req, res) => {
  const { token } = req.body as { token?: string | null };
  if (token !== null && token !== undefined && typeof token !== "string") {
    res.status(400).json({ error: "token must be a string or null" });
    return;
  }
  const value = typeof token === "string" && token.trim().length > 0
    ? token.trim()
    : null;
  try {
    await db
      .update(usersTable)
      .set({ expoPushToken: value })
      .where(eq(usersTable.id, req.user!.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("push-token update error:", err);
    res.status(500).json({ error: "Failed to update push token" });
  }
});

// PATCH /api/auth/change-password
router.patch("/change-password", requireAuth, authLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required." });
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from your current password." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) return res.status(404).json({ error: "User not found." });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

    res.json({ message: "Password updated successfully." });
  } catch {
    res.status(500).json({ error: "Failed to change password. Please try again." });
  }
});

router.delete("/me", requireAuth, async (req, res) => {
  const uid = req.user!.id;
  try {
    // Delete child records first to satisfy FK constraints
    await db.delete(quickExpensesTable).where(eq(quickExpensesTable.userId, uid));
    await db.delete(savedRoutesTable).where(eq(savedRoutesTable.userId, uid));
    await db.delete(assetsTable).where(eq(assetsTable.userId, uid));
    await db.delete(fuelEntriesTable).where(eq(fuelEntriesTable.userId, uid));
    await db.delete(tripsTable).where(eq(tripsTable.userId, uid));
    await db.delete(incomeTable).where(eq(incomeTable.userId, uid));
    await db.delete(expensesTable).where(eq(expensesTable.userId, uid));
    // Finally delete the user account itself
    await db.delete(usersTable).where(eq(usersTable.id, uid));
    res.status(204).send();
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

export default router;
