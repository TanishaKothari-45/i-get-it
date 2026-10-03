// A label the phone keeps, so the first night survives a refresh without an account.
const KEY = "igetit.device";
export function deviceToken(): string {
  try {
    let t = localStorage.getItem(KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    // private windows can refuse storage; the night still works for this visit
    return "ephemeral-" + Math.random().toString(36).slice(2);
  }
}
