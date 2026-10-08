// A label the phone keeps, so the first night survives a refresh without an account.
const KEY = "igetit.device";
// True when the token was made on this page load: a brand-new phone, which has no handbook to wait for, so the landing
// page can paint before the first query answers (8 Oct night, performance audit: 1 to 2 s sooner).
export let freshDevice = false;
export function deviceToken(): string {
  try {
    let t = localStorage.getItem(KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
      freshDevice = true;
    }
    return t;
  } catch {
    // private windows can refuse storage; the night still works for this visit
    return "ephemeral-" + Math.random().toString(36).slice(2);
  }
}
