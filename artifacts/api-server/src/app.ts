import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalLimiter } from "./middleware/rateLimits";
import router from "./routes";

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

app.use("/api", router);

export default app;
