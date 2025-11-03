// server.js  (improved, debug friendly)
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("✅ YouTube Tag Proxy is Running Successfully!"));

function safeJSONParse(s) {
  try { return JSON.parse(s); } catch(e){ return null; }
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ ok:false, error: "Missing video ID" });

  try {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    // Use a standard UA to avoid bot blocks
    const resp = await fetchWithTimeout(ytUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, 15000);

    if (!resp.ok) {
      const status = resp.status;
      const text = await resp.text().catch(()=>"");
      console.error("YouTube fetch failed:", status);
      return res.status(502).json({ ok:false, error: "Failed to fetch YouTube page", status, bodySample: text.slice(0,1000) });
    }

    const html = await resp.text();

    // 1) meta keywords
    const metaMatch = html.match(/<meta name=["']keywords["'] content=["']([^"']+)["']/i);
    let tags = [];
    if (metaMatch) {
      tags = metaMatch[1].split(",").map(t => t.trim()).filter(Boolean);
    }

    // 2) ytInitialPlayerResponse JSON
    if (!tags.length) {
      const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;/s);
      if (jsonMatch) {
        const parsed = safeJSONParse(jsonMatch[1]);
        if (parsed?.videoDetails?.keywords) tags = parsed.videoDetails.keywords;
      }
    }

    // 3) og:description fallback
    if (!tags.length) {
      const descMatch = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);
      if (descMatch) {
        const words = descMatch[1].split(/[^A-Za-z0-9#]+/).map(w => w.trim()).filter(Boolean);
        tags = Array.from(new Set(words)).slice(0, 30);
      }
    }

    // Final response
    return res.json({ ok:true, videoId, tags, count: tags.length });
  } catch (err) {
    console.error("Exception in /extract:", err && err.message ? err.message : err);
    // Return helpful error info (not stack) so frontend can display it
    return res.status(500).json({ ok:false, error: "Server error", message: String(err && err.message ? err.message : err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
