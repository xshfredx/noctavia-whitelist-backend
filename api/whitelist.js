// pages/api/whitelist.js

export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL!

  //
  // 1) UNCONDITIONAL CORS HEADERS
  //
  res.setHeader("Access-Control-Allow-Origin",  "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  )

  //
  // 2) OPTIONS PRE-FLIGHT
  //
  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  try {
    //
    // 3) GET — proxy to your sheet for progress data
    //
    if (req.method === "GET") {
      const sheetRes = await fetch(SHEET_URL)
      const data     = await sheetRes.json()
      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(data)
    }

    //
    // 4) POST — forward submission directly
    //
    if (req.method === "POST") {
      const payload  = req.body
      const sheetRes = await fetch(SHEET_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
      const result = await sheetRes.json()

      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(result)
    }

    //
    // 5) ANYTHING ELSE → 405
    //
    res.setHeader("Allow", ["GET","POST","OPTIONS"])
    return res.status(405).json({ message: "Method Not Allowed" })

  } catch (err) {
    console.error("❌ /api/whitelist error:", err)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
