import { Router } from "express";
import OpenAI from "openai";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const objectStorageService = new ObjectStorageService();

router.post("/upload-url", async (req, res) => {
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    console.error("Upload URL error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/process", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    // Run GCS upload and AI parsing in parallel — don't let storage latency block the result
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const uploadPromise = objectStorageService.getObjectEntityUploadURL()
      .then(async (uploadURL) => {
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": mimeType },
          body: imageBuffer,
        });
        return objectPath;
      })
      .catch((err) => {
        console.error("Receipt upload to storage failed:", err);
        return null as string | null;
      });

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a receipt OCR parser for a trucking expense tracker. Extract fields from the receipt image and return ONLY a JSON object. Never return markdown, never add commentary. All keys must be present; use null when a value is absent or inapplicable.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Parse this receipt and return a JSON object with exactly these keys:
- merchant (string): business name shown on receipt, or null
- date (string): date in YYYY-MM-DD format, or null
- amount (number): total amount charged in USD (not subtotal), or null
- category (string): one of exactly ["Fuel","Maintenance","Lumper","Tolls","Parking","Scale Fee","Other"]
- gallons (number): gallons purchased — only for fuel receipts, otherwise null
- pricePerGallon (number): price per gallon — only for fuel receipts, otherwise null
- jurisdiction (string): 2-letter US state abbreviation where fuel was purchased — only for fuel, otherwise null

Return JSON only. No markdown fences.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    console.log("[receipts] GPT raw response:", content.slice(0, 300));
    let parsed: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (parseErr) {
      console.error("[receipts] JSON parse failed:", parseErr, "raw:", content);
      parsed = {};
    }

    // Collect the storage path — parallel upload may still be in-flight; wait for it now
    const objectPath = await uploadPromise;

    res.json({
      merchant: (parsed.merchant as string) ?? null,
      date: (parsed.date as string) ?? null,
      amount: (parsed.amount as number) ?? null,
      category: (parsed.category as string) ?? null,
      gallons: (parsed.gallons as number) ?? null,
      pricePerGallon: (parsed.pricePerGallon as number) ?? null,
      jurisdiction: (parsed.jurisdiction as string) ?? null,
      receiptUrl: objectPath,
    });
  } catch (err: unknown) {
    console.error("Receipt processing error:", err);
    const apiMessage =
      err && typeof err === "object" && "error" in err && err.error &&
      typeof err.error === "object" && "message" in err.error
        ? String((err.error as { message: unknown }).message)
        : null;
    const httpStatus = err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : 500;
    res.status(httpStatus >= 400 && httpStatus < 500 ? 422 : 500).json({
      error: apiMessage ?? "Failed to process receipt. Please try a clearer photo.",
    });
  }
});

export default router;
