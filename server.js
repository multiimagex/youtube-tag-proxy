import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is Running Successfully!");
});

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ ok: false, error: "Missing video ID" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await response.text();

    const metaMatch = html.match(/<meta name="keywords" content="([^"]+)">/i);
    if (metaMatch) {
      const tags = metaMatch[1].split(",").map((t) => t.trim());
      return res.json({ ok: true, tags });
    }

    const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const tags = data.videoDetails?.keywords || [];
      return res.json({ ok: true, tags });
    }

    return res.json({ ok: false, error: "No tags found" });
  } catch (err) {
    console.error("Error fetching:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
