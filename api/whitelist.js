// api/whitelist.js
import { Redis } from "@upstash/redis"
import crypto from "crypto"

// Init Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL
  const ALLOWED_ORIGIN = "https://noctavia.xyz"
  const origin = req.headers.origin || ""

  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Timestamp, X-Signature")
    return res.status(200).end()
  }

  // Token Issuance: GET ?getToken=true
  if (req.method === "GET" && req.query.getToken === "true") {
    const timestamp = Math.floor(Date.now() / 1000)
    const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
    hmac.update(String(timestamp))
    const signature = hmac.digest("hex")
    // allow this to be fetched anywhere
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json({ timestamp, signature })
  }

  // Proxy GET for data (progress bar)
  if (req.method === "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    try {
      const sheetRes = await fetch(SHEET_URL)
      const data = await sheetRes.json()
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ message: "Unable to fetch progress" })
    }
  }

  // Only allow POSTs from your domain
  if (req.method === "POST") {
    if (origin !== ALLOWED_ORIGIN) {
      return res.status(403).json({ message: "Forbidden" })
    }
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN)

    // 1) Rate-limit per IP (5/hr)
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown"
    const key = `rl:${ip}`
    const count = await redis.incr(key)
    if (count === 1) {
      // first hit → set TTL 3600s
      await redis.expire(key, 3600)
    }
    if (count > 5) {
      return res.status(429).json({ message: "Too many submissions, try again later." })
    }

    // 2) HMAC check
    const tsHeader = req.headers["x-timestamp"]
    const sigHeader = req.headers["x-signature"]
    if (!tsHeader || !sigHeader) {
      return res.status(400).json({ message: "Missing signature headers." })
    }
    const ts = parseInt(tsHeader, 10)
    if (Math.abs(Math.floor(Date.now()/1000) - ts) > 300) {
      return res.status(400).json({ message: "Signature expired." })
    }
    const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
    hmac.update(String(ts))
    if (hmac.digest("hex") !== sigHeader) {
      return res.status(400).json({ message: "Invalid signature." })
    }

    // 3) Body validation & forward
    const { wallet, username, timestamp } = req.body
    if (!wallet || !username) {
      return res.status(400).json({ message: "Wallet and Username are required." })
    }
    try {
      const resp = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, username, timestamp }),
      })
      if (!resp.ok) throw new Error(await resp.text() || resp.statusText)
      return res.status(200).json({ message: "Submitted successfully" })
    } catch (e) {
      return res.status(500).json({ message: `Submission failed: ${e.message}` })
    }
  }

  // Reject everything else
  res.setHeader("Allow", ["GET","POST","OPTIONS"])
  return res.status(405).json({ message: "Method not allowed" })
}
