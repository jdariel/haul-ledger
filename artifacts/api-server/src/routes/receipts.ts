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

    let objectPath: string | null = null;
    try {
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      const gcsUrl = uploadURL;
      await fetch(gcsUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: imageBuffer,
      });
    } catch (uploadErr) {
      console.error("Receipt upload to storage failed:", uploadErr);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a receipt parser for a trucking expense tracker. Extract the following from the receipt image and return ONLY valid JSON with no markdown or explanation:
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD format or null",
  "amount": number or null,
  "category": "one of: Fuel, Maintenance, Lumper, Tolls, Parking, Scale Fee, Other",
  "gallons": number or null (only for fuel receipts),
  "pricePerGallon": number or null (only for fuel receipts),
  "jurisdiction": "state abbreviation or null (only for fuel receipts)"
}
If a field is not visible or not applicable, use null. category must be one of the listed options.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

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
  } catch (err) {
    console.error("Receipt processing error:", err);
    res.status(500).json({ error: "Failed to process receipt" });
  }
});

export default router;
