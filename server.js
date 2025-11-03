import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ Enable CORS globally
app.use(cors({ origin: "*", methods: ["GET"] }));

// ✅ Default route to check if API is running
app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is running successfully on Vercel!");
});

// ✅ Main route for extracting tags
app.get("/extract", async (req, res) => {
  try {
    const videoId = req.query.v;
    if (!videoId) {
      return res.status(400).json({ ok: false, error: "Missing video ID" });
    }

    const youtubeURL = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(youtubeURL, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      return res.status(500).json({ ok: false, error: "Failed to fetch YouTube page" });
    }

    const html = await response.text();

    // 🔍 Extract tags from <meta name="keywords">
    const metaMatch = html.match(/<meta name="keywords" content="([^"]+)">/i);
    if (metaMatch) {
      const tags = metaMatch[1].split(",").map((t) => t.trim());
      return res.json({ ok: true, tags });
    }

    // 🔍 Extract tags from ytInitialPlayerResponse JSON
    const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const tags = data.videoDetails?.keywords || [];
        return res.json({ ok: true, tags });
      } catch (err) {
        console.error("JSON parse error:", err);
      }
    }

    res.json({ ok: false, error: "No tags found" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

// ✅ Required for Vercel serverless
export default app;
