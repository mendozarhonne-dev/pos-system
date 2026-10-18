
const KEY = "itaewon_pos_v1";

const sampleProducts = [
  {id:1,name:"Americano",category:"Coffee",price:39,cost:12,stock:100},
  {id:2,name:"Cafe Latte",category:"Coffee",price:49,cost:18,stock:100},
  {id:3,name:"Caramel Latte",category:"Coffee",price:59,cost:22,stock:100},
  {id:4,name:"Caramel Matcha Latte",category:"Matcha",price:67,cost:28,stock:50},
  {id:5,name:"Milk Tea",category:"Milk Tea",price:49,cost:20,stock:80},
  {id:6,name:"Fruit Soda",category:"Non-Coffee",price:39,cost:14,stock:80},
  {id:7,name:"Fries",category:"Food",price:45,cost:25,stock:40},
  {id:8,name:"Chicken Wings",category:"Food",price:99,cost:60,stock:30}
];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.products)) {
      return {
        products: saved.products,
        orders: saved.orders || [],
        expenses: saved.expenses || [],
        nextId: saved.nextId || 9
      };
    }
  } catch(e) {}
  return {
    products: sampleProducts.map(p => ({...p})),
    orders: [],
    expenses: [],
    nextId: 9
  };
}

let db = loadData();
let cart = [];
let page = "pos";
let category = "All";
let searchText = "";

const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {
  minimumFractionDigits:2, maximumFractionDigits:2
});

const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function notify(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

document.getElementById("date").textContent =
  new Date().toLocaleDateString(undefined, {
    weekday:"short", month:"short", day:"numeric", year:"numeric"
  });

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    page = button.dataset.page;
    document.querySelectorAll("[data-page]").forEach(b =>
      b.classList.toggle("active", b === button)
    );
    render();
  });
});

function panel(title, body) {
  return `<section class="panel"><h2>${title}</h2>${body}</section>`;
}

function render() {
  const titles = {
    pos:"POS / Checkout", products:"Products", inventory:"Inventory",
    sales:"Sales Reports", expenses:"Expenses", settings:"Backup / Settings"
  };
  document.getElementById("title").textContent = titles[page];
  const app = document.getElementById("app");
  app.innerHTML = ({
    pos:posPage, products:productsPage, inventory:inventoryPage,
    sales:salesPage, expenses:expensesPage, settings:settingsPage
  })();
  bind();
}

