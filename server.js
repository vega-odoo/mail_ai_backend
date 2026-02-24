import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const HUGGINGFACE_KEY = process.env.HUGGINGFACE_KEY;

// Rewrite + Translate endpoint
app.post("/process", async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: "Missing parameters" });

    // Hugging Face rewrite
    const hfResp = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-large",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + HUGGINGFACE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: "Rewrite this email professionally:\n\n" + text }),
      }
    );
    const hfData = await hfResp.json();
    const rewritten = Array.isArray(hfData) && hfData[0]?.generated_text
      ? hfData[0].generated_text
      : text;

    // LibreTranslate translation
    const ltResp = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: rewritten, source: "en", target: targetLang, format: "text" }),
    });
    const ltData = await ltResp.json();
    const translated = ltData.translatedText || rewritten;

    res.json({ rewritten, translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Backend running on port ${process.env.PORT || 3000}`);
});