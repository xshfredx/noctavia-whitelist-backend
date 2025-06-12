# Whitelist Backend

This is a simple Vercel serverless function for handling a whitelist form.

## Files

- **api/whitelist.js**: Serverless function that accepts POST requests with `address` and `twitter` fields and forwards them to Sheet.best.

## Setup

1. Install Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Clone this folder and navigate to it:

   ```bash
   cd whitelist-backend
   ```

3. Login to Vercel and add your secret:

   ```bash
   vercel login
   vercel env add SHEET_URL production
   ```

4. Deploy:

   ```bash
   vercel --prod
   ```

5. Use the endpoint `https://<your-project>.vercel.app/api/whitelist` in your front-end form.
