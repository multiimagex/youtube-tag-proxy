// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors()); // ✅ Allow all origins (for GitHub frontend)

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ error: "Missing video ID" });

  try {
    // Fetch HTML from YouTube
    const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await ytRes.text();

    // Extract <meta name="keywords">
    const metaMatch = html.match(/<meta name="keywords" content="([^"]+)">/i);
    let tags = [];
    if (metaMatch) {
      tags = metaMatch[1].split(",").map((t) => t.trim());
    }

    // Backup: from JSON data
    if (!tags.length) {
      const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;/s);
      if (jsonMatch) {
        const obj = JSON.parse(jsonMatch[1]);
        if (obj.videoDetails && obj.videoDetails.keywords) {
          tags = obj.videoDetails.keywords;
        }
      }
    }

    // Fallback: og:description keywords
    if (!tags.length) {
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      if (descMatch) {
        tags = Array.from(
          new Set(
            descMatch[1]
              .split(/[^A-Za-z0-9]+/)
              .map((w) => w.trim())
              .filter(Boolean)
          )
        ).slice(0, 25);
      }
    }

    if (!tags.length) {
      return res.json({ message: "No tags found for this video", tags: [] });
    }

    return res.json({ videoId, tags });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to extract tags" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
