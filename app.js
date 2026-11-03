import { db } from "./firebase.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");

const CART_KEY = "smartBazarCart";
const WISHLIST_KEY = "smartBazarWishlist";

let products = [];

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getProduct(data, keys, fallback = "") {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return fallback;
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce(
    (total, item) => total + Number(item.quantity || 1),
    0
  );

  if (cartCount) cartCount.textContent = count;
}

function normalizeOptions(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }

  return [];
}

function renderProducts() {
  if (!productGrid) return;

  if (!products.length) {
    productGrid.innerHTML =
      '<p style="color:#a7b0bf">এখনো কোনো পণ্য যোগ করা হয়নি।</p>';
    return;
  }

  productGrid.innerHTML = products.map(product => {
    const name = safe(product.name);
    const image = safe(product.image);
    const price = Number(product.price) || 0;
    const oldPrice = Number(product.oldPrice) || 0;

    return `
      <article class="product-card">
        <div class="product-image">
          ${image
            ? `<img src="${image}" alt="${name}" loading="lazy"
                onerror="this.style.display='none'">`
            : "পণ্যের ছবি"}
        </div>

        <div class="product-info">
          <h3>${name}</h3>

          <div class="price">
            ৳ ${price.toLocaleString("en-US")}
            ${oldPrice > price
              ? `<span class="old-price">৳ ${oldPrice.toLocaleString("en-US")}</span>`
              : ""}
          </div>

          <div class="product-actions" style="flex-wrap:wrap">
            <button type="button" data-cart="${safe(product.id)}">
              কার্টে রাখুন
            </button>

            <button type="button" data-wishlist="${safe(product.id)}">
              ♡
            </button>

            <button type="button" data-order="${safe(product.id)}"
              style="flex-basis:100%;background:#d9ad50;color:#111">
              এখনই অর্ডার করুন
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function addProductToCart(product, goToCheckout = false) {
  const cart = getCart();

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity = Number(existing.quantity || 1) + 1;
    existing.productType = product.productType || "normal";
    existing.options = normalizeOptions(product.options);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image,
      quantity: 1,
      productType: product.productType || "normal",
      options: normalizeOptions(product.options),
      selectedOption: ""
    });
  }

  saveCart(cart);

  if (goToCheckout) {
    window.location.href = "checkout.html";
  } else {
    alert("পণ্যটি কার্টে যোগ হয়েছে।");
  }
}

onSnapshot(
  collection(db, "products"),
  snapshot => {
    products = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        name: getProduct(data, ["name", "title", "productName"], "নাম নেই"),
        price: getProduct(data, ["price", "sellingPrice", "salePrice"], 0),
        oldPrice: getProduct(data, ["oldPrice", "originalPrice"], 0),
        image: getProduct(data, ["image", "imageUrl", "photo", "photoURL"], ""),
        productType: getProduct(data, ["productType"], "normal"),
        options: normalizeOptions(getProduct(data, ["options"], []))
      };
    });

    renderProducts();
  },
  error => {
    console.error("Product loading error:", error);

    if (productGrid) {
      productGrid.innerHTML =
        '<p style="color:#ffaaaa">পণ্য লোড করা যায়নি। Firebase সংযোগ ও নিরাপত্তা নিয়ম পরীক্ষা করুন।</p>';
    }
  }
);

productGrid?.addEventListener("click", event => {
  const cartButton = event.target.closest("[data-cart]");
  const wishButton = event.target.closest("[data-wishlist]");
  const orderButton = event.target.closest("[data-order]");

  if (orderButton) {
    const product = products.find(
      item => item.id === orderButton.dataset.order
    );

    if (product) addProductToCart(product, true);
    return;
  }

  if (cartButton) {
    const product = products.find(
      item => item.id === cartButton.dataset.cart
    );

    if (product) addProductToCart(product);
    return;
  }

  if (wishButton) {
    const id = wishButton.dataset.wishlist;

    let wishlist = [];

    try {
      wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    } catch {
      wishlist = [];
    }

    const index = wishlist.indexOf(id);

    if (index >= 0) {
      wishlist.splice(index, 1);
      wishButton.textContent = "♡";
    } else {
      wishlist.push(id);
      wishButton.textContent = "♥";
    }

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }
});

updateCartCount();
