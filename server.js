import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ YouTube Tag Extractor Proxy is running!");
});

app.get("/extract", async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ error: "Missing video ID" });

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const text = await response.text();

    const match = text.match(/"keywords":\[(.*?)\]/);
    const tags = match ? JSON.parse("[" + match[1] + "]") : [];

    res.json({ videoId, tags });
  } catch (error) {
    res.status(500).json({ error: "Failed to extract tags" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
