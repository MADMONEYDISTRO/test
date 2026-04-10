const express = require("express");
const app = express();
app.use(express.json());

const servers = new Map();
const PRESENCE_TTL = 45000;

setInterval(() => {
  const now = Date.now();
  for (const [jobId, players] of servers) {
    for (const [userId, data] of players) {
      if (now - data.lastSeen > PRESENCE_TTL) players.delete(userId);
    }
    if (players.size === 0) servers.delete(jobId);
  }
}, 30000);

app.post("/heartbeat", (req, res) => {
  const { userId, jobId, placeId, displayName, username, tier } = req.body;
  if (!userId || !jobId || !placeId || !displayName || !username)
    return res.status(400).json({ error: "Missing fields" });
  if (!servers.has(jobId)) servers.set(jobId, new Map());
  servers.get(jobId).set(String(userId), {
    userId: String(userId),
    displayName: String(displayName).substring(0, 30),
    username: String(username).substring(0, 30),
    tier: tier === "PRIVATE" ? "PRIVATE" : "FREE",
    placeId: String(placeId),
    lastSeen: Date.now(),
  });
  res.json({ ok: true });
});

app.get("/players", (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: "Missing jobId" });
  const players = servers.get(jobId);
  if (!players || players.size === 0) return res.json({ players: [] });
  const now = Date.now();
  const result = [];
  for (const [, data] of players) {
    if (now - data.lastSeen <= PRESENCE_TTL)
      result.push({ userId: data.userId, displayName: data.displayName, username: data.username, tier: data.tier });
  }
  res.json({ players: result });
});

app.get("/", (req, res) => res.json({ status: "Feather Nametag Server", version: "1.0" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Feather Nametag Server] Port ${PORT}`));
