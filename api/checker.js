// pages/api/checker.js

export default async function handler(req, res) {
  try {
    // 1) CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }

    // 2) Only GET & POST
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET,POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    // 3) Sheet URL from env
    const SHEET_URL = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
    if (!SHEET_URL) {
      console.error("checker.js: SHEET_URL not configured")
      return res.status(500).json({ error: "SHEET_URL not configured" })
    }

    // POST branch: unchanged except we read and store "type"
    if (req.method === "POST") {
      const { address, username, type } = req.body || {}
      if (!address || !username || !type) {
        return res
          .status(400)
          .json({ error: "Missing address, username, or type" })
      }

      // fetch existing rows
      const getRes = await fetch(SHEET_URL)
      if (!getRes.ok) {
        console.error("checker.js POST: fetch failed", getRes.status)
        return res.status(502).json({ error: "Failed to fetch sheet rows" })
      }
      const rows = await getRes.json()

      // detect wallet column
      const walletKey =
        Object.keys(rows[0] || {}).find(k => /wallet/i.test(k)) || "wallet"

      // duplicate?
      const isDup = rows.some(r => {
        const v = r[walletKey]
        return typeof v === "string" && v.toLowerCase() === address.toLowerCase()
      })
      if (isDup) {
        return res.status(200).json({ duplicate: true })
      }

      // append new row
      const postRes = await fetch(SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-write-token": process.env.WRITE_TOKEN || "",
        },
        body: JSON.stringify({
          [walletKey]: address,
          username:   username,
          type:       type.toUpperCase(),
        }),
      })
      if (!postRes.ok) {
        console.error("checker.js POST: append failed", postRes.status)
        return res.status(502).json({ error: "Failed to append row" })
      }

      return res.status(200).json({ success: true })
    }

    // GET branch: check inGTD / inFCFS
    // 4) parse query
    let raw = req.query.address
    if (Array.isArray(raw)) raw = raw[0]
    const address = raw ? String(raw).trim().toLowerCase() : ""
    if (!address) {
      return res.status(400).json({ error: "No address provided" })
    }

    // 5) fetch rows
    const getRes2 = await fetch(SHEET_URL)
    if (!getRes2.ok) {
      console.error("checker.js GET: fetch failed", getRes2.status)
      return res.status(502).json({ error: "Failed to fetch sheet rows" })
    }
    const rows2 = await getRes2.json()
    if (!Array.isArray(rows2)) {
      return res.status(500).json({ error: "Invalid sheet data" })
    }

    // 6) detect column names
    const walletKey = Object.keys(rows2[0] || {}).find(k => /wallet/i.test(k))
    const typeKey   = Object.keys(rows2[0] || {}).find(k => /type/i.test(k))
    if (!walletKey || !typeKey) {
      console.error("checker.js: missing wallet or type column")
      return res
        .status(500)
        .json({ error: "Sheet missing wallet or type column" })
    }

    // 7) filter matching rows
    const matches = rows2.filter(r => {
      const v = r[walletKey]
      return typeof v === "string" && v.toLowerCase() === address
    })

    // 8) compute flags
    const inGTD  = matches.some(r => String(r[typeKey]).toUpperCase() === "GTD")
    const inFCFS = matches.some(r => String(r[typeKey]).toUpperCase() === "FCFS")

    return res.status(200).json({ inGTD, inFCFS })
  } catch (e) {
    console.error("checker.js unexpected error:", e)
    return res.status(500).json({ error: "Internal server error" })
  }
}
