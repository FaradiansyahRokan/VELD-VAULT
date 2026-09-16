/**
 * clipboard.ts
 *
 * Universal safe clipboard copier that works in all environments:
 * - HTTPS & localhost (Modern navigator.clipboard API)
 * - HTTP & Local IP network (e.g., http://192.168.x.x:3000 on mobile devices)
 * - Embedded WebViews & non-secure contexts where navigator.clipboard is undefined
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern navigator.clipboard API if available
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // If permission denied or blocked by context, proceed to fallback
    }
  }

  // 2. Legacy fallback using invisible textarea + document.execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn("[clipboard] Fallback execCommand failed:", err);
      return false;
    }
  }

  return false;
}
