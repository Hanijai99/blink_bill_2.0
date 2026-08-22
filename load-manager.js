// Blink Bill — Load Manager (lazy script loading)
// Heavy libraries are downloaded ONLY when the feature is actually used,
// so pages open much faster and save mobile data.
const LoadManager = (() => {
  const loaded = {};

  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => {
        delete loaded[src];
        reject(new Error("Failed to load: " + src));
      };
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  return {
    loadScript,
    loadScanner: () => loadScript("https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"),
    loadCharts: () => loadScript("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"),
    loadPDF: () => loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
    loadExcel: () => loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"),
    loadQR: () => loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"),
    loadBarcode: () => loadScript("https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js")
  };
})();
