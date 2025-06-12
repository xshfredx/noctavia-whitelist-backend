// api/whitelist.js
export default async function handler(req, res) {
  // 1) CORS support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const SHEET_URL = process.env.SHEET_URL;

  // 2) GET → fetch progress data
  if (req.method === "GET") {
    try {
      const sheetRes = await fetch(SHEET_URL);
      const data = await sheetRes.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: "Unable to fetch progress" });
    }
  }

  // 3) POST → submit to the whitelist
  if (req.method === "POST") {
    const { address, twitter } = req.body;
    if (!address || !twitter) {
      return res.status(400).json({ error: "Missing address or Twitter" });
    }
    try {
      const resp = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, twitter }),
      });
      if (!resp.ok) throw new Error("sheet.best failed");
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  // 4) Method not allowed
  res.setHeader("Allow", ["GET","POST","OPTIONS"]);
  return res.status(405).json({ error: "Method not allowed" });
}
