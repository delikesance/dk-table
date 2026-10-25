/** Print an HTML page through a hidden iframe (the system dialog offers "Enregistrer en PDF"). */
export function printHtml(html: string): void {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  f.srcdoc = html;
  f.onload = () => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 60_000);
  };
  document.body.append(f);
}
