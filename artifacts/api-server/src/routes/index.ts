import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import incomeRouter from "./income";
import fuelRouter from "./fuel";
import tripsRouter from "./trips";
import assetsRouter from "./assets";
import savedRoutesRouter from "./savedRoutes";
import quickExpensesRouter from "./quickExpenses";
import summaryRouter from "./summary";
import receiptsRouter from "./receipts";
import storageRouter from "./storage";
import iftaRouter from "./ifta";
import authRouter from "./auth";
import adminRouter from "./admin";
import exportRouter from "./export";
import fleetRouter from "./fleet";
import costSettingsRouter from "./cost-settings";
import geoRouter from "./geo";
import webhooksRouter from "./webhooks";
import { requirePro } from "../middleware/requirePro";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use("/auth", authRouter);
router.use(storageRouter); // Receipt image serving — objects protected by ACL
router.use("/admin", adminRouter); // Admin endpoints — protected by ADMIN_SECRET
router.use("/webhooks", webhooksRouter); // External webhooks (RevenueCat, etc.)

// Protected routes (JWT required)
router.use("/expenses", requireAuth, expensesRouter);
router.use("/income", requireAuth, incomeRouter);
router.use("/fuel-entries", requireAuth, fuelRouter);
router.use("/trips", requireAuth, tripsRouter);
router.use("/assets", requireAuth, assetsRouter);
router.use("/saved-routes", requireAuth, savedRoutesRouter);
router.use("/quick-expenses", requireAuth, quickExpensesRouter);
router.use("/summary", requireAuth, summaryRouter);
router.use("/receipts", requireAuth, receiptsRouter);
// Pro-only routes (JWT + Pro entitlement required)
router.use("/ifta", requireAuth, requirePro, iftaRouter);
router.use("/export", requireAuth, requirePro, exportRouter);
router.use("/fleet", requireAuth, requirePro, fleetRouter);
router.use("/cost-settings", requireAuth, requirePro, costSettingsRouter);
router.use("/geo", geoRouter);

export default router;