function posPage() {
  const categories = ["All", ...new Set(db.products.map(p=>p.category))];
  const products = db.products.filter(p =>
    (category === "All" || p.category === category) &&
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );
  const total = cart.reduce((s,p)=>s+p.price*p.qty,0);

  return `<div class="layout">
    ${panel("Menu", `
      <input id="search" class="search" placeholder="Search products..."
        value="${escapeHTML(searchText)}">
      <div class="categories">
        ${categories.map(c=>`<button class="chip ${category===c?"active":""}"
          data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("")}
      </div>
      <div class="products">
        ${products.map(p=>`<button class="product" data-add="${p.id}">
          <b>${escapeHTML(p.name)}</b>
          <small>${escapeHTML(p.category)}</small>
          <span class="price">${money(p.price)}</span>
        </button>`).join("") || '<div class="empty">No products found.</div>'}
      </div>
    `)}
    ${panel("Current Order", `
      <div class="row"><span class="muted">Items in cart</span>
        <button class="btn secondary" id="clear">Clear</button></div>
      ${cart.map(p=>`<div class="cart-item">
        <div><b>${escapeHTML(p.name)}</b><br><span class="muted">${money(p.price)}</span></div>
        <div class="qty">
          <button data-minus="${p.id}">−</button><b>${p.qty}</b>
          <button data-plus="${p.id}">+</button>
        </div>
      </div>`).join("") || '<div class="empty">Add a product to begin.</div>'}
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><b>${money(total)}</b></div>
        <div class="total-row grand"><span>Total</span><span>${money(total)}</span></div>
      </div>
      <div class="field"><label>Cash received (₱)</label>
        <input id="cash" type="number" min="0" step=".01" placeholder="${total.toFixed(2)}">
      </div>
      <div class="total-row"><span>Change</span><b id="change">${money(0)}</b></div>
      <button class="btn primary full" id="checkout" ${cart.length?"":"disabled"}>
        Complete Sale
      </button>
    `)}
  </div>`;
}

function productsPage() {
  return panel("Menu Products", `
    <button class="btn primary" id="add-product">+ Add Product</button>
    <div class="table-wrap"><table>
      <thead><tr><th>Product</th><th>Category</th><th>Price</th>
      <th>Cost</th><th>Stock</th><th>Actions</th></tr></thead>
      <tbody>${db.products.map(p=>`<tr>
        <td>${escapeHTML(p.name)}</td><td>${escapeHTML(p.category)}</td>
        <td>${money(p.price)}</td><td>${money(p.cost)}</td><td>${p.stock}</td>
        <td><button class="btn secondary" data-edit="${p.id}">Edit</button>
        <button class="btn secondary" data-delete="${p.id}">Delete</button></td>
      </tr>`).join("")}</tbody>
    </table></div>
  `);
}

function inventoryPage() {
  return panel("Inventory", `
    <p class="muted">Stock is tracked by sellable product. Ingredient recipes are not included yet.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Product</th><th>Stock</th><th>New stock</th><th>Status</th></tr></thead>
      <tbody>${db.products.map(p=>`<tr>
        <td>${escapeHTML(p.name)}</td><td>${p.stock}</td>
        <td><input type="number" min="0" id="stock-${p.id}" value="${p.stock}">
          <button class="btn secondary" data-stock="${p.id}">Save</button></td>
        <td>${p.stock<=10?'<b style="color:#b33">Low stock</b>':"In stock"}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  `);
}

function salesPage() {
  const day = new Date().toDateString();
  const today = db.orders.filter(o=>new Date(o.date).toDateString()===day);
  const total = today.reduce((s,o)=>s+o.total,0);
  const cost = today.reduce((s,o)=>s+o.cost,0);
  const expenses = db.expenses.filter(e=>new Date(e.date).toDateString()===day)
    .reduce((s,e)=>s+e.amount,0);

  return `<div class="metrics">
    <div class="metric"><small>Today's Sales</small><strong>${money(total)}</strong></div>
    <div class="metric"><small>Orders Today</small><strong>${today.length}</strong></div>
    <div class="metric"><small>Estimated Net</small><strong>${money(total-cost-expenses)}</strong></div>
  </div>${panel("Order History", `
    <button class="btn primary" id="export-sales">Export CSV</button>
    <div class="table-wrap"><table><thead><tr>
      <th>Date</th><th>Items</th><th>Total</th><th>Est. Cost</th><th>Cash</th>
    </tr></thead><tbody>
      ${[...db.orders].reverse().map(o=>`<tr>
        <td>${new Date(o.date).toLocaleString()}</td>
        <td>${o.items.map(i=>`${escapeHTML(i.name)} ×${i.qty}`).join(", ")}</td>
        <td>${money(o.total)}</td><td>${money(o.cost)}</td><td>${money(o.cash)}</td>
      </tr>`).join("") || '<tr><td colspan="5">No sales yet.</td></tr>'}
    </tbody></table></div>
  `)}`;
}

function expensesPage() {
  return `<div class="layout">
    ${panel("Record Expense", `<form id="expense-form">
      <div class="field"><label>Description</label><input name="name" required placeholder="Milk, cups, electricity..."></div>
      <div class="field"><label>Amount (₱)</label><input name="amount" type="number" min=".01" step=".01" required></div>
      <button class="btn primary">Save Expense</button>
    </form>`)}
    ${panel("Expense History", `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${[...db.expenses].reverse().map(e=>`<tr>
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td>${escapeHTML(e.name)}</td><td>${money(e.amount)}</td>
      </tr>`).join("") || '<tr><td colspan="3">No expenses yet.</td></tr>'}</tbody>
    </table></div>`)}
  </div>`;
}

function settingsPage() {
  return panel("Data Backup", `
    <p>Your records are saved in this browser on this device.</p>
    <button class="btn primary" id="backup">Download Backup</button>
    <label class="btn secondary">Import Backup
      <input type="file" id="restore" accept=".json,application/json" hidden>
    </label>
    <p class="notice">Export backups regularly. This version has no secure login and does not synchronize between devices.</p>
    <button class="btn secondary" id="reset">Reset Sample Data</button>
  `);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const a = document.createElement("a");
  a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function csv(rows) {
  return rows.map(row=>row.map(v=>
    '"' + String(v ?? "").replace(/"/g,'""') + '"'
  ).join(",")).join("\r\n");
}

function bind() {
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{
    category=b.dataset.category; render();
  });

  const search=document.getElementById("search");
  if(search) search.oninput=e=>{
    searchText=e.target.value;
    const cursor=search.selectionStart;
    render();
    const next=document.getElementById("search");
    next.focus(); next.setSelectionRange(cursor,cursor);
  };

  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
    const p=db.products.find(p=>p.id===+b.dataset.add);
    if(p.stock<1){notify("Out of stock.");return;}
    const item=cart.find(x=>x.id===p.id);
    if(item){
      if(item.qty>=p.stock){notify("Not enough stock.");return;}
      item.qty++;
    } else cart.push({...p,qty:1});
    render();
  });

  document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{
    const item=cart.find(p=>p.id===+b.dataset.minus);
    item.qty--;
    if(item.qty<=0) cart=cart.filter(p=>p!==item);
    render();
  });

  document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{
    const item=cart.find(p=>p.id===+b.dataset.plus);
    const p=db.products.find(p=>p.id===item.id);
    if(item.qty>=p.stock){notify("Not enough stock.");return;}
    item.qty++; render();
  });

  const clear=document.getElementById("clear");
  if(clear) clear.onclick=()=>{cart=[];render();};

  const cash=document.getElementById("cash");
  if(cash) cash.oninput=()=>{
    const total=cart.reduce((s,p)=>s+p.price*p.qty,0);
    document.getElementById("change").textContent=
      money(Math.max(0,Number(cash.value||0)-total));
  };

  const checkout=document.getElementById("checkout");
  if(checkout) checkout.onclick=()=>{
    const total=cart.reduce((s,p)=>s+p.price*p.qty,0);
    const received=Number(document.getElementById("cash").value || total);
    if(received<total){notify("Cash is less than the total.");return;}
    for(const item of cart){
      const p=db.products.find(p=>p.id===item.id);
      if(!p || p.stock<item.qty){notify("Check stock before checkout.");return;}
    }
    const order={
      id:Date.now(),date:new Date().toISOString(),
      items:cart.map(p=>({id:p.id,name:p.name,qty:p.qty,price:p.price,cost:p.cost})),
      total,cost:cart.reduce((s,p)=>s+p.cost*p.qty,0),cash:received
    };
    order.items.forEach(i=>db.products.find(p=>p.id===i.id).stock-=i.qty);
    db.orders.push(order); save(); cart=[]; render();
    notify("Sale saved successfully.");
  };

  const add=document.getElementById("add-product");
  if(add) add.onclick=()=>{
    const name=prompt("Product name?");
    if(!name?.trim())return;
    const category=prompt("Category?","Coffee")||"Other";
    const price=Number(prompt("Selling price in pesos?","39"));
    const cost=Number(prompt("Estimated cost per item?","12"));
    const stock=Number(prompt("Starting stock?","100"));
    if(!Number.isFinite(price)||price<0||!Number.isFinite(cost)||cost<0||
       !Number.isFinite(stock)||stock<0){notify("Invalid number.");return;}
    db.products.push({id:db.nextId++,name:name.trim(),category,price,cost,stock});
    save();render();
  };

  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
    const p=db.products.find(p=>p.id===+b.dataset.edit);
    const name=prompt("Product name:",p.name);
    if(name===null)return;
    const price=Number(prompt("Selling price:",p.price));
    const cost=Number(prompt("Estimated cost:",p.cost));
    const cat=prompt("Category:",p.category);
    if(!Number.isFinite(price)||price<0||!Number.isFinite(cost)||cost<0){
      notify("Invalid number.");return;
    }
    p.name=name.trim()||p.name;p.price=price;p.cost=cost;p.category=cat||p.category;
    save();render();
  });

  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{
    if(confirm("Delete this product?")){
      db.products=db.products.filter(p=>p.id!==+b.dataset.delete);
      cart=cart.filter(p=>p.id!==+b.dataset.delete);
      save();render();
    }
  });

  document.querySelectorAll("[data-stock]").forEach(b=>b.onclick=()=>{
    const p=db.products.find(p=>p.id===+b.dataset.stock);
    const value=Number(document.getElementById("stock-"+p.id).value);
    if(!Number.isFinite(value)||value<0){notify("Invalid stock quantity.");return;}
    p.stock=value;save();render();notify("Stock updated.");
  });

  const form=document.getElementById("expense-form");
  if(form) form.onsubmit=e=>{
    e.preventDefault();
    const data=new FormData(form);
    db.expenses.push({date:new Date().toISOString(),
      name:data.get("name").trim(),amount:Number(data.get("amount"))});
    save();render();notify("Expense saved.");
  };

  const exportSales=document.getElementById("export-sales");
  if(exportSales) exportSales.onclick=()=>download("itaewon-sales.csv",
    csv([["Date","Items","Total","Estimated Cost","Cash"],
      ...db.orders.map(o=>[o.date,o.items.map(i=>`${i.name} x${i.qty}`).join("; "),o.total,o.cost,o.cash])]),
    "text/csv");

  const backup=document.getElementById("backup");
  if(backup) backup.onclick=()=>download("itaewon-pos-backup.json",
    JSON.stringify(db,null,2),"application/json");

  const restore=document.getElementById("restore");
  if(restore) restore.onchange=async()=>{
    try {
      const file=restore.files[0]; if(!file)return;
      const data=JSON.parse(await file.text());
      if(!Array.isArray(data.products)||!Array.isArray(data.orders)||
         !Array.isArray(data.expenses)) throw Error("Invalid backup");
      db={products:data.products,orders:data.orders,expenses:data.expenses,
        nextId:data.nextId||9};
      save();cart=[];render();notify("Backup imported.");
    } catch(e){notify("Invalid backup file.");}
  };

  const reset=document.getElementById("reset");
  if(reset) reset.onclick=()=>{
    if(confirm("Erase this browser's POS data and restore the sample menu?")){
      db={products:sampleProducts.map(p=>({...p})),orders:[],expenses:[],nextId:9};
      cart=[];save();render();notify("Sample data restored.");
    }
  };
}

render();
