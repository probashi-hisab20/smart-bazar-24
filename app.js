
import { db } from "./firebase.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");

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

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("smartBazarCart") || "[]");
  const count = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  if (cartCount) cartCount.textContent = count;
}

function renderProducts() {
  if (!productGrid) return;

  if (products.length === 0) {
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
            ? `<img src="${image}" alt="${name}" loading="lazy" onerror="this.style.display='none'">`
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
          <div class="product-actions">
            <button type="button" data-cart="${safe(product.id)}">কার্টে রাখুন</button>
            <button type="button" data-wishlist="${safe(product.id)}">♡</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

onSnapshot(collection(db, "products"), snapshot => {
  products = snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      name: getProduct(data, ["name", "title", "productName"], "নাম নেই"),
      price: getProduct(data, ["price", "sellingPrice", "salePrice"], 0),
      oldPrice: getProduct(data, ["oldPrice", "originalPrice"], 0),
      image: getProduct(data, ["image", "imageUrl", "photo", "photoURL"], "")
    };
  });

  renderProducts();
}, error => {
  console.error("Product loading error:", error);
  if (productGrid) {
    productGrid.innerHTML =
      '<p style="color:#ffaaaa">পণ্য লোড করা যায়নি। Firebase সংযোগ ও নিরাপত্তা নিয়ম পরীক্ষা করুন।</p>';
  }
});

productGrid?.addEventListener("click", event => {
  const cartButton = event.target.closest("[data-cart]");
  const wishButton = event.target.closest("[data-wishlist]");

  if (cartButton) {
    const product = products.find(item => item.id === cartButton.dataset.cart);
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("smartBazarCart") || "[]");
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image,
        quantity: 1
      });
    }

    localStorage.setItem("smartBazarCart", JSON.stringify(cart));
    updateCartCount();
    alert("পণ্যটি কার্টে যোগ হয়েছে।");
  }

  if (wishButton) {
    const id = wishButton.dataset.wishlist;
    const wishlist = JSON.parse(localStorage.getItem("smartBazarWishlist") || "[]");
    const index = wishlist.indexOf(id);

    if (index >= 0) {
      wishlist.splice(index, 1);
      wishButton.textContent = "♡";
    } else {
      wishlist.push(id);
      wishButton.textContent = "♥";
    }

    localStorage.setItem("smartBazarWishlist", JSON.stringify(wishlist));
  }
});

updateCartCount();

