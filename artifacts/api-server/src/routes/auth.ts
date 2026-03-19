import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "haul-ledger-dev-secret-key-2025";
const JWT_EXPIRES = "30d";

function signToken(payload: { id: number; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

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
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
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

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/verify-identity  — checks email + full name match before allowing reset
router.post("/verify-identity", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email and full name are required." });
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    // Use the same generic message whether the email is unknown or the name doesn't match
    // so we don't reveal which field is wrong
    const nameMatches = user && user.name.toLowerCase().trim() === name.toLowerCase().trim();
    if (!user || !nameMatches) {
      return res.status(401).json({ error: "The name and email you entered don't match our records." });
    }

    res.json({ verified: true });
  } catch {
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/auth/reset-password  — requires email + name verification before resetting
router.post("/reset-password", async (req, res) => {
  try {
    const { email, name, newPassword } = req.body;
    if (!email || !name || !newPassword) {
      return res.status(400).json({ error: "Email, name, and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    const nameMatches = user && user.name.toLowerCase().trim() === name.toLowerCase().trim();
    if (!user || !nameMatches) {
      return res.status(401).json({ error: "The name and email you entered don't match our records." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, user.id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
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
