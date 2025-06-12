// pages/api/checker.js

export default async function handler(req, res) {
  try {
    // 1) CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }

    // 2) Only GET & POST
    if (!["GET","POST"].includes(req.method)) {
      res.setHeader("Allow","GET,POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    // 3) Pick your sheet URL
    const SHEET_URL = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
    if (!SHEET_URL) {
      console.error("🛑 checker.js: SHEET_URL not set")
      return res.status(500).json({ error: "SHEET_URL not configured" })
    }
    // For debugging:
    console.log("📡 checker.js using SHEET_URL:", SHEET_URL)

    // 4) POST = append row
    if (req.method === "POST") {
      const { address, username } = req.body
      if (!address || !username) {
        return res.status(400).json({ error: "Missing address or username" })
      }

      // fetch existing rows
      const getRes = await fetch(SHEET_URL)
      if (!getRes.ok) {
        console.error("🛑 checker.js: GET fetch failed:", getRes.status)
        return res.status(502).json({ error: "Failed to fetch sheet rows" })
      }
      const rows = await getRes.json()

      // detect wallet column
      const walletKey = Object.keys(rows[0] || {}).find(k => /wallet/i.test(k))
      if (!walletKey) {
        console.error("🛑 checker.js: no wallet column found in sheet")
        return res.status(500).json({ error: "Sheet missing wallet column" })
      }

      // duplicate?
      const dup = rows.some(r => r[walletKey]?.toLowerCase() === address.toLowerCase())
      if (dup) {
        return res.status(200).json({ duplicate: true })
      }

      // append with server-side token
      const postRes = await fetch(SHEET_URL, {
        method:  "POST",
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

    // 5) GET = whitelist check
    const address = (req.query.address as string || "").trim().toLowerCase()
    if (!address) {
      return res.status(400).json({ error: "No address provided" })
    }

    // fetch rows
    const getRes = await fetch(SHEET_URL)
    if (!getRes.ok) {
      console.error("🛑 checker.js: GET fetch failed:", getRes.status)
      return res.status(502).json({ error: "Failed to fetch sheet rows" })
    }
    const rows = await getRes.json()

    // detect wallet column
    const walletKey = Object.keys(rows[0] || {}).find(k => /wallet/i.test(k))
    if (!walletKey) {
      console.error("🛑 checker.js: no wallet column found in sheet")
      return res.status(500).json({ error: "Sheet missing wal
