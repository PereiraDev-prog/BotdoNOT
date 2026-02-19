let currentToken = '';

async function login() {
    const password = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            currentToken = password;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('hidden');
            loadAll();
        } else {
            errorMsg.innerText = 'Senha incorreta!';
        }
    } catch (e) {
        errorMsg.innerText = 'Erro ao conectar ao servidor';
    }
}

function logout() {
    currentToken = '';
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    event.currentTarget.classList.add('active');

    if (tabName === 'overview') loadStats();
    if (tabName === 'products') loadProducts();
    if (tabName === 'orders') loadOrders();
    if (tabName === 'config') loadConfig();
}

async function loadAll() {
    loadStats();
    loadProducts();
    loadOrders();
    loadConfig();
}

async function apiRequest(path, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': currentToken
        }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(path, options);
    if (response.status === 401) return logout();
    return response.json();
}

// Stats
async function loadStats() {
    const stats = await apiRequest('/api/stats');
    document.getElementById('stat-members').innerText = stats.members;
    document.getElementById('stat-sales').innerText = `R$ ${stats.totalSales.toFixed(2)}`;
    document.getElementById('stat-tickets').innerText = stats.activeTickets;
    document.getElementById('stat-orders').innerText = stats.orders;

    const tbody = document.querySelector('#recent-orders-table tbody');
    tbody.innerHTML = '';
    stats.recentOrders.forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td>#${o.id}</td>
                <td>${o.username}</td>
                <td>R$ ${o.total.toFixed(2)}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
        `;
    });
}

// Products
async function loadProducts() {
    const products = await apiRequest('/api/products');
    const container = document.getElementById('product-list');
    container.innerHTML = '';

    products.forEach(p => {
        container.innerHTML += `
            <div class="product-card">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="product-price">R$ ${p.price.toFixed(2)}</div>
                <p>Estoque: ${p.stock}</p>
                <div class="product-actions">
                    <button class="btn-secondary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

let editingProductId = null;
function openProductModal(id = null) {
    editingProductId = id;
    document.getElementById('modal-title').innerText = id ? 'Editar Produto' : 'Novo Produto';
    document.getElementById('product-modal').classList.remove('hidden');

    if (id) {
        // Mock load data for edit (will implement properly if needed)
    } else {
        document.getElementById('p-name').value = '';
        document.getElementById('p-desc').value = '';
        document.getElementById('p-price').value = '';
        document.getElementById('p-stock').value = '';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

async function saveProduct() {
    const data = {
        name: document.getElementById('p-name').value,
        description: document.getElementById('p-desc').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: parseInt(document.getElementById('p-stock').value)
    };

    if (editingProductId) {
        await apiRequest(`/api/products/${editingProductId}`, 'PUT', data);
    } else {
        await apiRequest('/api/products', 'POST', data);
    }

    closeProductModal();
    loadProducts();
}

async function deleteProduct(id) {
    if (confirm('Tem certeza?')) {
        await apiRequest(`/api/products/${id}`, 'DELETE');
        loadProducts();
    }
}

// Orders
async function loadOrders() {
    const orders = await apiRequest('/api/orders');
    const tbody = document.getElementById('all-orders-list');
    tbody.innerHTML = '';

    orders.reverse().forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td>#${o.id}</td>
                <td>${o.username}</td>
                <td>R$ ${o.total.toFixed(2)}</td>
                <td>
                    <select onchange="updateOrderStatus(${o.id}, this.value)">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processando</option>
                        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
                <td><button onclick="alert('Ver detalhes do pedido em breve')">Detalhes</button></td>
            </tr>
        `;
    });
}

async function updateOrderStatus(id, status) {
    await apiRequest(`/api/orders/${id}/status`, 'PUT', { status });
    loadStats();
}

// Config
async function loadConfig() {
    const config = await apiRequest('/api/config');
    document.getElementById('config-welcome-msg').value = config.welcome?.message || '';
    document.getElementById('config-welcome-id').value = config.welcome?.channelId || '';
    document.getElementById('config-logs-id').value = config.logs?.memberJoin || '';
}

async function saveConfig() {
    const data = {
        welcome: {
            message: document.getElementById('config-welcome-msg').value,
            channelId: document.getElementById('config-welcome-id').value,
            enabled: true
        },
        logs: {
            memberJoin: document.getElementById('config-logs-id').value,
            enabled: true
        }
    };
    await apiRequest('/api/config', 'POST', data);
    alert('Configurações salvas!');
}
