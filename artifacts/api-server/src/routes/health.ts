import { Router, type IRouter } from "express";
import { config } from "../config";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", minVersion: config.minAppVersion });
});

export default router;
