import { Router } from "express";

const router = Router();

router.post("/process", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    res.json({
      merchant: null,
      date: null,
      amount: null,
      gallons: null,
      pricePerGallon: null,
      jurisdiction: null,
      category: null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process receipt" });
  }
});

export default router;
