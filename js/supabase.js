/* ==========================================================================
   SHONE PARFUMERIE - GLOBAL REAL-TIME CLOUD DB ENGINE (REVIEWS, ORDERS & MESSAGES)
   ========================================================================== */

const REVIEWS_CLOUD_ID = "ff8081819ff5b11001a00c751a4f2fb9";
const ORDERS_CLOUD_ID = "ff8081819ff5b11001a00c767b562fbd";
const INBOX_CLOUD_ID = "ff8081819ff5b11001a00c767d962fbe";

const CLOUD_BASE_URL = "https://api.restful-api.dev/objects";

const ShoneCloudSync = {
  // 1. Pousser un avis client dans le Cloud en temps r�el (Accessible par l'Administrateur)
  async pushReview(reviewObj) {
    try {
      const currentReviews = await this.fetchCloudCategory(REVIEWS_CLOUD_ID, 'reviews');
      // �viter les doublons par ID
      const filtered = currentReviews.filter(r => r.id !== reviewObj.id);
      filtered.unshift(reviewObj);
      await this.updateCloudCategory(REVIEWS_CLOUD_ID, 'shone_parfumerie_reviews', 'reviews', filtered);
    } catch (err) {
      console.log("Cloud review sync info:", err);
    }
  },

  // 2. Sauvegarder l'ensemble des avis (ex: lors d'une r�ponse officielle de l'admin)
  async saveAllReviews(reviewsArray) {
    try {
      await this.updateCloudCategory(REVIEWS_CLOUD_ID, 'shone_parfumerie_reviews', 'reviews', reviewsArray);
    } catch (err) {
      console.log("Cloud all reviews save info:", err);
    }
  },

  // 3. Pousser une nouvelle commande dans le Cloud
  async pushOrder(orderObj) {
    try {
      const currentOrders = await this.fetchCloudCategory(ORDERS_CLOUD_ID, 'orders');
      const filtered = currentOrders.filter(o => o.orderNumber !== orderObj.orderNumber);
      filtered.unshift(orderObj);
      await this.updateCloudCategory(ORDERS_CLOUD_ID, 'shone_parfumerie_orders', 'orders', filtered);
    } catch (err) {
      console.log("Cloud order sync info:", err);
    }
  },

  // 4. Pousser un nouveau message / demande dans le Cloud
  async pushInboxMessage(msgObj) {
    try {
      const currentMsgs = await this.fetchCloudCategory(INBOX_CLOUD_ID, 'inbox');
      const filtered = currentMsgs.filter(m => m.id !== msgObj.id);
      filtered.unshift(msgObj);
      await this.updateCloudCategory(INBOX_CLOUD_ID, 'shone_parfumerie_inbox', 'inbox', filtered);
    } catch (err) {
      console.log("Cloud inbox sync info:", err);
    }
  },

  // 5. R�cup�rer et fusionner toutes les donn�es du Cloud vers l'appareil Administrateur
  async pullAllData() {
    try {
      // Pull Reviews
      const cloudReviews = await this.fetchCloudCategory(REVIEWS_CLOUD_ID, 'reviews');
      if (Array.isArray(cloudReviews) && cloudReviews.length > 0) {
        let localReviews = JSON.parse(localStorage.getItem('shone_reviews')) || [];
        const mergedReviews = this.mergeArrays(localReviews, cloudReviews, 'id');
        localStorage.setItem('shone_reviews', JSON.stringify(mergedReviews));
      }

      // Pull Orders
      const cloudOrders = await this.fetchCloudCategory(ORDERS_CLOUD_ID, 'orders');
      if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        let localOrders = JSON.parse(localStorage.getItem('shone_orders')) || [];
        const mergedOrders = this.mergeArrays(localOrders, cloudOrders, 'orderNumber');
        localStorage.setItem('shone_orders', JSON.stringify(mergedOrders));
      }

      // Pull Inbox
      const cloudInbox = await this.fetchCloudCategory(INBOX_CLOUD_ID, 'inbox');
      if (Array.isArray(cloudInbox) && cloudInbox.length > 0) {
        let localInbox = JSON.parse(localStorage.getItem('shone_inbox')) || [];
        const mergedInbox = this.mergeArrays(localInbox, cloudInbox, 'id');
        localStorage.setItem('shone_inbox', JSON.stringify(mergedInbox));
      }
    } catch (err) {
      console.log("Pull all cloud data info:", err);
    }
  },

  // HTTP HELPERS WITH CORS & HEADERS
  async fetchCloudCategory(objectId, categoryKey) {
    try {
      const res = await fetch(`${CLOUD_BASE_URL}/${objectId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data[categoryKey])) {
          return json.data[categoryKey];
        }
      }
    } catch (e) {}
    return [];
  },

  async updateCloudCategory(objectId, name, categoryKey, dataArray) {
    try {
      // Keep up to 60 most recent records per category
      const trimmed = dataArray.slice(0, 60);
      const payload = {
        name: name,
        data: {
          [categoryKey]: trimmed
        }
      };
      await fetch(`${CLOUD_BASE_URL}/${objectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  },

  mergeArrays(localArr, cloudArr, keyField = 'id') {
    const map = new Map();
    // Put cloud items first
    cloudArr.forEach(item => {
      if (item && item[keyField]) map.set(item[keyField], item);
    });
    // Merge local items
    localArr.forEach(item => {
      if (item && item[keyField]) {
        if (!map.has(item[keyField])) {
          map.set(item[keyField], item);
        } else {
          // If local has replyText, keep replyText
          const existing = map.get(item[keyField]);
          map.set(item[keyField], { ...existing, ...item });
        }
      }
    });
    return Array.from(map.values());
  }
};

window.ShoneCloudSync = ShoneCloudSync;
