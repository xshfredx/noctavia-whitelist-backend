export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL

  // 1) Always send these CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")                  // or your exact front-end URL
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Timestamp, X-Signature")

  // 2) Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // 3) GET — proxy your sheet, same as before
  if (req.method === "GET") {
    try {
      const sheetRes = await fetch(SHEET_URL)
      const data = await sheetRes.json()
      return res.status(200).json(data)
    } catch (err) {
      return res.status(500).json({ message: "Unable to fetch progress" })
    }
  }

  // 4) POST — now implemented and CORS headers already set above
  if (req.method === "POST") {
    // === your existing IP-rate-limit + HMAC + origin check here ===
    // e.g.
    // if (req.headers.origin !== "https://noctavia.xyz") return res.status(403).json({ message: "Forbidden" })

    try {
      const payload = await req.json()
      // forward it to your Sheet API
      const sheetRes = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await sheetRes.json()
      if (!sheetRes.ok) {
        return res.status(sheetRes.status).json({ message: result.message || "Sheet error" })
      }
      return res.status(200).json({ message: result.message || "Submitted!" })
    } catch (err) {
      return res.status(500).json({ message: "Submission failed" })
    }
  }

  // 5) Anything else → proper 405
  res.setHeader("Allow", ["GET","POST","OPTIONS"])
  return res.status(405).json({ message: "Method not allowed" })
}
