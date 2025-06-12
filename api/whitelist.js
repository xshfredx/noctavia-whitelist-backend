// api/whitelist.js
export default async function handler(req, res) {
  const ALLOWED_ORIGIN = "https://noctavia.xyz"
  const origin = req.headers.origin || req.headers.referer || ""

  // 0) CORS preflight for your domain only
  if (req.method === "OPTIONS") {
    if (origin !== ALLOWED_ORIGIN) {
      return res.status(403).end("Forbidden")
    }
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }

  // 1) Reject any non-allowed origin
  if (origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ message: "Forbidden" })
  }

  // 2) Set CORS headers for subsequent requests
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
  res.setHeader("Access-Control-Allow-Methods", "GET,POST")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  const SHEET_URL = process.env.SHEET_URL

  // 3) GET → proxy progress data
  if (req.method === "GET") {
    try {
      const sheetRes = await fetch(SHEET_URL)
      const data = await sheetRes.json()
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ message: "Unable to fetch progress" })
    }
  }

  // 4) POST → whitelist submission
  if (req.method === "POST") {
    const { wallet, username, timestamp } = req.body
    if (!wallet || !username) {
      return res.status(400).json({ message: "Wallet and Username are required" })
    }
    try {
      const resp = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username, timestamp }),
      })
      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(errText || resp.statusText)
      }
      return res.status(200).json({ message: "Submitted successfully" })
    } catch (e) {
      return res
        .status(500)
        .json({ message: `Submission failed: ${e.message}` })
    }
  }

  // 5) Other methods → reject
  res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
  return res.status(405).json({ message: "Method not allowed" })
}
