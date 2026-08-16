/* ==========================================================================
   SHONE PARFUMERIE - DIRECT ORDER ENGINE (CODES USSD *144*2*1* ET *555*2*1*)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let cart = JSON.parse(localStorage.getItem('shone_cart')) || [];
  let currentGender = 'all';
  let currentSort = 'default';

  // OFFICIAL PHONE NUMBERS (BURKINA FASO)
  const ORANGE_NUMBER = '06887330';
  const MOOV_NUMBER = '06887330';
  const WAVE_NUMBER = '06887330';
  const WHATSAPP_NUMBER = '22606887330';

  // Direct Order State
  let currentOrderProduct = null;
  let currentOrderQty = 1;
  let isDeliveryRequested = true;
  let isTrackingRequested = true;
  let currentPaymentMethod = 'orange';
  let uploadedReceiptBase64 = null;
  let adminProductImageBase64 = null;

  // Receipt Photo Confirmation Base64
  let rcPhotoBase64 = null;

  // AUTOMATIC CACHE RESET FOR MOBILE BROWSERS & VERCEL DEPLOYMENT
  const CURRENT_APP_VERSION = 'v5.0_intense_wayfarer';
  if (localStorage.getItem('shone_app_version') !== CURRENT_APP_VERSION) {
    localStorage.removeItem('shone_products');
    localStorage.removeItem('shone_reviews');
    localStorage.setItem('shone_app_version', CURRENT_APP_VERSION);
  }

  // SAFE PRODUCTS INITIALIZATION FOR VERCEL & LOCALSTORAGE
  let storedProductsRaw = localStorage.getItem('shone_products');
  let parsedProducts = null;
  try {
    if (storedProductsRaw) parsedProducts = JSON.parse(storedProductsRaw);
  } catch (e) {
    parsedProducts = null;
  }

  let allProducts = (Array.isArray(parsedProducts) && parsedProducts.length > 0)
    ? parsedProducts
    : [...PRODUCTS_DATA];

  if (!storedProductsRaw || !Array.isArray(parsedProducts) || parsedProducts.length === 0) {
    localStorage.setItem('shone_products', JSON.stringify(allProducts));
  }

  // Update Velvet Rose image if present
  const velvetIdx = allProducts.findIndex(p => p.name.toLowerCase().includes('velvet') || p.name.toLowerCase().includes('vanille'));
  if (velvetIdx > -1 && !allProducts[velvetIdx].image.startsWith('data:image')) {
    allProducts[velvetIdx].image = "images/vanille-exaltante.png";
  }

  let allZones = JSON.parse(localStorage.getItem('shone_zones')) || [...DELIVERY_ZONES_DATA];
  let allOrders = JSON.parse(localStorage.getItem('shone_orders')) || [];
  let allInboxMessages = JSON.parse(localStorage.getItem('shone_inbox')) || [];

  // DEFAULT REVIEWS
  const defaultReviews = [
    {
      id: "rev-1",
      authorName: "Aminata Kaboré",
      city: "Ouagadougou (Karpala)",
      perfume: "Intense Wayfarer",
      stars: 5,
      text: "J'ai commandé Intense Wayfarer via Orange Money. Le parfum est arrivé en moins de 2 heures chez moi. La tenue sur mes vêtements est tout simplement incroyable du matin au soir !",
      date: "2026-08-14"
    },
    {
      id: "rev-2",
      authorName: "Moussa Sawadogo",
      city: "Bobo-Dioulasso",
      perfume: "Royal Oud Impérial",
      stars: 5,
      text: "Royal Oud Impérial est d'une puissance et d'une rareté remarquables. Merci à toute l'équipe Shone Parfumerie pour la rapidité du service et le suivi SHN très pratique.",
      date: "2026-08-13"
    },
    {
      id: "rev-3",
      authorName: "Fatoumata Traoré",
      city: "Koudougou",
      perfume: "Velvet Rose",
      stars: 5,
      text: "Le conseiller olfactif m'a très bien orientée sur WhatsApp. Velvet Rose (Vanille Exaltante) est extrêmement doux et envoûtant. Je repasserai commande avec grand plaisir !",
      date: "2026-08-12"
    }
  ];

  let allReviews = JSON.parse(localStorage.getItem('shone_reviews')) || defaultReviews;

  // DOM Elements
  const cartBadge = document.getElementById('cart-badge');
  const productsGrid = document.getElementById('products-grid');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');

  // Mobile Drawer Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }

  // Auto hash navigation to Admin view if URL ends with #admin or #admin-view
  if (window.location.hash === '#admin' || window.location.hash === '#admin-view') {
    switchView('admin');
  }

  // --------------------------------------------------------------------------
  // PACKAGE RECEIPT PHOTO CONFIRMATION ON PLATFORM (STEP 5 PROCEDURE)
  // --------------------------------------------------------------------------
  window.handleReceiptPhotoPreview = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        rcPhotoBase64 = evt.target.result;
        document.getElementById('rc-photo-preview-img').src = rcPhotoBase64;
        document.getElementById('rc-photo-preview-box').style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      rcPhotoBase64 = null;
      document.getElementById('rc-photo-preview-box').style.display = 'none';
    }
  };

  window.submitReceiptPhotoConfirmation = function(e) {
    e.preventDefault();
    if (!rcPhotoBase64) {
      alert("⚠️ La photo de votre flacon de parfum reçu est OBLIGATOIRE ! Veuillez sélectionner votre fichier photo.");
      return;
    }

    const orderNum = document.getElementById('rc-order-num').value.trim();
    const custName = document.getElementById('rc-cust-name').value.trim();
    const custPhone = document.getElementById('rc-cust-phone').value.trim();
    const perfumeName = document.getElementById('rc-perfume-name').value.trim();

    const newReceiptMessage = {
      id: `msg-${Date.now()}`,
      type: 'CONFIRMATION RÉCEPTION',
      orderNumber: orderNum,
      customerName: custName,
      customerPhone: custPhone,
      perfumeName: perfumeName,
      photoImage: rcPhotoBase64,
      details: `Colis N° ${orderNum} bien reçu pour le parfum "${perfumeName}". Photo de confirmation transmise.`,
      createdAt: new Date().toISOString()
    };

    allInboxMessages.unshift(newReceiptMessage);
    localStorage.setItem('shone_inbox', JSON.stringify(allInboxMessages));

    closeModal('receipt-confirm-modal');
    
    // Reset form
    rcPhotoBase64 = null;
    document.getElementById('rc-photo-preview-box').style.display = 'none';

    alert(`✓ Merci ${custName} ! Votre confirmation de réception avec photo pour la commande N° "${orderNum}" a bien été enregistrée sur la plateforme Shone Parfumerie !`);

    if (document.getElementById('admin-view').style.display !== 'none') {
      loadAdminData();
    }
  };

  // --------------------------------------------------------------------------
  // REVIEWS RENDER & SUBMISSION ENGINE (MATCHES AVAILABLE PRODUCTS ONLY)
  // --------------------------------------------------------------------------
  function renderCustomerReviews() {
    const container = document.getElementById('reviews-cards-container');
    if (!container) return;

    // Get list of active available product names
    const activeProductNames = allProducts.map(p => p.name.toLowerCase());

    // Filter reviews to show those matching available products, or assign to active available products
    let validReviews = allReviews.filter(rev => {
      return activeProductNames.some(pName => pName.includes(rev.perfume.toLowerCase()) || rev.perfume.toLowerCase().includes(pName));
    });

    // If active products were deleted, adapt review perfume names to active available ones
    if (validReviews.length === 0 && allProducts.length > 0) {
      validReviews = allReviews.map((rev, index) => {
        const activeProd = allProducts[index % allProducts.length];
        return {
          ...rev,
          perfume: activeProd.name,
          text: `J'ai commandé ${activeProd.name}. Le parfum est arrivé très rapidement. La tenue sur mes vêtements est tout simplement formidable !`
        };
      });
    }

    if (validReviews.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-star" style="font-size: 2rem; color: var(--gold-primary); margin-bottom: 10px;"></i>
          <p>Soyez le premier à donner votre avis sur nos parfums disponibles !</p>
        </div>
      `;
      return;
    }

    container.innerHTML = validReviews.map(rev => {
      const initial = rev.authorName ? rev.authorName.charAt(0).toUpperCase() : 'S';
      const starsHtml = '★'.repeat(rev.stars || 5) + '☆'.repeat(5 - (rev.stars || 5));

      return `
        <div class="review-card">
          <i class="fas fa-quote-right review-quote-icon"></i>
          <div class="review-stars">${starsHtml}</div>
          <p class="review-text">"${rev.text}"</p>
          <div class="review-footer">
            <div class="review-avatar">${initial}</div>
            <div>
              <div class="review-author-name">${rev.authorName}</div>
              <div class="review-author-city"><i class="fas fa-location-dot"></i> ${rev.city}</div>
            </div>
            <div class="review-perfume-tag">
              <i class="fas fa-flask"></i> ${rev.perfume}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.submitCustomerReview = function(e) {
    e.preventDefault();
    const authorName = document.getElementById('rev-author-name').value.trim();
    const city = document.getElementById('rev-author-city').value.trim();
    const perfume = document.getElementById('rev-perfume-name').value.trim();
    const stars = parseInt(document.getElementById('rev-rating-stars').value);
    const text = document.getElementById('rev-message-text').value.trim();

    const newReview = {
      id: `rev-${Date.now()}`,
      authorName,
      city,
      perfume,
      stars,
      text,
      date: new Date().toISOString().slice(0, 10)
    };

    allReviews.unshift(newReview);
    localStorage.setItem('shone_reviews', JSON.stringify(allReviews));

    closeModal('add-review-modal');
    renderCustomerReviews();

    alert(`✓ Merci ${authorName} ! Votre avis sur le parfum "${perfume}" a bien été publié sur Shone Parfumerie.`);
  };

  // --------------------------------------------------------------------------
  // VIEW SWITCHER (STORE vs ADMIN)
  // --------------------------------------------------------------------------
  window.switchView = function(viewName) {
    const storeView = document.getElementById('store-view');
    const adminView = document.getElementById('admin-view');

    if (viewName === 'admin') {
      storeView.style.display = 'none';
      adminView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (sessionStorage.getItem('shone_admin_logged') === 'true') {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-main-screen').style.display = 'block';
        loadAdminData();
      } else {
        document.getElementById('admin-login-screen').style.display = 'block';
        document.getElementById('admin-main-screen').style.display = 'none';
      }
    } else {
      adminView.style.display = 'none';
      storeView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --------------------------------------------------------------------------
  // SPECIFIC AVAILABILITY CHECKER (PLATFORM INBOX REGISTRATION)
  // --------------------------------------------------------------------------
  window.checkSpecificAvailability = function(productName) {
    document.getElementById('avail-modal-perfume-name').textContent = productName;
    document.getElementById('avail-perfume-hidden-name').value = productName;
    openModal('availability-modal');
  };

  window.submitAvailabilityRequest = function(e) {
    e.preventDefault();
    const perfumeName = document.getElementById('avail-perfume-hidden-name').value;
    const name = document.getElementById('avail-cust-name').value.trim();
    const phone = document.getElementById('avail-cust-phone').value.trim();

    const newMessage = {
      id: `msg-${Date.now()}`,
      type: 'DISPONIBILITÉ',
      perfumeName,
      customerName: name,
      customerPhone: phone,
      details: `Demande de disponibilité pour le parfum "${perfumeName}"`,
      createdAt: new Date().toISOString()
    };

    allInboxMessages.unshift(newMessage);
    localStorage.setItem('shone_inbox', JSON.stringify(allInboxMessages));

    closeModal('availability-modal');
    alert(`✓ Merci ${name} ! Votre demande de disponibilité pour "${perfumeName}" a bien été transmise à Shone Parfumerie. Notre équipe vous répondra très rapidement sur WhatsApp (${phone}).`);
    
    if (document.getElementById('admin-view').style.display !== 'none') {
      loadAdminData();
    }
  };

  // --------------------------------------------------------------------------
  // CONSEILLER OLFACTIF — FORMULAIRE SUR-MESURE (PLATFORM INBOX REGISTRATION)
  // --------------------------------------------------------------------------
  window.submitAdvisorCustomForm = function(e) {
    e.preventDefault();
    const name = document.getElementById('adv-cust-name').value.trim();
    const phone = document.getElementById('adv-cust-phone').value.trim();
    const gender = document.getElementById('adv-cust-gender').value;
    const requestDesc = document.getElementById('adv-cust-request').value.trim();

    const newMessage = {
      id: `msg-${Date.now()}`,
      type: 'CONSEIL OLFACTIF',
      gender,
      customerName: name,
      customerPhone: phone,
      details: `Parfum recherché (${gender}) : "${requestDesc}"`,
      createdAt: new Date().toISOString()
    };

    allInboxMessages.unshift(newMessage);
    localStorage.setItem('shone_inbox', JSON.stringify(allInboxMessages));

    alert(`✓ Merci ${name} ! Votre demande de Conseil Olfactif a été enregistrée avec succès sur notre plateforme. L'équipe Shone Parfumerie analysera vos critères et vous enverra sa recommandation sur WhatsApp (${phone}).`);
    
    document.getElementById('advisor-custom-form').reset();

    if (document.getElementById('admin-view').style.display !== 'none') {
      loadAdminData();
    }
  };

  // --------------------------------------------------------------------------
  // DIRECT ORDER ENGINE
  // --------------------------------------------------------------------------
  window.openDirectOrderModal = function(productId) {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    currentOrderProduct = prod;
    currentOrderQty = 1;
    isDeliveryRequested = true;
    isTrackingRequested = true;
    currentPaymentMethod = 'orange';
    uploadedReceiptBase64 = null;

    const fileInp = document.getElementById('direct-receipt-file');
    if (fileInp) fileInp.value = "";
    const nameLbl = document.getElementById('receipt-file-name');
    if (nameLbl) nameLbl.textContent = "";

    // Reset toggle UI
    document.getElementById('delivery-yes-btn').classList.add('active');
    document.getElementById('delivery-no-btn').classList.remove('active');
    document.getElementById('delivery-details-box').style.display = 'block';

    document.getElementById('tracking-yes-btn').classList.add('active');
    document.getElementById('tracking-no-btn').classList.remove('active');

    renderDirectProductPreview();
    selectPaymentMethod('orange');
    calculateDirectOrderTotal();

    openModal('direct-order-modal');
  };

  function renderDirectProductPreview() {
    const box = document.getElementById('direct-order-product-preview');
    if (!box || !currentOrderProduct) return;

    const genderBadge = currentOrderProduct.gender === 'homme'
      ? `<span style="background: rgba(96, 165, 250, 0.15); color: #60A5FA; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-mars"></i> Homme</span>`
      : `<span style="background: rgba(244, 114, 182, 0.15); color: #F472B6; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-venus"></i> Femme</span>`;

    box.innerHTML = `
      <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
        <img src="${currentOrderProduct.image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-gold);" />
        <div style="flex: 1;">
          <div style="margin-bottom: 4px;">
            ${genderBadge} 
            ${currentOrderProduct.style ? `<span style="background: rgba(212, 175, 55, 0.1); color: var(--gold-light); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fas fa-wand-magic-sparkles"></i> ${currentOrderProduct.style}</span>` : ''}
            <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-flask"></i> ${currentOrderProduct.size || '100 ml'}</span>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--gold-light); margin-bottom: 4px;">${currentOrderProduct.name}</h3>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${currentOrderProduct.price.toLocaleString('fr-FR')} FCFA / unité</div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 0.85rem; font-weight: 600;">Quantité :</span>
          <div class="qty-input-group">
            <button type="button" onclick="changeDirectQty(-1)">-</button>
            <span id="direct-qty-val" style="font-weight: 800; padding: 0 6px;">${currentOrderQty}</span>
            <button type="button" onclick="changeDirectQty(1)">+</button>
          </div>
        </div>
      </div>
    `;
  }

  window.changeDirectQty = function(delta) {
    currentOrderQty = Math.max(1, currentOrderQty + delta);
    const valElem = document.getElementById('direct-qty-val');
    if (valElem) valElem.textContent = currentOrderQty;
    calculateDirectOrderTotal();
  };

  window.selectDeliveryChoice = function(choice) {
    isDeliveryRequested = choice;
    const bYes = document.getElementById('delivery-yes-btn');
    const bNo = document.getElementById('delivery-no-btn');
    const detailsBox = document.getElementById('delivery-details-box');

    if (choice) {
      bYes.classList.add('active');
      bNo.classList.remove('active');
      detailsBox.style.display = 'block';
    } else {
      bNo.classList.add('active');
      bYes.classList.remove('active');
      detailsBox.style.display = 'none';
    }
    calculateDirectOrderTotal();
  };

  window.selectTrackingChoice = function(choice) {
    isTrackingRequested = choice;
    const bYes = document.getElementById('tracking-yes-btn');
    const bNo = document.getElementById('tracking-no-btn');

    if (choice) {
      bYes.classList.add('active');
      bNo.classList.remove('active');
    } else {
      bNo.classList.add('active');
      bYes.classList.remove('active');
    }
  };

  window.selectPaymentMethod = function(method) {
    currentPaymentMethod = method;

    ['orange', 'moov', 'wave', 'cash'].forEach(m => {
      const card = document.getElementById(`pay-${m}-card`);
      if (card) card.classList.remove('selected');
    });

    const activeCard = document.getElementById(`pay-${method}-card`);
    if (activeCard) activeCard.classList.add('active', 'selected');

    updatePaymentInstructionsText();
  };

  function updatePaymentInstructionsText() {
    const totalAmount = currentOrderProduct ? (currentOrderProduct.price * currentOrderQty) : 0;
    const instrText = document.getElementById('pay-instructions-text');
    const uploadBox = document.getElementById('receipt-upload-box');
    const fileInp = document.getElementById('direct-receipt-file');

    if (currentPaymentMethod === 'orange') {
      const ussdCode = `*144*2*1*${ORANGE_NUMBER}*${totalAmount}#`;
      instrText.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; word-break: break-all; overflow-wrap: anywhere;">
          <div><i class="fas fa-mobile-screen-button" style="color: #FF7900;"></i> <strong>Paiement Orange Money :</strong></div>
          <div style="background: var(--bg-dark); padding: 12px; border-radius: var(--radius-sm); border: 1px solid #FF7900; word-break: break-all;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Numéro Orange Money Shone : <strong>+226 ${ORANGE_NUMBER}</strong></div>
            <div style="font-size: clamp(0.85rem, 3.8vw, 1.15rem); font-weight: 800; color: #FF7900; margin-top: 6px; word-break: break-all; overflow-wrap: anywhere;">
              Code USSD à composer : <code style="background: rgba(255, 121, 0, 0.15); padding: 4px 8px; border-radius: 4px; font-family: monospace; word-break: break-all !important; display: inline-block;">${ussdCode}</code>
            </div>
          </div>
          <a href="tel:${encodeURIComponent(ussdCode)}" class="btn btn-gold" style="padding: 10px 14px; font-size: 0.85rem; width: 100%; white-space: normal; text-align: center;">
            <i class="fas fa-phone"></i> Lancer l'appel USSD Orange Money (*144*2*1*)
          </a>
        </div>
      `;
      uploadBox.style.display = 'block';
      if (fileInp) fileInp.required = true;
    } else if (currentPaymentMethod === 'moov') {
      const ussdCode = `*555*2*1*${MOOV_NUMBER}*${totalAmount}#`;
      instrText.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; word-break: break-all; overflow-wrap: anywhere;">
          <div><i class="fas fa-mobile-retro" style="color: #005CA9;"></i> <strong>Paiement Moov Money :</strong></div>
          <div style="background: var(--bg-dark); padding: 12px; border-radius: var(--radius-sm); border: 1px solid #005CA9; word-break: break-all;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Numéro Moov Money Shone : <strong>+226 ${MOOV_NUMBER}</strong></div>
            <div style="font-size: clamp(0.85rem, 3.8vw, 1.15rem); font-weight: 800; color: #60A5FA; margin-top: 6px; word-break: break-all; overflow-wrap: anywhere;">
              Code USSD à composer : <code style="background: rgba(0, 92, 169, 0.2); padding: 4px 8px; border-radius: 4px; font-family: monospace; word-break: break-all !important; display: inline-block;">${ussdCode}</code>
            </div>
          </div>
          <a href="tel:${encodeURIComponent(ussdCode)}" class="btn btn-gold" style="padding: 10px 14px; font-size: 0.85rem; width: 100%; background: #005CA9; color: #FFF; white-space: normal; text-align: center;">
            <i class="fas fa-phone"></i> Lancer l'appel USSD Moov Money (*555*2*1*)
          </a>
        </div>
      `;
      uploadBox.style.display = 'block';
      if (fileInp) fileInp.required = true;
    } else if (currentPaymentMethod === 'wave') {
      const wavePhone = `+226 ${WAVE_NUMBER}`;
      instrText.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div><i class="fas fa-water" style="color: #1DC3F2;"></i> <strong>Paiement Wave Mobile Money :</strong></div>
          <div style="background: var(--bg-dark); padding: 14px; border-radius: var(--radius-sm); border: 1px solid #1DC3F2;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Numéro de compte Wave Shone :</div>
            <div style="font-size: 1.4rem; font-weight: 900; color: #1DC3F2; margin-top: 2px;">${wavePhone}</div>
          </div>
          <a href="https://wave.com" target="_blank" class="btn btn-gold" style="padding: 10px 16px; font-size: 0.9rem; width: 100%; background: linear-gradient(135deg, #1DC3F2, #0D2C54); color: #FFF;">
            <i class="fas fa-external-link-alt"></i> Ouvrir l'application Wave
          </a>
        </div>
      `;
      uploadBox.style.display = 'block';
      if (fileInp) fileInp.required = true;
    } else if (currentPaymentMethod === 'cash') {
      instrText.innerHTML = `<i class="fas fa-money-bill-wave" style="color: #10B981;"></i> <strong>Paiement en Espèces :</strong> Règlement à la livraison après contrôle de votre parfum ou lors du retrait en boutique.`;
      uploadBox.style.display = 'none';
      if (fileInp) fileInp.required = false;
    }
  }

  window.handleReceiptSelect = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        uploadedReceiptBase64 = evt.target.result;
        document.getElementById('receipt-file-name').textContent = `✓ Capture enregistrée : ${file.name}`;
      };
      reader.readAsDataURL(file);
    } else {
      uploadedReceiptBase64 = null;
      document.getElementById('receipt-file-name').textContent = "";
    }
  };

  window.calculateDirectOrderTotal = function() {
    if (!currentOrderProduct) return;
    const subtotal = currentOrderProduct.price * currentOrderQty;

    document.getElementById('direct-subtotal-val').textContent = `${subtotal.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('direct-total-val').textContent = `${subtotal.toLocaleString('fr-FR')} FCFA`;

    updatePaymentInstructionsText();
  };

  window.submitDirectOrder = function(e) {
    e.preventDefault();
    if (!currentOrderProduct) return;

    if (['orange', 'moov', 'wave'].includes(currentPaymentMethod) && !uploadedReceiptBase64) {
      alert("⚠️ La capture d'écran du paiement est OBLIGATOIRE ! Veuillez joindre la preuve de votre transfert Orange Money, Moov ou Wave.");
      const fileInp = document.getElementById('direct-receipt-file');
      if (fileInp) fileInp.focus();
      return;
    }

    const name = document.getElementById('direct-cust-name').value.trim();
    const phone = document.getElementById('direct-cust-phone').value.trim();

    const city = isDeliveryRequested ? (document.getElementById('direct-cust-city').value.trim() || 'Ouagadougou') : 'Retrait Boutique';
    const neighborhood = isDeliveryRequested ? document.getElementById('direct-cust-neighborhood').value.trim() : 'Point de vente';

    const subtotal = currentOrderProduct.price * currentOrderQty;
    const total = subtotal;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const orderNumber = isTrackingRequested ? `SHN-${dateStr}-${randomNum}` : `COMMANDE-${dateStr}-${randomNum}`;

    const newOrder = {
      orderNumber,
      customer: { name, phone, city, neighborhood },
      items: [{
        id: currentOrderProduct.id,
        name: currentOrderProduct.name,
        price: currentOrderProduct.price,
        image: currentOrderProduct.image,
        size: currentOrderProduct.size || '100 ml',
        quantity: currentOrderQty
      }],
      subtotal,
      deliveryFee: "À convenir selon le quartier",
      total,
      deliveryRequested: isDeliveryRequested,
      trackingRequested: isTrackingRequested,
      paymentMethod: currentPaymentMethod.toUpperCase(),
      receiptImage: uploadedReceiptBase64,
      status: 'Commande reçue',
      createdAt: now.toISOString()
    };

    allOrders.unshift(newOrder);
    localStorage.setItem('shone_orders', JSON.stringify(allOrders));

    document.getElementById('success-order-num').textContent = orderNumber;

    const paymentLabel = currentPaymentMethod === 'orange' ? 'Orange Money' : currentPaymentMethod === 'moov' ? 'Moov Money' : currentPaymentMethod === 'wave' ? 'Wave' : 'Espèces à la livraison';
    const deliveryText = isDeliveryRequested ? `Livraison souhaitée à ${neighborhood}, ${city} (Frais à convenir selon le quartier)` : 'Retrait en boutique (Sans livraison)';

    const waMsgText = `Bonjour Shone Parfumerie ! Je viens de valider ma commande avec reçu transmis :
📌 N° Commande : ${orderNumber}
💎 Parfum : ${currentOrderProduct.name} (Qté: ${currentOrderQty})
👤 Client : ${name} (${phone})
🚚 Zone / Quartier : ${deliveryText}
💳 Paiement : ${paymentLabel} (Reçu téléversé)
💰 PRIX DU PARFUM À PAYER : ${total.toLocaleString('fr-FR')} FCFA`;

    document.getElementById('success-wa-btn').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsgText)}`;

    closeModal('direct-order-modal');
    openModal('success-modal');

    if (document.getElementById('admin-view').style.display !== 'none') {
      loadAdminData();
    }
  };

  // --------------------------------------------------------------------------
  // ADMIN PRODUCT IMAGE & FORM ENGINE
  // --------------------------------------------------------------------------
  window.handleAdminImageUpload = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        adminProductImageBase64 = evt.target.result;
        document.getElementById('admin-prod-preview-img').src = adminProductImageBase64;
        document.getElementById('prod-image-in').value = adminProductImageBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  window.updateAdminImagePreviewText = function(url) {
    if (url) {
      adminProductImageBase64 = url;
      document.getElementById('admin-prod-preview-img').src = url;
    }
  };

  window.openAddProductModal = function() {
    document.getElementById('product-form-title').textContent = "Ajouter un Parfum";
    document.getElementById('edit-product-id').value = "";
    document.getElementById('product-form').reset();
    adminProductImageBase64 = "images/royal-oud.png";
    document.getElementById('admin-prod-preview-img').src = adminProductImageBase64;
    document.getElementById('prod-image-in').value = adminProductImageBase64;
    openModal('product-form-modal');
  };

  window.openEditProductModal = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-form-title').textContent = "Modifier la Fiche du Parfum";
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('prod-name-in').value = product.name;
    document.getElementById('prod-gender-in').value = product.gender === 'femme' ? 'femme' : 'homme';
    document.getElementById('prod-style-in').value = product.style || 'Doux';
    document.getElementById('prod-price-in').value = product.price;
    document.getElementById('prod-size-in').value = product.size || '100 ml';
    
    adminProductImageBase64 = product.image;
    document.getElementById('admin-prod-preview-img').src = product.image;
    document.getElementById('prod-image-in').value = product.image;
    document.getElementById('prod-desc-in').value = product.description;

    openModal('product-form-modal');
  };

  window.saveProductSubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-product-id').value || `prod-${Date.now()}`;
    const name = document.getElementById('prod-name-in').value.trim();
    const gender = document.getElementById('prod-gender-in').value;
    const style = document.getElementById('prod-style-in').value;
    const price = parseInt(document.getElementById('prod-price-in').value);
    const size = document.getElementById('prod-size-in').value.trim() || '100 ml';
    const image = document.getElementById('prod-image-in').value.trim() || adminProductImageBase64 || 'images/royal-oud.png';
    const description = document.getElementById('prod-desc-in').value.trim();

    const productData = {
      id,
      name,
      gender,
      genderLabel: gender === 'homme' ? 'Homme' : 'Femme',
      style,
      price,
      size,
      image,
      description
    };

    const idx = allProducts.findIndex(p => p.id === id);
    if (idx > -1) {
      allProducts[idx] = productData;
    } else {
      allProducts.push(productData);
    }

    localStorage.setItem('shone_products', JSON.stringify(allProducts));
    closeModal('product-form-modal');
    applyFiltersAndSort();
    renderCustomerReviews();
    loadAdminData();

    alert("✓ Parfum enregistré avec succès !");
  };

  window.deleteProduct = function(productId) {
    if (confirm("Voulez-vous vraiment supprimer définitivement ce parfum du catalogue ?")) {
      allProducts = allProducts.filter(p => p.id !== productId);
      localStorage.setItem('shone_products', JSON.stringify(allProducts));
      applyFiltersAndSort();
      renderCustomerReviews();
      loadAdminData();
    }
  };

  // --------------------------------------------------------------------------
  // PROCEDURE & AVAILABILITY HELPERS
  // --------------------------------------------------------------------------
  window.askAvailability = function() {
    const waMsg = encodeURIComponent("Bonjour Shone Parfumerie, je souhaite vérifier la disponibilité d'un parfum d'exception avant de passer ma commande.");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`, '_blank');
  };

  window.openFeedbackForm = function() {
    openModal('feedback-modal');
  };

  window.sendFeedbackSubmit = function(e) {
    e.preventDefault();
    const orderNum = document.getElementById('fb-order-num').value.trim();
    const name = document.getElementById('fb-name').value.trim();
    const msg = document.getElementById('fb-message').value.trim();

    const waMsg = encodeURIComponent(`Bonjour Shone Parfumerie ! Je suis ${name} (Commande ${orderNum}). Voici mon avis après réception de mon parfum : "${msg}"`);
    
    closeModal('feedback-modal');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`, '_blank');
  };

  // --------------------------------------------------------------------------
  // GENDER FILTER LOGIC
  // --------------------------------------------------------------------------
  window.filterByGender = function(gender) {
    currentGender = gender;
    
    const bAll = document.getElementById('gender-btn-all');
    const bHomme = document.getElementById('gender-btn-homme');
    const bFemme = document.getElementById('gender-btn-femme');

    if (bAll) bAll.classList.remove('active');
    if (bHomme) bHomme.classList.remove('active');
    if (bFemme) bFemme.classList.remove('active');

    const activeBtn = document.getElementById(`gender-btn-${gender}`);
    if (activeBtn) activeBtn.classList.add('active');

    applyFiltersAndSort();
  };

  window.filterByGenderNav = function(gender) {
    switchView('store');
    filterByGender(gender);
    const catalogElem = document.getElementById('parfums');
    if (catalogElem) catalogElem.scrollIntoView({ behavior: 'smooth' });
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION ADMIN
  // --------------------------------------------------------------------------
  window.handleAdminLogin = function(e) {
    e.preventDefault();
    const pwd = document.getElementById('admin-password-input').value;
    if (pwd === 'shone2026' || pwd === 'admin') {
      sessionStorage.setItem('shone_admin_logged', 'true');
      document.getElementById('admin-login-screen').style.display = 'none';
      document.getElementById('admin-main-screen').style.display = 'block';
      loadAdminData();
    } else {
      alert("Mot de passe incorrect ! (Utilisez : shone2026)");
    }
  };

  window.adminLogout = function() {
    sessionStorage.removeItem('shone_admin_logged');
    switchView('store');
  };

  // --------------------------------------------------------------------------
  // STOREFRONT CATALOGUE
  // --------------------------------------------------------------------------
  function applyFiltersAndSort() {
    let filtered = [...allProducts];

    if (currentGender !== 'all') {
      filtered = filtered.filter(p => p.gender === currentGender);
    }

    if (searchInput && searchInput.value.trim() !== '') {
      const term = searchInput.value.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        (p.style && p.style.toLowerCase().includes(term))
      );
    }

    if (currentSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    renderProducts(filtered);
  }

  function renderProducts(productsToRender) {
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    if (productsToRender.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-gold);">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(212, 175, 55, 0.15); color: var(--gold-primary); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 16px auto;">
            <i class="fas fa-bottle-droplet text-gold-gradient"></i>
          </div>
          <h3 style="font-family: var(--font-heading); color: var(--gold-light); font-size: 1.4rem; margin-bottom: 8px;">Catalogue Shone Parfumerie</h3>
          <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 20px auto; font-size: 0.95rem;">Le catalogue est prêt. Vous pouvez ajouter vos propres parfums directement depuis l'Espace Admin !</p>
          <button class="btn btn-gold" onclick="switchView('admin')">
            <i class="fas fa-plus-circle"></i> Accéder à l'Espace Admin pour Ajouter un Parfum
          </button>
        </div>
      `;
      return;
    }

    productsToRender.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      const genderBadgeHtml = product.gender === 'homme' 
        ? `<span style="background: rgba(96, 165, 250, 0.15); color: #60A5FA; padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-mars"></i> Homme</span>`
        : `<span style="background: rgba(244, 114, 182, 0.15); color: #F472B6; padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-venus"></i> Femme</span>`;

      const styleBadgeHtml = product.style 
        ? `<span style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--border-gold); color: var(--gold-light); padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-wand-magic-sparkles"></i> Style : ${product.style}</span>`
        : '';

      const escapedName = product.name.replace(/'/g, "\\'");

      card.innerHTML = `
        <div class="product-image-box" onclick="window.openProductDetail('${product.id}')">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-info">
          <div class="product-size" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            ${genderBadgeHtml}
            ${styleBadgeHtml}
          </div>
          <h3 class="product-title" onclick="window.openProductDetail('${product.id}')" style="margin-top: 10px;">${product.name}</h3>
          
          <!-- FULL DESCRIPTION VISIBLE WITHOUT TRUNCATION -->
          <p class="product-desc" style="display: block !important; white-space: normal !important; overflow: visible !important; -webkit-line-clamp: none !important; line-height: 1.6; margin-bottom: 20px; font-size: 0.9rem; color: var(--text-muted);">${product.description}</p>
          
          <div class="product-price" style="margin-bottom: 12px;">${product.price.toLocaleString('fr-FR')} <span>FCFA</span></div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn btn-outline" style="padding: 8px 10px; font-size: 0.78rem;" onclick="window.checkSpecificAvailability('${escapedName}')">
              <i class="fas fa-boxes-packing"></i> Disponibilité
            </button>
            <button class="btn btn-gold" style="padding: 8px 10px; font-size: 0.78rem;" onclick="window.openDirectOrderModal('${product.id}')">
              <i class="fas fa-shopping-bag"></i> Commander
            </button>
          </div>
        </div>
      `;
      productsGrid.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // PRODUCT DETAIL MODAL
  // --------------------------------------------------------------------------
  window.openProductDetail = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const detailContainer = document.getElementById('product-detail-content');

    if (detailContainer) {
      const genderText = product.gender === 'homme' ? 'Homme' : 'Femme';
      const escapedName = product.name.replace(/'/g, "\\'");
      
      detailContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start;">
          <div style="border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-gold); background: #15151B;">
            <img src="${product.image}" alt="${product.name}" style="width: 100%; height: auto; display: block;" />
          </div>
          <div>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
              <div style="color: var(--gold-primary); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">
                <i class="fas fa-user-tag"></i> Genre : Parfum ${genderText}
              </div>
              <div style="color: var(--gold-light); font-size: 0.9rem; font-weight: 600;">
                <i class="fas fa-wand-magic-sparkles"></i> Style Olfactif : ${product.style || 'Doux'}
              </div>
            </div>
            
            <h2 style="font-family: var(--font-heading); font-size: 1.9rem; margin-bottom: 6px; color: var(--text-main);">${product.name}</h2>
            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px;">
              <i class="fas fa-flask"></i> Contenance : ${product.size || '100 ml'}
            </div>
            
            <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.95rem; line-height: 1.7;">${product.description}</p>

            <div style="font-size: 1.8rem; font-family: var(--font-heading); font-weight: 800; color: var(--gold-light); margin: 16px 0;">
              ${product.price.toLocaleString('fr-FR')} <span style="font-size: 0.9rem; color: var(--text-muted);">FCFA</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <button class="btn btn-outline" style="padding: 10px 14px; font-size: 0.88rem;" onclick="window.checkSpecificAvailability('${escapedName}')">
                <i class="fas fa-boxes-packing"></i> Demander Disponibilité
              </button>
              <button class="btn btn-gold" style="padding: 10px 14px; font-size: 0.88rem;" onclick="window.closeModal('product-modal'); window.openDirectOrderModal('${product.id}');">
                <i class="fas fa-shopping-bag"></i> Commander
              </button>
            </div>
          </div>
        </div>
      `;
    }
    openModal('product-modal');
  };

  // --------------------------------------------------------------------------
  // DELIVERY ZONES RENDER
  // --------------------------------------------------------------------------
  function renderDeliveryZones() {
    const grid = document.getElementById('delivery-zones-grid');
    if (grid) {
      grid.innerHTML = allZones.map(z => `
        <div class="zone-card">
          <i class="fas fa-location-dot" style="font-size: 2rem; color: var(--gold-primary);"></i>
          <h3 style="margin-top: 10px;">${z.name}</h3>
          <div class="zone-price" style="font-size: 1rem; color: var(--gold-light);">Tarif convenu selon quartier</div>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Livraison rapide à domicile</p>
        </div>
      `).join('');
    }
  }

  // --------------------------------------------------------------------------
  // ORDER TRACKING
  // --------------------------------------------------------------------------
  window.trackOrder = function(e) {
    if (e) e.preventDefault();
    const inputNum = document.getElementById('tracking-input').value.trim();
    const resultBox = document.getElementById('tracking-result');

    if (!inputNum) {
      alert("Veuillez saisir votre numéro de commande.");
      return;
    }

    const order = allOrders.find(o => o.orderNumber.toUpperCase() === inputNum.toUpperCase());

    if (!order) {
      resultBox.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-danger); padding: 20px; border-radius: var(--radius-md); color: var(--text-main); text-align: center;">
          <i class="fas fa-exclamation-circle" style="color: var(--accent-danger); font-size: 2rem; margin-bottom: 10px;"></i>
          <p>Aucune commande trouvée sous le numéro <strong>${inputNum}</strong>.</p>
        </div>
      `;
      return;
    }

    const statuses = ['Commande reçue', 'Commande confirmée', 'En préparation', 'En livraison', 'Livrée'];
    const currentStepIndex = statuses.indexOf(order.status);

    resultBox.innerHTML = `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-gold); padding: 24px; border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-dark); padding-bottom: 14px; margin-bottom: 20px;">
          <span style="font-weight: 800; font-family: var(--font-heading); color: var(--gold-light);">${order.orderNumber}</span>
          <span style="color: var(--accent-success); font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 4px 12px; border-radius: var(--radius-full); font-size: 0.85rem;">
            ${order.status}
          </span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; position: relative;">
          ${statuses.map((st, idx) => `
            <div style="text-align: center; z-index: 1; flex: 1;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: ${idx <= currentStepIndex ? 'var(--gold-primary)' : 'var(--bg-dark)'}; color: ${idx <= currentStepIndex ? '#000' : 'var(--text-muted)'}; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--border-gold);">
                ${idx + 1}
              </div>
              <div style="font-size: 0.7rem; color: ${idx <= currentStepIndex ? 'var(--gold-light)' : 'var(--text-muted)'};">${st}</div>
            </div>
          `).join('')}
        </div>

        <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.8;">
          <p><strong>Client :</strong> ${order.customer ? order.customer.name : 'Client'} (${order.customer ? order.customer.phone : '-'})</p>
          <p><strong>Adresse :</strong> ${order.customer ? order.customer.neighborhood : ''}, ${order.customer ? order.customer.city : ''}</p>
          <p><strong>Paiement :</strong> <span style="color: var(--gold-primary); font-weight: 700;">${order.paymentMethod || 'Espèces'}</span></p>
          <p><strong>Total Parfum :</strong> <span style="color: var(--gold-light); font-weight: 700;">${order.total.toLocaleString('fr-FR')} FCFA</span></p>
        </div>
      </div>
    `;
  };

  // --------------------------------------------------------------------------
  // ADMIN DASHBOARD LOGIC
  // --------------------------------------------------------------------------
  function loadAdminData() {
    renderAdminStats();
    renderAdminOrdersTable(allOrders);
    renderAdminInboxTable(allInboxMessages);
    renderAdminProductsTable(allProducts);
  }

  function renderAdminStats() {
    const revenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pending = allOrders.filter(o => o.status === 'En préparation' || o.status === 'Commande reçue').length;
    const delivered = allOrders.filter(o => o.status === 'Livrée').length;

    document.getElementById('stat-revenue').textContent = `${revenue.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('stat-total-orders').textContent = allOrders.length;
    document.getElementById('stat-total-messages').textContent = allInboxMessages.length;
    document.getElementById('stat-delivered').textContent = delivered;
    document.getElementById('inbox-badge-count').textContent = allInboxMessages.length;
  }

  window.deleteInboxMessage = function(msgId) {
    if (confirm("Voulez-vous vraiment supprimer ce message de la plateforme ?")) {
      allInboxMessages = allInboxMessages.filter(m => m.id !== msgId);
      localStorage.setItem('shone_inbox', JSON.stringify(allInboxMessages));
      loadAdminData();
    }
  };

  function renderAdminInboxTable(messages) {
    const tbody = document.getElementById('admin-inbox-tbody');
    if (!tbody) return;

    if (messages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucun message ou demande enregistré sur la plateforme.</td></tr>`;
      return;
    }

    tbody.innerHTML = messages.map(msg => {
      let typeBadge = '';
      if (msg.type === 'DISPONIBILITÉ') {
        typeBadge = `<span style="background: rgba(96, 165, 250, 0.15); color: #60A5FA; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;"><i class="fas fa-boxes-packing"></i> Disponibilité</span>`;
      } else if (msg.type === 'CONFIRMATION RÉCEPTION') {
        typeBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;"><i class="fas fa-camera"></i> Réception + Photo</span>`;
      } else {
        typeBadge = `<span style="background: rgba(212, 175, 55, 0.15); color: var(--gold-light); padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;"><i class="fas fa-wand-magic-sparkles"></i> Conseil Olfactif</span>`;
      }

      const cleanPhone = msg.customerPhone ? msg.customerPhone.replace(/\s+/g, '') : '';
      const fullPhone = cleanPhone.startsWith('226') ? cleanPhone : `226${cleanPhone}`;

      // EXACT MESSAGE REQUESTED BY USER
      const waReplyText = `Bonjour ${msg.customerName}, nous avons bien reçu votre message nous nous apprêtons à vous répondre.`;
      const waReplyUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(waReplyText)}`;

      // PHOTO THUMBNAIL IF PRESENT
      const photoHtml = msg.photoImage 
        ? `<div style="margin-top: 8px;"><a href="${msg.photoImage}" target="_blank"><img src="${msg.photoImage}" style="max-height: 70px; border-radius: 6px; border: 1px solid var(--border-gold);" title="Cliquez pour agrandir la photo de preuve" /></a><div style="font-size: 0.7rem; color: var(--gold-primary);">📸 Photo transmise</div></div>`
        : '';

      return `
        <tr style="border-bottom: 1px solid var(--border-dark);">
          <td style="padding: 14px; font-size: 0.85rem;">${new Date(msg.createdAt || Date.now()).toLocaleString('fr-FR')}</td>
          <td style="padding: 14px;">${typeBadge}</td>
          <td style="padding: 14px;"><strong style="color: var(--gold-light);">${msg.customerName}</strong></td>
          <td style="padding: 14px;">${msg.customerPhone}</td>
          <td style="padding: 14px; font-size: 0.85rem; max-width: 280px; line-height: 1.5;">
            ${msg.details}
            ${photoHtml}
          </td>
          <td style="padding: 14px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <a href="${waReplyUrl}" target="_blank" class="btn btn-whatsapp" style="padding: 6px 12px; font-size: 0.8rem;">
                <i class="fab fa-whatsapp"></i> Répondre sur WhatsApp
              </a>
              <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem; border-color: var(--accent-danger); color: var(--accent-danger);" onclick="deleteInboxMessage('${msg.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderAdminOrdersTable(orders) {
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucune commande enregistrée.</td></tr>`;
      return;
    }

    const statuses = ['Commande reçue', 'Commande confirmée', 'En préparation', 'En livraison', 'Livrée'];

    tbody.innerHTML = orders.map(o => `
      <tr style="border-bottom: 1px solid var(--border-dark);">
        <td style="padding: 14px;"><strong style="color: var(--gold-light);">${o.orderNumber}</strong></td>
        <td style="padding: 14px; font-size: 0.85rem;">${new Date(o.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 14px;">${o.customer ? o.customer.name : 'Client'}</td>
        <td style="padding: 14px;">${o.customer ? o.customer.phone : '-'}</td>
        <td style="padding: 14px;">${o.customer ? o.customer.neighborhood : '-'} (${o.customer ? o.customer.city : ''})</td>
        <td style="padding: 14px;"><span style="background: rgba(212,175,55,0.15); color: var(--gold-primary); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">${o.paymentMethod || 'ESPÈCES'}</span></td>
        <td style="padding: 14px;"><strong>${(o.total || 0).toLocaleString('fr-FR')} FCFA</strong></td>
        <td style="padding: 14px;">
          <select class="status-select" onchange="changeOrderStatus('${o.orderNumber}', this.value)">
            ${statuses.map(st => `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  }

  window.changeOrderStatus = function(orderNumber, newStatus) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (order) {
      order.status = newStatus;
      localStorage.setItem('shone_orders', JSON.stringify(allOrders));
      loadAdminData();
    }
  };

  window.filterAdminOrders = function() {
    const query = document.getElementById('admin-search-orders').value.toLowerCase().trim();
    const filtered = allOrders.filter(o => 
      o.orderNumber.toLowerCase().includes(query) ||
      (o.customer && o.customer.name.toLowerCase().includes(query))
    );
    renderAdminOrdersTable(filtered);
  };

  function renderAdminProductsTable(products) {
    const tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => `
      <tr style="border-bottom: 1px solid var(--border-dark);">
        <td style="padding: 14px;"><img src="${p.image}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-gold);" /></td>
        <td style="padding: 14px;"><strong style="color: var(--gold-light);">${p.name}</strong></td>
        <td style="padding: 14px;"><span style="color: ${p.gender==='homme'?'#60A5FA':'#F472B6'}; font-weight: 700; font-size: 0.8rem;">${p.gender==='homme'?'♂ Homme':'♀ Femme'}</span></td>
        <td style="padding: 14px;"><span style="color: var(--gold-light); font-weight: 600; font-size: 0.85rem;">✨ ${p.style || 'Doux'}</span></td>
        <td style="padding: 14px;"><strong style="color: var(--gold-light);">${p.price.toLocaleString('fr-FR')} FCFA</strong></td>
        <td style="padding: 14px;">
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-color: var(--border-gold);" onclick="openEditProductModal('${p.id}')">
            <i class="fas fa-pen-to-square"></i> Modifier / Remplacer
          </button>
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-color: var(--accent-danger); color: var(--accent-danger);" onclick="deleteProduct('${p.id}')">
            <i class="fas fa-trash"></i> Supprimer
          </button>
        </td>
      </tr>
    `).join('');
  }

  window.switchAdminTab = function(tabId) {
    const tabs = document.querySelectorAll('.admin-tab-content');
    tabs.forEach(t => t.style.display = 'none');
    
    document.getElementById('tab-btn-orders').classList.remove('active');
    document.getElementById('tab-btn-inbox').classList.remove('active');
    document.getElementById('tab-btn-products').classList.remove('active');

    document.getElementById(tabId).style.display = 'block';
    if (tabId === 'orders-tab') document.getElementById('tab-btn-orders').classList.add('active');
    if (tabId === 'inbox-tab') document.getElementById('tab-btn-inbox').classList.add('active');
    if (tabId === 'products-tab') document.getElementById('tab-btn-products').classList.add('active');
  };

  // --------------------------------------------------------------------------
  // GENERAL MODAL HELPERS & LISTENERS
  // --------------------------------------------------------------------------
  window.openModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  if (searchInput) searchInput.addEventListener('input', applyFiltersAndSort);
  if (sortSelect) sortSelect.addEventListener('change', (e) => { currentSort = e.target.value; applyFiltersAndSort(); });

  // INITIAL RUN
  applyFiltersAndSort();
  renderDeliveryZones();
  renderCustomerReviews();
});
