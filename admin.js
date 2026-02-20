// ====== GLOBAL STATE ======
let adminHotels = [];
let adminMenuItems = [];
let adminOrders = [];
let adminDonations = [];
let adminReviews = [];
let adminPromoCodes = [];
let allCustomers = [];
let editingHotelId = null;
let editingMenuId = null;

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  attachFormListeners();
  renderAdminUsersTable();
});
// ====== ADMIN USERS TABLE ======
function renderAdminUsersTable() {
  const users = JSON.parse(localStorage.getItem('adminUsers')) || [];
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No users registered yet</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `<tr><td style='padding:6px 4px;'>${u.name}</td><td style='padding:6px 4px;'>${u.email}</td><td style='padding:6px 4px;'>${u.phone}</td></tr>`).join('');
}

// Update user table if users are added in another tab
window.addEventListener('storage', (e) => {
  if (e.key === 'adminUsers') renderAdminUsersTable();
});

// ====== AUTHENTICATION ======
function checkAdminAuth() {
  const adminToken = localStorage.getItem('adminToken');
  const adminEmail = localStorage.getItem('adminEmail');

  if (!adminToken || !adminEmail) {
    showLoginPage();
  } else {
    showAdminDashboard();
    loadAdminData();
    updateDashboard();
  }
}

function showLoginPage() {
  const loginHTML = `
    <div class="login-container">
      <div class="login-box">
        <div class="login-header">
          <h1>🍲 Oor Saapadu Admin</h1>
          <p>Administrator Login</p>
        </div>
        <form id="adminLoginForm" class="login-form" onsubmit="handleAdminLogin(event)">
          <div class="form-group">
            <label for="adminEmailInput">Email</label>
            <input type="email" id="adminEmailInput" required placeholder="admin@oorsaapadu.com" />
          </div>
          <div class="form-group">
            <label for="adminPasswordInput">Password</label>
            <input type="password" id="adminPasswordInput" required placeholder="password123" />
          </div>
          <button type="submit" class="login-btn">Login</button>
          <p class="demo-credentials">Demo: admin@oorsaapadu.com / password123</p>
        </form>
      </div>
    </div>
  `;
  document.body.innerHTML = loginHTML;
}

function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmailInput').value;
  const password = document.getElementById('adminPasswordInput').value;

  if (email === 'admin@oorsaapadu.com' && password === 'password123') {
    localStorage.setItem('adminToken', 'admin_token_' + Date.now());
    localStorage.setItem('adminEmail', email);
    location.reload();
  } else {
    alert('Invalid credentials! Use demo account: admin@oorsaapadu.com / password123');
  }
}

function showAdminDashboard() {
  document.querySelector('body').style.display = 'block';
  document.getElementById('adminUser').textContent = localStorage.getItem('adminEmail');
  attachFormListeners();
}

// ====== FORM LISTENERS ======
function attachFormListeners() {
  // Remove old listeners
  const oldHotelForm = document.getElementById('hotelForm');
  const oldMenuForm = document.getElementById('menuForm');
  
  if (oldHotelForm) {
    oldHotelForm.removeEventListener('submit', handleFormSubmit);
    oldHotelForm.addEventListener('submit', handleFormSubmit);
  }
  
  if (oldMenuForm) {
    oldMenuForm.removeEventListener('submit', handleFormSubmit);
    oldMenuForm.addEventListener('submit', handleFormSubmit);
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  if (e.target.id === 'hotelForm') {
    handleHotelFormSubmit(e);
  } else if (e.target.id === 'menuForm') {
    handleMenuFormSubmit(e);
  }
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    location.reload();
  }
}

// ====== DATA LOADING ======
function loadFromStorage(key, defaultValue = []) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : defaultValue;
    }
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return defaultValue;
}

