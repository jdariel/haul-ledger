import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateMiles(points: Array<{ lat: number; lon: number }>): number {
  let totalKm = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    totalKm += haversineKm(points[i].lat, points[i].lon, points[i + 1].lat, points[i + 1].lon);
  }
  const CIRCUITY = 1.25;
  return Math.round(totalKm * 0.621371 * CIRCUITY);
}

router.get("/geocode", requireAuth, async (req, res) => {
  const q = req.query.q as string;
  if (!q?.trim()) return res.status(400).json({ error: "Missing query" });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "HaulLedger/1.0 (server-proxy)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
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
    const points = coords.split(";").map(pair => {
      const [lon, lat] = pair.split(",").map(Number);
      return { lat, lon };
    });

    if (points.length < 2 || points.some(p => isNaN(p.lat) || isNaN(p.lon))) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const miles = estimateMiles(points);
    return res.json({ miles, estimated: true });
  } catch (err) {
    return res.status(500).json({ error: "Route calculation failed" });
  }
});

export default router;
