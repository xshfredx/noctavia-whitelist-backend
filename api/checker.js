// pages/api/checker.js

export default async function handler(req, res) {
  try {
    // 1) CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }

    // 2) Only allow GET & POST
    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET,POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    // 3) Determine which sheet URL to use
    const SHEET_URL = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
    if (!SHEET_URL) {
      console.error("🛑 checker.js: SHEET_URL not set")
      return res.status(500).json({ error: "SHEET_URL not configured" })
    }
    console.log("📡 checker.js using SHEET_URL:", SHEET_URL)

    // 4) POST branch: append a new row (unchanged)
    if (req.method === "POST") {
      const { address, username, type } = req.body
      if (!address || !username || !type) {
        return res.status(400).json({ error: "Missing address, username, or type" })
      }

      // Fetch existing rows for duplicate check
      const getRes = await fetch(SHEET_URL)
      if (!getRes.ok) {
        console.error("🛑 checker.js: GET fetch failed:", getRes.status)
        return res.status(502).json({ error: "Failed to fetch sheet rows" })
      }
      const rows = await getRes.json()

      // Find the wallet column dynamically
      const walletKey = Object.keys(rows[0] || {})
        .find(k => /wallet/i.test(k))
      if (!walletKey) {
        console.error("🛑 checker.js: no wallet column found")
        return res.status(500).json({ error: "Sheet missing wallet column" })
      }

      // Duplicate check
      const dup = rows.some(r => {
        const v = r[walletKey]
        return typeof v === "string" && v.toLowerCase() === address.toLowerCase()
      })
      if (dup) {
        return res.status(200).json({ duplicate: true })
      }

      // Append the new row, including type (FCFS or GTD)
      const postRes = await fetch(SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-write-token": process.env.WRITE_TOKEN || "",
        },
        body: JSON.stringify({
          [walletKey]: address,
          username,
          type: type.toUpperCase(),
        }),
      })
      if (!postRes.ok) {
        console.error("🛑 checker.js: POST fetch failed:", postRes.status)
        return res.status(502).json({ error: "Failed
