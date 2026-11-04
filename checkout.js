const WHATSAPP_NUMBER = "8801916551788";
const CART_KEY = "smartBazarCart";

let db;
let auth;
let orderSubmitting = false;

const $ = id => document.getElementById(id);

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
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

function getOptions(item) {
  if (Array.isArray(item.options) && item.options.length) {
    return item.options.map(option => String(option).trim()).filter(Boolean);
  }

  const name = String(item.name || "").toLowerCase();

  if (/চাল|rice/.test(name)) {
    return ["১ কেজি", "২ কেজি", "৫ কেজি", "১০ কেজি"];
  }

  if (/রিং|আংটি|ring/.test(name)) {
    return ["সাইজ ৬", "সাইজ ৭", "সাইজ ৮", "সাইজ ৯", "সাইজ ১০", "সাইজ ১১"];
  }

  if (/শার্ট|জামা|প্যান্ট|টি-শার্ট|shirt|pant|t-shirt|dress|কাপড়/.test(name)) {
    return ["S", "M", "L", "XL", "XXL"];
  }

  return [];
}

function calculateTotal(cart) {
  return cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
}

function renderCheckout() {
  const container = $("checkoutItems");
  if (!container) return;

  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = "<p>আপনার কার্ট খালি।</p>";
    return;
  }

  let cartChanged = false;

  cart.forEach(item => {
    const options = getOptions(item);

    if (options.length && !options.includes(item.selectedOption)) {
      item.selectedOption = options[0];
      cartChanged = true;
    }
  });

  if (cartChanged) saveCart(cart);

  container.innerHTML = cart.map(item => {
    const options = getOptions(item);

    let optionLabel = "অপশন নির্বাচন করুন";
    if (item.productType === "clothing") optionLabel = "সাইজ নির্বাচন করুন";
    if (item.productType === "weight") optionLabel = "ওজন নির্বাচন করুন";
    if (item.productType === "ring") optionLabel = "রিং সাইজ নির্বাচন করুন";

    return `
      <div style="padding:14px;border-bottom:1px solid #555">
        <strong>${escapeHTML(item.name)}</strong>
        <p>দাম: ৳${Number(item.price || 0).toLocaleString("en-US")}</p>

        ${
          options.length
            ? `
              <label>${optionLabel}</label>
              <select data-option="${escapeHTML(item.id)}"
                style="padding:10px;width:100%;margin:8px 0">
                ${options.map(option => `
                  <option value="${escapeHTML(option)}"
                    ${item.selectedOption === option ? "selected" : ""}>
                    ${escapeHTML(option)}
                  </option>
                `).join("")}
              </select>
            `
            : `<p>এই পণ্যের জন্য কোনো সাইজ / ওজন যোগ করা হয়নি।</p>`
        }

        <p>পণ্যের সংখ্যা:</p>
        <button type="button" data-minus="${escapeHTML(item.id)}">−</button>
        <span style="padding:10px">${Number(item.quantity || 1)}</span>
        <button type="button" data-plus="${escapeHTML(item.id)}">+</button>
        <button type="button" data-remove="${escapeHTML(item.id)}">বাদ দিন</button>
      </div>
    `;
  }).join("");

  container.insertAdjacentHTML("beforeend", `
    <div style="padding:15px">
      <h3>সর্বমোট: ৳${calculateTotal(cart).toLocaleString("en-US")}</h3>
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

$("checkoutItems")?.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.plus) changeQuantity(button.dataset.plus, 1);
  if (button.dataset.minus) changeQuantity(button.dataset.minus, -1);
  if (button.dataset.remove) removeCartItem(button.dataset.remove);
});

$("checkoutItems")?.addEventListener("change", event => {
  const select = event.target.closest("[data-option]");
  if (!select) return;

  const cart = getCart();
  const item = cart.find(p => p.id === select.dataset.option);

  if (!item) return;

  item.selectedOption = select.value;
  saveCart(cart);
});

async function sendOrderToWhatsApp(event) {
  event.preventDefault();

  if (orderSubmitting) return;

  const cart = getCart();

  if (!cart.length) {
    alert("আপনার কার্ট খালি!");
    return;
  }

  const name = $("customerName")?.value.trim();
  const phone = $("customerPhone")?.value.trim();
  const address = $("customerAddress")?.value.trim();

  if (!name || !phone || !address) {
    alert("নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন।");
    return;
  }

  const total = calculateTotal(cart);
  const submitButton = $("checkoutForm")?.querySelector('[type="submit"]');

  orderSubmitting = true;
  if (submitButton) submitButton.disabled = true;

  try {
    // Firebase-এ অর্ডার সংরক্ষণ
    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js");

    const orderItems = cart.map(item => ({
      productId: String(item.id || ""),
      name: String(item.name || ""),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      selectedOption: String(item.selectedOption || "প্রযোজ্য নয়")
    }));

    const orderData = {
      name,
      phone,
      address,
      items: orderItems,
      total,
      status: "Pending",
      uid: auth.currentUser ? auth.currentUser.uid : null,
      createdAt: serverTimestamp()
    };

    const orderRef = await addDoc(collection(db, "orders"), orderData);

    // একই অর্ডার WhatsApp-এ পাঠানো
    const lines = [
      "SMART BAZAR 24 - NEW ORDER",
      `অর্ডার ID: ${orderRef.id}`,
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

    // অর্ডার সফলভাবে সংরক্ষিত হওয়ার পর WhatsApp খোলা হবে
    const url =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;

    window.location.href = url;

  } catch (error) {
    console.error("Order error:", error);
    alert("অর্ডার সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।\n" + error.message);

    orderSubmitting = false;
    if (submitButton) submitButton.disabled = false;
  }
}

$("checkoutForm")?.addEventListener("submit", sendOrderToWhatsApp);

// Firebase সংযোগ চালু করে Checkout প্রস্তুত করা
async function initializeCheckout() {
  try {
    const firebase = await import("./firebase.js");

    db = firebase.db;
    auth = firebase.auth;

    if (!db || !auth) {
      throw new Error("Firebase-এর db অথবা auth পাওয়া যায়নি।");
    }

    renderCheckout();

  } catch (error) {
    console.error(error);
    alert("Firebase সংযোগে সমস্যা: " + error.message);
  }
}

initializeCheckout();
