import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "haul-ledger-dev-secret-key-2025";
const JWT_EXPIRES = "30d";

const FROM_EMAIL = "HaulLedger <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured. Connect Resend in the integrations panel.");
  return new Resend(key);
}

function signToken(payload: { id: number; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ── In-memory token stores (short-lived, no DB migration needed) ──────────────

interface OtpEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

interface ResetEntry {
  email: string;
  expiresAt: Date;
}

// email → OTP entry
const otpStore = new Map<string, OtpEntry>();
// resetToken → reset entry
const resetStore = new Map<string, ResetEntry>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
  for (const [k, v] of resetStore) if (v.expiresAt < now) resetStore.delete(k);
}, 10 * 60 * 1000);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Auth routes ───────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ name, email: email.toLowerCase(), passwordHash })
      .returning();

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/forgot-password  — sends a 6-digit OTP to the user's email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    // Always return success even if email not found — prevents email enumeration
    if (!user) {
      return res.json({ sent: true });
    }

    // Rate-limit: block if a valid OTP already exists and was sent < 60s ago
    const existing = otpStore.get(email.toLowerCase());
    const now = new Date();
    if (existing && existing.expiresAt > now) {
      const ageMs = 15 * 60 * 1000 - (existing.expiresAt.getTime() - now.getTime());
      if (ageMs < 60_000) {
        return res.status(429).json({ error: "Please wait a moment before requesting another code." });
      }
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    otpStore.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });

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
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ error: "Failed to send reset code. Please try again." });
  }
});

// POST /api/auth/verify-otp  — verifies the 6-digit code, returns a short-lived resetToken
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const entry = otpStore.get(email.toLowerCase());
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
    }

    if (entry.code !== code.trim()) {
      const remaining = 5 - entry.attempts;
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    // Code is correct — invalidate OTP and issue a one-time resetToken
    otpStore.delete(email.toLowerCase());
    const resetToken = crypto.randomBytes(32).toString("hex");
    resetStore.set(resetToken, { email: email.toLowerCase(), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    res.json({ resetToken });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// POST /api/auth/reset-password  — uses resetToken from verify-otp to set a new password
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const entry = resetStore.get(resetToken);
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ error: "This reset link has expired. Please start over." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, entry.email));
    if (!user) return res.status(404).json({ error: "Account not found." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

    // Invalidate the reset token so it can't be reused
    resetStore.delete(resetToken);

    res.json({ success: true });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

// GET /api/auth/me  (requires Authorization: Bearer <token>)
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; name: string };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id));
    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