function loadAdminData() {
  try {
    adminHotels = loadFromStorage('adminHotels');
    adminOrders = loadFromStorage('orders');
    adminDonations = loadFromStorage('adminDonations');
    adminReviews = loadFromStorage('adminReviews');
    adminPromoCodes = loadFromStorage('adminPromoCodes');

    // Build menu items from hotels
    adminMenuItems = [];
    adminHotels.forEach(hotel => {
      if (hotel.menu) {
        ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(category => {
          if (hotel.menu[category] && Array.isArray(hotel.menu[category])) {
            hotel.menu[category].forEach((item, idx) => {
              adminMenuItems.push({
                id: `${hotel.id}-${category}-${idx}`,
                name: item.name || item,
                hotel: hotel.name,
                hotelId: hotel.id,
                category: category,
                price: item.price || 50,
                description: item.description || ''
              });
            });
          }
        });
      }
    });

    extractCustomersFromOrders();
    populateReviewHotelFilter();
  } catch (error) {
    console.error('Critical error loading admin data:', error);
  }
}

function extractCustomersFromOrders() {
  const customersMap = new Map();

  adminOrders.forEach(order => {
    const customerId = order.email || order.customerName;
    if (!customersMap.has(customerId)) {
      customersMap.set(customerId, {
        id: customerId,
        name: order.customerName || 'Guest',
        email: order.email || 'N/A',
        phone: order.phone || 'N/A',
        orders: 0,
        totalSpent: 0,
        joinDate: new Date(order.timestamp).toLocaleDateString()
      });
    }
    const customer = customersMap.get(customerId);
    customer.orders += 1;
    customer.totalSpent += order.total || 0;
  });

  allCustomers = Array.from(customersMap.values());
}

