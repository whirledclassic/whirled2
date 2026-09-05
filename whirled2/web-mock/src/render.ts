/**
 * Tiny HTML helper.
 *
 * WHY
 * This mock is vanilla TypeScript on purpose. No React.
 * `el()` builds a real Element. Do not innerHTML user text without
 * escaping — feed posts go through `esc()`.
 */

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch
  ));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = ""
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === "class") node.className = val;
    else node.setAttribute(key, val);
  }
  if (html) node.innerHTML = html;
  return node;
}
