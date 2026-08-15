/* ==========================================================================
   SHONE PARFUMERIE - SUPABASE CLIENT INTEGRATION (STEP 5 & 6)
   ========================================================================== */

// Configure your Supabase Credentials here or via window.ENV
const SUPABASE_URL = window.SUPABASE_URL || "https://your-supabase-project.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "your-anon-key";

let supabaseClient = null;

// Initialize Supabase if SDK is loaded from CDN and credentials are provided
if (typeof supabase !== 'undefined' && SUPABASE_URL !== "https://your-supabase-project.supabase.co") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Shone Parfumerie: Connecté avec succès à Supabase.");
} else {
  console.log("Shone Parfumerie: Mode LocalStorage actif (Prêt pour synchronisation Supabase).");
}

// Database Helper API Wrapper
const ShoneDB = {
  // 1. Fetch Products
  async getProducts() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('products').select('*');
      if (!error && data && data.length > 0) return data;
    }
    return JSON.parse(localStorage.getItem('shone_products')) || PRODUCTS_DATA;
  },

  // 2. Add or Update Product
  async saveProduct(productData) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('products').upsert([productData]).select();
      if (!error) return data[0];
    }
    const products = JSON.parse(localStorage.getItem('shone_products')) || [...PRODUCTS_DATA];
    const idx = products.findIndex(p => p.id === productData.id);
    if (idx > -1) {
      products[idx] = { ...products[idx], ...productData };
    } else {
      products.push(productData);
    }
    localStorage.setItem('shone_products', JSON.stringify(products));
    return productData;
  },

  // 3. Create Order
  async createOrder(orderObj) {
    if (supabaseClient) {
      const { data: orderData, error: orderErr } = await supabaseClient
        .from('orders')
        .insert([{
          order_number: orderObj.orderNumber,
          customer_name: orderObj.customer.name,
          phone: orderObj.customer.phone,
          city: orderObj.customer.city,
          neighborhood: orderObj.customer.neighborhood,
          address: orderObj.customer.address,
          landmark: orderObj.customer.landmark,
          delivery_fee: orderObj.deliveryFee,
          subtotal: orderObj.subtotal,
          total: orderObj.total,
          status: orderObj.status || 'Commande reçue'
        }])
        .select();

      if (!orderErr && orderData && orderData.length > 0) {
        const orderId = orderData[0].id;
        const itemsToInsert = orderObj.items.map(item => ({
          order_id: orderId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        }));
        await supabaseClient.from('order_items').insert(itemsToInsert);
        return orderData[0];
      }
    }

    // LocalStorage Fallback
    const orders = JSON.parse(localStorage.getItem('shone_orders')) || [];
    orders.push(orderObj);
    localStorage.setItem('shone_orders', JSON.stringify(orders));
    return orderObj;
  },

  // 4. Fetch All Orders (For Admin)
  async getOrders() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('shone_orders')) || [];
  },

  // 5. Update Order Status
  async updateOrderStatus(orderNumber, newStatus) {
    if (supabaseClient) {
      await supabaseClient.from('orders').update({ status: newStatus }).eq('order_number', orderNumber);
    }
    const orders = JSON.parse(localStorage.getItem('shone_orders')) || [];
    const order = orders.find(o => o.orderNumber === orderNumber);
    if (order) {
      order.status = newStatus;
      localStorage.setItem('shone_orders', JSON.stringify(orders));
    }
  }
};
