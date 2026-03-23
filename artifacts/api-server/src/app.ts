import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalLimiter } from "./middleware/rateLimits";
import router from "./routes";
import { Sentry } from "./lib/sentry";

const app: Express = express();

// Trust Replit's reverse proxy so rate limiting works on real client IPs
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Mobile apps don't send Origin; browser preview uses same domain
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Global rate limiting ──────────────────────────────────────────────────────
app.use(globalLimiter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Sentry error handler — MUST come after all routes ────────────────────────
// Captures unhandled errors and sends them to Sentry with full request context
Sentry.setupExpressErrorHandler(app);

export default app;
