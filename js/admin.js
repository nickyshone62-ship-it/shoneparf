/* ==========================================================================
   SHONE PARFUMERIE - ADMIN DASHBOARD ENGINE (ÉTAPE 10)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Check if admin is authenticated
  if (sessionStorage.getItem('shone_admin_logged') === 'true') {
    showMainScreen();
  }

  // Admin Login Handler
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = document.getElementById('admin-password-input').value;
      if (pwd === 'shone2026' || pwd === 'admin') {
        sessionStorage.setItem('shone_admin_logged', 'true');
        showMainScreen();
      } else {
        alert("Code d'accès incorrect ! Accès refusé.");
      }
    });
  }
});

function showMainScreen() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-main-screen').style.display = 'block';
  loadAdminDashboardData();
}

window.adminLogout = function() {
  sessionStorage.removeItem('shone_admin_logged');
  location.reload();
};

// Tab Switcher
window.switchAdminTab = function(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(t => t.style.display = 'none');
  
  const navTabs = document.querySelectorAll('.admin-tab');
  navTabs.forEach(n => n.classList.remove('active'));

  document.getElementById(tabId).style.display = 'block';
  event.currentTarget.classList.add('active');
};

// Dashboard Data Loading
let allOrders = [];
let allProducts = [];
let allZones = [];

async function loadAdminDashboardData() {
  allOrders = await ShoneDB.getOrders();
  allProducts = await ShoneDB.getProducts();
  allZones = JSON.parse(localStorage.getItem('shone_zones')) || DELIVERY_ZONES_DATA;

  renderStats();
  renderAdminOrders(allOrders);
  renderAdminProducts(allProducts);
  renderAdminZones(allZones);
}

// Render Stats KPIs
function renderStats() {
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingCount = allOrders.filter(o => o.status === 'En préparation' || o.status === 'Commande reçue').length;
  const deliveredCount = allOrders.filter(o => o.status === 'Livrée').length;

  document.getElementById('stat-revenue').textContent = `${totalRevenue.toLocaleString('fr-FR')} FCFA`;
  document.getElementById('stat-total-orders').textContent = allOrders.length;
  document.getElementById('stat-pending').textContent = pendingCount;
  document.getElementById('stat-delivered').textContent = deliveredCount;
}

// Render Admin Orders Table
function renderAdminOrders(ordersToRender) {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (ordersToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Aucune commande enregistrée.</td></tr>`;
    return;
  }

  const statuses = ['Commande reçue', 'Commande confirmée', 'En préparation', 'En livraison', 'Livrée'];

  tbody.innerHTML = ordersToRender.map(o => `
    <tr>
      <td><strong style="color: var(--gold-light);">${o.orderNumber}</strong></td>
      <td>${new Date(o.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
      <td>${o.customer ? o.customer.name : 'Client'}</td>
      <td>${o.customer ? o.customer.phone : '-'}</td>
      <td>${o.customer ? `${o.customer.neighborhood}, ${o.customer.city}` : '-'}</td>
      <td><strong>${(o.total || 0).toLocaleString('fr-FR')} FCFA</strong></td>
      <td>
        <select class="status-select" onchange="changeOrderStatus('${o.orderNumber}', this.value)">
          ${statuses.map(st => `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="viewOrderDetails('${o.orderNumber}')">
          <i class="fas fa-eye"></i> Détails
        </button>
      </td>
    </tr>
  `).join('');
}

window.changeOrderStatus = async function(orderNumber, newStatus) {
  await ShoneDB.updateOrderStatus(orderNumber, newStatus);
  loadAdminDashboardData();
};

window.filterAdminOrders = function() {
  const query = document.getElementById('admin-search-orders').value.toLowerCase().trim();
  const filtered = allOrders.filter(o => 
    o.orderNumber.toLowerCase().includes(query) ||
    (o.customer && o.customer.name.toLowerCase().includes(query))
  );
  renderAdminOrders(filtered);
};

// Render Products Table
function renderAdminProducts(productsToRender) {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = productsToRender.map(p => `
    <tr>
      <td><img src="${p.image}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;" /></td>
      <td><strong>${p.name}</strong></td>
      <td><span style="color: var(--gold-primary); font-size: 0.8rem;">${p.categoryLabel || p.category}</span></td>
      <td><strong>${p.price.toLocaleString('fr-FR')} FCFA</strong></td>
      <td><span style="color: var(--accent-success); font-weight: 700;">${p.stock}</span></td>
      <td>${p.size || '100 ml'}</td>
      <td>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openEditProductModal('${p.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem; border-color: var(--accent-danger); color: var(--accent-danger);" onclick="deleteProduct('${p.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Product Modal Handlers
window.openAddProductModal = function() {
  document.getElementById('product-form-title').textContent = "Ajouter un Parfum";
  document.getElementById('edit-product-id').value = "";
  document.getElementById('product-form').reset();
  openModal('product-form-modal');
};

window.openEditProductModal = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('product-form-title').textContent = "Modifier le Parfum";
  document.getElementById('edit-product-id').value = product.id;
  document.getElementById('prod-name-in').value = product.name;
  document.getElementById('prod-price-in').value = product.price;
  document.getElementById('prod-stock-in').value = product.stock;
  document.getElementById('prod-category-in').value = product.category;
  document.getElementById('prod-size-in').value = product.size || '100 ml';
  document.getElementById('prod-image-in').value = product.image;
  document.getElementById('prod-desc-in').value = product.description;

  openModal('product-form-modal');
};

window.saveProductSubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-product-id').value || `prod-${Date.now()}`;
  const name = document.getElementById('prod-name-in').value;
  const price = parseInt(document.getElementById('prod-price-in').value);
  const stock = parseInt(document.getElementById('prod-stock-in').value);
  const category = document.getElementById('prod-category-in').value;
  const size = document.getElementById('prod-size-in').value;
  const image = document.getElementById('prod-image-in').value;
  const description = document.getElementById('prod-desc-in').value;

  const productData = { id, name, price, stock, category, size, image, description };
  await ShoneDB.saveProduct(productData);

  closeModal('product-form-modal');
  loadAdminDashboardData();
};

window.deleteProduct = function(productId) {
  if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
    allProducts = allProducts.filter(p => p.id !== productId);
    localStorage.setItem('shone_products', JSON.stringify(allProducts));
    loadAdminDashboardData();
  }
};

// Render Delivery Zones Setup
function renderAdminZones(zones) {
  const container = document.getElementById('admin-zones-container');
  if (!container) return;

  container.innerHTML = zones.map((z, idx) => `
    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
      <input type="text" class="form-control zone-name-input" value="${z.name}" style="flex: 2;" />
      <input type="number" class="form-control zone-fee-input" value="${z.fee}" style="flex: 1;" />
    </div>
  `).join('');
}

window.saveAdminZones = function() {
  const nameInputs = document.querySelectorAll('.zone-name-input');
  const feeInputs = document.querySelectorAll('.zone-fee-input');

  const updatedZones = [];
  nameInputs.forEach((inp, idx) => {
    updatedZones.push({
      id: `zone-${idx+1}`,
      name: inp.value,
      fee: parseInt(feeInputs[idx].value) || 0
    });
  });

  localStorage.setItem('shone_zones', JSON.stringify(updatedZones));
  alert("Tarifs de livraison mis à jour avec succès !");
};

// General Modal Helpers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}
