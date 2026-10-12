// Blink Bill — Store Scope (Multi-Store support)
// Each store keeps its OWN data: bills, stock, expenses, shop details, bill numbers.
// Storage pattern: <baseKey>_<storeId>  (e.g. bharat_bills_su8x1)
// The active store decides which scoped key every page reads/writes.
// Legacy single-store data (keys WITHOUT suffix) is migrated once into "main".

const StoreScope = (() => {
  function raw() {
    try { return JSON.parse(localStorage.getItem("bharat_stores") || "[]"); } catch (e) { return []; }
  }
  function save(list) { localStorage.setItem("bharat_stores", JSON.stringify(list)); }

  // One-time migration: bharat_bills / bharat_inventory / ...  ->  *_main
  function ensureMain() {
    if (localStorage.getItem("bharat_stores")) return;
    const id = "main";
    ["bharat_bills", "bharat_inventory", "bharat_expenses", "bharat_shop_details", "lastBillNo"]
      .forEach((k) => {
        const v = localStorage.getItem(k);
        if (v !== null) localStorage.setItem(k + "_" + id, v);
      });
    save([{ id, name: "Main Store", address: "", phone: "", gstin: "", createdAt: new Date().toISOString() }]);
    localStorage.setItem("bharat_active_store", id);
  }
  ensureMain();

  function activeId() {
    let id = localStorage.getItem("bharat_active_store");
    const list = raw();
    if (!id || !list.some((s) => s.id === id)) {
      id = list.length ? list[0].id : "main";
      localStorage.setItem("bharat_active_store", id);
    }
    return id;
  }
  function activeStore() {
    return raw().find((s) => s.id === activeId()) ||
      { id: "main", name: "Main Store", address: "", phone: "", gstin: "" };
  }
  function key(base) { return base + "_" + activeId(); }

  function addStore(data) {
    const list = raw();
    const id = "s" + Date.now().toString(36);
    list.push({
      id,
      name: ((data && data.name) || "").trim() || "New Store",
      address: ((data && data.address) || "").trim(),
      phone: ((data && data.phone) || "").trim(),
      gstin: ((data && data.gstin) || "").trim(),
      createdAt: new Date().toISOString()
    });
    save(list);
    return id;
  }

  function switchStore(id) {
    if (raw().some((s) => s.id === id)) {
      localStorage.setItem("bharat_active_store", id);
      return true;
    }
    return false;
  }

  function storeData(id, base) {
    try { return JSON.parse(localStorage.getItem(base + "_" + id) || "[]"); } catch (e) { return []; }
  }

  function removeStore(id) {
    const list = raw().filter((s) => s.id !== id);
    save(list);
    if (localStorage.getItem("bharat_active_store") === id) {
      localStorage.setItem("bharat_active_store", list.length ? list[0].id : "main");
    }
    ["bharat_bills", "bharat_inventory", "bharat_expenses", "bharat_shop_details", "lastBillNo"]
      .forEach((k) => localStorage.removeItem(k + "_" + id));
  }

  return {
    raw, save, ensureMain,
    activeId, activeStore, key,
    addStore, switchStore, removeStore, storeData
  };
})();