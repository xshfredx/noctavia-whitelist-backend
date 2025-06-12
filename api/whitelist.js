// api/whitelist.js
export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL;
  const ALLOWED_ORIGIN = "https://noctavia.xyz";
  const origin = req.headers.origin || "";

  // CORS and preflight for GET always open
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  // For GET, allow any origin
  if (req.method === "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const sheetRes = await fetch(SHEET_URL);
      const data = await sheetRes.json();
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ message: "Unable to fetch progress" });
    }
  }

  // For POST, enforce origin lock
  if (req.method === "POST") {
    if (origin !== ALLOWED_ORIGIN) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);

    const { wallet, username, timestamp } = req.body;
    if (!wallet || !username) {
      return res.status(400).json({ message: "Wallet and Username are required" });
    }
    try {
      const resp = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username, timestamp }),
      });
      if (!resp.ok) throw new Error(await resp.text() || resp.statusText);
      return res.status(200).json({ message: "Submitted successfully" });
    } catch (e) {
      return res.status(500).json({ message: `Submission failed: ${e.message}` });
    }
  }

  // Everything else
  res.setHeader("Allow", ["GET","POST","OPTIONS"]);
  return res.status(405).json({ message: "Method not allowed" });
}
