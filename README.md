# Kabadiwala Connect — SIH26229 Dynamic MVP

A Supabase-backed prototype for:
Collector → Capture → Classify → Value → Match → Handover → Passport → Earnings

## Stack
- HTML/CSS/JavaScript frontend
- Supabase Auth + PostgreSQL + Storage
- Browser localStorage for offline lot queue
- Rule-based demo AI classifier/value engine (replaceable by an ML API)
- Browser Geolocation
- Recycler matching and Collection Passport

## 1. Supabase setup
Create a Supabase project.

Run `supabase/schema.sql` in Supabase SQL Editor.

Create a public Storage bucket named `e-waste-images` OR change the policy/bucket settings in the SQL.

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
