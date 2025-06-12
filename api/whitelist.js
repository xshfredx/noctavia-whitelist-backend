// api/whitelist.js
export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL

  // 1) CORS preflight and common headers
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Timestamp, X-Signature")
  if (req.method === "OPTIONS") {
    // Allow GET from anywhere
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).end()
  }

  // 2) Handle GET (progress data) → allow any origin
  if (req.method === "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    try {
      const sheetRes = await fetch(SHEET_URL)
      const data = await sheetRes.json()
      return res.status(200).json(data)
    } catch (err) {
      return res.status(500).json({ message: "Unable to fetch progress" })
    }
  }

  // 3) Handle POST (submission) with your existing IP-rate-limit + HMAC + origin check…
  //    (make sure you still have that code here)
  //    and set:
  //      res.setHeader("Access-Control-Allow-Origin", "https://noctavia.xyz")
  //    before processing the POST.

  // 4) Otherwise
  res.setHeader("Allow", ["GET","POST","OPTIONS"])
  return res.status(405).json({ message: "Method not allowed" })
}
