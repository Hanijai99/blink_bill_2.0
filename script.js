// ================== BHARAT BILLING PRO – UPDATED SCRIPT.JS WITH NEW FEATURES ==================

const defaultItems = [
];

let items = [];
let cart = [];
let bills = JSON.parse(localStorage.getItem(StoreScope.key("bharat_bills")) || "[]");

// Attempt to migrate any legacy string-based bills to structured objects
try { migrateBills(); } catch (e) { /* migrate function may be defined later; safe to ignore here */ }

let owner = localStorage.getItem("owner") || "Owner";
if (document.getElementById("owner")) {
  document.getElementById("owner").innerText = owner;
}

function loadInventory(refreshUI = true) {
  const saved = localStorage.getItem(StoreScope.key("bharat_inventory"));
  if (saved && saved.trim() !== "" && saved !== "[]") {
    try {
      items = JSON.parse(saved);
      items.forEach(item => {
        if (!item.initialStock || item.initialStock <= 0) {
          item.initialStock = item.stock || 1;
        }
      });
    } catch (e) {
      console.error("Inventory data error. Using defaults...");
      items = defaultItems;
      saveInventory();
    }
  } else {
    items = defaultItems;  
    saveInventory();
  }

  if (refreshUI) {
    updateStockStatus();
    if (document.getElementById("search")?.value) showSuggest();
  }
}

function saveInventory() {
  localStorage.setItem(StoreScope.key("bharat_inventory"), JSON.stringify(items));
}

loadInventory();

window.addEventListener('storage', (e) => {
  if (e.key === StoreScope.key('bharat_inventory')) loadInventory();
});
window.addEventListener('focus', () => loadInventory());
window.addEventListener('load', () => { try { migrateBills(); } catch(e){} });

function showSuggest() {
  let q = (document.getElementById("search")?.value || "").toLowerCase().trim();
  let s = document.getElementById("suggest");
  if (!s || !q) { 
    s.innerHTML = ""; 
    s.style.display = "none"; 
    return; 
  }

  let matches = items.filter(i => 
    i.name.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q))
  );

  s.innerHTML = "";
  matches.forEach(i => {
    let div = document.createElement("div");
    div.className = "suggest-item";
    div.innerHTML = `
      <strong>${esc(i.name)}</strong> - ₹${i.price} (${i.gst}%)
      <small style="color:${i.stock<20?'red':'green'}">Stock: ${i.stock}</small>
    `;
    div.onclick = () => {
      document.getElementById("name").value = i.name;
      document.getElementById("price").value = i.price;
      document.getElementById("gst").value = i.gst;
      document.getElementById("search").value = "";
      s.style.display = "none";
      document.getElementById("qty").focus();
    };
    s.appendChild(div);
  });

  s.style.display = matches.length ? "block" : "none";
}

function add() {
  let name = document.getElementById("name").value.trim();
  let qty = parseInt(document.getElementById("qty").value) || 1;
  let price = parseFloat(document.getElementById("price").value) || 0;
  let gst = parseFloat(document.getElementById("gst").value) || 0;

  if (!name || price <= 0) {
    alert("Name & Price mandatory!");
    return;
  }

  let product = items.find(i => i.name === name);
  if (product) {
    if (product.stock < qty) {
      alert(`Out of stock! Only ${product.stock} left`);
      return;
    }
    product.stock -= qty;
    saveInventory();
  }

  cart.push({name, qty, price, gst});

  document.getElementById("name").value = "";
  document.getElementById("qty").value = 1;
  document.getElementById("price").value = "";
  document.getElementById("gst").value = "";

  updateCart();
  calc();
  updateStockStatus();
  document.getElementById("search").focus();
}

function getDiscount(sub) {
  const amt = parseFloat(document.getElementById("discAmt")?.value || 0);
  const per = parseFloat(document.getElementById("discPer")?.value || 0);
  return per > 0 ? sub * per / 100 : amt;
}

function calc() {
  let sub = cart.reduce((a,b) => a + b.qty * b.price, 0);
  let disc = getDiscount(sub);
  let gstTotal = cart.reduce((a,b) => a + (b.qty * b.price * b.gst/100), 0);
  let final = sub - disc + gstTotal;

  document.getElementById("sub").innerText = sub.toFixed(2);
  document.getElementById("disc").innerText = disc.toFixed(2);
  document.getElementById("gstt").innerText = gstTotal.toFixed(2);
  document.getElementById("final").innerText = final.toFixed(2);
}

