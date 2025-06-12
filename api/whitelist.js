// pages/api/whitelist.js

import crypto from "crypto"

export default async function handler(req, res) {
  const SHEET_URL   = process.env.SHEET_URL!
  const HMAC_SECRET = process.env.HMAC_SECRET!

  //
  // 1) UNCONDITIONAL CORS HEADERS
  //
  // These run for every request, no matter what happens later
  res.setHeader("Access-Control-Allow-Origin",  "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Timestamp, X-Signature"
  )

  //
  // 2) OPTIONS PRE-FLIGHT
  //
  if (req.method === "OPTIONS") {
    // 204 No Content is enough
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
    // 4) POST — HMAC check + forward submission
    //
    if (req.method === "POST") {
      // 4.a) Validate HMAC headers
      const ts  = req.headers["x-timestamp"]  as string
      const sig = req.headers["x-signature"]  as string
      if (!ts || !sig) {
        return res.status(400).json({ message: "Missing X-Timestamp or X-Signature" })
      }

      // 4.b) Reject stale or bad signatures
      const payload  = req.body
      const expected = crypto
        .createHmac("sha256", HMAC_SECRET)
        .update(ts + JSON.stringify(payload))
        .digest("hex")

      if (sig !== expected) {
        return res.status(401).json({ message: "Invalid signature" })
      }

      // 4.c) Forward to your sheet service
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
    // CORS header is already set above, so browser will see it even on 500
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
