// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ Allow requests from all origins (important for GitHub frontend)
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is Running Successfully!");
});

// 🎯 Main endpoint: /extract?v=VIDEO_ID
app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ error: "Missing video ID" });

  try {
    // Fetch YouTube HTML
    const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await ytRes.text();

    // Extract tags from <meta name="keywords">
    const metaMatch = html.match(/<meta name="keywords" content="([^"]+)">/i);
    let tags = [];
    if (metaMatch) {
      tags = metaMatch[1].split(",").map(t => t.trim());
    }

    // Backup: from ytInitialPlayerResponse JSON
    if (!tags.length) {
      const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;/s);
      if (jsonMatch) {
        const obj = JSON.parse(jsonMatch[1]);
        if (obj.videoDetails && obj.videoDetails.keywords) {
          tags = obj.videoDetails.keywords;
        }
      }
    }

    // Fallback: generate keywords from description
    if (!tags.length) {
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      if (descMatch) {
        const words = descMatch[1]
          .split(/[^A-Za-z0-9]+/)
          .map(w => w.trim())
          .filter(Boolean);
        tags = Array.from(new Set(words)).slice(0, 25);
      }
    }

    if (!tags.length) {
      return res.json({ message: "No tags found for this video", tags: [] });
    }

    return res.json({ videoId, tags });
  } catch (err) {
    console.error("Error extracting tags:", err);
    return res.status(500).json({ error: "Failed to extract tags" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