function updateStockStatus() {
  let status = document.getElementById("stockStatus");
  if (!status) return;

  if (items.length === 0) {
    status.innerHTML = `<span style="color:#ff5722;font-weight:bold;">No products in stock. Go to Manage Stock and add items.</span>`;
    return;
  }

  let low = items.filter(i => i.stock < 20 && i.stock > 0).length;
  let out = items.filter(i => i.stock === 0).length;
  if (out > 0) status.innerHTML = `<span style="color:red;font-weight:bold;">${out} items OUT OF STOCK!</span>`;
  else if (low > 0) status.innerHTML = `<span style="color:orange;font-weight:bold;">${low} items low stock!</span>`;
  else status.innerHTML = `<span style="color:green;font-weight:bold;">All good,Lets start billing ✅</span>`;
}

// Build + persist bill from current cart. mode: "cash" | "online"
function storeBill(mode) {
  let subtotal = cart.reduce((a,b) => a + b.qty * b.price, 0);
  let discount = getDiscount(subtotal);
  let gstTotal = cart.reduce((a,b) => a + (b.qty * b.price * b.gst/100), 0);
  let finalTotal = subtotal - discount + gstTotal;

  const bill = {
    id: 'bill-' + Date.now(),
    name: document.getElementById("cname")?.value.trim() || "Walk-in",
    phone: document.getElementById("cphone")?.value.trim() || "",
    items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, gst: i.gst })),
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    gst: parseFloat(gstTotal.toFixed(2)),
    total: parseFloat(finalTotal.toFixed(2)),
    itemsCount: cart.length,
    date: new Date().toISOString(),
    paymentMode: mode
  };

  bills.push(bill);
  localStorage.setItem(StoreScope.key("bharat_bills"), JSON.stringify(bills));
  return bill;
}

// Fresh start for the NEXT bill — clears cart, customer fields, discounts
function clearCartAfterBill() {
  cart = [];
  try { sessionStorage.removeItem('bharat_cart_backup'); } catch (e) {}
  const el = (id) => { const n = document.getElementById(id); if (n) n.value = ""; };
  el("cname"); el("cphone"); el("discAmt"); el("discPer");
  updateCart();
  calc();
  updateStockStatus();
}

function save() {
  if (cart.length === 0) return alert("Add items first!");

  let subtotal = cart.reduce((a,b) => a + b.qty * b.price, 0);
  let discount = getDiscount(subtotal);

  if (discount > subtotal * 0.2) {
    if (!confirm(`Heavy discount detected! ₹${discount.toFixed(2)} (${((discount/subtotal)*100).toFixed(0)}%)\nDo you want to save this bill anyway?`)) {
      return;
    }
  }

  const isOnline = confirm("Online / UPI payment?\n\nPress OK = Online/UPI\nPress Cancel = CASH");

  storeBill(isOnline ? "online" : "cash");
  showToast(`✅ Bill saved! Payment: ${isOnline ? "Online/UPI" : "Cash"}`);
  clearCartAfterBill();
}

