/* ============================================================
   SUPABASE CONFIG — IPA Church Elappara
   ============================================================
   Already wired up to your project "ipa-church-elappara"
   (Mumbai / ap-south-1 region), including the database table
   and security rules — created for you.

   Anonymous Sign-Ins must be enabled in the Supabase dashboard
   before admin.html can save changes:

     Authentication → Sign In / Providers → Anonymous → Enable
   ============================================================ */

export const supabaseUrl = "https://wgjoaitequtthyzufgev.supabase.co";
export const supabaseAnonKey = "sb_publishable_94z_ZwbJjeByE46uIi7WQg_b61RP_81";

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

// Use the current Supabase JS v2 release instead of an old pinned build.
export const SUPABASE_SDK = "2";
