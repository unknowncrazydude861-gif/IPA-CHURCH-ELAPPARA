/* ============================================================
   SUPABASE CONFIG — IPA Church Elappara
   ============================================================
   Already wired to the church project.

   Anonymous Sign-Ins must be enabled in Supabase for the
   admin panel's client-side editing flow.
   ============================================================ */

export const supabaseUrl = "https://wgjoaitequtthyzufgev.supabase.co";
export const supabaseAnonKey = "sb_publishable_94z_ZwbJjeByE46uIi7WQg_b61RP_81";
export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
export const SUPABASE_SDK = "2";

// Load the separate media manager on both the public site and admin page.
if (typeof document !== 'undefined') {
  const load = () => import('./media-manager.js?v=20260913-media').catch((err) => {
    console.warn('IPA media manager could not load:', err);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
}
