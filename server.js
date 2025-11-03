import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// ⚠️ Hardcoded API key (use only for local/private testing)
const API_KEY = "AIzaSyDEPJdK2pigsPmyn0RQygNx7SGan7TrHQE";

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Proxy is running successfully on Vercel!");
});

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).json({ error: "Missing video ID" });
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "Video not found or private" });
    }

    const snippet = data.items[0].snippet;
    res.json({
      title: snippet.title,
      channel: snippet.channelTitle,
      tags: snippet.tags || [],
      tagCount: (snippet.tags || []).length,
      source: "YouTube Data API v3",
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
