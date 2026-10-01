# E-Setu Responsive Website v2

Responsive SIH 2026 PS 26229 landing page plus clickable Collector, Recycler and EPR demo flows.

## Deploy to Netlify
Extract the ZIP and upload the folder contents through Netlify Deploys/drag-and-drop.

## 2. Configure frontend
Open `js/config.js` and replace:
- SUPABASE_URL
- SUPABASE_ANON_KEY

Use only the anon/public key in frontend code. Never put a service-role key in the browser.

## 3. Run
For local development, use a local static server, e.g. VS Code Live Server.

## Demo accounts
Create users through the Register screen. After registering, choose a role:
- collector
- recycler
- admin

For a real deployment, role changes should be restricted to an admin/server-side workflow.

## Important prototype limitations
- AI classification is a browser-side demo classifier based on filename/category hints. For production, connect `/api/classify` to a trained model.
- Price values are indicative demo values and must be replaced with validated market/recycler data.
- "Escrow" is represented as a payment workflow state; the frontend does NOT hold money.
- Recycler authorization should be verified against authoritative records before production use.
