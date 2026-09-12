/* ============================================================
   SUPABASE CONFIG — IPA Church Elappara
   ============================================================
   Already wired up to your project "ipa-church-elappara"
   (Mumbai / ap-south-1 region), including the database table
   and security rules — created for you.

   One thing still needs to be switched on by hand in the
   Supabase dashboard before admin.html can save changes:

     Authentication → Sign In / Providers → Anonymous → Enable

   That's it — this is what lets admin.html write to the
   database after someone unlocks it with the admin password.
   It doesn't create a real account; it just gives the browser
   a signed-in session so the database's security rules allow
   the save.

   Nothing else to edit here. index.html and admin.html both
   import this file automatically.
   ============================================================ */

export const supabaseUrl = "https://wgjoaitequtthyzufgev.supabase.co";
export const supabaseAnonKey = "sb_publishable_94z_ZwbJjeByE46uIi7WQg_b61RP_81";

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

// SDK version used across every file that talks to Supabase —
// change it here once and it updates everywhere.
export const SUPABASE_SDK = "2.45.4";
