# IPA Church Elappara — website + admin panel

A 3D-styled site for IPA Church Elappara (Indian Pentecostal Assembly, Idukki,
Kerala), with a live-editable content backend on Supabase.

## Files
- `index.html` — the public site
- `admin.html` — password-protected control panel (password: `admin861`)
- `styles.css` — shared styles (light/dark theme, "strip light" animation, 3D gallery)
- `script.js` — public site behaviour + reads live content from Supabase
- `admin.js` — admin panel behaviour + writes content to Supabase
- `supabase-config.js` — project connection details (already filled in)
- `images/`, `video/` — your church photos and a short worship clip

## What's already done
A Supabase project called **ipa-church-elappara** (region: `ap-south-1`,
Mumbai) has been created and connected for you:

- A `site_content` table holding one row of editable content (hero text,
  service times, languages, ministries, leadership info, contact details,
  announcement banner) — pre-filled with the same defaults you see on the
  live site.
- Row-level security turned on: anyone can **read** the content (so the
  public site works), but only a **signed-in** browser session can
  **write** to it (so random visitors can't edit your site).
- Realtime turned on for that table, so if you edit something in
  `admin.html` while someone else has the site open, they see the change
  without refreshing.

## One manual step left
Supabase needs one setting switched on by hand before Save works in
`admin.html` (this can't be done through the API):

1. Go to your project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Authentication → Sign In / Providers → Anonymous** → toggle it **on**

This is what lets the admin panel get a signed-in session after someone
enters the password — it doesn't create a real user account, it just
satisfies the "must be signed in to write" rule above.

## Using the admin panel
1. Open `admin.html` and enter the password: **admin861**
2. Edit any section and press its **Save** button — each card saves
   independently.
3. Changes go live on `index.html` immediately, no republishing needed.

**To change the password:** open `admin.js` and edit this line near the top:
```js
const ADMIN_PASSWORD = 'admin861';
```

**Important honesty note about security:** this password only gates the
*admin.html page in the browser* — it's convenient, not a vault. Because
this is a static site with no server of its own, the real protection is
the Supabase row-level security rule (only a signed-in session can write).
That's a reasonable, lightweight setup for a small church site, but it's
not bank-grade — anyone with a copy of `admin.js` and some technical
know-how could theoretically also sign in anonymously and write to the
table directly, bypassing the password screen. If you ever want stronger
protection, the next step up is switching the Supabase policy from "any
authenticated session" to "a specific email/password account", which is a
small change to the SQL policy plus enabling email/password sign-in
instead of anonymous.

## Still to confirm before this fully goes live
Use the admin panel to fill these in once confirmed:
- Exact Sunday (and any weekday) service timings
- Current pastor / leadership name and role — the "please confirm" note on
  the site disappears once you tick "confirmed" in the admin panel
- Official address / map pin
- Any events or a Christmas/anniversary announcement (use the
  Announcement banner)

## Deploying this for real
Right now these are static files. To put them on the web:
- **Easiest:** drag the whole folder into [Netlify Drop](https://app.netlify.com/drop)
  or connect it to **Vercel** / **GitHub Pages** / **Firebase Hosting** — any
  static host works, since there's no server code.
- Whatever host you pick, keep all the files together in one folder
  (the `images/` and `video/` paths are relative).

## Notes
- Theme (light/dark) is remembered per visitor via their browser.
- The gallery, marquee, and "strip light" accents are pure CSS/JS — no
  external library, so they keep working even if Supabase or the internet
  connection is briefly unavailable. Only the editable text/content
  (hero copy, service times, ministries, leadership, contact info,
  announcement) depends on Supabase; everything else is baked into the
  page as a sensible default.
