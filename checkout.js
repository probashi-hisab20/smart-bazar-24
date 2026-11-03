
const WHATSAPP_NUMBER = "8801916551788";
const CART_KEY = "smartBazarCart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function calculateTotal(cart, deliveryCharge = 0) {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  return {
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge
  };
}

function changeQuantity(productId, amount) {
  const cart = getCart();
  const item = cart.find(product => product.id === productId);

  if (!item) return;

  item.quantity = Math.max(1, Number(item.quantity || 1) + amount);
  saveCart(cart);
  renderCheckout();
}

function removeCartItem(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  renderCheckout();
}

function renderCheckout() {
  const container = document.getElementById("checkoutItems");
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = "<p>আপনার কার্ট খালি।</p>";
    return;
  }

  container.innerHTML = cart.map(item => `
    <div style="padding:12px;border-bottom:1px solid #555">
      <strong>${escapeHTML(item.name)}</strong>
      <p>দাম: ৳${Number(item.price || 0)}</p>
      <button type="button" data-minus="${escapeHTML(item.id)}">−</button>
      <span>${Number(item.quantity || 1)}</span>
      <button type="button" data-plus="${escapeHTML(item.id)}">+</button>
      <button type="button" data-remove="${escapeHTML(item.id)}">বাদ দিন</button>
    </div>
  `).join("");

  const totals = calculateTotal(cart, 0);

  container.insertAdjacentHTML("beforeend", `
    <div style="padding:15px">
      <p>পণ্যের মূল্য: ৳${totals.subtotal}</p>
      <p>ডেলিভারি চার্জ: ৳${totals.deliveryCharge}</p>
      <h3>সর্বমোট: ৳${totals.total}</h3>
    </div>
  `);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

document.getElementById("checkoutItems")?.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.plus) changeQuantity(button.dataset.plus, 1);
  if (button.dataset.minus) changeQuantity(button.dataset.minus, -1);
  if (button.dataset.remove) removeCartItem(button.dataset.remove);
});

function sendOrderToWhatsApp(event) {
  event.preventDefault();

  const cart = getCart();

  if (cart.length === 0) {
    alert("আপনার কার্ট খালি!");
    return;
  }

  const customerName = document.getElementById("customerName")?.value.trim();
  const customerPhone = document.getElementById("customerPhone")?.value.trim();
  const customerAddress = document.getElementById("customerAddress")?.value.trim();

  if (!customerName || !customerPhone || !customerAddress) {
    alert("নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন।");
    return;
  }

  const totals = calculateTotal(cart, 0);

  const lines = [
    "SMART BAZAR 24 - NEW ORDER",
    "",
    "পণ্যের তালিকা:"
  ];

  cart.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name}`,
      `পরিমাণ: ${item.quantity}`,
      `দাম: ৳${item.price}`,
      ""
    );
  });

  lines.push(
    `পণ্যের মোট: ৳${totals.subtotal}`,
    `ডেলিভারি চার্জ: ৳${totals.deliveryCharge}`,
    `সর্বমোট: ৳${totals.total}`,
    "",
    `কাস্টমারের নাম: ${customerName}`,
    `মোবাইল: ${customerPhone}`,
    `ঠিকানা: ${customerAddress}`
  );

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;

  window.location.href = url;
}

document.getElementById("checkoutForm")?.addEventListener(
  "submit",
  sendOrderToWhatsApp
);

renderCheckout();