// Migration helper: convert old string-based bills to new structured format
function migrateBills() {
  try {
    let raw = JSON.parse(localStorage.getItem(StoreScope.key('bharat_bills')) || '[]');
    let changed = false;
    const migrated = raw.map(b => {
      if (b && b.items && Array.isArray(b.items)) return b; // already structured
      if (b && b.itemsList) {
        // parse itemsList like: "name (qty×₹price) | name2 (...)"
        const items = b.itemsList.split(' | ').map(s => {
          const namePart = s.split(' (')[0].trim();
          let qty = 1, price = 0, gst = 0;
          const qtyMatch = s.match(/\((\d+)×/);
          if (qtyMatch) qty = parseInt(qtyMatch[1]);
          const priceMatch = s.match(/₹([0-9.]+)/);
          if (priceMatch) price = parseFloat(priceMatch[1]);
          return { name: namePart, qty, price, gst };
        });
        changed = true;
        return {
          id: b.id || ('bill-' + Date.now()),
          name: b.name || 'Walk-in',
          phone: b.phone || '',
          items: items,
          subtotal: parseFloat((items.reduce((a,i)=>a+i.qty*i.price,0)).toFixed(2)),
          discount: parseFloat((parseFloat(b.discount||0)).toFixed(2)) || 0,
          gst: parseFloat((items.reduce((a,i)=>a + (i.qty*i.price*(i.gst||0)/100),0)).toFixed(2)) || 0,
          total: parseFloat(b.total) || parseFloat(b.amount) || 0,
          itemsCount: b.itemsCount || items.length,
          date: b.date || new Date().toISOString(),
          paymentMode: b.paymentMode || 'cash'
        };
      }
      return b;
    });
    if (changed) {
      localStorage.setItem(StoreScope.key('bharat_bills'), JSON.stringify(migrated));
      bills = migrated;
    } else {
      bills = raw;
    }
  } catch (e) {
    console.error('Failed to migrate bills', e);
  }
}

// Shared restore helper (used by both Excel and JSON restore)
async function applyRestore(inventory, restoredBills, expenses) {
  if (!confirm('This will REPLACE current inventory, bills' + (expenses ? ' & expenses' : '') + '. Proceed?')) return;
  localStorage.setItem(StoreScope.key('bharat_inventory'), JSON.stringify(inventory));
  localStorage.setItem(StoreScope.key('bharat_bills'), JSON.stringify(restoredBills));
  if (expenses) localStorage.setItem(StoreScope.key('bharat_expenses'), JSON.stringify(expenses));

  // Reset the archive too — backup file now holds everything (no duplicates)
  await ArchiveDB.clear();

  localStorage.setItem('backupDate', new Date().toLocaleString());
  showToast("✅ Backup restored! Reloading...");
  setTimeout(() => location.reload(), 1200);
}

// Import/Restore backup — accepts .xlsx / .xls / .json
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.json';
  input.onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;

    // Old JSON backups still supported
    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.inventory || !data.bills) return alert('Invalid backup file');
          applyRestore(data.inventory, data.bills, null);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Excel (.xlsx / .xls)
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await LoadManager.loadExcel();
        const XLSX = window.XLSX;
        const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' });

        const rows = (sheetName) =>
          wb.SheetNames.includes(sheetName) ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName]) : [];

        const inventory = rows("Inventory").map(r => ({
          name: String(r.Name ?? "").trim(),
          stock: parseInt(r.Stock) || 0,
          price: parseFloat(r.Price) || 0,
          gst: parseFloat(r.GST) || 0,
          barcode: String(r.Barcode ?? "").trim(),
          initialStock: parseInt(r.InitialStock) || parseInt(r.Stock) || 0
        })).filter(i => i.name);

        const restoredBills = rows("Bills").map((r, idx) => {
          let parsedItems = [];
          try { parsedItems = JSON.parse(r.ItemsJSON || "[]"); } catch (e) { parsedItems = []; }
          return {
            id: String(r.ID ?? ('bill-restored-' + Date.now() + '-' + idx)),
            name: String(r.Customer ?? "Walk-in"),
            phone: String(r.Phone ?? ""),
            paymentMode: String(r.Payment ?? "cash"),
            subtotal: parseFloat(r.Subtotal) || 0,
            discount: parseFloat(r.Discount) || 0,
            gst: parseFloat(r.GST) || 0,
            total: parseFloat(r.Total) || 0,
            itemsCount: parseInt(r.ItemsCount) || (Array.isArray(parsedItems) ? parsedItems.length : 0),
            date: String(r.Date ?? new Date().toISOString()),
            items: Array.isArray(parsedItems) ? parsedItems : []
          };
        });

        const expenses = rows("Expenses").map(r => ({
          date: String(r.Date ?? "").slice(0, 10),
          desc: String(r.Description ?? "").trim(),
          amt: parseFloat(r.Amount) || 0
        })).filter(e => e.desc);

        if (inventory.length === 0 && restoredBills.length === 0) {
          return alert('Invalid Excel backup!\n\nIt must contain "Inventory" and/or "Bills" sheets.\nPlease use the backup file created by this app.');
        }

        applyRestore(inventory, restoredBills, expenses);
      } catch (err) {
        alert('Restore failed: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function wa() {
  if (document.getElementById('list').children.length === 0) {
    alert("No items added!");
    return;
  }

  const shop = JSON.parse(localStorage.getItem(StoreScope.key("bharat_shop_details")) || "{}");
  const shopName = shop.shopName || "Blink Bill";
  const shopPhone = shop.shopPhone || "";

  const cname = document.getElementById('cname').value.trim() || "Customer";
  const cphone = document.getElementById('cphone').value.trim();

  const sub = parseFloat(document.getElementById('sub').innerText) || 0;
  const disc = parseFloat(document.getElementById('disc').innerText) || 0;
  const gstt = parseFloat(document.getElementById('gstt').innerText) || 0;
  const final = parseFloat(document.getElementById('final').innerText) || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN');

  let itemsList = '';
  const rows = document.getElementById('list').querySelectorAll('.row');
  rows.forEach((row, index) => {
    const name = row.querySelector('.name').innerText;
    const qty = row.querySelector('.qty').innerText;
    const price = row.querySelector('.price').innerText;
    const amount = (parseFloat(qty) * parseFloat(price)).toFixed(2);
    itemsList += `${index+1}. ${name} x ${qty} = ₹${amount}\n`;
  });

  const message = 
`*${shopName} Bill*  
Date: ${dateStr} | Time: ${timeStr}

Customer: ${cname}
${cphone ? 'Phone: ' + cphone : ''}

Items:
${itemsList}

Subtotal: ₹${sub.toFixed(2)}
Discount: -₹${disc.toFixed(2)}
GST: ₹${gstt.toFixed(2)}
*Total: ₹${final.toFixed(2)}*
  
Thank you
  
! 💚  
Come again and have a great day! 🛒
  
Pay via UPI: ${shop.upiId || 'your-upi-id@upi'}  
Scan QR to pay`;

  let waUrl = `https://wa.me/${cphone ? cphone : ''}?text=${encodeURIComponent(message)}`;

  const upiQR = localStorage.getItem("upiQRUrl");
  if (upiQR) {
    alert("A QR image is available. Attach it manually in WhatsApp or use an upcoming update for automatic sharing.");
  }

  window.open(waUrl, '_blank');
}

function print() {
  const listDiv = document.getElementById('list');
  if (!listDiv) {
    alert("List container not found, check in list ");
    return;
  }

  const rows = listDiv.querySelectorAll('div.row');
  if (rows.length === 0) {
    alert("No items added! First add some items!");
    return;
  }

  const shop = JSON.parse(localStorage.getItem(StoreScope.key("bharat_shop_details")) || "{}");
  const shopName = shop.shopName || "Blink Bill";
  const shopAddress = shop.shopAddress || "";
  const shopPhone = shop.shopPhone || "";
  const shopGST = shop.shopGST || "";
  const counterNo = shop.counterNo || "Main Counter";

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN');

  let billNo = localStorage.getItem(StoreScope.key("lastBillNo")) || 1000;
  billNo = parseInt(billNo) + 1;
  localStorage.setItem(StoreScope.key("lastBillNo"), billNo);

  let itemsHtml = '';
  let subtotal = 0;
  let totalGst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let grandTotal = 0;

  rows.forEach((row, index) => {
    const name = row.querySelector('.name')?.innerText || "Unknown";
    const qty = parseFloat(row.querySelector('.qty')?.innerText) || 0;
    const price = parseFloat(row.querySelector('.price')?.innerText) || 0;
    const gstPer = parseFloat(row.querySelector('.gst')?.innerText) || 0;

    const amount = qty * price;
    const gstAmt = amount * (gstPer / 100);
    const halfGst = gstAmt / 2;

    subtotal += amount;
    totalGst += gstAmt;
    totalCgst += halfGst;
    totalSgst += halfGst;

    itemsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${qty}</td>
        <td>₹${price.toFixed(2)}</td>
        <td>${gstPer}%</td>
        <td>₹${halfGst.toFixed(2)}</td>
        <td>₹${halfGst.toFixed(2)}</td>
        <td>₹${amount.toFixed(2)}</td>
      </tr>
    `;
  });

  const discAmt = parseFloat(document.getElementById('disc')?.innerText) || 0;
  grandTotal = subtotal - discAmt + totalGst;

  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Popup blocked. Allow popups to print.'); return; }
  printWindow.document.write(`
    <html>
    <head>
      <title>Bill - ${billNo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background: #f0f0f0; }
        .total { font-weight: bold; font-size: 16px; text-align: right; }
        .thanks { text-align: center; margin-top: 30px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${shopName}</h2>
        <p>${shopAddress}</p>
        <p>Phone: ${shopPhone} | GST: ${shopGST} | Counter: ${counterNo}</p>
        <p>Bill No: ${billNo} | Date: ${dateStr} | Time: ${timeStr}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sl.No</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>GST%</th>
            <th>CGST</th>
            <th>SGST</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="total">
        <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
        <p>Discount: -₹${discAmt.toFixed(2)}</p>
        <p>CGST Total: ₹${totalCgst.toFixed(2)}</p>
        <p>SGST Total: ₹${totalSgst.toFixed(2)}</p>
        <p>Total GST: ₹${totalGst.toFixed(2)}</p>
        <p style="font-size:18px;">Grand Total: ₹${grandTotal.toFixed(2)}</p>
      </div>

      <div class="thanks">
        <p>Thank You! Come Again!</p>
      </div>

      <script>
        window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function upi() {
  const amt = parseFloat(document.getElementById("final").innerText);
  if (!amt || amt <= 0) return alert("Add items first!");

  // Safety: stash cart so it survives navigation (auto-print restore)
  try { sessionStorage.setItem('bharat_cart_backup', JSON.stringify(cart)); } catch (e) {}

  // Show modal instantly with loading state
  document.getElementById("upiAmt").innerText = "₹" + amt.toFixed(2);
  document.getElementById("upiBankInfo").innerText = "";
  document.getElementById("upiQrBox").innerHTML = '<p style="color:#64748b;">Loading QR…</p>';
  document.getElementById("upiModal").style.display = "flex";

  // Load tiny QR library on demand (cached after first use)
  try { await LoadManager.loadQR(); } catch (e) {
    document.getElementById("upiQrBox").innerHTML = '<p style="color:#b91c1c;">QR failed to load. Check internet.</p>';
    return;
  }

  // Same active-bank logic as UPI MANAGE page
  const banks = JSON.parse(localStorage.getItem("upiBanks") || "[]");
  let activeIndex = parseInt(localStorage.getItem("activeUpiIndex"), 10);
  if (isNaN(activeIndex) || activeIndex < 0 || activeIndex >= banks.length) {
    activeIndex = banks.length > 0 ? 0 : -1;
  }
  const bank = activeIndex >= 0 ? banks[activeIndex] : null;
  const shop = JSON.parse(localStorage.getItem(StoreScope.key("bharat_shop_details")) || "{}");

  if (!bank && !shop.upiId) {
    document.getElementById("upiQrBox").innerHTML = "";
    document.getElementById("upiBankInfo").innerHTML =
      '<span style="color:#b91c1c; font-weight:bold;">⚠️ No UPI account set! Add one in UPI MANAGE first.</span>';
    return;
  }

  const upiId = bank ? bank.upiId : shop.upiId;
  const payName = bank ? bank.ownerName : (shop.shopName || "Blink Bill Store");
  document.getElementById("upiBankInfo").innerText =
    (bank ? bank.bankName + " • " : "") + upiId;

  const qrBox = document.getElementById("upiQrBox");
  qrBox.innerHTML = "";

  if (bank && bank.qrImage) {
    // Owner's own uploaded QR image
    const img = document.createElement("img");
    img.src = bank.qrImage;
    img.alt = "UPI QR";
    img.style.maxWidth = "240px";
    img.style.borderRadius = "12px";
    qrBox.appendChild(img);
  } else {
    // Live QR generated from the UPI deep link
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payName)}&am=${amt.toFixed(2)}&cu=INR&tn=Bill Payment`;
    new QRCode(qrBox, {
      text: link,
      width: 230,
      height: 230,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

function closeUpiModal(printBill) {
  document.getElementById("upiModal").style.display = "none";
  if (printBill) completePaidBill();
}

// Payment verified → auto-save the bill (online), print, then clear cart
// so the NEXT bill always starts fresh with no old products leaking in.
function onPaymentReceived() {
  document.getElementById("upiModal").style.display = "none";
  completePaidBill();
}

function completePaidBill() {
  if (!cart.length) return;
  storeBill("online");          // auto-save: payment already received
  print();                      // print current items (reads DOM synchronously)
  clearCartAfterBill();         // fresh cart for next customer
  showToast("✅ Payment verified! Bill saved & printing...");
}

// Auto-archive: bills older than 2 months move from localStorage to IndexedDB.
// Keeps localStorage small & fast; history/dashboard still show archived bills
// by merging ArchiveDB data. Archived bills are included in Excel backups.
async function autoArchiveOldBills() {
  try {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // 2 months
    const oldBills = bills.filter(b => new Date(b.date).getTime() < cutoff);
    if (!oldBills.length) return;
    await ArchiveDB.addMany(oldBills);
    bills = bills.filter(b => new Date(b.date).getTime() >= cutoff);
    localStorage.setItem(StoreScope.key("bharat_bills"), JSON.stringify(bills));
    showToast(`📦 ${oldBills.length} old bill(s) moved to archive — space freed!`);
  } catch (e) {
    console.error("auto-archive failed", e); // non-fatal: billing continues normally
  }
}

function logout() {
  if (confirm("Logout?")) {
    location.href = "login.html";
  }
}

function toggleMode() {
  toggleTheme(); // shared theme engine (utils.js)

  const loader = document.getElementById("bharatLoader");
  if (loader) {
    loader.style.background = document.body.classList.contains("dark") ? "#0b1120" : "#f5fbf4";
    loader.style.color = document.body.classList.contains("dark") ? "#ffffff" : "#0f172a";
  }
}

async function exportData() {
  // Load Excel library only when backup is requested (Load Manager)
  try { await LoadManager.loadExcel(); } catch (e) { return alert("Excel library load failed! Check internet."); }
  const XLSX = window.XLSX;

  // Sheet 1: Inventory
  const invRows = items.map(i => ({
    Name: i.name || "",
    Stock: Number(i.stock) || 0,
    Price: Number(i.price) || 0,
    GST: Number(i.gst) || 0,
    Barcode: i.barcode || "",
    InitialStock: Number(i.initialStock ?? i.stock) || 0
  }));

  // Sheet 2: Bills (items kept as JSON column so restore is lossless)
  // Active + archived bills are BOTH included — backup is always complete
  const archivedBills = await ArchiveDB.getAll();
  const allBillsForBackup = [...bills, ...archivedBills];
  const billRows = allBillsForBackup.map(b => ({
    ID: b.id || "",
    Date: b.date || "",
    Customer: b.name || "",
    Phone: b.phone || "",
    Payment: b.paymentMode || "cash",
    Subtotal: Number(b.subtotal) || 0,
    Discount: Number(b.discount) || 0,
    GST: Number(b.gst) || 0,
    Total: Number(b.total) || 0,
    ItemsCount: b.itemsCount ?? (b.items ? b.items.length : 0),
    ItemsJSON: JSON.stringify(b.items || [])
  }));

  // Sheet 3: Expenses
  const expRows = (JSON.parse(localStorage.getItem(StoreScope.key("bharat_expenses")) || "[]")).map(e => ({
    Date: e.date || "",
    Description: e.desc || "",
    Amount: Number(e.amt) || 0
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows.length ? invRows : [{ Name: "" }]), "Inventory");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(billRows.length ? billRows : [{ ID: "" }]), "Bills");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Date: "" }]), "Expenses");

  const fileName = `BlinkBill_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const saved = await saveBlob(fileName, blob);
  if (saved !== false) showToast("✅ Excel backup downloaded! (Inventory + Bills + Expenses)");
}

function dailyClose() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (todayBills.length === 0) return alert("No sales today.");

  const total = todayBills.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
  const cash = todayBills.filter(b => b.paymentMode === "cash").reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
  const online = total - cash;

  let report = `*DAILY CLOSE REPORT*\n\n`;
  report += `Date: ${today}\n`;
  report += `Total Sales: ₹${total.toFixed(2)}\n`;
  report += `Cash: ₹${cash.toFixed(2)}\n`;
  report += `Online/UPI: ₹${online.toFixed(2)}\n`;
  report += `Bills: ${todayBills.length}\n\n`;
  report += `Have a strong finish to your day! 💪`;

  if (confirm(report + "\n\nSend via WhatsApp?")) {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(report)}`);
  }
}

function generateCode() {
  const name = document.getElementById('pname').value.trim();
  const stock = parseInt(document.getElementById('pstock').value) || 0;
  const price = parseFloat(document.getElementById('pprice').value) || 0;
  const gst = parseFloat(document.getElementById('pgst').value) || 0;
  let barcode = document.getElementById('pbarcode').value.trim();
  
  if (!barcode) {
    barcode = "AUTO-" + Date.now();
  }

  if (!name || stock <= 0 || price <= 0) {
    alert("Product name, stock, and price are required.");
    return;
  }

  const i = items.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (i !== -1) {
    items[i].stock = stock;
    items[i].price = price;
    items[i].gst = gst;
    items[i].barcode = barcode;
    items[i].initialStock = items[i].initialStock || stock;
  } else {
    items.push({ name, stock, price, gst, barcode, initialStock: stock });
  }

  localStorage.setItem(StoreScope.key("bharat_inventory"), JSON.stringify(items));

  const codeType = document.querySelector('input[name="codeType"]:checked').value;
  document.getElementById("generatedCode").innerHTML = "";

  if (codeType === "qr") {
    document.getElementById("codeTitle").innerText = "Product QR Code";
    new QRCode(document.getElementById("generatedCode"), {
      text: JSON.stringify({ name, barcode, price, gst }),
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    document.getElementById("codeTitle").innerText = "Product Barcode";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "generatedBarcode";
    document.getElementById("generatedCode").appendChild(svg);
    JsBarcode("#generatedBarcode", barcode, {
      format: "CODE128",
      lineColor: "#000",
      width: 2,
      height: 100,
      fontSize: 20,
      displayValue: true
    });
  }

  document.getElementById("codeSection").style.display = "block";
  alert(codeType.toUpperCase() + " generated successfully! Please print it. 🎉");
}

function printCode() {
  const pname = document.getElementById('pname').value.trim() || "Product";
  const generated = document.getElementById("generatedCode").innerHTML;
  const codeType = document.querySelector('input[name="codeType"]:checked').value;

  const win = window.open('', '_blank');
  const htmlContent = '<!DOCTYPE html><html><head><title>' + pname + ' - ' + codeType + '</title><style>body{text-align:center;font-family:Arial,sans-serif;padding:30px;background:white;}h2{color:#006400;margin:20px 0;}h3{color:#333;}div{max-width:400px;margin:30px auto;display:block;}svg{max-width:100%;}canvas{max-width:100%;}@media print{body{padding:0;margin:0;}.no-print{display:none;}}</style></head><body><h2>' + pname + '</h2><h3>Product ' + codeType.toUpperCase() + '</h3><div>' + generated + '</div></body></html>';
  
  win.document.write(htmlContent);
  win.document.close();
  
  setTimeout(() => {
    win.print();
  }, 500);
}

function generateDynamicUPIQR(amount) {
  const shop = JSON.parse(localStorage.getItem(StoreScope.key("bharat_shop_details")) || "{}");
  const upiId = shop.upiId || "yourupi@upi";
  const shopName = shop.shopName || "Blink Bill";
  const transactionNote = "Bill Payment - Blink Bill";

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  const qrContainer = document.createElement('div');
  qrContainer.id = 'dynamic-qr-temp';
  qrContainer.style.display = 'none';
  document.body.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: upiLink,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    const canvas = qrContainer.querySelector('canvas');
    const qrBase64 = canvas.toDataURL('image/png');
    document.body.removeChild(qrContainer);

    sendWhatsAppWithQR(qrBase64);
  }, 500);
}

function sendWhatsAppWithQR(qrBase64) {
  alert("QR ready! Attach it in WhatsApp or save the image.");
}

async function showTodayStats() {
  // Load Chart.js only when stats are opened (Load Manager)
  try { await LoadManager.loadCharts(); } catch (e) { /* chart skipped if offline */ }

  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (todayBills.length === 0) return alert("No sales today.");

  const total = todayBills.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
  const cash = todayBills.filter(b => b.paymentMode === "cash").reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
  const online = total - cash;

  const ctx = document.createElement('canvas');
  ctx.id = 'todayChart';
  ctx.style.maxWidth = '500px';
  ctx.style.margin = '20px auto';

  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const content = document.createElement('div');
  content.style.background = 'white';
  content.style.padding = '30px';
  content.style.borderRadius = '12px';
  content.style.maxWidth = '600px';
  content.innerHTML = `
    <h2 style="text-align:center;">📊 TODAY STATS 📊</h2>
    <p>Total Sales: ₹${total.toFixed(2)}</p>
    <p>Cash: ₹${cash.toFixed(2)}</p>
    <p>Online/UPI: ₹${online.toFixed(2)}</p>
    <p>Bills: ${todayBills.length}</p>
    <div id="chartContainer"></div>
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top:20px; padding:10px 20px; background:#d32f2f; color:white; border:none; border-radius:8px;">Close</button>
  `;

  content.querySelector('#chartContainer').appendChild(ctx);
  modal.appendChild(content);
  document.body.appendChild(modal);

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Cash', 'Online/UPI'],
      datasets: [{
        data: [cash, online],
        backgroundColor: ['#2196f3', '#4caf50']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}

async function downloadPDF() {
  // Load jsPDF only when PDF download is requested (Load Manager)
  try { await LoadManager.loadPDF(); } catch (e) { return alert("PDF library load failed! Check internet."); }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Blink Bill", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text("Bill No: " + (parseInt(localStorage.getItem(StoreScope.key("lastBillNo")) || 0) + 1), 20, 40);
  doc.text("Date: " + new Date().toLocaleDateString(), 20, 50);

  let y = 70;
  cart.forEach(item => {
    doc.text(`${item.name} x ${item.qty} = ₹${(item.qty * item.price).toFixed(2)}`, 20, y);
    y += 10;
  });

  doc.text("Total: ₹" + document.getElementById('final').innerText, 20, y + 20);

  const blob = doc.output("blob");
  await saveBlob("bill.pdf", blob);
}

function updateCart() {
  const listEl = document.getElementById("list");
  if (!listEl) return;
  listEl.innerHTML = "";
  
  if (cart.length === 0) {
    listEl.innerHTML = "<p>No items yet.</p>";
    return;
  }

  cart.forEach((item, i) => {
    const total = item.qty * item.price * (1 + item.gst / 100);
    const row = document.createElement("div");
    row.className = "row";
    
    row.innerHTML = `
      <span class="name"></span>
      <span class="qty">${item.qty}</span>
      <span class="price">${item.price}</span>
      <span class="gst">${item.gst}</span>
      <span>₹${total.toFixed(2)}</span>
      <button style="background:red;color:white;padding:5px 10px;border:none;border-radius:8px;">×</button>
    `;
    row.querySelector(".name").textContent = item.name;
    row.querySelector("button").onclick = () => {
      cart.splice(i, 1);
      updateCart();
      calc();
      updateStockStatus();
    };
    listEl.appendChild(row);
  });
}

updateCart();
calc();
updateStockStatus();
document.getElementById("search")?.focus();

autoArchiveOldBills(); // 2+ month old bills → IndexedDB archive (quota protection)

// Background preload: QR library ready BEFORE owner taps UPI PAY (silent, 3s after load)
window.addEventListener("load", () => {
  setTimeout(() => { try { LoadManager.loadQR(); } catch (e) {} }, 3000);
});

// Auto-print after returning from a UPI payment (restoreprint=1 in URL):
// restores the stashed cart, saves the bill as paid (online), prints, clears cart.
(function restoreAndPrint() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('restoreprint') !== '1') return;

    // Clean the URL immediately so a refresh can never re-trigger this
    history.replaceState(null, "", location.pathname);

    const saved = JSON.parse(sessionStorage.getItem('bharat_cart_backup') || 'null');
    if (saved && Array.isArray(saved) && saved.length) {
      cart = saved;
      updateCart();
      calc();
      updateStockStatus();
      sessionStorage.removeItem('bharat_cart_backup');
      storeBill("online");
      setTimeout(() => { print(); clearCartAfterBill(); }, 800);
    }
  } catch (e) { console.error('restore-print failed', e); }
})();