// ====== DASHBOARD FUNCTIONS ======
function updateDashboard() {
  try {
    // Update stat cards
    document.getElementById('totalHotels').textContent = adminHotels.length;
    
    const todayOrders = adminOrders.filter(order => {
      const orderDate = new Date(order.timestamp).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      return orderDate === today;
    }).length;
    document.getElementById('todayOrders').textContent = todayOrders;

    const revenueToday = adminOrders
      .filter(order => {
        const orderDate = new Date(order.timestamp).toLocaleDateString();
        const today = new Date().toLocaleDateString();
        return orderDate === today;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('revenueToday').textContent = '₹' + revenueToday.toFixed(2);

    document.getElementById('totalDonations').textContent = adminDonations.length;
    document.getElementById('totalCustomers').textContent = allCustomers.length;
    
    let totalMenuItems = 0;
    adminHotels.forEach(hotel => {
      if (hotel.menu) {
        ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(category => {
          if (Array.isArray(hotel.menu[category])) {
            totalMenuItems += hotel.menu[category].length;
          }
        });
      }
    });
    document.getElementById('totalMenuItems').textContent = totalMenuItems;

    // Update recent orders
    updateRecentOrders();
    
    // Update top hotels
    updateTopHotels();
    
    // Update performance stats
    updatePerformanceStats();

    // Populate table data
    populateHotelsTable();
    populateMenuTable();
    populateOrdersTable();
    populateDonationsTable();
    populateReviewsTable();
    populatePromoCodesTable();
    populateCustomersTable();

    // Populate filters
    populateHotelFilters();
    populateReviewHotelFilter();
  } catch (error) {
    console.error('Error updating dashboard:', error);
  }
}

function updateRecentOrders() {
  const recentOrders = adminOrders.slice(-5).reverse();
  const container = document.getElementById('recentOrdersList');
  
  if (recentOrders.length === 0) {
    container.innerHTML = '<p class="empty-message">No orders yet</p>';
    return;
  }

  container.innerHTML = recentOrders.map(order => `
    <div class="recent-order-item">
      <div class="order-info">
        <p><strong>#${order.orderId || 'N/A'}</strong></p>
        <p class="order-customer">${order.customerName || 'Guest'}</p>
      </div>
      <div class="order-amount">₹${(order.total || 0).toFixed(2)}</div>
      <div class="order-status ${order.status || 'Pending'}">${order.status || 'Pending'}</div>
    </div>
  `).join('');
}

function updateTopHotels() {
  const hotelOrders = {};
  
  adminOrders.forEach(order => {
    const hotelName = order.hotelName || 'Unknown';
    if (!hotelOrders[hotelName]) {
      hotelOrders[hotelName] = 0;
    }
    hotelOrders[hotelName]++;
  });

  const topHotels = Object.entries(hotelOrders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const container = document.getElementById('topHotelsList');
  
  if (topHotels.length === 0) {
    container.innerHTML = '<p class="empty-message">No orders yet</p>';
    return;
  }

  container.innerHTML = topHotels.map(([hotel, count]) => `
    <div class="top-hotel-item">
      <p class="hotel-name">${hotel}</p>
      <p class="hotel-orders">${count} orders</p>
    </div>
  `).join('');
}

function updatePerformanceStats() {
  const stats = {
    totalOrders: adminOrders.length,
    deliveredOrders: adminOrders.filter(o => o.status === 'Delivered').length,
    pendingOrders: adminOrders.filter(o => o.status === 'Pending').length,
    averageOrderValue: adminOrders.length > 0 ? (adminOrders.reduce((s, o) => s + (o.total || 0), 0) / adminOrders.length).toFixed(2) : 0,
    totalRevenue: adminOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)
  };

  const container = document.getElementById('performanceStats');
  container.innerHTML = `
    <div class="perf-stat">
      <p>Total Orders</p>
      <h4>${stats.totalOrders}</h4>
    </div>
    <div class="perf-stat">
      <p>Delivered</p>
      <h4>${stats.deliveredOrders}</h4>
    </div>
    <div class="perf-stat">
      <p>Pending</p>
      <h4>${stats.pendingOrders}</h4>
    </div>
    <div class="perf-stat">
      <p>Avg Order Value</p>
      <h4>₹${stats.averageOrderValue}</h4>
    </div>
    <div class="perf-stat">
      <p>Total Revenue</p>
      <h4>₹${stats.totalRevenue}</h4>
    </div>
  `;
}

// ====== SECTION NAVIGATION ======
function showSection(sectionId) {
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(section => section.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => item.classList.remove('active'));
  event.target.classList.add('active');

  if (sectionId === 'dashboard') {
    updateDashboard();
  }
}

// ====== HOTEL MANAGEMENT ======
function openHotelForm() {
  editingHotelId = null;
  document.getElementById('hotelFormTitle').textContent = 'Add New Hotel';
  document.getElementById('hotelForm').reset();
  const preview = document.getElementById('hotelImagePreview');
  preview.src = '';
  preview.style.display = 'none';
  document.getElementById('hotelFormModal').style.display = 'flex';
}

function closeHotelForm() {
  document.getElementById('hotelFormModal').style.display = 'none';
  editingHotelId = null;
  const preview = document.getElementById('hotelImagePreview');
  preview.src = '';
  preview.style.display = 'none';
}

function editHotel(id) {
  const hotel = adminHotels.find(h => h.id === id);
  if (!hotel) return;

  editingHotelId = id;
  document.getElementById('hotelFormTitle').textContent = 'Edit Hotel';
  document.getElementById('hotelName').value = hotel.name;
  document.getElementById('hotelArea').value = hotel.area;
  document.getElementById('hotelLocation').value = hotel.location;
  document.getElementById('hotelCuisine').value = hotel.cuisine;
  document.getElementById('hotelDistance').value = hotel.distance;
  document.getElementById('hotelMinPrice').value = hotel.minPrice;
  document.getElementById('hotelDeliveryFee').value = hotel.deliveryFee;
  document.getElementById('hotelDeliveryTime').value = hotel.deliveryTime;
  document.getElementById('hotelContact').value = hotel.contact;
  
  const preview = document.getElementById('hotelImagePreview');
  if (hotel.imageUrl && hotel.imageUrl !== '🍲') {
    document.getElementById('hotelImageUrl').value = hotel.imageUrl.startsWith('data:') ? '' : hotel.imageUrl;
    preview.src = hotel.imageUrl;
    preview.style.display = 'block';
  } else {
    document.getElementById('hotelImageUrl').value = '';
    preview.src = '';
    preview.style.display = 'none';
  }

  document.getElementById('hotelFormModal').style.display = 'flex';
}

function deleteHotel(id) {
  if (confirm('Are you sure you want to delete this hotel?')) {
    adminHotels = adminHotels.filter(h => h.id !== id);
    saveAdminData();
    populateHotelsTable();
    updateDashboard();
  }
}

// ====== IMAGE HANDLING ======
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('hotelImagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    // Clear URL input if file is uploaded
    document.getElementById('hotelImageUrl').value = '';
  };
  reader.readAsDataURL(file);
}

function updateImagePreview(url) {
  const preview = document.getElementById('hotelImagePreview');
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    // Clear file input if URL is entered
    document.getElementById('hotelImageFile').value = '';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
}

function handleHotelFormSubmit(e) {

  try {
    if (!Array.isArray(adminHotels)) {
      adminHotels = [];
    }

    const preview = document.getElementById('hotelImagePreview');
    
    // Preserve existing menu if editing
    let existingMenu = {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: []
    };
    
    if (editingHotelId) {
      const existingHotel = adminHotels.find(h => h.id === editingHotelId);
      if (existingHotel && existingHotel.menu) {
        existingMenu = existingHotel.menu;
      }
    } else {
      // Default menu for new hotels
      existingMenu = {
        breakfast: [{ name: 'Idli', price: 30 }, { name: 'Dosa', price: 40 }],
        lunch: [{ name: 'Biriyani', price: 120 }, { name: 'Pulao', price: 90 }],
        snacks: [{ name: 'Samosa', price: 20 }, { name: 'Vada', price: 15 }],
        dinner: [{ name: 'Parotta', price: 30 }, { name: 'Naan', price: 35 }]
      };
    }

    const hotelData = {
      id: editingHotelId || (adminHotels.length > 0 ? Math.max(...adminHotels.map(h => h.id)) + 1 : 1),
      name: document.getElementById('hotelName').value,
      area: document.getElementById('hotelArea').value,
      location: document.getElementById('hotelLocation').value,
      cuisine: document.getElementById('hotelCuisine').value,
      distance: parseFloat(document.getElementById('hotelDistance').value),
      minPrice: parseFloat(document.getElementById('hotelMinPrice').value),
      deliveryFee: parseFloat(document.getElementById('hotelDeliveryFee').value),
      deliveryTime: document.getElementById('hotelDeliveryTime').value,
      contact: document.getElementById('hotelContact').value,
      imageUrl: (preview.style.display !== 'none' && preview.src && !preview.src.includes(window.location.host + window.location.pathname)) ? preview.src : '🍲',
      rating: 4.5,
      reviews: 125,
      menu: existingMenu
    };

    if (editingHotelId) {
      const index = adminHotels.findIndex(h => h.id === editingHotelId);
      if (index !== -1) {
        adminHotels[index] = hotelData;
        alert('Hotel updated successfully!');
      }
    } else {
      adminHotels.push(hotelData);
      alert('Hotel added successfully!');
    }

    saveAdminData();
    notifyUserPanel();
    closeHotelForm();
    populateHotelsTable();
    populateHotelFilters();
    updateDashboard();
  } catch (error) {
    console.error('❌ Hotel form error:', error);
    console.error('Error stack:', error.stack);
    alert('Error: ' + error.message);
  }
}

function populateHotelsTable() {
  const tbody = document.getElementById('hotelsTableBody');
  
  if (!Array.isArray(adminHotels) || adminHotels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No hotels added yet</td></tr>';
    return;
  }

  tbody.innerHTML = adminHotels.map(hotel => `
    <tr>
      <td>${hotel.id}</td>
      <td>${hotel.name}</td>
      <td>${hotel.area}</td>
      <td>${hotel.cuisine}</td>
      <td>⭐ ${hotel.rating}</td>
      <td><span class="status-badge active">Active</span></td>
      <td class="action-buttons">
        <button class="btn-edit" onclick="editHotel(${hotel.id})">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteHotel(${hotel.id})">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function populateHotelFilters() {
  const hotelSelect = document.getElementById('menuHotelSelect');
  const hotelFilter = document.getElementById('menuHotelFilter');
  
  hotelSelect.innerHTML = '<option value="">Select Hotel</option>' + adminHotels.map(h => 
    `<option value="${h.id}">${h.name}</option>`
  ).join('');

  hotelFilter.innerHTML = '<option value="">All Hotels</option>' + adminHotels.map(h => 
    `<option value="${h.id}">${h.name}</option>`
  ).join('');
}

// ====== MENU MANAGEMENT ======
function openMenuForm() {
  editingMenuId = null;
  document.getElementById('menuFormTitle').textContent = 'Add Menu Item';
  document.getElementById('menuForm').reset();
  document.getElementById('menuFormModal').style.display = 'flex';
}

function closeMenuForm() {
  document.getElementById('menuFormModal').style.display = 'none';
  editingMenuId = null;
}

function deleteMenuItem(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    adminMenuItems = adminMenuItems.filter(item => item.id !== id);
    populateMenuTable();
    updateDashboard();
  }
}

function handleMenuFormSubmit(e) {
  try {
    const menuItem = {
      id: editingMenuId || `menu-${Date.now()}`,
      name: document.getElementById('menuItemName').value,
      hotelId: parseInt(document.getElementById('menuHotelSelect').value),
      hotel: adminHotels.find(h => h.id == document.getElementById('menuHotelSelect').value)?.name || 'Unknown',
      category: document.getElementById('menuCategory').value,
      price: parseFloat(document.getElementById('menuItemPrice').value),
      description: document.getElementById('menuItemDesc').value
    };

    const existingIndex = adminMenuItems.findIndex(m => m.id === editingMenuId);
    if (existingIndex !== -1) {
      adminMenuItems[existingIndex] = menuItem;
      alert('Menu item updated!');
    } else {
      adminMenuItems.push(menuItem);
      alert('Menu item added!');
    }

    closeMenuForm();
    populateMenuTable();
    updateDashboard();
  } catch (error) {
    console.error('Menu form error:', error);
    alert('Error: ' + error.message);
  }
}

function filterMenuItems() {
  populateMenuTable();
}

function populateMenuTable() {
  const hotelFilter = document.getElementById('menuHotelFilter')?.value || '';
  const categoryFilter = document.getElementById('menuCategoryFilter')?.value || '';
  
  let filteredItems = adminMenuItems;
  
  if (hotelFilter) {
    filteredItems = filteredItems.filter(item => item.hotelId == hotelFilter);
  }
  if (categoryFilter) {
    filteredItems = filteredItems.filter(item => item.category === categoryFilter);
  }

  const tbody = document.getElementById('menuTableBody');
  
  if (filteredItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No menu items found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredItems.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.hotel}</td>
      <td><span class="category-badge">${item.category}</span></td>
      <td>₹${item.price}</td>
      <td>${item.description}</td>
      <td class="action-buttons">
        <button class="btn-delete" onclick="deleteMenuItem('${item.id}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

// ====== ORDERS MANAGEMENT ======
function filterOrders() {
  populateOrdersTable();
}

function updateOrderStatus(orderId, newStatus) {
  const order = adminOrders.find(o => o.orderId === orderId);
  if (order) {
    order.status = newStatus;
    localStorage.setItem('orders', JSON.stringify(adminOrders));
    populateOrdersTable();
    alert('Order status updated!');
  }
}

function populateOrdersTable() {
  const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
  
  let filteredOrders = adminOrders;
  if (statusFilter) {
    filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
  }

  const tbody = document.getElementById('ordersTableBody');
  
  if (filteredOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-message">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredOrders.map(order => `
    <tr>
      <td>${order.orderId || 'N/A'}</td>
      <td>${order.customerName}</td>
      <td>${order.hotelName}</td>
      <td>${order.items?.length || 0} items</td>
      <td>₹${(order.total || 0).toFixed(2)}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${order.orderId}', this.value)">
          <option ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>${new Date(order.timestamp).toLocaleDateString()}</td>
      <td>
        <button class="btn-view" onclick="alert('Order Details: ${order.customerName}\\nTotal: ₹${order.total}\\nItems: ${order.items?.map(i => i.name).join(', ')}')">👁️</button>
      </td>
    </tr>
  `).join('');
}

// ====== DONATIONS MANAGEMENT ======
function populateDonationsTable() {
  const tbody = document.getElementById('donationsTableBody');
  
  if (!Array.isArray(adminDonations) || adminDonations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No donations yet</td></tr>';
    return;
  }

  tbody.innerHTML = adminDonations.map(donation => `
    <tr>
      <td>${donation.id || 'N/A'}</td>
      <td>${donation.donor || 'Anonymous'}</td>
      <td>${donation.hotel || 'N/A'}</td>
      <td>${donation.orphanage || 'N/A'}</td>
      <td>${donation.items || 'N/A'}</td>
      <td>₹${donation.amount || 0}</td>
      <td>${new Date(donation.date).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// ====== CUSTOMERS MANAGEMENT ======
function populateCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  
  if (!Array.isArray(allCustomers) || allCustomers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No customers yet</td></tr>';
    return;
  }

  tbody.innerHTML = allCustomers.map(customer => `
    <tr>
      <td>${customer.id}</td>
      <td>${customer.name}</td>
      <td>${customer.email}</td>
      <td>${customer.phone}</td>
      <td>${customer.orders}</td>
      <td>₹${customer.totalSpent.toFixed(2)}</td>
      <td>${customer.joinDate}</td>
    </tr>
  `).join('');
}

// ====== ANALYTICS ======
function updateAnalytics() {
  updateOrderStats();
  updatePopularItems();
  updateRevenueBreakdown();
}

function updateOrderStats() {
  const stats = {
    total: adminOrders.length,
    delivered: adminOrders.filter(o => o.status === 'Delivered').length,
    pending: adminOrders.filter(o => o.status === 'Pending').length,
    cancelled: adminOrders.filter(o => o.status === 'Cancelled').length
  };

  const container = document.getElementById('orderStats');
  container.innerHTML = `
    <div class="stat-row">
      <span>Total Orders:</span>
      <strong>${stats.total}</strong>
    </div>
    <div class="stat-row">
      <span>✅ Delivered:</span>
      <strong>${stats.delivered}</strong>
    </div>
    <div class="stat-row">
      <span>⏳ Pending:</span>
      <strong>${stats.pending}</strong>
    </div>
    <div class="stat-row">
      <span>❌ Cancelled:</span>
      <strong>${stats.cancelled}</strong>
    </div>
  `;
}

function updatePopularItems() {
  const itemCount = {};
  
  adminOrders.forEach(order => {
    order.items?.forEach(item => {
      itemCount[item.name] = (itemCount[item.name] || 0) + 1;
    });
  });

  const popular = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const container = document.getElementById('popularItemsList');
  container.innerHTML = popular.length === 0 ? 
    '<p class="empty-message">No data yet</p>' :
    popular.map(([item, count]) => `
      <div class="popular-item">
        <span>${item}</span>
        <strong>${count} orders</strong>
      </div>
    `).join('');
}

function updateRevenueBreakdown() {
  const hotelRevenue = {};
  
  adminOrders.forEach(order => {
    const hotel = order.hotelName || 'Unknown';
    hotelRevenue[hotel] = (hotelRevenue[hotel] || 0) + (order.total || 0);
  });

  const breakdown = Object.entries(hotelRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const container = document.getElementById('revenueBreakdown');
  container.innerHTML = breakdown.length === 0 ? 
    '<p class="empty-message">No data yet</p>' :
    breakdown.map(([hotel, revenue]) => `
      <div class="revenue-row">
        <span>${hotel}</span>
        <strong>₹${revenue.toFixed(2)}</strong>
      </div>
    `).join('');
}

// ====== SETTINGS ======
function saveCommissionSettings() {
  const percentage = document.getElementById('commissionPercentage').value;
  const minOrder = document.getElementById('minOrderValue').value;
  
  localStorage.setItem('commissionPercentage', percentage);
  localStorage.setItem('minOrderValue', minOrder);
  
  alert('Commission settings saved!');
}

function saveDeliverySettings() {
  const maxDistance = document.getElementById('maxDeliveryDistance').value;
  const baseFee = document.getElementById('baseDeliveryFee').value;
  
  localStorage.setItem('maxDeliveryDistance', maxDistance);
  localStorage.setItem('baseDeliveryFee', baseFee);
  
  alert('Delivery settings saved!');
}

function updateAdminSettings() {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  
  if (email) {
    localStorage.setItem('adminEmail', email);
  }
  if (password) {
    localStorage.setItem('adminPassword', password);
  }
  
  alert('Admin settings updated!');
}

// ====== DATA PERSISTENCE ======
function saveAdminData() {
  try {
    localStorage.setItem('adminHotels', JSON.stringify(adminHotels));
    localStorage.setItem('adminReviews', JSON.stringify(adminReviews));
    localStorage.setItem('adminPromoCodes', JSON.stringify(adminPromoCodes));
  } catch (e) {
    console.error('❌ Error saving admin data:', e);
    alert('Error saving data: ' + e.message);
  }
}

// Refresh hotels in user panel when admin saves
function notifyUserPanel() {
  try {
    const event = new Event('hotelsUpdated');
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Error notifying user panel:', e);
  }
}

// ====== REVIEWS MANAGEMENT ======
function filterReviews() {
  populateReviewsTable();
}

function populateReviewsTable() {
  const hotelFilter = document.getElementById('reviewHotelFilter')?.value || '';
  const ratingFilter = document.getElementById('reviewRatingFilter')?.value || '';
  
  let filteredReviews = adminReviews;
  
  if (hotelFilter) {
    filteredReviews = filteredReviews.filter(review => review.hotelId == hotelFilter);
  }
  if (ratingFilter) {
    filteredReviews = filteredReviews.filter(review => review.rating == ratingFilter);
  }

  const tbody = document.getElementById('reviewsTableBody');
  
  if (filteredReviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No reviews yet</td></tr>';
    return;
  }

  tbody.innerHTML = filteredReviews.map(review => `
    <tr>
      <td>${review.id}</td>
      <td>${review.hotelName}</td>
      <td>${review.customerName}</td>
      <td>${'⭐'.repeat(review.rating)}</td>
      <td>${review.comment.substring(0, 50)}...</td>
      <td>${new Date(review.date).toLocaleDateString()}</td>
      <td class="action-buttons">
        <button class="btn-delete" onclick="deleteReview('${review.id}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function deleteReview(reviewId) {
  if (confirm('Are you sure you want to delete this review?')) {
    adminReviews = adminReviews.filter(r => r.id !== reviewId);
    localStorage.setItem('adminReviews', JSON.stringify(adminReviews));
    populateReviewsTable();
    alert('Review deleted!');
  }
}

function populateReviewHotelFilter() {
  const reviewHotelFilter = document.getElementById('reviewHotelFilter');
  if (reviewHotelFilter) {
    reviewHotelFilter.innerHTML = '<option value="">All Hotels</option>' + adminHotels.map(h => 
      `<option value="${h.id}">${h.name}</option>`
    ).join('');
  }
}

// ====== PROMO CODES MANAGEMENT ======
function openPromoForm() {
  const form = prompt('Enter promo code details\nFormat: CODE|DiscountType(percentage/fixed)|DiscountValue|MinOrderValue|ExpiryDate(YYYY-MM-DD)\nExample: SAVE10|percentage|10|100|2025-12-31');
  if (!form) return;

  try {
    const [code, discountType, discountValue, minOrderValue, expiryDate] = form.split('|');
    if (!code || !discountType || !discountValue || !minOrderValue || !expiryDate) {
      alert('Invalid format');
      return;
    }

    const newPromo = {
      id: Date.now(),
      code: code.toUpperCase().trim(),
      discountType: discountType.trim(),
      discountValue: parseInt(discountValue),
      minOrderValue: parseInt(minOrderValue),
      expiryDate: expiryDate.trim(),
      active: true,
      createdDate: new Date().toLocaleDateString(),
      usageCount: 0
    };

    adminPromoCodes.push(newPromo);
    saveAdminData();
    populatePromoCodesTable();
    alert(`✓ Promo code "${newPromo.code}" created successfully!`);
  } catch (e) {
    alert('Error creating promo code: ' + e.message);
  }
}

function deletePromoCode(id) {
  if (confirm('Delete this promo code?')) {
    adminPromoCodes = adminPromoCodes.filter(p => p.id !== id);
    saveAdminData();
    populatePromoCodesTable();
  }
}

function togglePromoStatus(id) {
  const promo = adminPromoCodes.find(p => p.id === id);
  if (promo) {
    promo.active = !promo.active;
    saveAdminData();
    populatePromoCodesTable();
  }
}

function populatePromoCodesTable() {
  const tbody = document.getElementById('promosTableBody');
  if (!tbody) return;

  if (adminPromoCodes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">No promo codes</td></tr>';
    return;
  }

  tbody.innerHTML = adminPromoCodes.map(promo => `
    <tr>
      <td><strong>${promo.code}</strong></td>
      <td>${promo.discountType === 'percentage' ? promo.discountValue + '%' : '₹' + promo.discountValue}</td>
      <td>₹${promo.minOrderValue}</td>
      <td>${promo.expiryDate}</td>
      <td>${promo.usageCount}</td>
      <td><span class="status-badge ${promo.active ? 'active' : 'inactive'}">${promo.active ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="btn-view" onclick="togglePromoStatus(${promo.id})">${promo.active ? '❌ Disable' : '✓ Enable'}</button>
        <button class="btn-delete" onclick="deletePromoCode(${promo.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ====== ADVANCED ANALYTICS ======
function getCustomerInsights() {
  const insights = {
    totalCustomers: allCustomers.length,
    repeatCustomers: allCustomers.filter(c => c.orderCount > 1).length,
    averageOrderValue: adminOrders.length > 0 ? (adminOrders.reduce((s, o) => s + (o.total || 0), 0) / adminOrders.length).toFixed(2) : 0,
    topCustomers: allCustomers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5)
  };
  return insights;
}

function getHotelAnalytics() {
  const hotelStats = {};
  adminOrders.forEach(order => {
    if (!hotelStats[order.hotelName]) {
      hotelStats[order.hotelName] = { orders: 0, revenue: 0, ratings: [] };
    }
    hotelStats[order.hotelName].orders++;
    hotelStats[order.hotelName].revenue += order.total || 0;
  });

  return Object.entries(hotelStats).map(([name, data]) => ({
    name,
    ...data
  })).sort((a, b) => b.revenue - a.revenue);
}

function getMenuAnalytics() {
  const itemStats = {};
  adminOrders.forEach(order => {
    order.items.forEach(item => {
      if (!itemStats[item.name]) {
        itemStats[item.name] = { quantity: 0, revenue: 0 };
      }
      itemStats[item.name].quantity += item.quantity || 1;
      itemStats[item.name].revenue += item.price * (item.quantity || 1);
    });
  });

  return Object.entries(itemStats).map(([name, data]) => ({
    name,
    ...data
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}

function updateAdvancedAnalytics() {
  const section = document.getElementById('analytics');
  if (!section) return;

  const customerInsights = getCustomerInsights();
  const hotelAnalytics = getHotelAnalytics();
  const menuAnalytics = getMenuAnalytics();

  const analyticsHTML = `
    <div class="section-header">
      <h1>📈 Advanced Analytics & Insights</h1>
    </div>

    <div class="analytics-container">
      <div class="analytics-card">
        <h3>👥 Customer Insights</h3>
        <div class="stats-list">
          <div class="stat-row">
            <span>Total Customers:</span>
            <strong>${customerInsights.totalCustomers}</strong>
          </div>
          <div class="stat-row">
            <span>Repeat Customers:</span>
            <strong>${customerInsights.repeatCustomers}</strong>
          </div>
          <div class="stat-row">
            <span>Avg Order Value:</span>
            <strong>₹${customerInsights.averageOrderValue}</strong>
          </div>
        </div>
      </div>

      <div class="analytics-card">
        <h3>🏪 Top Hotels</h3>
        <div class="popular-list">
          ${hotelAnalytics.slice(0, 5).map(h => `
            <div class="popular-item">
              <span>${h.name}</span>
              <strong>${h.orders} orders (₹${h.revenue.toFixed(2)})</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analytics-card">
        <h3>🍽️ Best Selling Items</h3>
        <div class="popular-list">
          ${menuAnalytics.slice(0, 5).map(m => `
            <div class="popular-item">
              <span>${m.name}</span>
              <strong>${m.quantity} sold (₹${m.revenue.toFixed(2)})</strong>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  section.innerHTML = analyticsHTML;
}

// Auto-update analytics on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    updateAnalytics();
    updateAdvancedAnalytics();
  }, 1000);
});
