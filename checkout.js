
const WHATSAPP_NUMBER = "8801916551788";
const CART_KEY = "smartBazarCart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getOptions(name) {
  const n = String(name).toLowerCase();

  if (/চাল|rice/.test(n)) {
    return ["১ কেজি", "২ কেজি", "৫ কেজি", "১০ কেজি"];
  }

  if (/রিং|আংটি|ring/.test(n)) {
    return ["সাইজ ৬", "সাইজ ৭", "সাইজ ৮", "সাইজ ৯", "সাইজ ১০", "সাইজ ১১"];
  }

  if (/শার্ট|জামা|প্যান্ট|টি-শার্ট|shirt|pant|t-shirt|dress|কাপড়/.test(n)) {
    return ["S", "M", "L", "XL", "XXL"];
  }

  return ["প্রযোজ্য নয়"];
}

function calculateTotal(cart) {
  return cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
}

function renderCheckout() {
  const container = document.getElementById("checkoutItems");
  if (!container) return;

  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = "<p>আপনার কার্ট খালি।</p>";
    return;
  }

  container.innerHTML = cart.map(item => {
    const options = getOptions(item.name);

    return `
      <div style="padding:14px;border-bottom:1px solid #555">
        <strong>${escapeHTML(item.name)}</strong>
        <p>দাম: ৳${Number(item.price || 0)}</p>

        <label>সাইজ / পরিমাণ নির্বাচন করুন</label>
        <select data-option="${escapeHTML(item.id)}"
          style="padding:10px;width:100%;margin:8px 0">
          ${options.map(option => `
            <option value="${escapeHTML(option)}"
              ${item.selectedOption === option ? "selected" : ""}>
              ${escapeHTML(option)}
            </option>
          `).join("")}
        </select>

        <p>পণ্যের সংখ্যা:</p>
        <button type="button" data-minus="${escapeHTML(item.id)}">−</button>
        <span>${Number(item.quantity || 1)}</span>
        <button type="button" data-plus="${escapeHTML(item.id)}">+</button>
        <button type="button" data-remove="${escapeHTML(item.id)}">বাদ দিন</button>
      </div>
    `;
  }).join("");

  const total = calculateTotal(cart);

  container.insertAdjacentHTML("beforeend", `
    <div style="padding:15px">
      <h3>সর্বমোট: ৳${total.toLocaleString("en-US")}</h3>
    </div>
  `);
}

function changeQuantity(id, amount) {
  const cart = getCart();
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.quantity = Math.max(1, Number(item.quantity || 1) + amount);
  saveCart(cart);
  renderCheckout();
}

function removeCartItem(id) {
  saveCart(getCart().filter(item => item.id !== id));
  renderCheckout();
}

document.getElementById("checkoutItems")?.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.plus) changeQuantity(button.dataset.plus, 1);
  if (button.dataset.minus) changeQuantity(button.dataset.minus, -1);
  if (button.dataset.remove) removeCartItem(button.dataset.remove);
});

document.getElementById("checkoutItems")?.addEventListener("change", event => {
  const select = event.target.closest("[data-option]");
  if (!select) return;

  const cart = getCart();
  const item = cart.find(p => p.id === select.dataset.option);
  if (!item) return;

  item.selectedOption = select.value;
  saveCart(cart);
});

function sendOrderToWhatsApp(event) {
  event.preventDefault();

  const cart = getCart();

  if (!cart.length) {
    alert("আপনার কার্ট খালি!");
    return;
  }

  const name = document.getElementById("customerName")?.value.trim();
  const phone = document.getElementById("customerPhone")?.value.trim();
  const address = document.getElementById("customerAddress")?.value.trim();

  if (!name || !phone || !address) {
    alert("নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন।");
    return;
  }

  const total = calculateTotal(cart);
  const lines = [
    "SMART BAZAR 24 - NEW ORDER",
    "",
    "পণ্যের তালিকা:"
  ];

  cart.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name}`,
      `সাইজ / পরিমাণ: ${item.selectedOption || "প্রযোজ্য নয়"}`,
      `সংখ্যা: ${item.quantity}`,
      `দাম: ৳${item.price}`,
      ""
    );
  });

  lines.push(
    `সর্বমোট: ৳${total}`,
    "",
    `কাস্টমারের নাম: ${name}`,
    `মোবাইল: ${phone}`,
    `ঠিকানা: ${address}`
  );

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;

  window.location.href = url;
}

document.getElementById("checkoutForm")?.addEventListener(
  "submit",
  sendOrderToWhatsApp
);

renderCheckout();
