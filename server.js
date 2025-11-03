import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is running successfully on Vercel!");
});

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).json({ error: "Missing video ID" });
  }

  try {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(ytUrl);
    const text = await response.text();

    const metaMatch = text.match(/<meta name="keywords" content="([^"]+)">/i);
    if (metaMatch) {
      const tags = metaMatch[1].split(",").map((s) => s.trim());
      return res.json({ tags });
    }

    const jsonMatch = text.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;/s);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[1]);
      if (obj.videoDetails?.keywords) {
        return res.json({ tags: obj.videoDetails.keywords });
      }
    }

    res.json({ tags: [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
