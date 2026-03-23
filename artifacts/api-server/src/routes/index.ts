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

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use("/auth", authRouter);
router.use(storageRouter); // Receipt image serving — objects protected by ACL
router.use("/admin", adminRouter); // Admin endpoints — protected by ADMIN_SECRET

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
router.use("/ifta", requireAuth, iftaRouter);
router.use("/export", requireAuth, exportRouter);

export default router;
