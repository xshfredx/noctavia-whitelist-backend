// pages/api/checker.js

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }

    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET,POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    const SHEET_URL = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
    if (!SHEET_URL) {
      console.error("🛑 checker.js: SHEET_URL not set")
      return res.status(500).json({ error: "SHEET_URL not configured" })
    }
    console.log("📡 checker.js using SHEET_URL:", SHEET_URL)

    if (req.method === "POST") {
      const { address, username } = req.body
      if (!address || !username) {
        return res.status(400).json({ error: "Missing address or username" })
      }

      const getRes = await fetch(SHEET_URL)
      if (!getRes.ok) {
        console.error("🛑 checker.js: GET fetch failed:", getRes.status)
        return res.status(502).json({ error: "Failed to fetch sheet rows" })
      }
      const rows = await getRes.json()
      const walletKey = Object.keys(rows[0] || {})
        .find(k => /wallet/i.test(k))
      if (!walletKey) {
        console.error("🛑 checker.js: no wallet column found")
        return res.status(500).json({ error: "Sheet missing wallet column" })
      }

      const dup = rows.some(r => {
        const v = r[walletKey]
        return typeof v === "string" && v.toLowerCase() === address.toLowerCase()
      })
      if (dup) {
        return res.status(200).json({ duplicate: true })
      }

      const postRes = await fetch(SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-write-token": process.env.WRITE_TOKEN || "",
        },
        body: JSON.stringify({ [walletKey]: address, username }),
      })
      if (!postRes.ok) {
        console.error("🛑 checker.js: POST fetch failed:", postRes.status)
        return res.status(502).json({ error: "Failed to append row" })
      }

      return res.status(200).json({ success: true })
    }

    // GET branch
    // Coerce req.query.address to string
    const raw = req.query.address
    const address = Array.isArray(raw) ? raw[0] : (raw || "")
    const clean = String(address).trim().toLowerCase()
    if (!clean) {
      return res.status(400).json({ error: "No address provided" })
    }

    const getRes = await fetch(SHEET_URL)
    if (!getRes.ok) {
      console.error("🛑 checker.js: GET fetch failed:", getRes.status)
      return res.status(502).json({ error: "Failed to fetch sheet rows" })
    }
    const rows = await getRes.json()
    const walletKey = Object.keys(rows[0] || {})
      .find(k => /wallet/i.test(k))
    if (!walletKey) {
      console.error("🛑 checker.js: no wallet column found")
      return res.status(500).json({ error: "Sheet missing wallet column" })
    }

    const whitelisted = rows.some(r => {
      const v = r[walletKey]
      return typeof v === "string" && v.toLowerCase() === clean
    })
    return res.status(200).json({ whitelisted })
  } catch (err) {
    console.error("🛑 checker.js unexpected error:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
