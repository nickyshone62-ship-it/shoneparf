/* ==========================================================================
   SHONE PARFUMERIE - SUPABASE & GLOBAL CLOUD SYNC ENGINE (REVIEWS, ORDERS & MESSAGES)
   ========================================================================== */

// Supabase Credentials
const SUPABASE_URL = window.SUPABASE_URL || "https://your-supabase-project.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "your-anon-key";

let supabaseClient = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL !== "https://your-supabase-project.supabase.co") {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Shone Parfumerie: Connecté avec succès à Supabase.");
  } catch (e) {
    console.warn("Supabase init info:", e);
  }
}

// --------------------------------------------------------------------------
// GLOBAL CLOUD RELAY (SYNCHRONISATION MULTI-APPAREILS SANS SERVEUR COMPLEXE)
// --------------------------------------------------------------------------
const GLOBAL_CLOUD_ENDPOINT = "https://api.kvdb.io/shone_parfumerie_store_2026";

const ShoneCloudSync = {
  // 1. Synchroniser et pousser un nouvel avis client dans le Cloud
  async pushReview(reviewObj) {
    try {
      if (supabaseClient) {
        await supabaseClient.from('reviews').insert([reviewObj]);
      }
      const existingReviews = await this.fetchCloudArray('reviews');
      existingReviews.unshift(reviewObj);
      await this.saveCloudArray('reviews', existingReviews);
    } catch (err) {
      console.log("Push review cloud info:", err);
    }
  },

  // 2. Synchroniser et pousser une nouvelle commande client dans le Cloud
  async pushOrder(orderObj) {
    try {
      if (supabaseClient) {
        await supabaseClient.from('orders').insert([orderObj]);
      }
      const existingOrders = await this.fetchCloudArray('orders');
      existingOrders.unshift(orderObj);
      await this.saveCloudArray('orders', existingOrders);
    } catch (err) {
      console.log("Push order cloud info:", err);
    }
  },

  // 3. Synchroniser et pousser un nouveau message client dans le Cloud
  async pushInboxMessage(msgObj) {
    try {
      if (supabaseClient) {
        await supabaseClient.from('messages').insert([msgObj]);
      }
      const existingMsgs = await this.fetchCloudArray('inbox');
      existingMsgs.unshift(msgObj);
      await this.saveCloudArray('inbox', existingMsgs);
    } catch (err) {
      console.log("Push inbox cloud info:", err);
    }
  },

  // 4. Mettre à jour l'ensemble des données dans le Cloud (ex: réponse admin aux avis)
  async saveAllReviews(reviewsArray) {
    try {
      await this.saveCloudArray('reviews', reviewsArray);
    } catch (err) {}
  },

  // 5. Récupérer et fusionner toutes les données du Cloud vers le device Admin / Client
  async pullAllData() {
    try {
      // Pull Reviews
      const cloudReviews = await this.fetchCloudArray('reviews');
      if (Array.isArray(cloudReviews) && cloudReviews.length > 0) {
        let localReviews = JSON.parse(localStorage.getItem('shone_reviews')) || [];
        const mergedReviews = this.mergeArraysById(localReviews, cloudReviews);
        localStorage.setItem('shone_reviews', JSON.stringify(mergedReviews));
      }

      // Pull Orders
      const cloudOrders = await this.fetchCloudArray('orders');
      if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        let localOrders = JSON.parse(localStorage.getItem('shone_orders')) || [];
        const mergedOrders = this.mergeArraysById(localOrders, cloudOrders, 'orderNumber');
        localStorage.setItem('shone_orders', JSON.stringify(mergedOrders));
      }

      // Pull Inbox Messages
      const cloudInbox = await this.fetchCloudArray('inbox');
      if (Array.isArray(cloudInbox) && cloudInbox.length > 0) {
        let localInbox = JSON.parse(localStorage.getItem('shone_inbox')) || [];
        const mergedInbox = this.mergeArraysById(localInbox, cloudInbox);
        localStorage.setItem('shone_inbox', JSON.stringify(mergedInbox));
      }
    } catch (err) {
      console.log("Pull cloud data info:", err);
    }
  },

  // Helpers HTTP
  async fetchCloudArray(key) {
    try {
      const res = await fetch(`${GLOBAL_CLOUD_ENDPOINT}/${key}`, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : [];
      }
    } catch (e) {}
    return [];
  },

  async saveCloudArray(key, arrayData) {
    try {
      await fetch(`${GLOBAL_CLOUD_ENDPOINT}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arrayData.slice(0, 50)) // max 50 items per category
      });
    } catch (e) {}
  },

  mergeArraysById(localArr, cloudArr, keyField = 'id') {
    const map = new Map();
    [...cloudArr, ...localArr].forEach(item => {
      if (item && item[keyField]) {
        if (!map.has(item[keyField])) {
          map.set(item[keyField], item);
        } else {
          // Merge replyText if present
          const existing = map.get(item[keyField]);
          map.set(item[keyField], { ...existing, ...item });
        }
      }
    });
    return Array.from(map.values());
  }
};

window.ShoneCloudSync = ShoneCloudSync;
