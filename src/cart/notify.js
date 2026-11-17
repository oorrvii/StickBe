const SERVICE_ID = "service_4w4qk8t";
const TEMPLATE_ID = "template_do8tc1z";
const PUBLIC_KEY = "D50OkpvdbTQlz70qg";

function loadEmailJs() {
  if (window.emailjs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = () => {
      window.emailjs.init(PUBLIC_KEY);
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function notifyShop(order) {
  try {
    await loadEmailJs();
    const c = order.customer;
    await window.emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      order_number: order.orderNumber,
      customer_name: c.name,
      customer_email: c.email,
      phone: c.phone,
      alt_phone: c.altPhone || "—",
      instagram_handle: c.instagram || "—",
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      note: order.note || "—",
      order_items: order.items.map((i) => `${i.name} × ${i.qty} (₹${i.price} each = ₹${i.price * i.qty})`).join("\n"),
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total: order.total,
    });
  } catch {
    // the order is already saved; a failed notification email must not block the customer
  }
}
