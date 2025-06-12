// api/whitelist.js
export default async function handler(req, res) {
  // === CORS ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const SHEET_URL = process.env.SHEET_URL;
  // === GET: proxy for progress data ===
  if (req.method === "GET") {
    try {
      const sheetRes = await fetch(SHEET_URL);
      const data = await sheetRes.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: "Unable to fetch progress" });
    }
  }

  // === POST: handle submission ===
  if (req.method === "POST") {
    const { wallet, username, timestamp } = req.body;
    if (!wallet || !username) {
      return res.status(400).json({ message: "Wallet and Username are required" });
    }
    try {
      // Forward exactly what frontend sent to your Sheet
      const resp = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username, timestamp }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || resp.statusText);
      }
      return res.status(200).json({ message: "Submitted successfully" });
    } catch (e) {
      return res
        .status(500)
        .json({ message: `Submission failed: ${e.message}` });
    }
  }

  // === Other methods ===
  res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
  return res.status(405).json({ message: "Method not allowed" });
}
