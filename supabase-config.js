/* ============================================================
   SUPABASE CONFIG — IPA Church Elappara
   ============================================================
   Already wired up to your project "ipa-church-elappara"
   (Mumbai / ap-south-1 region), including the database table
   and security rules — created for you.

   Anonymous Sign-Ins must be enabled in the Supabase dashboard
   before admin.html can save changes.
   ============================================================ */

export const supabaseUrl = "https://wgjoaitequtthyzufgev.supabase.co";
export const supabaseAnonKey = "sb_publishable_94z_ZwbJjeByE46uIi7WQg_b61RP_81";

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

// Use the current Supabase JS v2 release.
export const SUPABASE_SDK = "2";

// Load the sectioned media manager on both the public site and admin panel.
// It detects the current page and adds the appropriate UI/rendering.
if (typeof window !== 'undefined') {
  const loadMediaManager = () => {
    import('./media-manager-sectioned.js?v=20260913').catch((err) => {
      console.warn('IPA media manager failed to load:', err);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMediaManager, { once: true });
  } else {
    loadMediaManager();
  }
}
