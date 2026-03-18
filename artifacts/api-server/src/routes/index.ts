import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/expenses", expensesRouter);
router.use("/income", incomeRouter);
router.use("/fuel-entries", fuelRouter);
router.use("/trips", tripsRouter);
router.use("/assets", assetsRouter);
router.use("/saved-routes", savedRoutesRouter);
router.use("/quick-expenses", quickExpensesRouter);
router.use("/summary", summaryRouter);
router.use("/receipts", receiptsRouter);

export default router;
