import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/geocode", requireAuth, async (req, res) => {
  const q = req.query.q as string;
  if (!q?.trim()) return res.status(400).json({ error: "Missing query" });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "HaulLedger/1.0 (server-proxy)",
        "Accept": "application/json",
      },
    });
    if (!resp.ok) return res.status(502).json({ error: "Geocode service error" });
    const data = await resp.json() as Array<{ lat: string; lon: string }>;
    if (!data?.length) return res.json({ result: null });
    return res.json({ result: { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } });
  } catch (err) {
    return res.status(502).json({ error: "Geocode fetch failed" });
  }
});

router.get("/route", requireAuth, async (req, res) => {
  const coords = req.query.coords as string;
  if (!coords?.trim()) return res.status(400).json({ error: "Missing coords" });

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "HaulLedger/1.0 (server-proxy)" },
    });
    if (!resp.ok) return res.status(502).json({ error: "Route service error" });
    const data = await resp.json() as { code: string; routes?: Array<{ distance: number }> };
    if (data.code !== "Ok" || !data.routes?.length) return res.json({ miles: null });
    const miles = Math.round(data.routes[0].distance * 0.000621371);
    return res.json({ miles });
  } catch (err) {
    return res.status(502).json({ error: "Route fetch failed" });
  }
});

export default router;
