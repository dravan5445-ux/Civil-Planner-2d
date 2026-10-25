# Planora + Supabase starter

This package prepares the project for a persistent backend. It includes:
- `supabase-config.js` for your Supabase project URL and anon/public key
- `supabase-schema.sql` for profiles, floor plans, activity events, and payment records with Row Level Security
- The original frontend prototype

## Next setup steps
1. Create a Supabase project at https://supabase.com/.
2. Open SQL Editor and run `supabase-schema.sql`.
3. Open Project Settings → API and copy the Project URL and anon/public key.
4. Paste those two values into `supabase-config.js`.
5. Keep the service-role key private; never place it in browser JavaScript.
6. Configure Authentication → URL Configuration with the URL where you host the website.
7. Configure email confirmation as desired for your launch.

## Important status
This is a **backend setup starter**, not yet a completed live integration. The current frontend's demo authentication/payment flow still needs to be replaced with Supabase Auth/database calls and a trusted server-side payment flow. Do not publish as a real paid service yet.

## Planned data model
- `auth.users`: managed securely by Supabase Auth
- `profiles`: customer display name and timestamps
- `floor_plans`: requirements and saved preview per user
- `activity_events`: events such as plan creation and download
- `payments`: payment records; client-side users cannot write verified payment statuses

## Security notes
- RLS policies limit users to their own profiles, plans, activity events, and payment records.
- Payment status must be updated only by a trusted server/verified gateway webhook.
- Never store raw passwords yourself. Use Supabase Auth.
- Only collect necessary activity data and explain tracking in a privacy notice.
- Concept plans need qualified professional review before construction.
