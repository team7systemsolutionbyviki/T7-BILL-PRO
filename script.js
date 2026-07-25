// T7 BillPro - Core Logic

// --- Constants & State ---
let branches = JSON.parse(localStorage.getItem('mediflow_branches')) || [];
let currentBranchId = 'branch_default';
let currentUser = sessionStorage.getItem('mediflow_user') || null;
let currentTheme = localStorage.getItem('mediflow_theme') || 'light';
let admins = JSON.parse(localStorage.getItem('mediflow_admins')) || [];

// Migrate legacy data if branches are empty
if (branches.length === 0) {
    branches.push({ id: 'branch_default', name: 'Main Branch' });
    localStorage.setItem('mediflow_branches', JSON.stringify(branches));
    if (localStorage.getItem('mediflow_products')) {
        const legacyKeys = ['products', 'sales', 'settings', 'purchases', 'expenses', 'categories', 'customers', 'customer_payments', 'suppliers', 'supplier_payments', 'held_carts', 'amc'];
        legacyKeys.forEach(k => {
            let data = localStorage.getItem(`mediflow_${k}`);
            if (data) localStorage.setItem(`mediflow_branch_default_${k}`, data);
        });
    }
}

// Storage Interceptors for Multi-Branch
const branchSpecificKeys = ['mediflow_products', 'mediflow_sales', 'mediflow_settings', 'mediflow_purchases', 'mediflow_expenses', 'mediflow_categories', 'mediflow_expense_categories', 'mediflow_customers', 'mediflow_customer_payments', 'mediflow_suppliers', 'mediflow_supplier_payments', 'mediflow_held_carts', 'mediflow_amc'];

const originalGetItem = localStorage.getItem;
localStorage.getItem = function(key) {
    if (branchSpecificKeys.includes(key) && typeof currentBranchId !== 'undefined' && currentBranchId) {
        return originalGetItem.apply(this, [`mediflow_${currentBranchId}_${key.replace('mediflow_', '')}`]);
    }
    return originalGetItem.apply(this, [key]);
};

// Data Variables (Loaded dynamically based on branch)
let products = [];
let sales = [];
let settings = {};
let purchases = [];
let expenses = [];
let categories = [];
let expenseCategories = [];
let amcData = null;
let customers = [];
// admins declared globally above
let customerPayments = [];
let suppliers = [];
let supplierPayments = [];
let cart = [];
let heldCarts = [];

function loadBranchData() {
    const storedProducts = localStorage.getItem('mediflow_products');
    if (storedProducts === null) {
        products = [
            { id: 'P01', name: 'Paracetamol 500mg', category: 'Tablet', hsn: '3004', batch: 'BN1024', expiry: '2026-12-31', mrp: 40.00, salePrice: 35.00, stock: 150, gst: 12 },
            { id: 'P02', name: 'Amoxicillin 250mg', category: 'Capsule', hsn: '3004', batch: 'BN2025', expiry: '2026-06-15', mrp: 120.00, salePrice: 110.00, stock: 8, gst: 12 }
        ];
        localStorage.setItem('mediflow_products', JSON.stringify(products));
    } else {
        try {
            products = JSON.parse(storedProducts) || [];
        } catch (e) {
            products = [];
        }
    }
    sales = JSON.parse(localStorage.getItem('mediflow_sales')) || [];
    settings = JSON.parse(localStorage.getItem('mediflow_settings')) || {
        shopName: 'T7 BillPro', shopAddress: '123 Medical Street, City Center', shopPhone: '+91 9876543210', shopLogo: '', printerType: '3inch', gstDefault: true, currency: '₹'
    };
    purchases = JSON.parse(localStorage.getItem('mediflow_purchases')) || [];
    expenses = JSON.parse(localStorage.getItem('mediflow_expenses')) || [];
    categories = JSON.parse(localStorage.getItem('mediflow_categories')) || ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Other'];
    expenseCategories = JSON.parse(localStorage.getItem('mediflow_expense_categories')) || ['Rent', 'Electricity', 'Salary', 'Maintenance', 'Other'];
    amcData = JSON.parse(localStorage.getItem('mediflow_amc')) || null;
    customers = JSON.parse(localStorage.getItem('mediflow_customers')) || [];
    customerPayments = JSON.parse(localStorage.getItem('mediflow_customer_payments')) || [];
    suppliers = JSON.parse(localStorage.getItem('mediflow_suppliers')) || [];
    supplierPayments = JSON.parse(localStorage.getItem('mediflow_supplier_payments')) || [];
    heldCarts = JSON.parse(localStorage.getItem('mediflow_held_carts')) || [];
    cart = [];
}

// --- Firebase Config & Synchronization ---
const firebaseConfig = {
    apiKey: "AIzaSyDHWpCbtbs2G3_Gtm0-XKI2bxLoBG5TIDY",
    authDomain: "dical-billing-001.firebaseapp.com",
    databaseURL: "https://dical-billing-001-default-rtdb.firebaseio.com",
    projectId: "dical-billing-001",
    storageBucket: "dical-billing-001.firebasestorage.app",
    messagingSenderId: "1022770660641",
    appId: "1:1022770660641:web:8a56086be5fb5b2867aa60",
    measurementId: "G-QFJCKQYP9P"
};

let db = null;
let isFirebaseEnabled = false;
let unsubscribeCloudListener = null;

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_KEY") {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            isFirebaseEnabled = true;
            console.log("T7 BillPro Cloud Connected");
            syncFromCloud().then(() => {
                setupCloudListener();
            });
        }
    } catch (e) {
        console.error("Cloud Connection Error:", e);
    }
}

function initApp() {
    try {
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderProductDropdown === 'function') renderProductDropdown();
        if (typeof renderSupplierDropdown === 'function') renderSupplierDropdown();
        if (typeof renderSalesHistory === 'function') renderSalesHistory();
        if (typeof renderPurchases === 'function') renderPurchases();
        if (typeof renderExpenses === 'function') renderExpenses();
        if (typeof renderCustomers === 'function') renderCustomers();
        if (typeof renderSuppliers === 'function') renderSuppliers();
        if (typeof renderAdmins === 'function') renderAdmins();
        if (typeof renderBranches === 'function') renderBranches();
        if (typeof renderCategoryManagement === 'function') renderCategoryManagement();
        if (typeof renderExpenseCategoryManagement === 'function') renderExpenseCategoryManagement();
        if (typeof switchSection === 'function' && typeof activeSection !== 'undefined') {
            switchSection(activeSection);
        }
    } catch (e) {
        console.error("Error in initApp:", e);
    }
}
window.initApp = initApp;

async function syncToCloud(collectionName, documentData) {
    if (!isFirebaseEnabled || !db) return;
    try {
        let docName = collectionName;
        if (collectionName === 'customerPayments') docName = 'customer_payments';
        if (collectionName === 'supplierPayments') docName = 'supplier_payments';
        if (collectionName === 'expenseCategories') docName = 'expense_categories';
        
        const globalCols = ['admins', 'branches'];
        let fbDocName = globalCols.includes(collectionName) ? docName : `${currentBranchId}_${docName}`;
        
        await db.collection('mediflow_data').doc(fbDocName).set({
            payload: documentData.data !== undefined ? documentData.data : documentData,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('Error syncing to cloud:', e);
    }
}

let isSyncingFromCloud = false;

async function syncFromCloud() {
    if (!isFirebaseEnabled || !db) return;
    try {
        isSyncingFromCloud = true;
        const collections = ['products', 'sales', 'settings', 'purchases', 'expenses', 'categories', 'expense_categories', 'customers', 'suppliers', 'admins', 'supplierPayments', 'customerPayments', 'branches'];
        
        let hasUpdates = false;
        for (const col of collections) {
            let docName = col;
            if (col === 'customerPayments') docName = 'customer_payments';
            if (col === 'supplierPayments') docName = 'supplier_payments';

            const globalCols = ['admins', 'branches'];
            let fbDocName = globalCols.includes(col) ? docName : `${currentBranchId}_${docName}`;

            const doc = await db.collection('mediflow_data').doc(fbDocName).get();
            if (doc.exists) {
                const cloudData = doc.data().payload;
                if (cloudData === undefined || cloudData === null) continue;

                if (col === 'settings') {
                    settings = cloudData;
                    localStorage.setItem('mediflow_settings', JSON.stringify(settings));
                } else if (col === 'branches') {
                    branches = Array.isArray(cloudData) ? cloudData : [];
                    localStorage.setItem('mediflow_branches', JSON.stringify(branches));
                } else {
                    const arrayData = Array.isArray(cloudData) ? cloudData : [];
                    if (col === 'products') products = arrayData;
                    else if (col === 'sales') sales = arrayData;
                    else if (col === 'purchases') purchases = arrayData;
                    else if (col === 'expenses') expenses = arrayData;
                    else if (col === 'categories') categories = arrayData;
                    else if (col === 'expense_categories') expenseCategories = arrayData;
                    else if (col === 'customers') customers = arrayData;
                    else if (col === 'suppliers') suppliers = arrayData;
                    else if (col === 'admins') admins = arrayData;
                    else if (col === 'supplierPayments') supplierPayments = arrayData;
                    else if (col === 'customerPayments') customerPayments = arrayData;

                    window[col] = arrayData;
                    let localKey = 'mediflow_' + docName;
                    localStorage.setItem(localKey, JSON.stringify(arrayData));
                }
                hasUpdates = true;
            }
        }
        
        if (hasUpdates) {
            console.log("Cloud sync complete: App re-initialized with remote data.");
            initApp();
        }
    } catch (e) {
        console.error('Error syncing from cloud:', e);
    } finally {
        isSyncingFromCloud = false;
    }
}

function setupCloudListener() {
    if (!isFirebaseEnabled || !db) return;
    try {
        if (unsubscribeCloudListener) {
            unsubscribeCloudListener();
        }
        unsubscribeCloudListener = db.collection('mediflow_data').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    if (change.doc.metadata && change.doc.metadata.hasPendingWrites) {
                        return;
                    }
                    if (isSyncingFromCloud) return;

                    const docId = change.doc.id;
                    const cloudData = change.doc.data().payload;
                    if (cloudData === undefined || cloudData === null) return;

                    const globalCols = ['admins', 'branches'];
                    const isGlobal = globalCols.includes(docId);
                    const isBranchDoc = docId.startsWith(`${currentBranchId}_`);

                    if (!isGlobal && !isBranchDoc) return;

                    isSyncingFromCloud = true;
                    try {
                        let colKey = docId;
                        if (isBranchDoc) {
                            colKey = docId.replace(`${currentBranchId}_`, '');
                        }

                        if (colKey === 'settings') {
                            settings = cloudData;
                            localStorage.setItem('mediflow_settings', JSON.stringify(settings));
                        } else if (colKey === 'branches') {
                            branches = Array.isArray(cloudData) ? cloudData : [];
                            localStorage.setItem('mediflow_branches', JSON.stringify(branches));
                        } else {
                            const arrayData = Array.isArray(cloudData) ? cloudData : [];
                            if (colKey === 'products') products = arrayData;
                            else if (colKey === 'sales') sales = arrayData;
                            else if (colKey === 'purchases') purchases = arrayData;
                            else if (colKey === 'expenses') expenses = arrayData;
                            else if (colKey === 'categories') categories = arrayData;
                            else if (colKey === 'expense_categories') expenseCategories = arrayData;
                            else if (colKey === 'customers') customers = arrayData;
                            else if (colKey === 'suppliers') suppliers = arrayData;
                            else if (colKey === 'admins') admins = arrayData;
                            else if (colKey === 'supplier_payments') supplierPayments = arrayData;
                            else if (colKey === 'customer_payments') customerPayments = arrayData;

                            window[colKey] = arrayData;
                            let localKey = 'mediflow_' + colKey;
                            localStorage.setItem(localKey, JSON.stringify(arrayData));
                        }
                        initApp();
                    } finally {
                        isSyncingFromCloud = false;
                    }
                }
            });
        }, (err) => {
            console.warn("Cloud realtime listener issue:", err);
        });
    } catch (e) {
        console.error("Error setting up cloud listener:", e);
    }
}

async function backupAllToCloud() {
    if (!isFirebaseEnabled || !db) {
        alert('Cloud backup is not connected.');
        return;
    }
    const btn = document.getElementById('cloud-backup-btn');
    const originalText = btn ? btn.innerHTML : '<i data-lucide="cloud-upload"></i> BACKUP TO CLOUD';
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Backing up...';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        await syncToCloud('products', { data: products });
        await syncToCloud('sales', { data: sales });
        await syncToCloud('settings', settings);
        await syncToCloud('purchases', { data: purchases });
        await syncToCloud('expenses', { data: expenses });
        await syncToCloud('categories', { data: categories });
        await syncToCloud('expenseCategories', { data: expenseCategories });
        await syncToCloud('customers', { data: customers });
        await syncToCloud('suppliers', { data: suppliers });
        await syncToCloud('admins', { data: admins });
        await syncToCloud('customerPayments', { data: customerPayments });
        await syncToCloud('supplierPayments', { data: supplierPayments });
        await syncToCloud('branches', { data: branches });
        alert('All local data successfully backed up to Firebase!');
    } catch (e) {
         alert('Backup failed: ' + e.message);
         console.error(e);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

async function manualSyncFromCloud() {
    if (!isFirebaseEnabled || !db) {
        alert('Cloud sync is not connected.');
        return;
    }
    const btn = document.getElementById('cloud-sync-btn');
    const originalText = btn ? btn.innerHTML : '<i data-lucide="cloud-download"></i> SYNC FROM CLOUD';
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Syncing...';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        await syncFromCloud();
        alert('Data successfully synced from cloud!');
    } catch (e) {
        alert('Sync failed: ' + e.message);
        console.error(e);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

window.backupAllToCloud = backupAllToCloud;
window.manualSyncFromCloud = manualSyncFromCloud;
window.syncFromCloud = syncFromCloud;
window.syncToCloud = syncToCloud;

let activeSection = 'dashboard';
let currentPayMode = 'Cash';
let isReturnMode = false;

// --- Auto-Backup Interceptor ---
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    let actualKey = key;
    if (branchSpecificKeys.includes(key) && typeof currentBranchId !== 'undefined' && currentBranchId) {
        actualKey = `mediflow_${currentBranchId}_${key.replace('mediflow_', '')}`;
    }
    originalSetItem.apply(this, [actualKey, value]);

    // Only auto-backup if we aren't currently pulling down from Firebase
    if (typeof isSyncingFromCloud !== 'undefined' && !isSyncingFromCloud && typeof isFirebaseEnabled !== 'undefined' && isFirebaseEnabled && typeof db !== 'undefined' && db) {
        const keyMap = {
            'mediflow_products': 'products',
            'mediflow_sales': 'sales',
            'mediflow_settings': 'settings',
            'mediflow_purchases': 'purchases',
            'mediflow_expenses': 'expenses',
            'mediflow_categories': 'categories',
            'mediflow_expense_categories': 'expenseCategories',
            'mediflow_customers': 'customers',
            'mediflow_suppliers': 'suppliers',
            'mediflow_admins': 'admins',
            'mediflow_supplier_payments': 'supplierPayments',
            'mediflow_customer_payments': 'customerPayments',
            'mediflow_branches': 'branches'
        };

        if (keyMap[key]) {
             try {
                 const payload = (key === 'mediflow_settings') ? JSON.parse(value) : { data: JSON.parse(value) };
                 syncToCloud(keyMap[key], payload);
             } catch(e) {
                 console.error("Auto-backup parse error for " + key, e);
             }
        }
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initFirebase();
    lucide.createIcons();
    applySavedSidebarState();
    setupLoginHandler();
    setupEventListeners();
});

function applySavedSidebarState() {
    const isCollapsed = localStorage.getItem('mediflow_sidebar_collapsed') === 'true';
    const sidebar = document.querySelector('aside');
    if (sidebar && isCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
    }
}

function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('mediflow_logged_in');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (isLoggedIn === 'true') {
        const loggedInUsername = sessionStorage.getItem('mediflow_user');
        
        // Branch lock check
        const currentBranch = branches.find(b => b.id === (sessionStorage.getItem('mediflow_current_branch') || 'branch_default'));
        if (currentBranch && currentBranch.isLocked) {
            let lockActions = '';
            if (loggedInUsername === 'VIKI') {
                window.unlockCurrentBranch = function(id) {
                    const branch = branches.find(b => b.id === id);
                    if (branch) {
                        branch.isLocked = false;
                        localStorage.setItem('mediflow_branches', JSON.stringify(branches));
                        window.location.reload();
                    }
                };
                window.switchBranchFromLockScreen = function(val) {
                    if (val) {
                        sessionStorage.setItem('mediflow_current_branch', val);
                        window.location.reload();
                    }
                };
                
                lockActions = `
                    <button onclick="unlockCurrentBranch('${currentBranch.id}')" style="margin-top: 1rem; background: var(--primary-color); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; font-size: 1.1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                        Super Admin: Unlock Branch
                    </button>
                    <div style="margin-top: 1.5rem; text-align: left;">
                        <label style="font-size: 0.9rem; color: #64748b;">Or switch to another branch:</label>
                        <select onchange="switchBranchFromLockScreen(this.value)" style="margin-top: 0.5rem; width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #cbd5e1;">
                            <option value="">Select a branch...</option>
                            ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>
                `;
            }

            window.logoutFromLock = function() {
                sessionStorage.removeItem('mediflow_logged_in');
                sessionStorage.removeItem('mediflow_user');
                window.location.reload();
            };

            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 450px; width: 90%;">
                        <div style="color: #dc2626; margin-bottom: 1.5rem;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <h2 style="color: #dc2626; margin-bottom: 1rem; font-size: 1.8rem;">Branch Locked</h2>
                        <p style="color: #475569; margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.5;">This branch has been locked.</p>
                        
                        ${loggedInUsername !== 'VIKI' ? `
                            <h1 style="color: #0f172a; margin-bottom: 2rem; font-size: 2.5rem; letter-spacing: 2px;">9360039283</h1>
                            <a href="https://wa.me/919360039283?text=Hello%20Super%20Admin,%20my%20branch%20(${encodeURIComponent(currentBranch.name)})%20is%20locked." target="_blank" style="background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 0.75rem; text-decoration: none; padding: 16px 24px; border-radius: 8px; font-weight: bold; font-size: 1.1rem; width: 100%; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(37, 211, 102, 0.2); transition: transform 0.2s;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg> Send Message
                            </a>
                        ` : ''}

                        ${lockActions}
                        
                        <button onclick="logoutFromLock()" style="margin-top: 1.5rem; background: transparent; border: none; color: #64748b; cursor: pointer; text-decoration: underline;">Back to Login</button>
                    </div>
                </div>
            `;
            return;
        }
        
        let actualRole = 'staff'; 
        if (loggedInUsername === 'VIKI') {
            actualRole = 'superadmin';
            currentBranchId = sessionStorage.getItem('mediflow_current_branch') || (branches.length > 0 ? branches[0].id : 'branch_default');
        } else {
            const foundUser = admins.find(a => a.username === loggedInUsername);
            if (foundUser) {
                actualRole = foundUser.role;
                currentBranchId = foundUser.branchId || 'branch_default';
            }
        }
        
        loadBranchData();
        setupGlobalBranchSelector(actualRole);

        const isStaff = (actualRole === 'staff');

        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) {
            appContainer.style.display = 'flex';
            appContainer.classList.add('active-app');
        }

        const hideForStaff = ['dashboard', 'products', 'purchase', 'customers', 'suppliers', 'sales', 'settings'];
        hideForStaff.forEach(secName => {
            const navLink = document.querySelector(`.nav-item[data-section="${secName}"]`);
            if (navLink) navLink.style.display = isStaff ? 'none' : 'flex';
        });
        
        const navUsers = document.getElementById('nav-users');
        if (navUsers) navUsers.style.display = (actualRole === 'superadmin') ? 'flex' : 'none';
        
        const createUserBtn = document.getElementById('create-user-btn');
        if (createUserBtn) createUserBtn.style.display = (actualRole === 'superadmin') ? 'inline-flex' : 'none';

        initApp();
        renderAdmins();

        if (sessionStorage.getItem('mediflow_open_settings') === 'true') {
            sessionStorage.removeItem('mediflow_open_settings');
            setTimeout(() => switchSection('settings'), 200);
        } else if (isStaff && activeSection === 'dashboard') {
            switchSection('billing');
        } else {
            switchSection(activeSection);
        }
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContainer) {
            appContainer.style.display = 'none';
            appContainer.classList.remove('active-app');
        }
    }
}

function setupGlobalBranchSelector(role) {
    const container = document.getElementById('global-branch-container');
    const selector = document.getElementById('global-branch-selector');
    const navBranches = document.getElementById('nav-branches');
    
    if (role === 'superadmin') {
        if (container) container.style.display = 'block';
        if (navBranches) navBranches.style.display = 'flex';
        if (selector) {
            selector.innerHTML = '';
            branches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                if (b.id === currentBranchId) opt.selected = true;
                selector.appendChild(opt);
            });
            selector.onchange = (e) => {
                sessionStorage.setItem('mediflow_current_branch', e.target.value);
                window.location.reload(); 
            };
        }
    } else {
        if (container) container.style.display = 'none';
        if (navBranches) navBranches.style.display = 'none';
    }
}

function setupLoginHandler() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value.trim();
        const error = document.getElementById('login-error');

        // Check Super Admin
        if (user === 'VIKI' && pass === 'VIKI1101') {
            sessionStorage.setItem('mediflow_logged_in', 'true');
            sessionStorage.setItem('mediflow_user', 'VIKI');
            checkLoginStatus();
            try { 
                const hasBackupDir = await getBackupDirHandle();
                if (!hasBackupDir) exportData(); 
            } catch(e) {}
            try { await printShiftSummaryReceipt('LOGIN'); } catch(e) {}
            return;
        }

        // Check Other Admins
        const found = admins.find(a => a.username === user && a.password === pass);
        if (found) {
            if (found.branchId) {
                sessionStorage.setItem('mediflow_current_branch', found.branchId);
            }
            sessionStorage.setItem('mediflow_logged_in', 'true');
            sessionStorage.setItem('mediflow_user', user);
            checkLoginStatus();
            try { 
                const hasBackupDir = await getBackupDirHandle();
                if (!hasBackupDir) exportData(); 
            } catch(e) {}
            try { await printShiftSummaryReceipt('LOGIN'); } catch(e) {}
        } else {
            error.style.display = 'block';
            setTimeout(() => { error.style.display = 'none'; }, 3000);
        }
    });
}

function initApp() {
    try {
        // Data Migration: Ensure all sales have grandTotal (fix for legacy 'total' field)
        sales.forEach(s => {
            if (s.total !== undefined && s.grandTotal === undefined) {
                s.grandTotal = s.total;
            }
        });

        // Set theme
        document.body.setAttribute('data-theme', currentTheme);
        updateThemeIcon();

        // Set current date
        const now = new Date();
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.textContent = now.toDateString();

        // Generate first invoice number if in billing
        generateInvoiceNumber();

        // Initial renders with element safety
        renderDashboard();
        renderProducts();
        renderSalesHistory();
        renderPurchases();
        renderExpenses();
        renderCategoryManagement();
        renderExpenseCategoryManagement();
        renderCustomers();
        renderSuppliers();
        renderCartTabs();
        loadSettings();
        checkAMCStatus();
        
        lucide.createIcons();
    } catch (error) {
        console.error('App initialization error:', error);
    }
}

function checkAMCStatus() {
    if (!amcData || !amcData.expiryDate) return;
    
    const now = new Date();
    const expiry = new Date(amcData.expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let banner = document.getElementById('amc-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'amc-banner';
        document.body.prepend(banner);
    }
    
    banner.style.padding = '10px 20px';
    banner.style.textAlign = 'center';
    banner.style.fontWeight = 'bold';
    banner.style.zIndex = '9999';
    banner.style.position = 'sticky';
    banner.style.top = '0';
    banner.style.width = '100%';
    
    const genBillBtn = document.getElementById('generate-bill-btn');
    
    if (diffDays <= 0) {
        banner.style.backgroundColor = 'var(--danger-color)';
        banner.style.color = '#fff';
        banner.innerHTML = `AMC Subscription Expired on ${new Date(amcData.expiryDate).toLocaleDateString()}. Please renew to ensure uninterrupted service. Contact: ${amcData.contactInfo}`;
        banner.style.display = 'block';
        if (genBillBtn) genBillBtn.disabled = true;
        
        // Lock application for expired AMC
        enforceAMCLockout();
    } else if (diffDays <= 15) {
        banner.style.backgroundColor = 'var(--warning-color)';
        banner.style.color = '#fff';
        banner.innerHTML = `Your AMC subscription (${amcData.planName}) expires in ${diffDays} days on ${new Date(amcData.expiryDate).toLocaleDateString()}. Please contact ${amcData.contactInfo} for renewal.`;
        banner.style.display = 'block';
        if (genBillBtn) genBillBtn.disabled = false;
        banner.style.display = 'none';
        removeAMCLockout();
    } else {
        banner.style.display = 'none';
        removeAMCLockout();
        if (genBillBtn) genBillBtn.disabled = false;
    }
}

function enforceAMCLockout() {
    let lockScreen = document.getElementById('amc-lock-screen');
    if (!lockScreen) {
        lockScreen = document.createElement('div');
        lockScreen.id = 'amc-lock-screen';
        lockScreen.style.position = 'fixed';
        lockScreen.style.top = '0';
        lockScreen.style.left = '0';
        lockScreen.style.width = '100vw';
        lockScreen.style.height = '100vh';
        lockScreen.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        lockScreen.style.color = 'white';
        lockScreen.style.zIndex = '99999';
        lockScreen.style.display = 'flex';
        lockScreen.style.flexDirection = 'column';
        lockScreen.style.alignItems = 'center';
        lockScreen.style.justifyContent = 'center';
        lockScreen.style.backdropFilter = 'blur(10px)';
        document.body.appendChild(lockScreen);
    }
    
    const user = sessionStorage.getItem('mediflow_user');
    if (user === 'VIKI') {
        lockScreen.innerHTML = `
            <i data-lucide="alert-triangle" style="width: 64px; height: 64px; color: var(--danger-color); margin-bottom: 20px;"></i>
            <h1 style="font-size: 2.5rem; margin-bottom: 10px; color: var(--danger-color);">AMC EXPIRED</h1>
            <p style="font-size: 1.2rem; margin-bottom: 30px; text-align: center; max-width: 500px;">The AMC subscription for this branch has expired. Branch operations are currently locked.</p>
            <button onclick="document.getElementById('amc-lock-screen').style.display='none'; switchSection('settings');" style="padding: 15px 30px; font-size: 1.1rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Open Settings to Renew AMC
            </button>
            <button onclick="document.getElementById('logout-btn').click();" style="margin-top: 20px; padding: 10px 20px; font-size: 1rem; background: transparent; color: #94a3b8; border: 1px solid #334155; border-radius: 8px; cursor: pointer;">
                Logout
            </button>
        `;
        lucide.createIcons();
        lockScreen.style.display = 'flex';
    } else {
        lockScreen.innerHTML = `
            <i data-lucide="lock" style="width: 64px; height: 64px; color: var(--danger-color); margin-bottom: 20px;"></i>
            <h1 style="font-size: 2.5rem; margin-bottom: 10px; color: var(--danger-color);">SYSTEM LOCKED</h1>
            <p style="font-size: 1.2rem; margin-bottom: 30px; text-align: center; max-width: 500px;">The Annual Maintenance Contract (AMC) for this branch has expired. Please contact the administrator (${amcData ? amcData.contactInfo : 'Support'}) to renew the subscription.</p>
            <button onclick="document.getElementById('logout-btn').click();" style="padding: 15px 30px; font-size: 1.1rem; background: var(--danger-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Logout
            </button>
        `;
        lucide.createIcons();
        lockScreen.style.display = 'flex';
    }
}

function removeAMCLockout() {
    const lockScreen = document.getElementById('amc-lock-screen');
    if (lockScreen) {
        lockScreen.style.display = 'none';
    }
}

function loadSettings() {
    try {
        const fields = {
            'set-shop-name': settings.shopName,
            'set-shop-address': settings.shopAddress,
            'set-shop-phone': settings.shopPhone,
            'set-shop-gstin': settings.shopGstin,
            'set-shop-logo': settings.shopLogo,
            'set-shop-upi': settings.shopUpi,
            'set-printer-type': settings.printerType,
            'set-currency': settings.currency
        };
        
        for (const [id, val] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        }

        if (settings.shopLogo) {
            const previewContainer = document.getElementById('logo-preview-container');
            const previewImg = document.getElementById('logo-preview');
            if (previewContainer && previewImg) {
                previewImg.src = settings.shopLogo;
                previewContainer.style.display = 'block';
            }
        }

        // AMC Panel handling
        const user = sessionStorage.getItem('mediflow_user');
        if (user === 'VIKI') {
            const amcPanel = document.getElementById('amc-admin-panel');
            if (amcPanel) {
                amcPanel.style.display = 'block';
                document.getElementById('set-amc-plan').value = amcData ? (amcData.planName || '') : '';
                document.getElementById('set-amc-expiry').value = amcData ? (amcData.expiryDate || '') : '';
                document.getElementById('set-amc-contact').value = amcData ? (amcData.contactInfo || '') : '';
                
                if (amcData && amcData.expiryDate) {
                    const now = new Date();
                    const expiry = new Date(amcData.expiryDate);
                    const diffTime = expiry - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    document.getElementById('super-amc-plan').textContent = amcData.planName || 'Standard';
                    document.getElementById('super-amc-days').textContent = diffDays < 0 ? 'Expired' : `${diffDays} days`;
                    if (diffDays < 0) {
                        document.getElementById('super-amc-days').style.color = 'var(--danger-color)';
                    } else if (diffDays <= 15) {
                        document.getElementById('super-amc-days').style.color = 'var(--warning-color)';
                    } else {
                        document.getElementById('super-amc-days').style.color = '#16a34a';
                    }
                } else {
                    document.getElementById('super-amc-plan').textContent = 'Not Set';
                    document.getElementById('super-amc-days').textContent = 'Unlimited / Lifetime';
                    document.getElementById('super-amc-days').style.color = '#16a34a';
                }
            }
            const amcBranchPanel = document.getElementById('amc-branch-panel');
            if (amcBranchPanel) amcBranchPanel.style.display = 'none';
        } else {
            const amcAdminPanel = document.getElementById('amc-admin-panel');
            if (amcAdminPanel) amcAdminPanel.style.display = 'none';
            
            const amcBranchPanel = document.getElementById('amc-branch-panel');
            if (amcBranchPanel) {
                amcBranchPanel.style.display = 'block';
                if (amcData && amcData.expiryDate) {
                    const now = new Date();
                    const expiry = new Date(amcData.expiryDate);
                    const diffTime = expiry - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    document.getElementById('branch-amc-plan').textContent = amcData.planName || 'Standard';
                    document.getElementById('branch-amc-days').textContent = diffDays < 0 ? 'Expired' : `${diffDays} days`;
                    if (diffDays < 0) {
                        document.getElementById('branch-amc-days').style.color = 'var(--danger-color)';
                    } else if (diffDays <= 15) {
                        document.getElementById('branch-amc-days').style.color = 'var(--warning-color)';
                    } else {
                        document.getElementById('branch-amc-days').style.color = '#16a34a';
                    }
                } else {
                    document.getElementById('branch-amc-plan').textContent = 'Not Set';
                    document.getElementById('branch-amc-days').textContent = 'Unlimited / Lifetime';
                    document.getElementById('branch-amc-days').style.color = '#16a34a';
                }
            }
        }
        const gstEl = document.getElementById('set-gst-default');
        if (gstEl) gstEl.checked = !!settings.gstDefault;

        // Apply currency to UI
        document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = settings.currency || '₹');
        
        // WhatsApp Float
        const waBtn = document.getElementById('whatsapp-float');
        if (waBtn) {
            const shopNameStr = settings.shopName ? settings.shopName : 'your system';
            const message = encodeURIComponent(`Hello, I am contacting you regarding ${shopNameStr}.`);
            waBtn.href = `https://wa.me/919360039283?text=${message}`;
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

// --- Navigation ---
function switchSection(sectionId) {
    // Update UI
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Update Title
    const titles = {
        'dashboard': 'Dashboard',
        'billing': 'Billing Terminal',
        'products': 'Product Management',
        'purchase': 'Purchase & Stock In',
        'expenses': 'Expense Management',
        'customers': 'Customer Management',
        'suppliers': 'Supplier Management',
        'sales': 'Sales History',
        'settings': 'Application Settings',
        'reports': 'Business Reports',
        'menu-card': 'Digital Menu Card',
        'digital-orders': 'Digital Menu Orders',
        'users': 'Staff & Admin Management',
        'branches': 'Branch Management'
    };
    if (document.getElementById('section-title')) {
        document.getElementById('section-title').textContent = titles[sectionId] || 'T7 BillPro';
    }
    activeSection = sectionId;

    // Close mobile sidebar after section selection
    const sidebar = document.querySelector('aside');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('sidebar-open');
    }

    // Specific actions
    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'customers') renderCustomers();
    if (sectionId === 'suppliers') renderSuppliers();
    if (sectionId === 'purchase') {
        renderProductDropdown();
        renderSupplierDropdown();
        renderPurchases();
    }
    if (sectionId === 'expenses') renderExpenses();
    if (sectionId === 'billing') {
        document.getElementById('billing-search').focus();
        generateInvoiceNumber();
        // Set GST default from settings
        document.getElementById('gst-toggle').checked = settings.gstDefault;
    }
    if (sectionId === 'reports') {
        const today = new Date().toISOString().split('T')[0];
        if (!document.getElementById('report-start').value) document.getElementById('report-start').value = today;
        if (!document.getElementById('report-end').value) document.getElementById('report-end').value = today;
        generateReport();
    }
    if (sectionId === 'menu-card') {
        renderMenuCard();
    }
    if (sectionId === 'digital-orders') {
        renderDigitalOrders();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Hide / Collapse Sidebar Menu Button
    const hideMenuBtn = document.getElementById('hide-menu-btn');
    if (hideMenuBtn) {
        hideMenuBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('aside');
            if (sidebar) {
                sidebar.classList.toggle('sidebar-collapsed');
                const collapsed = sidebar.classList.contains('sidebar-collapsed');
                localStorage.setItem('mediflow_sidebar_collapsed', collapsed ? 'true' : 'false');
            }
        });
    }

    // Sidebar Navigation Toggle (Header Top Button)
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('aside');
            if (sidebar) {
                if (window.innerWidth <= 768) {
                    sidebar.classList.toggle('sidebar-open');
                } else {
                    sidebar.classList.toggle('sidebar-collapsed');
                    const collapsed = sidebar.classList.contains('sidebar-collapsed');
                    localStorage.setItem('mediflow_sidebar_collapsed', collapsed ? 'true' : 'false');
                }
            }
        });
    }

    // Sidebar Navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Product Modal
    document.getElementById('open-add-product').addEventListener('click', () => openProductModal());
    document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
    document.getElementById('cancel-product').addEventListener('click', closeProductModal);
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

    // Billing Logic
    const billingSearch = document.getElementById('billing-search');
    billingSearch.addEventListener('input', handleBillingSearch);
    
    billingSearch.addEventListener('keydown', (e) => {
        const resultsDiv = document.getElementById('search-results');
        const items = resultsDiv.querySelectorAll('.search-item');
        if (items.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                searchSelectedIndex = Math.min(searchSelectedIndex + 1, items.length - 1);
                updateSearchSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                searchSelectedIndex = Math.max(searchSelectedIndex - 1, 0);
                updateSearchSelection(items);
            } else if (e.key === 'Enter') {
                if (e.ctrlKey) return; // Let the global shortcut handle it
                e.preventDefault();
                if (searchSelectedIndex >= 0 && searchSelectedIndex < items.length) {
                    items[searchSelectedIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            }
        } else if (e.key === 'Enter' && e.target.value.trim() === '' && cart.length > 0) {
            e.preventDefault();
            processSale(true);
        }
    });

    function updateSearchSelection(items) {
        items.forEach((item, index) => {
            if (index === searchSelectedIndex) {
                item.style.backgroundColor = 'var(--primary-light)';
            } else {
                item.style.backgroundColor = '';
            }
        });
    }
    
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('gst-toggle').addEventListener('change', updateCartTotals);
    document.getElementById('discount-input').addEventListener('input', updateCartTotals);
    document.getElementById('discount-type').addEventListener('change', updateCartTotals);

    // Customer Auto-suggest
    const customerNameInput = document.getElementById('customer-name');
    customerNameInput.addEventListener('input', handleCustomerSuggest);
    customerNameInput.addEventListener('keydown', (e) => {
        const resultsDiv = document.getElementById('customer-suggestions');
        const items = resultsDiv.querySelectorAll('.search-item');
        if (items.length > 0 && resultsDiv.style.display === 'block') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                customerSearchSelectedIndex = Math.min(customerSearchSelectedIndex + 1, items.length - 1);
                updateCustomerSearchSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                customerSearchSelectedIndex = Math.max(customerSearchSelectedIndex - 1, 0);
                updateCustomerSearchSelection(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (customerSearchSelectedIndex >= 0 && customerSearchSelectedIndex < items.length) {
                    items[customerSearchSelectedIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            }
        }
    });

    function updateCustomerSearchSelection(items) {
        items.forEach((item, index) => {
            if (index === customerSearchSelectedIndex) {
                item.style.backgroundColor = 'var(--primary-light)';
            } else {
                item.style.backgroundColor = '';
            }
        });
    }
    document.getElementById('customer-list-search').addEventListener('input', renderCustomers);

    // Sales History Filters
    document.getElementById('sale-date-from').addEventListener('change', renderSalesHistory);
    document.getElementById('sale-date-to').addEventListener('change', renderSalesHistory);
    if (document.getElementById('sale-search')) {
        document.getElementById('sale-search').addEventListener('input', renderSalesHistory);
    }
    
    // Menu Card Search & Controls
    if (document.getElementById('menu-card-search')) {
        document.getElementById('menu-card-search').addEventListener('input', (e) => renderMenuCard(e.target.value));
    }
    const clearSearchBtn = document.getElementById('menu-search-clear');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            const input = document.getElementById('menu-card-search');
            if (input) {
                input.value = '';
                renderMenuCard('');
            }
        });
    }

    // View Switcher buttons
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewList = document.getElementById('btn-view-list');
    if (btnViewGrid && btnViewList) {
        btnViewGrid.addEventListener('click', () => {
            activeMenuViewMode = 'grid';
            btnViewGrid.classList.add('active');
            btnViewList.classList.remove('active');
            renderMenuCard();
        });
        btnViewList.addEventListener('click', () => {
            activeMenuViewMode = 'list';
            btnViewList.classList.add('active');
            btnViewGrid.classList.remove('active');
            renderMenuCard();
        });
    }

    // Menu Order Form Submit
    const menuOrderForm = document.getElementById('menu-order-form');
    if (menuOrderForm) {
        menuOrderForm.addEventListener('submit', handleMenuOrderSubmit);
    }

    // Digital Orders Search & Status Filter
    if (document.getElementById('digital-orders-search')) {
        document.getElementById('digital-orders-search').addEventListener('input', renderDigitalOrders);
    }
    if (document.getElementById('digital-orders-status-filter')) {
        document.getElementById('digital-orders-status-filter').addEventListener('change', renderDigitalOrders);
    }

    document.getElementById('customer-form').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('supplier-form').addEventListener('submit', handleSupplierSubmit);
    if (document.getElementById('product-list-search')) {
        document.getElementById('product-list-search').addEventListener('input', renderProducts);
    }

    document.getElementById('supplier-list-search').addEventListener('input', renderSuppliers);
    document.getElementById('supplier-payment-form').addEventListener('submit', handleSupplierPaymentSubmit);
    document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);

    document.getElementById('save-bill-btn').addEventListener('click', () => processSale(false));
    document.getElementById('generate-bill-btn').addEventListener('click', () => processSale(true));
    document.getElementById('whatsapp-bill-btn').addEventListener('click', () => processSale(false, true));

    // Logo Upload handler
    const logoUpload = document.getElementById('set-shop-logo-upload');
    if (logoUpload) {
        logoUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                if (file.size > 1024 * 1024) {
                    alert('Image is too large. Please select an image under 1MB.');
                    this.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('set-shop-logo').value = e.target.result;
                    document.getElementById('logo-preview').src = e.target.result;
                    document.getElementById('logo-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    window.removeLogo = function() {
        document.getElementById('set-shop-logo').value = '';
        document.getElementById('set-shop-logo-upload').value = '';
        document.getElementById('logo-preview-container').style.display = 'none';
    };

    // AMC Quick Actions
    window.setQuickAMC = function(planName, days) {
        let baseDate = new Date();
        if (amcData && amcData.expiryDate) {
            const currentExpiry = new Date(amcData.expiryDate);
            if (currentExpiry > baseDate) {
                baseDate = currentExpiry;
            }
        }
        baseDate.setDate(baseDate.getDate() + days);
        
        const yyyy = baseDate.getFullYear();
        const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
        const dd = String(baseDate.getDate()).padStart(2, '0');
        const newExpiryStr = `${yyyy}-${mm}-${dd}`;
        
        document.getElementById('set-amc-plan').value = planName;
        document.getElementById('set-amc-expiry').value = newExpiryStr;
        document.getElementById('set-amc-contact').value = '9360039283';
    };

    // AMC Form
    const amcForm = document.getElementById('amc-form');
    if (amcForm) {
        amcForm.addEventListener('submit', (e) => {
            e.preventDefault();
            amcData = {
                planName: document.getElementById('set-amc-plan').value,
                expiryDate: document.getElementById('set-amc-expiry').value,
                contactInfo: document.getElementById('set-amc-contact').value
            };
            localStorage.setItem('mediflow_amc', JSON.stringify(amcData));
            alert('AMC Subscription Details Saved!');
            checkAMCStatus();
        });
    }

    // Settings Form
    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        settings = {
            shopName: document.getElementById('set-shop-name').value,
            shopAddress: document.getElementById('set-shop-address').value,
            shopPhone: document.getElementById('set-shop-phone').value,
            shopGstin: document.getElementById('set-shop-gstin') ? document.getElementById('set-shop-gstin').value : '',
            shopLogo: document.getElementById('set-shop-logo').value,
            shopUpi: document.getElementById('set-shop-upi') ? document.getElementById('set-shop-upi').value : '',
            printerType: document.getElementById('set-printer-type').value,
            gstDefault: document.getElementById('set-gst-default').checked,
            currency: document.getElementById('set-currency').value
        };
        localStorage.setItem('mediflow_settings', JSON.stringify(settings));
        alert('Settings saved successfully!');
        initApp(); // Refresh to apply changes
    });

    // Purchase Form
    document.getElementById('purchase-form').addEventListener('submit', handlePurchaseSubmit);
    
    // Expense Form
    document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

    // Admin Form
    document.getElementById('admin-form').addEventListener('submit', handleAdminSubmit);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            // Avoid manual export if auto-backup is configured
            try { 
                const hasBackupDir = await getBackupDirHandle();
                if (!hasBackupDir) {
                    exportData(); 
                }
            } catch(e) {}

            try { await printShiftSummaryReceipt('LOGOUT'); } catch(e) {}
            
            setTimeout(() => {
                sessionStorage.removeItem('mediflow_logged_in');
                sessionStorage.removeItem('mediflow_user');
                checkLoginStatus();
            }, 500);
        }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Menu shortcuts (Alt + Key)
        if (e.altKey) {
            switch(e.key.toLowerCase()) {
                case 'd': e.preventDefault(); switchSection('dashboard'); break;
                case 'b': e.preventDefault(); switchSection('billing'); break;
                case 'p': e.preventDefault(); switchSection('products'); break;
                case 'u': e.preventDefault(); switchSection('purchase'); break;
                case 'e': e.preventDefault(); switchSection('expenses'); break;
                case 'c': e.preventDefault(); switchSection('customers'); break;
                case 's': e.preventDefault(); switchSection('suppliers'); break;
                case 'h': e.preventDefault(); switchSection('sales'); break;
                case 'o': e.preventDefault(); switchSection('digital-orders'); break;
                case 'a': e.preventDefault(); switchSection('users'); break;
                case 't': e.preventDefault(); switchSection('settings'); break;
                case 'n': 
                    e.preventDefault();
                    if (activeSection === 'products') openProductModal();
                    else if (activeSection === 'customers') openCustomerModal();
                    else if (activeSection === 'suppliers') openSupplierModal();
                    break;
                case 'o':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        if (typeof holdCurrentCart === 'function') holdCurrentCart();
                    }
                    break;
                case 'x':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        if (typeof clearCart === 'function') clearCart();
                    }
                    break;
                case '1':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        const btn = document.querySelector('[data-mode="Cash"]');
                        if (btn && typeof setPayMode === 'function') setPayMode('Cash', btn);
                    }
                    break;
                case '2':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        const btn = document.querySelector('[data-mode="GPay"]');
                        if (btn && typeof setPayMode === 'function') setPayMode('GPay', btn);
                    }
                    break;
                case '3':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        const btn = document.querySelector('[data-mode="Credit"]');
                        if (btn && typeof setPayMode === 'function') setPayMode('Credit', btn);
                    }
                    break;
            }
        }

        if (e.key === 'F2') { e.preventDefault(); switchSection('billing'); }
        if (e.key === 'F4') { e.preventDefault(); switchSection('products'); }
        
        if (activeSection === 'billing') {
            if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F9' || e.key === 'F8' || e.key === 'End') {
                e.preventDefault();
                processSale(true);
            }
            if (e.key === 'Escape') {
                document.getElementById('search-results').style.display = 'none';
                const billingSearch = document.getElementById('billing-search');
                if (billingSearch) billingSearch.blur();
            }
        }
    });

    // Sales History Export
    const exportSalesBtn = document.getElementById('export-sales');
    if (exportSalesBtn) exportSalesBtn.addEventListener('click', exportData);
    // Export/Import Data
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);

    const importDataBtn = document.getElementById('import-data-btn');
    if (importDataBtn) importDataBtn.addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) importFileInput.addEventListener('change', importData);

    // Product specific Export/Import & CSV Sample Template
    const importProdBtn = document.getElementById('import-products-btn');
    if (importProdBtn) importProdBtn.addEventListener('click', () => {
        const input = document.getElementById('product-import-input');
        if (input) input.click();
    });

    const prodImportInput = document.getElementById('product-import-input');
    if (prodImportInput) prodImportInput.addEventListener('change', importProducts);

    // Close search results on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-results').style.display = 'none';
        }
    });
}

// --- Theme Logic ---
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('mediflow_theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    icon.setAttribute('data-lucide', currentTheme === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
}

// --- CSV Sample Template, Export & Import ---
function downloadSampleCSVTemplate() {
    const headers = [
        "Product Name",
        "Category",
        "Unit",
        "Sales Unit",
        "HSN Code",
        "Batch Number",
        "Expiry Date (YYYY-MM-DD)",
        "MRP",
        "Sale Price",
        "Stock Quantity",
        "Barcode",
        "GST %"
    ];

    const sampleRows = [
        [
            "Paracetamol 650mg",
            "Tablet",
            "pcs",
            "pcs",
            "3004",
            "BATCH101",
            "2027-12-31",
            "30.00",
            "25.00",
            "100",
            "8901234567890",
            "12"
        ],
        [
            "Basmati Rice",
            "Grocery",
            "kg",
            "grm",
            "1006",
            "B2026",
            "2028-06-30",
            "160.00",
            "140.00",
            "50",
            "8909876543210",
            "5"
        ],
        [
            "Refined Sunflower Oil",
            "Grocery",
            "ltr",
            "ml",
            "1512",
            "B3099",
            "2027-09-30",
            "180.00",
            "160.00",
            "20",
            "8905555444333",
            "5"
        ],
        [
            "Biscuit Family Pack",
            "Snacks",
            "pkg",
            "pkg",
            "1905",
            "PK99",
            "2026-11-30",
            "60.00",
            "50.00",
            "30",
            "8901111222333",
            "18"
        ]
    ];

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    sampleRows.forEach(row => {
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "T7_BillPro_Product_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportProductsCSV() {
    if (products.length === 0) {
        alert("No products available to export!");
        return;
    }

    const headers = [
        "Product Name",
        "Category",
        "Unit",
        "Sales Unit",
        "HSN Code",
        "Batch Number",
        "Expiry Date",
        "MRP",
        "Sale Price",
        "Stock Quantity",
        "Barcode",
        "GST %"
    ];

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    products.forEach(p => {
        const row = [
            p.name || '',
            p.category || 'General',
            p.unit || 'pcs',
            p.saleUnit || p.unit || 'pcs',
            p.hsn || '',
            p.batch || '',
            p.expiry || '',
            p.mrp || 0,
            p.salePrice || 0,
            p.stock || 0,
            p.barcode || '',
            p.gst || 0
        ];
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Products_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importProducts(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const content = event.target.result;
            let count = 0;

            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(content);
                const items = Array.isArray(parsed) ? parsed : (parsed.products || parsed.data || []);
                if (Array.isArray(items) && items.length > 0) {
                    items.forEach(p => {
                        const name = p.name || p.productName || p.title;
                        if (name && String(name).trim() !== '') {
                            products.push({
                                id: p.id || ('P' + Date.now() + Math.random().toString().slice(-4)),
                                name: String(name).trim(),
                                barcode: p.barcode || '',
                                category: p.category || 'General',
                                unit: (p.unit || 'pcs').toLowerCase(),
                                saleUnit: (p.saleUnit || p.unit || 'pcs').toLowerCase(),
                                hsn: p.hsn || '',
                                batch: p.batch || 'GEN',
                                expiry: p.expiry || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
                                mrp: parseFloat(p.mrp) || 0,
                                salePrice: parseFloat(p.salePrice) || 0,
                                stock: parseFloat(p.stock) || 0,
                                gst: parseFloat(p.gst) || 0
                            });
                            count++;
                        }
                    });
                }
            } else {
                // CSV Parsing with empty line protection & dynamic column mapping
                const rawLines = content.split(/\r\n|\n|\r/);
                
                // Filter out lines that are purely empty, whitespace, or commas only
                const lines = rawLines.filter(l => l.replace(/[,; "'\t]/g, '').trim().length > 0);

                if (lines.length > 0) {
                    // Check if line 0 is a header line
                    const firstLineCols = parseCSVLine(lines[0]);
                    const isHeader = firstLineCols.some(c => /name|product|category|price|mrp|stock|hsn|batch|expiry|barcode|unit/i.test(c));

                    let colMap = {
                        name: 0,
                        category: 1,
                        unit: 2,
                        saleUnit: 3,
                        hsn: 4,
                        batch: 5,
                        expiry: 6,
                        mrp: 7,
                        salePrice: 8,
                        stock: 9,
                        barcode: 10,
                        gst: 11
                    };

                    if (isHeader) {
                        firstLineCols.forEach((colName, index) => {
                            const cLower = colName.toLowerCase().trim();
                            if (cLower.includes('name') || cLower.includes('item') || cLower.includes('product')) colMap.name = index;
                            else if (cLower.includes('cat')) colMap.category = index;
                            else if (cLower.includes('sales unit') || cLower.includes('sale unit')) colMap.saleUnit = index;
                            else if (cLower.includes('unit') || cLower.includes('pkg')) colMap.unit = index;
                            else if (cLower.includes('hsn')) colMap.hsn = index;
                            else if (cLower.includes('batch')) colMap.batch = index;
                            else if (cLower.includes('exp')) colMap.expiry = index;
                            else if (cLower.includes('mrp')) colMap.mrp = index;
                            else if (cLower.includes('sale') || cLower.includes('price')) colMap.salePrice = index;
                            else if (cLower.includes('stock') || cLower.includes('qty')) colMap.stock = index;
                            else if (cLower.includes('bar') || cLower.includes('code')) colMap.barcode = index;
                            else if (cLower.includes('gst') || cLower.includes('tax')) colMap.gst = index;
                        });
                    }

                    const startIdx = isHeader ? 1 : 0;
                    for (let i = startIdx; i < lines.length; i++) {
                        const cols = parseCSVLine(lines[i]);
                        if (cols.length === 0) continue;

                        let name = cols[colMap.name] || '';
                        if (!name || name.trim() === '') {
                            const nonEmp = cols.find(c => c && c.trim().length > 0);
                            if (nonEmp) name = nonEmp;
                            else continue;
                        }

                        const category = cols[colMap.category] || 'General';
                        const rawUnit = (cols[colMap.unit] || 'pcs').toLowerCase().trim();
                        const unit = ['kg', 'grm', 'ltr', 'ml', 'pkg', 'plate', 'strip', 'pcs'].includes(rawUnit) ? rawUnit : 'pcs';
                        const rawSaleUnit = (cols[colMap.saleUnit] || unit).toLowerCase().trim();
                        const saleUnit = ['kg', 'grm', 'ltr', 'ml', 'pkg', 'plate', 'strip', 'pcs'].includes(rawSaleUnit) ? rawSaleUnit : unit;
                        
                        const hsn = cols[colMap.hsn] || '';
                        const batch = cols[colMap.batch] || 'GEN';
                        let expiry = cols[colMap.expiry] || '';
                        if (!expiry || !/\d{4}/.test(expiry)) {
                            expiry = new Date(Date.now() + 31536000000).toISOString().split('T')[0];
                        }

                        const mrp = parseFloat(cols[colMap.mrp]) || 0;
                        const salePrice = parseFloat(cols[colMap.salePrice]) || mrp;
                        const stock = parseFloat(cols[colMap.stock]) || 0;
                        const barcode = cols[colMap.barcode] || '';
                        const gst = parseFloat(cols[colMap.gst]) || 0;

                        products.push({
                            id: 'P' + Date.now() + Math.floor(Math.random() * 1000) + i,
                            name: name.trim(),
                            barcode: barcode.trim(),
                            category: category.trim(),
                            unit: unit,
                            saleUnit: saleUnit,
                            hsn: hsn.trim(),
                            batch: batch.trim(),
                            expiry: expiry.trim(),
                            mrp: mrp,
                            salePrice: salePrice,
                            stock: stock,
                            gst: gst
                        });
                        count++;
                    }
                }
            }

            if (count > 0) {
                saveAndRefresh();
                alert(`Successfully imported ${count} product(s)!`);
            } else {
                alert('No valid product data found in the imported file.');
            }
        } catch (err) {
            console.error('Failed to import products:', err);
            alert('Error reading imported file. Please check file format.');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

function parseCSVLine(line) {
    if (!line) return [];
    const cols = [];
    let insideQuote = false;
    let currentVal = '';
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
            cols.push(currentVal.trim().replace(/^"|"$/g, ''));
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    cols.push(currentVal.trim().replace(/^"|"$/g, ''));
    return cols;
}
function getItemLineTotal(item) {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.salePrice) || 0;
    const saleUnit = item.saleUnit || item.unit || 'pcs';

    if (saleUnit === 'grm') {
        return (qty / 1000) * price;
    } else if (saleUnit === 'ml') {
        return (qty / 1000) * price;
    }
    return qty * price;
}

function getItemStockDeduction(item) {
    const qty = parseFloat(item.qty) || 0;
    const saleUnit = item.saleUnit || item.unit || 'pcs';

    if (saleUnit === 'grm') {
        return qty / 1000;
    } else if (saleUnit === 'ml') {
        return qty / 1000;
    }
    return qty;
}

function updateSalesUnitOptions() {
    const unitSelect = document.getElementById('p-unit');
    const salesUnitSelect = document.getElementById('p-sales-unit');
    if (!unitSelect || !salesUnitSelect) return;

    const val = unitSelect.value;
    let options = '';
    if (val === 'kg') {
        options = '<option value="kg">Kg (Kilogram)</option><option value="grm" selected>grm (Gram)</option>';
    } else if (val === 'ltr') {
        options = '<option value="ltr">Ltr (Liter)</option><option value="ml" selected>ml (Milliliter)</option>';
    } else if (val === 'pkg') {
        options = '<option value="pkg" selected>Pkg (Package)</option>';
    } else if (val === 'plate') {
        options = '<option value="plate" selected>Plate</option>';
    } else if (val === 'strip') {
        options = '<option value="strip" selected>Strip</option>';
    } else {
        options = '<option value="pcs" selected>Pcs (Pieces)</option>';
    }
    salesUnitSelect.innerHTML = options;
}

// --- Product Management ---
function renderProducts() {
    try {
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const searchInput = document.getElementById('product-list-search');
        const query = searchInput ? searchInput.value.toLowerCase() : '';

        let filtered = products;
        if (query) {
            filtered = products.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.barcode && p.barcode.toLowerCase().includes(query)) || 
                (p.batch && p.batch.toLowerCase().includes(query)) ||
                (p.category && p.category.toLowerCase().includes(query))
            );
        }

        filtered.forEach(p => {
        const tr = document.createElement('tr');
        const isExpired = new Date(p.expiry) < new Date();
        const isLowStock = p.stock <= 10 && p.stock < 999999;
        const displayStock = p.stock >= 999999 ? '∞' : p.stock;
        const unitDisplay = (p.unit || 'pcs').toUpperCase();

        tr.innerHTML = `
            <td>${p.name}</td>
            <td><span class="badge" style="background: #e2e8f0; color: #475569;">${p.category}</span></td>
            <td><span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">${unitDisplay}</span></td>
            <td>${p.hsn || '-'}</td>
            <td>${p.batch}</td>
            <td>
                <span class="badge ${isExpired ? 'badge-danger' : (isNearExpiry(p.expiry) ? 'badge-warning' : 'badge-success')}">
                    ${p.expiry}
                </span>
            </td>
            <td>${settings.currency}${p.mrp}</td>
            <td>${settings.currency}${p.salePrice} / ${p.unit || 'pcs'}</td>
            <td>
                <span class="badge ${isLowStock ? 'badge-danger' : 'badge-success'}">
                    ${displayStock} ${p.unit || 'pcs'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary" onclick="addToCartAndSwitch('${p.id}')" style="padding: 5px; background: var(--secondary-color);"><i data-lucide="shopping-cart" style="width: 16px;"></i></button>
                <button class="btn btn-outline" onclick="editProduct('${p.id}')" style="padding: 5px;"><i data-lucide="edit-2" style="width: 16px;"></i></button>
                ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deleteProduct('${p.id}')" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 16px;"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
        });

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products found in cloud or local. Click "Add New Product" to start.</td></tr>';
        }
        lucide.createIcons();
    } catch (e) {
        console.error('Error rendering products:', e);
    }
}

function addToCartAndSwitch(id) {
    addToCart(id);
    switchSection('billing');
}

function openProductModal(id = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');
    
    form.reset();
    document.getElementById('edit-id').value = '';

    if (id) {
        const p = products.find(prod => prod.id === id);
        title.textContent = 'Edit Product';
        document.getElementById('edit-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-barcode').value = p.barcode || '';
        document.getElementById('p-category').value = p.category;
        
        const unitEl = document.getElementById('p-unit');
        if (unitEl) unitEl.value = p.unit || 'pcs';
        updateSalesUnitOptions();
        const salesUnitEl = document.getElementById('p-sales-unit');
        if (salesUnitEl) salesUnitEl.value = p.saleUnit || p.unit || 'pcs';

        document.getElementById('p-hsn').value = p.hsn;
        document.getElementById('p-batch').value = p.batch;
        document.getElementById('p-expiry').value = p.expiry;
        document.getElementById('p-mrp').value = p.mrp;
        document.getElementById('p-sale-price').value = p.salePrice;
        document.getElementById('p-stock').value = p.stock;
        document.getElementById('p-gst').value = p.gst;
    } else {
        title.textContent = 'Add New Product';
        const unitEl = document.getElementById('p-unit');
        if (unitEl) unitEl.value = 'pcs';
        updateSalesUnitOptions();
    }

    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    
    const unitVal = document.getElementById('p-unit') ? document.getElementById('p-unit').value : 'pcs';
    const saleUnitVal = document.getElementById('p-sales-unit') ? document.getElementById('p-sales-unit').value : unitVal;

    const productData = {
        id: id || 'P' + Date.now(),
        name: document.getElementById('p-name').value,
        barcode: document.getElementById('p-barcode').value,
        category: document.getElementById('p-category').value,
        unit: unitVal,
        saleUnit: saleUnitVal,
        hsn: document.getElementById('p-hsn').value,
        batch: document.getElementById('p-batch').value,
        expiry: document.getElementById('p-expiry').value,
        mrp: parseFloat(document.getElementById('p-mrp').value),
        salePrice: parseFloat(document.getElementById('p-sale-price').value),
        stock: parseFloat(document.getElementById('p-stock').value),
        gst: parseFloat(document.getElementById('p-gst').value)
    };

    if (id) {
        const index = products.findIndex(p => p.id === id);
        products[index] = productData;
    } else {
        products.push(productData);
    }

    saveAndRefresh();
    closeProductModal();
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        products = products.filter(p => p.id !== id);
        saveAndRefresh();
    }
}

function editProduct(id) {
    openProductModal(id);
}

function saveAndRefresh() {
    localStorage.setItem('mediflow_products', JSON.stringify(products));
    renderProducts();
    renderDashboard();
    syncToCloud('products', products);
}


let searchSelectedIndex = -1;
let customerSearchSelectedIndex = -1;

// --- Billing Logic ---
function handleBillingSearch(e) {
    searchSelectedIndex = -1;
    const query = e.target.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('search-results');
    
    if (query.length < 1) {
        resultsDiv.style.display = 'none';
        return;
    }

    // Check for EXACT barcode match first (Hardware Scanners)
    const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === query);
    if (exactMatch) {
        addToCart(exactMatch.id);
        e.target.value = '';
        resultsDiv.style.display = 'none';
        return;
    }

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.batch.toLowerCase().includes(query)
    ).slice(0, 5);

    if (filtered.length > 0) {
        resultsDiv.innerHTML = filtered.map(p => `
            <div class="search-item" onclick="addToCart('${p.id}')">
                <span class="name">${p.name} <small>(${p.category})</small></span>
                <span class="details">Barcode: ${p.barcode || 'N/A'} | Batch: ${p.batch} | Price: ${settings.currency}${p.salePrice}</span>
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

function addToCart(productId, inputQty = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0 && product.stock < 999999) {
        alert('Item out of stock!');
        return;
    }

    const defaultUnit = product.saleUnit || product.unit || 'pcs';
    let qty = inputQty;

    if (qty === null) {
        const displayStock = product.stock >= 999999 ? '∞' : `${product.stock} ${product.unit || 'pcs'}`;
        const defaultPromptQty = (defaultUnit === 'grm') ? '250' : ((defaultUnit === 'ml') ? '500' : '1');
        let promptVal = prompt(`Enter quantity (${defaultUnit}) for ${product.name} (Available: ${displayStock}):`, defaultPromptQty);
        if (promptVal === null || promptVal.trim() === '') return;
        let cleanedStr = promptVal.replace(/[^0-9.,]/g, '').replace(',', '.');
        qty = parseFloat(cleanedStr);
        if (isNaN(qty) || qty <= 0) {
            alert('Invalid quantity entered.');
            return;
        }
    }

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        let newQty = existing.qty + qty;
        const deductQty = getItemStockDeduction({ ...existing, qty: newQty });
        if (deductQty > product.stock && product.stock < 999999) {
            alert('Exceeds available stock!');
            return;
        }
        existing.qty = newQty;
    } else {
        cart.push({
            ...product,
            unit: product.unit || 'pcs',
            saleUnit: defaultUnit,
            qty: qty
        });
    }

    playBeep();

    if (document.getElementById('billing-search')) document.getElementById('billing-search').value = '';
    if (document.getElementById('search-results')) document.getElementById('search-results').style.display = 'none';
    renderCart();
}

function renderCart() {
    const tbody = document.querySelector('#cart-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    cart.forEach((item, index) => {
        const lineTotal = getItemLineTotal(item);

        let unitSelectorHtml = `<span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.8rem; font-weight: 600;">${(item.saleUnit || item.unit || 'pcs').toUpperCase()}</span>`;
        if (item.unit === 'kg') {
            unitSelectorHtml = `
                <select onchange="updateCartItemUnit(${index}, this.value)" class="form-control" style="padding: 2px 4px; font-size: 0.8rem; width: 68px;">
                    <option value="kg" ${(item.saleUnit === 'kg' || !item.saleUnit) ? 'selected' : ''}>Kg</option>
                    <option value="grm" ${item.saleUnit === 'grm' ? 'selected' : ''}>grm</option>
                </select>
            `;
        } else if (item.unit === 'ltr') {
            unitSelectorHtml = `
                <select onchange="updateCartItemUnit(${index}, this.value)" class="form-control" style="padding: 2px 4px; font-size: 0.8rem; width: 68px;">
                    <option value="ltr" ${(item.saleUnit === 'ltr' || !item.saleUnit) ? 'selected' : ''}>Ltr</option>
                    <option value="ml" ${item.saleUnit === 'ml' ? 'selected' : ''}>ml</option>
                </select>
            `;
        }

        const isGramOrMl = item.saleUnit === 'grm' || item.saleUnit === 'ml';
        const qtyStep = isGramOrMl ? '1' : (item.unit === 'kg' || item.unit === 'ltr' ? '0.001' : '1');
        const qtyPlaceholder = item.saleUnit === 'grm' ? '250 grm' : (item.saleUnit === 'ml' ? '500 ml' : '1');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.batch || 'GEN'}</td>
            <td>${settings.currency}${item.salePrice}</td>
            <td>
                <input type="number" value="${item.qty}" min="0.001" step="${qtyStep}" placeholder="${qtyPlaceholder}"
                    onchange="updateQty('${item.id}', this.value)" class="form-control qty-input">
            </td>
            <td>${unitSelectorHtml}</td>
            <td>${item.gst}%</td>
            <td>${settings.currency}${lineTotal.toFixed(2)}</td>
            <td>
                <button class="btn btn-outline" onclick="removeFromCart(${index})" style="color: var(--danger-color); padding: 4px 8px;">
                    <i data-lucide="x" style="width: 16px;"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
    updateCartTotals();
}

function updateCartItemUnit(index, newSaleUnit) {
    if (!cart[index]) return;
    const oldUnit = cart[index].saleUnit || cart[index].unit;
    cart[index].saleUnit = newSaleUnit;

    if (oldUnit === 'kg' && newSaleUnit === 'grm') {
        cart[index].qty = (parseFloat(cart[index].qty) || 1) * 1000;
    } else if (oldUnit === 'grm' && newSaleUnit === 'kg') {
        cart[index].qty = (parseFloat(cart[index].qty) || 1000) / 1000;
    } else if (oldUnit === 'ltr' && newSaleUnit === 'ml') {
        cart[index].qty = (parseFloat(cart[index].qty) || 1) * 1000;
    } else if (oldUnit === 'ml' && newSaleUnit === 'ltr') {
        cart[index].qty = (parseFloat(cart[index].qty) || 1000) / 1000;
    }

    renderCart();
}

function updateQty(id, val) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty = parseFloat(val) || 0;
        renderCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (confirm('Clear all items from cart?')) {
        cart = [];
        if (document.getElementById('customer-name')) document.getElementById('customer-name').value = '';
        if (document.getElementById('customer-phone')) document.getElementById('customer-phone').value = '';
        renderCart();
        if (isReturnMode) toggleReturnMode();
    }
}

function updateCartTotals() {
    const includeGst = document.getElementById('gst-toggle') ? document.getElementById('gst-toggle').checked : true;
    const discInput = parseFloat(document.getElementById('discount-input') ? document.getElementById('discount-input').value : 0) || 0;
    const discType = document.getElementById('discount-type') ? document.getElementById('discount-type').value : 'amount';

    let subtotal = 0;
    let gstTotal = 0;

    cart.forEach(item => {
        const lineTotal = getItemLineTotal(item);
        subtotal += lineTotal;
        
        if (includeGst) {
            gstTotal += (lineTotal * (item.gst || 0) / 100);
        }
    });

    let discount = 0;
    if (discType === 'percent') {
        discount = (subtotal + gstTotal) * (discInput / 100);
    } else {
        discount = discInput;
    }

    const grandTotal = subtotal + gstTotal - discount;

    if (document.getElementById('summary-subtotal')) document.getElementById('summary-subtotal').textContent = `${settings.currency}${subtotal.toFixed(2)}`;
    if (document.getElementById('summary-gst')) document.getElementById('summary-gst').textContent = `${settings.currency}${gstTotal.toFixed(2)}`;
    if (document.getElementById('summary-grand-total')) document.getElementById('summary-grand-total').textContent = `${settings.currency}${grandTotal.toFixed(2)}`;
}

// --- Hold Bill Logic ---
function holdCurrentCart() {
    if (cart.length === 0) {
        alert("Cart is empty! There's nothing to hold.");
        return;
    }
    
    const cartName = prompt("Enter a name or identifier for this suspended bill (e.g. Person 1):", `Cart ${heldCarts.length + 1}`);
    if (!cartName) return;

    const cartData = {
        name: cartName,
        timestamp: Date.now(),
        cartFiles: JSON.parse(JSON.stringify(cart)),
        customerName: document.getElementById('customer-name').value,
        customerPhone: document.getElementById('customer-phone').value,
        discount: document.getElementById('discount-input').value,
        discountType: document.getElementById('discount-type').value,
        gstToggle: document.getElementById('gst-toggle').checked
    };

    heldCarts.push(cartData);
    localStorage.setItem('mediflow_held_carts', JSON.stringify(heldCarts));
    
    // Clear UI
    document.getElementById('clear-cart-btn').click(); 
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    renderCartTabs();
    alert(`Bill suspended safely as "${cartName}".`);
}

function recallCart(index) {
    if (cart.length > 0) {
        if (!confirm("You currently have items in the active cart! Recalling a held bill will erase the current one. Proceed?")) {
            return;
        }
    }

    const cData = heldCarts[index];
    cart = [...cData.cartFiles];
    document.getElementById('customer-name').value = cData.customerName || '';
    document.getElementById('customer-phone').value = cData.customerPhone || '';
    document.getElementById('discount-input').value = cData.discount || '0';
    document.getElementById('discount-type').value = cData.discountType || 'percent';
    
    const toggle = document.getElementById('gst-toggle');
    if (toggle) toggle.checked = cData.gstToggle;

    heldCarts.splice(index, 1);
    localStorage.setItem('mediflow_held_carts', JSON.stringify(heldCarts));
    
    renderCart();
    renderCartTabs();
}

function renderCartTabs() {
    const container = document.getElementById('cart-tabs-container');
    if (!container) return;
    container.innerHTML = '';
    
    heldCarts.forEach((hc, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.style.cssText = "padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: var(--warning-light); color: var(--warning-color); border-color: var(--warning-color); display: flex; gap: 6px; align-items: center; cursor: pointer; white-space: nowrap;";
        btn.innerHTML = `<i data-lucide="shopping-bag" style="width: 14px;"></i> ${hc.name} <span class="badge" style="background: var(--danger-color); color: white; padding: 2px 6px; border-radius: 50%; font-size: 10px;">${hc.cartFiles.length}</span>`;
        btn.onclick = () => recallCart(index);
        container.appendChild(btn);
    });
    lucide.createIcons();
}

// --- Return Mode ---
function toggleReturnMode() {
    isReturnMode = !isReturnMode;
    const btn = document.getElementById('return-mode-btn');
    if (isReturnMode) {
        btn.innerHTML = '<i data-lucide="corner-down-left"></i> Exit Return Mode';
        btn.classList.remove('btn-outline');
        btn.style.backgroundColor = 'var(--danger-color)';
        btn.style.color = 'white';
        // Add visual indicator to billing search area
        document.querySelector('.cart-section h2') && (document.querySelector('.cart-section h2').textContent = 'Billing Terminal - RETURN MODE');
    } else {
        btn.innerHTML = '<i data-lucide="corner-down-left"></i> Return Bill';
        btn.classList.add('btn-outline');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--danger-color)';
        document.querySelector('.cart-section h2') && (document.querySelector('.cart-section h2').textContent = 'Billing Terminal');
    }
    lucide.createIcons();
}

// --- Sale Processing ---
function setPayMode(mode, btn) {
    currentPayMode = mode;
    document.querySelectorAll('.pay-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function processSale(shouldPrint, shouldWhatsApp = false) {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const invoiceNo = document.getElementById('invoice-number').value;
    const customer = {
        name: document.getElementById('customer-name').value || 'Cash Customer',
        phone: document.getElementById('customer-phone').value || '-'
    };

    const subtotal = parseFloat(document.getElementById('summary-subtotal').textContent.replace(settings.currency, ''));
    const gst = parseFloat(document.getElementById('summary-gst').textContent.replace(settings.currency, ''));
    const discInput = parseFloat(document.getElementById('discount-input').value) || 0;
    const discType = document.getElementById('discount-type').value;
    
    let discountAmount = discType === 'percent' ? (subtotal + gst) * (discInput / 100) : discInput;
    let grandTotal = subtotal + gst - discountAmount;

    let finalInvoiceNo = invoiceNo;
    let finalSubtotal = subtotal;
    let finalGst = gst;
    let finalDiscount = discountAmount;
    
    // Apply return mode negation
    if (isReturnMode) {
        finalInvoiceNo = 'RET-' + invoiceNo;
        finalSubtotal = -subtotal;
        finalGst = -gst;
        finalDiscount = -discountAmount;
        grandTotal = -grandTotal;
    }

    const saleData = {
        id: 'S' + Date.now(),
        invoiceNo: finalInvoiceNo,
        customer,
        items: cart.map(item => ({...item, qty: isReturnMode ? -item.qty : item.qty})),
        subtotal: finalSubtotal,
        gst: finalGst,
        discount: finalDiscount,
        grandTotal: grandTotal,
        paymentMode: currentPayMode,
        date: new Date().toISOString(),
        isReturn: isReturnMode
    };

    // Update Stock using Unit Deduction
    cart.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.id);
        if (pIndex !== -1) {
            const deductQty = getItemStockDeduction(item);
            if (isReturnMode) {
                products[pIndex].stock += deductQty;
            } else {
                products[pIndex].stock -= deductQty;
            }
        }
    });

    // Update Customer Stats
    if (customer.name !== 'Cash Customer' && customer.phone !== '-') {
        let cust = customers.find(c => c.phone === customer.phone);
        if (!cust) {
            cust = { id: 'C' + Date.now(), name: customer.name, phone: customer.phone, visits: 0, totalSpent: 0 };
            customers.push(cust);
        }
        cust.visits = (cust.visits || 0) + 1;
        cust.totalSpent = (parseFloat(cust.totalSpent) || 0) + grandTotal;
        localStorage.setItem('mediflow_customers', JSON.stringify(customers));
        renderCustomers();
    }

    sales.push(saleData);
    localStorage.setItem('mediflow_products', JSON.stringify(products));
    localStorage.setItem('mediflow_sales', JSON.stringify(sales));

    if (shouldPrint) {
        printBill(saleData);
    } else if (shouldWhatsApp) {
        sendWhatsAppBill(saleData.id);
    } else {
        alert('Sale saved successfully!');
    }

    // Reset
    cart = [];
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('discount-input').value = '0';
    currentPayMode = 'Cash';
    document.querySelectorAll('.pay-mode').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('data-mode') === 'Cash') b.classList.add('active');
    });
    renderCart();
    renderProducts();
    renderDashboard();
    renderSalesHistory();
    generateInvoiceNumber();
    if (isReturnMode) toggleReturnMode();
}

function printBill(sale) {
    try {
        const bill = document.getElementById('thermal-bill');
        
        // Set print size class
        bill.className = ''; // Reset
        bill.classList.add('print-' + (settings.printerType || '3inch'));

        // Fill the hidden bill with settings
        const logoImg = document.getElementById('bill-logo');
        const defaultLogo = document.getElementById('bill-default-logo');
        if (logoImg) {
            if (settings.shopLogo) {
                logoImg.src = settings.shopLogo;
                logoImg.style.display = 'inline-block';
                if (defaultLogo) defaultLogo.style.display = 'none';
            } else {
                logoImg.style.display = 'none';
                if (defaultLogo) defaultLogo.style.display = 'inline-block';
            }
        }

    document.getElementById('bill-shop-name').textContent = settings.shopName;
    document.getElementById('bill-shop-address').innerHTML = `${settings.shopAddress}<br>Phone: ${settings.shopPhone}`;
    
    const gstinEl = document.getElementById('bill-shop-gstin');
    if (gstinEl) {
        if (settings.shopGstin && settings.shopGstin.trim() !== '') {
            gstinEl.textContent = `GSTIN: ${settings.shopGstin}`;
            gstinEl.style.display = 'block';
        } else {
            gstinEl.style.display = 'none';
        }
    }
    
    const returnHeader = document.getElementById('bill-return-header');
    if (returnHeader) {
        if (sale.isReturn) {
            returnHeader.style.display = 'block';
        } else {
            returnHeader.style.display = 'none';
        }
    }

    document.getElementById('bill-inv-no').textContent = sale.invoiceNo;
    const saleDate = new Date(sale.date);
    document.getElementById('bill-date').textContent = saleDate.toLocaleDateString();
    const timeEl = document.getElementById('bill-time');
    if (timeEl) timeEl.textContent = saleDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const cashierEl = document.getElementById('bill-cashier');
    if (cashierEl) cashierEl.textContent = sessionStorage.getItem('mediflow_user') || 'Unknown';
    
    const itemsTbody = document.getElementById('bill-items-body');
    itemsTbody.innerHTML = sale.items.map((item, index) => `
        <tr>
            <td style="padding: 2px 0;">${index + 1}</td>
            <td style="padding: 2px 0; word-break: break-word;">${item.name}</td>
            <td style="padding: 2px 0; text-align: center;">${item.qty}</td>
            <td style="padding: 2px 0; text-align: right;">${item.salePrice.toFixed(2)}</td>
            <td style="padding: 2px 0; text-align: right;">${(item.salePrice * item.qty).toFixed(2)}</td>
        </tr>
    `).join('');

    const curr = settings.currency || '₹';
    document.getElementById('bill-subtotal').textContent = `${sale.subtotal.toFixed(2)}`;
    
    const gstRow = document.getElementById('bill-gst-row');
    if (gstRow) {
        if (settings.taxEnabled) {
            gstRow.style.display = 'grid';
            document.getElementById('bill-gst').textContent = `${sale.gst.toFixed(2)}`;
        } else {
            gstRow.style.display = 'none';
        }
    }
    document.getElementById('bill-discount').textContent = `${sale.discount.toFixed(2)}`;
    document.getElementById('bill-grand-total').textContent = `${curr}${sale.grandTotal.toFixed(2)}`;
    
    const payModeEl = document.getElementById('bill-payment-mode');
    if (payModeEl) payModeEl.textContent = sale.paymentMode || 'CASH';
    
    const amtPaidEl = document.getElementById('bill-amount-paid');
    if (amtPaidEl) amtPaidEl.textContent = sale.grandTotal.toFixed(2);
    
    const transIdEl = document.getElementById('bill-trans-id');
    if (transIdEl) transIdEl.textContent = (sale.paymentMode || 'CASH') + '/' + sale.id.substring(sale.id.length - 8).toUpperCase();

    const supportEl = document.getElementById('bill-support-phone');
    if (supportEl) supportEl.textContent = settings.shopPhone || '+91 00000 00000';
    
    const executePrint = () => {
        // Show template
        document.body.classList.add('printing-bill');
        bill.style.display = 'block';

        // Small delay to ensure rendering before print dialog blocks thread
        setTimeout(() => {
            window.print();
            // Hide immediately after print dialog closes
            bill.style.display = 'none';
            document.body.classList.remove('printing-bill');
        }, 150);
    };

    const qrPlaceholder = document.getElementById('bill-qr-placeholder');
    const qrImg = document.getElementById('bill-qr-img');
    if (qrPlaceholder && qrImg) {
        if (settings.shopUpi && settings.shopUpi.trim() !== '') {
            // Generate standard UPI string: upi://pay?pa=UPI_ID&pn=SHOP_NAME&am=AMOUNT
            const upiString = `upi://pay?pa=${settings.shopUpi.trim()}&pn=${encodeURIComponent(settings.shopName)}&am=${sale.grandTotal.toFixed(2)}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiString)}`;
            
            qrImg.onload = executePrint;
            qrImg.onerror = executePrint;
            
            qrImg.src = qrUrl;
            qrImg.style.display = 'inline-block';
            qrPlaceholder.style.display = 'none';
        } else {
            qrImg.style.display = 'none';
            qrPlaceholder.style.display = 'inline-flex';
            executePrint();
        }
    } else {
        executePrint();
    }
    } catch (err) {
        alert("Print error: " + err.message);
        console.error(err);
        const bill = document.getElementById('thermal-bill');
        if (bill) bill.style.display = 'none';
    }
}

function printTestReceipt() {
    const dummySale = {
        id: 'TEST' + Date.now().toString(),
        invoiceNo: 'TEST-0001',
        date: new Date().toISOString(),
        customer: { name: 'Test Customer', phone: '0000000000' },
        items: [
            { name: 'Test Product 1', qty: 2, salePrice: 150.00 },
            { name: 'Test Product 2', qty: 1, salePrice: 200.00 }
        ],
        subtotal: 500.00,
        discount: 50.00,
        gst: 90.00,
        grandTotal: 540.00,
        paymentMode: 'UPI'
    };
    printBill(dummySale);
}

function generateShiftSummary() {
    const todayStr = new Date().toDateString();
    
    let cashTotal = 0;
    let gpayTotal = 0;
    let creditTotal = 0;

    sales.forEach(sale => {
        if (new Date(sale.date).toDateString() === todayStr) {
            const mode = sale.paymentMode || 'Cash';
            if (mode === 'Cash') cashTotal += sale.grandTotal;
            else if (mode === 'GPay') gpayTotal += sale.grandTotal;
            else if (mode === 'Credit') creditTotal += sale.grandTotal;
        }
    });

    return {
        cash: cashTotal,
        gpay: gpayTotal,
        credit: creditTotal,
        total: cashTotal + gpayTotal + creditTotal
    };
}

async function printShiftSummaryReceipt(actionType) {
    const summary = generateShiftSummary();
    const bill = document.getElementById('thermal-summary');
    if (!bill) return;

    // Remove old print classes, add new one
    document.body.classList.remove('print-3inch', 'print-4inch', 'print-a4', 'print-a5');
    if (settings.printerType) document.body.classList.add(`print-${settings.printerType}`);
    
    const shopNameEl = document.getElementById('summary-shop-name');
    if (shopNameEl) shopNameEl.textContent = settings.shopName || 'T7 BILLPRO';
    
    const typeEl = document.getElementById('summary-type');
    if (typeEl) typeEl.textContent = actionType === 'LOGIN' ? 'Login Summary' : 'Logout Summary';
    
    const dateEl = document.getElementById('summary-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleString();
    
    const userEl = document.getElementById('summary-user');
    if (userEl) userEl.textContent = sessionStorage.getItem('mediflow_user') || 'Unknown User';

    const curr = settings.currency || '₹';
    document.getElementById('summary-cash').textContent = `${curr}${summary.cash.toFixed(2)}`;
    document.getElementById('summary-gpay').textContent = `${curr}${summary.gpay.toFixed(2)}`;
    document.getElementById('summary-credit').textContent = `${curr}${summary.credit.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `${curr}${summary.total.toFixed(2)}`;

    // Ensure main thermal bill is hidden and only summary is printed
    const mainBill = document.getElementById('thermal-bill');
    if (mainBill) mainBill.style.display = 'none';
        document.body.classList.add('printing-bill');
        bill.style.display = 'block';

        // Trigger automated local backup BEFORE printing to preserve user gesture for permission prompts
        if (typeof window.runAutoLocalBackup === 'function') {
            try {
                await window.runAutoLocalBackup();
            } catch (e) {
                console.error("Backup failed during shift summary", e);
            }
        }

        window.print();
        
        bill.style.display = 'none';
        document.body.classList.remove('printing-bill');
}

// --- Sales History ---
function renderSalesHistory() {
    try {
        const tbody = document.querySelector('#sales-history-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        const fromDate = document.getElementById('sale-date-from')?.value;
        const toDate = document.getElementById('sale-date-to')?.value;
        const searchQuery = document.getElementById('sale-search')?.value.toLowerCase().trim();

        let filteredSales = [...sales];

        if (fromDate) {
            filteredSales = filteredSales.filter(s => s.date && new Date(s.date) >= new Date(fromDate));
        }
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            filteredSales = filteredSales.filter(s => s.date && new Date(s.date) <= end);
        }

        if (searchQuery) {
            filteredSales = filteredSales.filter(s => {
                const invNo = (s.invoiceNo || '').toLowerCase();
                const custName = (s.customer && s.customer.name ? s.customer.name : '').toLowerCase();
                const custPhone = (s.customer && s.customer.phone ? s.customer.phone : '').toLowerCase();
                return invNo.includes(searchQuery) || custName.includes(searchQuery) || custPhone.includes(searchQuery);
            });
        }

        filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(s => {
            const tr = document.createElement('tr');
            const amount = parseFloat(s.grandTotal || s.total || 0);
            const itemsCount = s.items ? s.items.length : 0;
            const custName = (s.customer && s.customer.name) ? s.customer.name : 'Cash Customer';
            const payMode = s.paymentMode || 'Cash';

            tr.innerHTML = `
                <td>#${s.invoiceNo || '---'}</td>
                <td>${s.date ? new Date(s.date).toLocaleString() : '---'}</td>
                <td>${custName}</td>
                <td><span class="badge" style="background: ${payMode === 'Credit' ? '#fee2e2' : '#dcfce7'}; color: ${payMode === 'Credit' ? '#dc2626' : '#16a34a'};">${payMode}</span></td>
                <td><strong>${settings.currency}${amount.toFixed(2)}</strong></td>
                <td>${itemsCount} items</td>
                <td>
                    <button class="btn btn-outline" onclick="reprintBill('${s.id}')" style="padding: 5px;"><i data-lucide="printer" style="width: 16px;"></i></button>
                    <button class="btn btn-outline" onclick="sendWhatsAppBill('${s.id}')" style="padding: 5px; color: #25d366;"><i data-lucide="message-square" style="width: 16px;"></i></button>
                    ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deleteSale('${s.id}')" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 16px;"></i></button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) {
        console.error('Error rendering sales history:', e);
    }
}

function deleteSale(id) {
    if (!confirm('Are you sure you want to delete this sale? This will restock the sold items.')) return;
    
    const loggedInUsername = sessionStorage.getItem('mediflow_user');
    let actualRole = 'staff'; 
    if (loggedInUsername === 'VIKI') {
        actualRole = 'superadmin';
    } else {
        const foundUser = admins.find(a => a.username === loggedInUsername);
        if (foundUser) actualRole = foundUser.role;
    }
    
    if (actualRole === 'staff') {
        alert('Access Denied: Staff cannot delete sales.');
        return;
    }

    const saleIndex = sales.findIndex(s => s.id === id);
    if (saleIndex > -1) {
        const sale = sales[saleIndex];
        
        // Restore stock
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const prodIndex = products.findIndex(p => p.id === item.id);
                if (prodIndex > -1) {
                    products[prodIndex].stock += item.qty;
                }
            });
            localStorage.setItem('mediflow_products', JSON.stringify(products));
            syncToCloud('products', products);
        }

        sales.splice(saleIndex, 1);
        localStorage.setItem('mediflow_sales', JSON.stringify(sales));
        syncToCloud('sales', sales);

        renderSalesHistory();
        renderDashboard();
        if (activeSection === 'products') renderProducts();
        alert('Sale deleted and stock restored successfully.');
    }
}

// --- Purchase & Expenses Logic ---
function renderProductDropdown() {
    const select = document.getElementById('pur-product');
    select.innerHTML = '<option value="">Select Product</option>';
    products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (${p.batch})</option>`;
    });
}

function handlePurchaseSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('pur-product').value;
    const qty = parseFloat(document.getElementById('pur-qty').value);
    const price = parseFloat(document.getElementById('pur-price').value);
    
    const purchaseData = {
        id: 'PUR' + Date.now(),
        productId,
        productName: products.find(p => p.id === productId).name,
        supplier: document.getElementById('pur-supplier').value,
        invoice: document.getElementById('pur-invoice').value,
        date: document.getElementById('pur-date').value,
        qty,
        price,
        total: qty * price
    };

    // Update stock
    const pIndex = products.findIndex(p => p.id === productId);
    products[pIndex].stock += qty;

    purchases.push(purchaseData);
    localStorage.setItem('mediflow_products', JSON.stringify(products));
    localStorage.setItem('mediflow_purchases', JSON.stringify(purchases));
    
    e.target.reset();
    renderPurchases();
    renderProducts();
    alert('Purchase recorded and stock updated!');
}

function renderPurchases() {
    try {
        const tbody = document.querySelector('#purchase-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        purchases.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.date || '---'}</td>
                <td>${p.productName || '---'}</td>
                <td>${p.qty || 0}</td>
                <td>${settings.currency}${parseFloat(p.total || 0).toFixed(2)}</td>
                <td>
                    ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deletePurchase('${p.id}')" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 14px;"></i></button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) {
        console.error('Error rendering purchases:', e);
    }
}

function deletePurchase(id) {
    if (confirm('Are you sure you want to delete this purchase? Stock levels will be reduced accordingly.')) {
        const purchase = purchases.find(p => p.id === id);
        if (purchase) {
            // Deduct stock
            const pIndex = products.findIndex(p => p.id === purchase.productId);
            if (pIndex !== -1) {
                products[pIndex].stock = Math.max(0, products[pIndex].stock - purchase.qty);
            }
            
            // Remove purchase
            purchases = purchases.filter(p => p.id !== id);
            
            // Save
            localStorage.setItem('mediflow_products', JSON.stringify(products));
            localStorage.setItem('mediflow_purchases', JSON.stringify(purchases));
            
            renderPurchases();
            renderProducts();
            if (activeSection === 'dashboard') renderDashboard();
            if (activeSection === 'suppliers') renderSuppliers();
            alert('Purchase deleted and stock restored successfully.');
        }
    }
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const expenseData = {
        id: 'EXP' + Date.now(),
        category: document.getElementById('exp-category').value,
        description: document.getElementById('exp-desc').value,
        amount: parseFloat(document.getElementById('exp-amount').value),
        date: document.getElementById('exp-date').value
    };

    expenses.push(expenseData);
    localStorage.setItem('mediflow_expenses', JSON.stringify(expenses));
    
    e.target.reset();
    renderExpenses();
    alert('Expense recorded!');
}

function renderExpenses() {
    try {
        const tbody = document.querySelector('#expenses-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(ex => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ex.date || '---'}</td>
                <td>${ex.category || '---'}</td>
                <td>${settings.currency}${parseFloat(ex.amount || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error rendering expenses:', e);
    }
}

function reprintBill(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (sale) printBill(sale);
}

// --- Dashboard Logic ---
function renderDashboard() {
    try {
        const today = new Date().toDateString();
        const todaysSales = sales.filter(s => s.date && new Date(s.date).toDateString() === today);
        const todaysExpenses = expenses.filter(ex => ex.date && new Date(ex.date).toDateString() === today);
        const todaysPurchases = purchases.filter(p => p.date && new Date(p.date).toDateString() === today);
        
        const revenue = todaysSales.reduce((sum, s) => sum + (parseFloat(s.grandTotal) || 0), 0);
        const dailyExpenses = todaysExpenses.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
        const dailyPurchases = todaysPurchases.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseFloat(p.qty) || 0)), 0);
        const netProfit = revenue - dailyExpenses - dailyPurchases;

        const lowStock = products.filter(p => (parseInt(p.stock) || 0) <= 10).length;
        const expired = products.filter(p => p.expiry && isNearExpiry(p.expiry)).length;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        const actualSalesCount = todaysSales.filter(s => !s.isReturn).length;
        setVal('stat-sales-count', actualSalesCount);
        setVal('stat-revenue', `${settings.currency}${revenue.toFixed(2)}`);
        setVal('stat-expenses', `${settings.currency}${dailyExpenses.toFixed(2)}`);
        setVal('stat-purchases', `${settings.currency}${dailyPurchases.toFixed(2)}`);
        setVal('stat-profit', `${settings.currency}${netProfit.toFixed(2)}`);
        setVal('stat-low-stock', lowStock);
        setVal('stat-expired', expired);

        // Recent Sales table
        const recentTbody = document.querySelector('#recent-sales-table tbody');
        if (recentTbody) {
            recentTbody.innerHTML = [...todaysSales].reverse().slice(0, 5).map(s => `
                <tr>
                    <td>#${s.invoiceNo || '---'}</td>
                    <td>${s.customer ? s.customer.name : 'Cash Customer'}</td>
                    <td>${s.items ? s.items.length : 0}</td>
                    <td>${settings.currency}${(parseFloat(s.grandTotal) || 0).toFixed(2)}</td>
                    <td>${s.date ? new Date(s.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error('Error rendering dashboard:', e);
    }
}

// --- Helpers ---
function generateInvoiceNumber() {
    const lastSale = sales[sales.length - 1];
    let nextNo = 1;
    if (lastSale && lastSale.invoiceNo) {
        nextNo = parseInt(lastSale.invoiceNo) + 1;
    }
    const invInput = document.getElementById('invoice-number');
    if (invInput) invInput.value = nextNo.toString().padStart(6, '0');
}

function isNearExpiry(dateStr) {
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    return expiryDate < threeMonthsFromNow;
}

function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

// --- Backup & Restore ---
function exportData() {
    const data = {
        products: JSON.parse(localStorage.getItem('mediflow_products')) || [],
        sales: JSON.parse(localStorage.getItem('mediflow_sales')) || [],
        settings: JSON.parse(localStorage.getItem('mediflow_settings')) || {},
        purchases: JSON.parse(localStorage.getItem('mediflow_purchases')) || [],
        expenses: JSON.parse(localStorage.getItem('mediflow_expenses')) || [],
        customers: JSON.parse(localStorage.getItem('mediflow_customers')) || [],
        suppliers: JSON.parse(localStorage.getItem('mediflow_suppliers')) || [],
        supplierPayments: JSON.parse(localStorage.getItem('mediflow_supplier_payments')) || [],
        theme: localStorage.getItem('mediflow_theme') || 'light',
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Are you sure you want to import this data? This will overwrite all your current products, sales, and settings. This action cannot be undone.')) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            // Basic validation
            if (!data.products || !data.sales) {
                throw new Error('Invalid backup file format.');
            }

            // Save to localStorage
            localStorage.setItem('mediflow_products', JSON.stringify(data.products));
            localStorage.setItem('mediflow_sales', JSON.stringify(data.sales));
            if (data.settings) localStorage.setItem('mediflow_settings', JSON.stringify(data.settings));
            if (data.purchases) localStorage.setItem('mediflow_purchases', JSON.stringify(data.purchases));
            if (data.expenses) localStorage.setItem('mediflow_expenses', JSON.stringify(data.expenses));
            if (data.customers) localStorage.setItem('mediflow_customers', JSON.stringify(data.customers));
            if (data.suppliers) localStorage.setItem('mediflow_suppliers', JSON.stringify(data.suppliers));
            if (data.supplierPayments) localStorage.setItem('mediflow_supplier_payments', JSON.stringify(data.supplierPayments));
            if (data.theme) localStorage.setItem('mediflow_theme', data.theme);

            alert('Data imported successfully! The application will now reload.');
            window.location.reload();
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// --- Product Specific Backup ---
function exportProducts() {
    const productsData = JSON.parse(localStorage.getItem('mediflow_products')) || [];
    const blob = new Blob([JSON.stringify(productsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediFlow_Products_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- CSV Helper Functions ---
function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportSalesCSV() {
    const headers = ['invoiceNo', 'date', 'customerName', 'customerPhone', 'itemName', 'qty', 'price', 'gst', 'total', 'grandTotal'];
    const flattenedSales = [];
    
    sales.forEach(sale => {
        sale.items.forEach(item => {
            flattenedSales.push({
                invoiceNo: sale.invoiceNo,
                date: new Date(sale.date).toLocaleString(),
                customerName: sale.customer.name,
                customerPhone: sale.customer.phone,
                itemName: item.name,
                qty: item.qty,
                price: item.salePrice,
                gst: item.gst,
                total: (item.qty * item.salePrice).toFixed(2),
                grandTotal: sale.grandTotal.toFixed(2)
            });
        });
    });

    const csvContent = jsonToCSV(flattenedSales, headers);
    downloadBlob(csvContent, `MediFlow_Sales_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function exportPurchasesCSV() {
    const headers = ['date', 'productName', 'supplier', 'invoice', 'qty', 'price', 'total'];
    const csvContent = jsonToCSV(purchases, headers);
    downloadBlob(csvContent, `MediFlow_Purchases_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function exportExpensesCSV() {
    const headers = ['date', 'category', 'description', 'amount'];
    const csvContent = jsonToCSV(expenses, headers);
    downloadBlob(csvContent, `MediFlow_Expenses_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

// --- Category Management ---
function renderCategoryManagement() {
    const list = document.getElementById('category-list');
    if (!list) return;
    
    list.innerHTML = categories.map(cat => `
        <div class="badge" style="background: var(--primary-light); color: var(--primary-color); padding: 5px 10px; display: flex; align-items: center; gap: 8px;">
            ${cat}
            <i data-lucide="edit-2" style="width: 12px; cursor: pointer;" onclick="editCategoryName('${cat}')"></i>
            <i data-lucide="x" style="width: 12px; cursor: pointer;" onclick="deleteCategory('${cat}')"></i>
        </div>
    `).join('');
    
    // Also update product category dropdowns
    updateCategoryDropdowns();
    lucide.createIcons();
}

function updateCategoryDropdowns() {
    const pCatSelect = document.getElementById('p-category');
    if (pCatSelect) {
        const currentVal = pCatSelect.value;
        pCatSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (categories.includes(currentVal)) pCatSelect.value = currentVal;
    }
}

function addCategory() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    
    if (!name) return;
    if (categories.includes(name)) {
        alert('Category already exists!');
        return;
    }
    
    categories.push(name);
    saveCategories();
    input.value = '';
    renderCategoryManagement();
}

function editCategoryName(oldName) {
    const newName = prompt('Enter new name for category:', oldName);
    if (!newName || newName.trim() === oldName) return;
    
    const trimmedNewName = newName.trim();
    if (categories.includes(trimmedNewName)) {
        alert('Category name already exists!');
        return;
    }
    
    // Update category list
    const index = categories.indexOf(oldName);
    if (index !== -1) {
        categories[index] = trimmedNewName;
        
        // Update all products using this category
        products.forEach(p => {
            if (p.category === oldName) p.category = trimmedNewName;
        });
        
        saveCategories();
        localStorage.setItem('mediflow_products', JSON.stringify(products));
        renderCategoryManagement();
        renderProducts();
    }
}

function deleteCategory(name) {
    if (categories.length <= 1) {
        alert('Must have at least one category.');
        return;
    }
    
    const count = products.filter(p => p.category === name).length;
    if (count > 0) {
        if (!confirm(`There are ${count} products using this category. Deleting it will set them to "${categories[0] === name ? categories[1] : categories[0]}". Continue?`)) {
            return;
        }
        
        const fallback = categories[0] === name ? categories[1] : categories[0];
        products.forEach(p => {
            if (p.category === name) p.category = fallback;
        });
        localStorage.setItem('mediflow_products', JSON.stringify(products));
        renderProducts();
    }
    
    categories = categories.filter(c => c !== name);
    saveCategories();
    renderCategoryManagement();
}

function saveCategories() {
    localStorage.setItem('mediflow_categories', JSON.stringify(categories));
}

// --- Expense Categories Management ---
function renderExpenseCategoryManagement() {
    const list = document.getElementById('expense-category-list');
    if (!list) return;
    
    list.innerHTML = expenseCategories.map(cat => `
        <div class="badge" style="background: var(--warning-light); color: var(--warning-color); padding: 5px 10px; display: flex; align-items: center; gap: 8px;">
            ${cat}
            <i data-lucide="edit-2" style="width: 12px; cursor: pointer;" onclick="editExpenseCategoryName('${cat}')"></i>
            <i data-lucide="x" style="width: 12px; cursor: pointer;" onclick="deleteExpenseCategory('${cat}')"></i>
        </div>
    `).join('');
    
    updateExpenseCategoryDropdowns();
    lucide.createIcons();
}

function updateExpenseCategoryDropdowns() {
    const expCatSelect = document.getElementById('exp-category');
    if (expCatSelect) {
        const currentVal = expCatSelect.value;
        expCatSelect.innerHTML = expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (expenseCategories.includes(currentVal)) expCatSelect.value = currentVal;
    }
}

function addExpenseCategory() {
    const input = document.getElementById('new-exp-category-name');
    const name = input.value.trim();
    
    if (!name) return;
    if (expenseCategories.includes(name)) {
        alert('Category already exists!');
        return;
    }
    
    expenseCategories.push(name);
    saveExpenseCategories();
    input.value = '';
    renderExpenseCategoryManagement();
}

function editExpenseCategoryName(oldName) {
    const newName = prompt('Enter new name for expense category:', oldName);
    if (!newName || newName.trim() === oldName) return;
    
    const trimmedNewName = newName.trim();
    if (expenseCategories.includes(trimmedNewName)) {
        alert('Category name already exists!');
        return;
    }
    
    const index = expenseCategories.indexOf(oldName);
    if (index !== -1) {
        expenseCategories[index] = trimmedNewName;
        
        expenses.forEach(e => {
            if (e.category === oldName) e.category = trimmedNewName;
        });
        
        saveExpenseCategories();
        localStorage.setItem('mediflow_expenses', JSON.stringify(expenses));
        renderExpenseCategoryManagement();
        renderExpenses();
    }
}

function deleteExpenseCategory(name) {
    if (expenseCategories.length <= 1) {
        alert('Must have at least one expense category.');
        return;
    }
    
    const count = expenses.filter(e => e.category === name).length;
    if (count > 0) {
        if (!confirm(`There are ${count} expenses using this category. Deleting it will set them to "${expenseCategories[0] === name ? expenseCategories[1] : expenseCategories[0]}". Continue?`)) {
            return;
        }
        
        const fallback = expenseCategories[0] === name ? expenseCategories[1] : expenseCategories[0];
        expenses.forEach(e => {
            if (e.category === name) e.category = fallback;
        });
        localStorage.setItem('mediflow_expenses', JSON.stringify(expenses));
        renderExpenses();
    }
    
    expenseCategories = expenseCategories.filter(c => c !== name);
    saveExpenseCategories();
    renderExpenseCategoryManagement();
}

function saveExpenseCategories() {
    localStorage.setItem('mediflow_expense_categories', JSON.stringify(expenseCategories));
}

// --- Customer Management ---
function renderCustomers() {
    const tbody = document.querySelector('#customers-table tbody');
    if (!tbody) return;
    
    // Calculate summaries from sales first
    const customerSummaries = {};
    sales.forEach(s => {
        if (!s.customer || !s.customer.phone) return;
        const phone = s.customer.phone;
        if (!customerSummaries[phone]) {
            customerSummaries[phone] = { paid: 0, credit: 0, returned: 0 };
        }
        if (s.paymentMode === 'Credit') {
            customerSummaries[phone].credit += (parseFloat(s.grandTotal) || 0);
        } else {
            customerSummaries[phone].paid += (parseFloat(s.grandTotal) || 0);
        }
    });

    // Substract actual payments made
    customerPayments.forEach(p => {
        const phone = p.customerPhone;
        if (customerSummaries[phone]) {
            customerSummaries[phone].returned += parseFloat(p.amount);
            customerSummaries[phone].credit -= parseFloat(p.amount);
        }
    });

    const queryInput = document.getElementById('customer-list-search');
    const query = queryInput ? queryInput.value.toLowerCase() : '';
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.phone.includes(query)
    );

    tbody.innerHTML = filtered.map(c => {
        const summary = customerSummaries[c.phone] || { paid: 0, credit: 0 };
        return `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.visits || 0}</td>
                <td>${settings.currency}${parseFloat(c.totalSpent || 0).toFixed(2)}</td>
                <td style="color: #16a34a; font-weight: 600;">${settings.currency}${(summary.paid + summary.returned).toFixed(2)}</td>
                <td style="color: #dc2626; font-weight: 600;">${settings.currency}${summary.credit.toFixed(2)}</td>
                <td>
                    <button class="btn btn-outline" onclick="openPaymentModal('${c.id}')" title="Return Amount" style="padding: 5px; color: #16a34a; border-color: #16a34a;"><i data-lucide="arrow-down-to-dot" style="width: 14px;"></i></button>
                    <button class="btn btn-outline" onclick="editCustomer('${c.id}')" style="padding: 5px;"><i data-lucide="edit-2" style="width: 14px;"></i></button>
                    ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deleteCustomer('${c.id}')" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 14px;"></i></button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function handleCustomerSuggest(e) {
    const query = e.target.value.toLowerCase();
    const suggestions = document.getElementById('customer-suggestions');
    
    if (query.length < 1) {
        suggestions.style.display = 'none';
        customerSearchSelectedIndex = -1;
        return;
    }
    customerSearchSelectedIndex = -1;

    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.phone.includes(query)
    ).slice(0, 5);

    if (filtered.length > 0) {
        suggestions.innerHTML = filtered.map(c => `
            <div class="search-item" onclick="selectCustomer('${c.name}', '${c.phone}')">
                <span class="name">${c.name}</span>
                <span class="details">${c.phone}</span>
            </div>
        `).join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

function selectCustomer(name, phone) {
    document.getElementById('customer-name').value = name;
    document.getElementById('customer-phone').value = phone;
    document.getElementById('customer-suggestions').style.display = 'none';
}

function openCustomerModal(id = null) {
    const modal = document.getElementById('customer-modal');
    const title = document.getElementById('customer-modal-title');
    const form = document.getElementById('customer-form');
    
    form.reset();
    document.getElementById('edit-customer-id').value = '';
    
    if (id) {
        const c = customers.find(cust => cust.id === id);
        title.textContent = 'Edit Customer';
        document.getElementById('edit-customer-id').value = c.id;
        document.getElementById('c-name').value = c.name;
        document.getElementById('c-phone').value = c.phone;
    } else {
        title.textContent = 'Add New Customer';
    }
    
    modal.style.display = 'flex';
}

function closeCustomerModal() {
    document.getElementById('customer-modal').style.display = 'none';
}

function handleCustomerSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-customer-id').value;
    const name = document.getElementById('c-name').value.trim();
    const phone = document.getElementById('c-phone').value.trim();

    if (id) {
        const index = customers.findIndex(c => c.id === id);
        customers[index] = { ...customers[index], name, phone };
    } else {
        customers.push({
            id: 'C' + Date.now(),
            name,
            phone,
            visits: 0,
            totalSpent: 0
        });
    }

    localStorage.setItem('mediflow_customers', JSON.stringify(customers));
    closeCustomerModal();
    renderCustomers();
}

function deleteCustomer(id) {
    if (confirm('Are you sure you want to delete this customer?')) {
        customers = customers.filter(c => c.id !== id);
        localStorage.setItem('mediflow_customers', JSON.stringify(customers));
        renderCustomers();
    }
}

function editCustomer(id) {
    openCustomerModal(id);
}

// --- Supplier Management ---
function renderSuppliers() {
    const tbody = document.querySelector('#suppliers-table tbody');
    if (!tbody) return;
    
    const searchInput = document.getElementById('supplier-list-search');
    let query = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = suppliers;
    if (query) {
        filtered = suppliers.filter(s => 
            s.name.toLowerCase().includes(query) || 
            s.phone.includes(query) || 
            (s.person && s.person.toLowerCase().includes(query))
        );
    }

    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No suppliers found.</td></tr>';
        return;
    }

    filtered.forEach(s => {
        let totalPurchases = 0;
        purchases.forEach(p => {
            if (p.supplier === s.name) {
                totalPurchases += (parseFloat(p.total) || 0);
            }
        });

        let totalPaid = 0;
        supplierPayments.forEach(p => {
            if (p.supplierId === s.id) {
                totalPaid += (parseFloat(p.amount) || 0);
            }
        });

        let balance = totalPurchases - totalPaid;

        const isOwe = balance > 0;
        const balanceColor = isOwe ? 'var(--danger-color)' : (balance < 0 ? 'var(--success-color)' : 'inherit');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.phone}</td>
            <td>${settings.currency}${totalPurchases.toFixed(2)}</td>
            <td>${settings.currency}${totalPaid.toFixed(2)}</td>
            <td style="color: ${balanceColor}; font-weight: bold;">${settings.currency}${Math.abs(balance).toFixed(2)} ${balance < 0 ? '(Adv)' : ''}</td>
            <td>
                <button class="btn btn-primary" onclick="openSupplierPaymentModal('${s.id}')" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;">Pay</button>
                <button class="btn btn-outline" onclick="openSupplierReport('${s.id}')" style="padding: 5px; margin-right: 5px;" title="Ledger Report"><i data-lucide="file-text" style="width: 14px;"></i></button>
                <button class="btn btn-outline" onclick="editSupplier('${s.id}')" style="padding: 5px; margin-right: 5px;"><i data-lucide="edit-2" style="width: 14px;"></i></button>
                ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deleteSupplier('${s.id}')" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 14px;"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openSupplierModal(id = null) {
    const modal = document.getElementById('supplier-modal');
    const title = document.getElementById('supplier-modal-title');
    const form = document.getElementById('supplier-form');
    
    form.reset();
    document.getElementById('edit-supplier-id').value = '';
    
    if (id) {
        const s = suppliers.find(sup => sup.id === id);
        title.textContent = 'Edit Supplier';
        document.getElementById('edit-supplier-id').value = s.id;
        document.getElementById('s-name').value = s.name;
        document.getElementById('s-person').value = s.person || '';
        document.getElementById('s-phone').value = s.phone || '';
        document.getElementById('s-email').value = s.email || '';
        document.getElementById('s-gstin').value = s.gstin || '';
        document.getElementById('s-address').value = s.address || '';
    } else {
        title.textContent = 'Add New Supplier';
    }
    
    modal.style.display = 'flex';
}

function closeSupplierModal() {
    document.getElementById('supplier-modal').style.display = 'none';
}

function handleSupplierSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-supplier-id').value;
    
    const supplierData = {
        name: document.getElementById('s-name').value.trim(),
        person: document.getElementById('s-person').value.trim(),
        phone: document.getElementById('s-phone').value.trim(),
        email: document.getElementById('s-email').value.trim(),
        gstin: document.getElementById('s-gstin').value.trim(),
        address: document.getElementById('s-address').value.trim()
    };

    if (id) {
        const index = suppliers.findIndex(s => s.id === id);
        suppliers[index] = { ...suppliers[index], ...supplierData };
    } else {
        supplierData.id = 'SUP' + Date.now();
        suppliers.push(supplierData);
    }

    localStorage.setItem('mediflow_suppliers', JSON.stringify(suppliers));
    closeSupplierModal();
    renderSuppliers();
    if (activeSection === 'purchase') renderSupplierDropdown();
}

function deleteSupplier(id) {
    if (confirm('Are you sure you want to delete this supplier?')) {
        suppliers = suppliers.filter(s => s.id !== id);
        localStorage.setItem('mediflow_suppliers', JSON.stringify(suppliers));
        renderSuppliers();
        if (activeSection === 'purchase') renderSupplierDropdown();
    }
}

function editSupplier(id) {
    openSupplierModal(id);
}

function renderSupplierDropdown() {
    const sSelect = document.getElementById('pur-supplier');
    if (!sSelect) return;
    const currentVal = sSelect.value;
    
    sSelect.innerHTML = '<option value="">Select Supplier (Optional)</option>' + 
        suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        
    // Keep selection if exists
    if (suppliers.some(s => s.name === currentVal)) {
        sSelect.value = currentVal;
    }
}

// --- Supplier Payments & Ledger ---
function openSupplierPaymentModal(id) {
    const s = suppliers.find(sup => sup.id === id);
    if (!s) return;

    document.getElementById('spay-supplier-id').value = s.id;
    document.getElementById('spay-supplier-name').value = s.name;
    document.getElementById('spay-amount').value = '';
    document.getElementById('supplier-payment-modal').style.display = 'flex';
}

function closeSupplierPaymentModal() {
    document.getElementById('supplier-payment-modal').style.display = 'none';
}

function handleSupplierPaymentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('spay-supplier-id').value;
    const amount = parseFloat(document.getElementById('spay-amount').value);
    const method = document.getElementById('spay-method').value;

    const s = suppliers.find(sup => sup.id === id);
    if (s && amount > 0) {
        supplierPayments.push({
            id: 'SP' + Date.now(),
            supplierId: s.id,
            supplierName: s.name,
            amount: amount,
            method: method,
            date: new Date().toISOString()
        });

        localStorage.setItem('mediflow_supplier_payments', JSON.stringify(supplierPayments));
        
        closeSupplierPaymentModal();
        renderSuppliers();
        alert(`Payment of ${settings.currency}${amount} to ${s.name} recorded!`);
    }
}

function openSupplierReport(id) {
    const s = suppliers.find(sup => sup.id === id);
    if (!s) return;

    document.getElementById('report-supplier-name').textContent = s.name;
    document.getElementById('report-supplier-phone').textContent = `Ph: ${s.phone} ${s.gstin ? ' | GSTIN: ' + s.gstin : ''}`;

    const tbody = document.querySelector('#supplier-ledger-table tbody');
    tbody.innerHTML = '';

    // Collect transactions
    const transactions = [];
    
    // 1. Add Purchases
    purchases.forEach(p => {
        if (p.supplier === s.name) {
            transactions.push({
                date: new Date(p.date),
                desc: 'Purchase',
                ref: `Inv: ${p.invoice || '-'}`,
                debit: parseFloat(p.total) || 0,
                credit: 0
            });
        }
    });

    // 2. Add Payments
    supplierPayments.forEach(p => {
        if (p.supplierId === s.id) {
            transactions.push({
                date: new Date(p.date),
                desc: 'Payment',
                ref: p.method,
                debit: 0,
                credit: parseFloat(p.amount) || 0
            });
        }
    });

    // Sort by date ascending
    transactions.sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No transactions found for this supplier.</td></tr>';
        document.getElementById('report-supplier-balance').textContent = `${settings.currency}0.00`;
        document.getElementById('supplier-report-modal').style.display = 'flex';
        return;
    }

    transactions.forEach(t => {
        runningBalance += t.debit;
        runningBalance -= t.credit;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.date.toLocaleDateString()}</td>
            <td>${t.desc}</td>
            <td>${t.ref}</td>
            <td style="text-align: right;">${t.debit > 0 ? settings.currency + t.debit.toFixed(2) : '-'}</td>
            <td style="text-align: right; color: var(--success-color);">${t.credit > 0 ? settings.currency + t.credit.toFixed(2) : '-'}</td>
            <td style="text-align: right; font-weight: bold;">${settings.currency}${runningBalance.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    const isOwe = runningBalance > 0;
    const balanceColor = isOwe ? 'var(--danger-color)' : (runningBalance < 0 ? 'var(--success-color)' : 'var(--text-color)');
    
    const balanceEl = document.getElementById('report-supplier-balance');
    balanceEl.textContent = `${settings.currency}${Math.abs(runningBalance).toFixed(2)} ${runningBalance < 0 ? '(Advance)' : ''}`;
    balanceEl.style.color = balanceColor;

    document.getElementById('supplier-report-modal').style.display = 'flex';
}

function closeSupplierReport() {
    document.getElementById('supplier-report-modal').style.display = 'none';
}

function printSupplierReport() {
    const sName = document.getElementById('report-supplier-name').textContent;
    const sPhone = document.getElementById('report-supplier-phone').textContent;
    const balance = document.getElementById('report-supplier-balance').textContent;
    const tableHTML = document.getElementById('supplier-ledger-table').outerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Supplier Report - ${sName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
                .right { text-align: right; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${settings.shopName}</h1>
            <h2>Supplier Ledger Report</h2>
            <p><strong>Supplier:</strong> ${sName}<br>
            ${sPhone}<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <h3 style="color: ${document.getElementById('report-supplier-balance').style.color};">Current Balance: ${balance}</h3>
            ${tableHTML}
            <br>
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print Report</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function sendWhatsAppBill(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    let message = `*${settings.shopName.toUpperCase()} - INVOICE*\n`;
    message += `Inv: #${sale.invoiceNo} | Date: ${new Date(sale.date).toLocaleDateString()}\n`;
    message += `Cust: ${sale.customer.name}\n\n`;

    sale.items.forEach(item => {
        message += `• ${item.name} (${item.qty} x ${item.salePrice}) = *${settings.currency}${(item.qty * item.salePrice).toFixed(2)}*\n`;
    });

    let subInfo = `\nGST: ${settings.currency}${sale.gst.toFixed(2)}`;
    if (sale.discount > 0) subInfo += ` | Disc: ${settings.currency}${sale.discount.toFixed(2)}`;
    message += `${subInfo}\n`;
    message += `*TOTAL: ${settings.currency}${sale.grandTotal.toFixed(2)} (${sale.paymentMode || 'Cash'})*\n\n`;
    message += `Thank you for choosing ${settings.shopName}! 🙏`;

    const phoneNumber = sale.customer.phone.replace(/\D/g, '');
    const cleanPhone = (phoneNumber.startsWith('91') || phoneNumber.length === 0) ? phoneNumber : '91' + phoneNumber;
    if (cleanPhone === '') {
        alert('No valid phone number found for this customer!');
        return;
    }
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function openPaymentModal(customerId) {
    const c = customers.find(cust => cust.id === customerId);
    if (!c) return;

    document.getElementById('pay-customer-id').value = c.id;
    document.getElementById('pay-customer-name').value = c.name;
    document.getElementById('pay-amount').value = '';
    document.getElementById('payment-modal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function handlePaymentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('pay-customer-id').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const method = document.getElementById('pay-method').value;

    const c = customers.find(cust => cust.id === id);
    if (c && amount > 0) {
        customerPayments.push({
            id: 'P' + Date.now(),
            customerId: c.id,
            customerName: c.name,
            customerPhone: c.phone,
            amount: amount,
            method: method,
            date: new Date().toISOString()
        });

        localStorage.setItem('mediflow_customer_payments', JSON.stringify(customerPayments));
        
        // Record as a "Sales Entry" or just let the ledger handle it.
        // Actually, let's keep it separate for the ledger.
        
        closePaymentModal();
        renderCustomers();
        alert(`Payment of ${settings.currency}${amount} recorded for ${c.name}`);
    }
}

// --- Admin Management ---
function openAdminModal() {
    if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
        alert('Access Denied: Only the Super Admin (VIKI) can create new Accounts.');
        return;
    }
    
    document.getElementById('admin-edit-id').value = '';
    const modalTitle = document.getElementById('admin-modal-title');
    if (modalTitle) modalTitle.textContent = 'Provision New User';
    const modalSubmit = document.getElementById('admin-modal-submit');
    if (modalSubmit) modalSubmit.textContent = 'Create Account';
    
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
    const roleSelect = document.getElementById('admin-role');
    if (roleSelect) roleSelect.value = 'staff';
    
    const branchSelect = document.getElementById('admin-branch');
    if (branchSelect) {
        branchSelect.innerHTML = '';
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            branchSelect.appendChild(opt);
        });
    }
    document.getElementById('admin-modal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
}

function handleAdminSubmit(e) {
    e.preventDefault();
    
    if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
        alert('Only the Super Admin (VIKI) can manage user accounts.');
        return;
    }

    const editId = document.getElementById('admin-edit-id').value;
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();
    const roleSelect = document.getElementById('admin-role');
    const role = roleSelect ? roleSelect.value : 'staff';
    const branchSelect = document.getElementById('admin-branch');
    const branchId = branchSelect ? branchSelect.value : 'branch_default';

    if (editId) {
        const existingAdmin = admins.find(a => a.id === editId);
        if (existingAdmin) {
            if (existingAdmin.username !== user && admins.some(a => a.username === user)) {
                alert('Username already exists!');
                return;
            }
            existingAdmin.username = user;
            existingAdmin.password = pass;
            existingAdmin.role = role;
            existingAdmin.branchId = branchId;
        }
        alert('Account updated successfully!');
    } else {
        if (admins.some(a => a.username === user)) {
            alert('Username already exists!');
            return;
        }
        admins.push({
            id: 'A' + Date.now(),
            username: user,
            password: pass,
            role: role,
            branchId: branchId
        });
        alert('Account created successfully!');
    }

    localStorage.setItem('mediflow_admins', JSON.stringify(admins));
    closeAdminModal();
    renderAdmins();
    syncToCloud('admins', { data: admins });
}

function editAdmin(id) {
    if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
        alert('Access Denied: Only the Super Admin (VIKI) can edit Accounts.');
        return;
    }
    const admin = admins.find(a => a.id === id);
    if (!admin) return;

    document.getElementById('admin-edit-id').value = admin.id;
    const modalTitle = document.getElementById('admin-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit User Account';
    const modalSubmit = document.getElementById('admin-modal-submit');
    if (modalSubmit) modalSubmit.textContent = 'Save Changes';

    document.getElementById('admin-user').value = admin.username;
    document.getElementById('admin-pass').value = admin.password;
    
    const roleSelect = document.getElementById('admin-role');
    if (roleSelect) roleSelect.value = admin.role;
    
    const branchSelect = document.getElementById('admin-branch');
    if (branchSelect) {
        branchSelect.innerHTML = '';
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            if (b.id === admin.branchId) opt.selected = true;
            branchSelect.appendChild(opt);
        });
    }
    
    document.getElementById('admin-modal').style.display = 'flex';
}

function renderAdmins() {
    const tbody = document.querySelector('#admins-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const trSuper = document.createElement('tr');
    trSuper.innerHTML = `
        <td><strong>VIKI</strong></td>
        <td><span class="badge" style="background: var(--warning-color); color: white;">Super Admin</span></td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">Has access to all branches</span></td>
    `;
    tbody.appendChild(trSuper);

    if (admins.length === 0) {
        const emptyTr = document.createElement('tr');
        emptyTr.innerHTML = '<td colspan="3" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No additional staff or admin accounts found. Click "Create New User" to add one.</td>';
        tbody.appendChild(emptyTr);
    } else {
        admins.forEach(a => {
            const tr = document.createElement('tr');
            const badgeStyle = a.role === 'admin' ? 'background: var(--primary-light); color: var(--primary-color);' : 'background: #e2e8f0; color: #475569;';
            const displayRole = a.role === 'admin' ? 'Admin' : 'Staff';
            const branchName = branches.find(b => b.id === a.branchId)?.name || 'Unknown Branch';
            
            tr.innerHTML = `
                <td>${a.username} <div style="font-size: 0.75rem; color: var(--text-muted);">${branchName}</div></td>
                <td><span class="badge" style="${badgeStyle}">${displayRole}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-outline" onclick="editAdmin('${a.id}')" style="padding: 5px; color: var(--primary-color);" title="Edit"><i data-lucide="edit-2" style="width: 14px;"></i></button>
                        <button class="btn btn-outline" onclick="deleteAdmin('${a.id}')" style="padding: 5px; color: var(--danger-color);" title="Delete"><i data-lucide="trash" style="width: 14px;"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteAdmin(id) {
    if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
        alert('Only the Super Admin (VIKI) can delete accounts.');
        return;
    }
    if (confirm('Are you sure you want to delete this account?')) {
        admins = admins.filter(a => a.id !== id);
        localStorage.setItem('mediflow_admins', JSON.stringify(admins));
        renderAdmins();
        syncToCloud('admins', { data: admins });
    }
}

// --- Branch Management ---
function renderBranches() {
    const tbody = document.querySelector('#branches-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    branches.forEach(b => {
        const tr = document.createElement('tr');
        const lockIcon = b.isLocked ? 'unlock' : 'lock';
        const lockText = b.isLocked ? 'Unlock' : 'Lock';
        const lockColor = b.isLocked ? '#16a34a' : '#dc2626';
        const statusBadge = b.isLocked 
            ? '<span class="badge" style="background:#fee2e2; color:#dc2626;">Locked</span>' 
            : '<span class="badge" style="background:#dcfce7; color:#16a34a;">Active</span>';

        let amcStatusHtml = '<span class="badge" style="background:#f1f5f9; color:#64748b;">Not Set</span>';
        try {
            const branchAmc = JSON.parse(localStorage.getItem('mediflow_' + b.id + '_amc'));
            if (branchAmc && branchAmc.expiryDate) {
                const diffTime = new Date(branchAmc.expiryDate) - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    amcStatusHtml = '<span class="badge" style="background:#fee2e2; color:#dc2626;">Expired</span>';
                } else if (diffDays <= 15) {
                    amcStatusHtml = `<span class="badge" style="background:#fef08a; color:#a16207;">${diffDays} Days Left</span>`;
                } else {
                    amcStatusHtml = `<span class="badge" style="background:#dcfce7; color:#16a34a;">${diffDays} Days Left</span>`;
                }
            }
        } catch (e) {}

        tr.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">${b.id}</span></td>
            <td>${b.location || '-'}</td>
            <td>${amcStatusHtml}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; display: flex; justify-content: flex-end; gap: 0.5rem;">
                ${b.isLocked 
                    ? `<button class="btn btn-outline" style="padding: 5px 10px; color: #16a34a; border-color: #16a34a;" onclick="toggleBranchLock('${b.id}')">
                           <i data-lucide="unlock" style="width: 14px;"></i> Unlock
                       </button>`
                    : `<button class="btn btn-outline" style="padding: 5px 10px; color: #dc2626; border-color: #dc2626;" onclick="toggleBranchLock('${b.id}')">
                           <i data-lucide="lock" style="width: 14px;"></i> Lock
                       </button>`
                }
                <button class="btn btn-outline" style="padding: 5px 10px; color: var(--primary-color); border-color: var(--primary-color);" onclick="changeBranchAMC('${b.id}')">
                    <i data-lucide="calendar" style="width: 14px;"></i> Renew Plan
                </button>
                <button class="btn btn-outline" style="padding: 5px 10px; color: #dc2626; border-color: #dc2626;" onclick="deleteBranch('${b.id}')">
                    <i data-lucide="trash" style="width: 14px;"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
     });
     if (typeof lucide !== 'undefined') lucide.createIcons();
 }
 
 function toggleBranchLock(id) {
     if (sessionStorage.getItem('mediflow_user') !== 'VIKI') return;
     const branch = branches.find(b => b.id === id);
     if (!branch) return;
     branch.isLocked = !branch.isLocked;
     localStorage.setItem('mediflow_branches', JSON.stringify(branches));
     renderBranches();
     
     // Immediately check login status in case they locked their current branch
     checkLoginStatus();
 }
 
 function changeBranchAMC(id) {
     if (sessionStorage.getItem('mediflow_user') !== 'VIKI') return;
     sessionStorage.setItem('mediflow_current_branch', id);
     sessionStorage.setItem('mediflow_open_settings', 'true');
     window.location.reload();
 }
 
 function deleteBranch(id) {
     if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
         alert('Only the Super Admin (VIKI) can delete branches.');
         return;
     }
     if (id === 'branch_default') {
         alert('The default Main Branch cannot be deleted.');
         return;
     }
     if (confirm('Are you sure you want to delete this branch? All local data for this branch will be removed.')) {
         // Filter out the branch
         branches = branches.filter(b => b.id !== id);
         localStorage.setItem('mediflow_branches', JSON.stringify(branches));
         
         // Remove branch-specific local storage data
         branchSpecificKeys.forEach(key => {
             const actualKey = `mediflow_${id}_${key.replace('mediflow_', '')}`;
             localStorage.removeItem(actualKey);
         });
         
         // If current branch was the deleted one, reset current branch
         if (sessionStorage.getItem('mediflow_current_branch') === id) {
             sessionStorage.setItem('mediflow_current_branch', 'branch_default');
         }
         
         renderBranches();
         setupGlobalBranchSelector('superadmin');
         alert('Branch deleted successfully.');
         window.location.reload();
     }
 }

function openBranchModal() {
    document.getElementById('branch-name').value = '';
    document.getElementById('branch-location').value = '';
    document.getElementById('branch-modal').style.display = 'flex';
}

function closeBranchModal() {
    document.getElementById('branch-modal').style.display = 'none';
}

document.getElementById('branch-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sessionStorage.getItem('mediflow_user') !== 'VIKI') {
        alert('Only Super Admin can create branches.');
        return;
    }
    const name = document.getElementById('branch-name').value;
    const location = document.getElementById('branch-location').value;
    const newId = 'branch_' + Date.now();
    branches.push({ id: newId, name: name, location: location });
    localStorage.setItem('mediflow_branches', JSON.stringify(branches));
    closeBranchModal();
    renderBranches();
    
    // Refresh branch selectors
    setupGlobalBranchSelector('superadmin');
    alert('Branch created successfully!');
});

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    renderBranches();
});

// Immediately kick users in other tabs if their branch is locked
window.addEventListener('storage', (e) => {
    if (e.key === 'mediflow_branches') {
        const updatedBranches = JSON.parse(e.newValue || '[]');
        const currentId = sessionStorage.getItem('mediflow_current_branch') || 'branch_default';
        const currentBranch = updatedBranches.find(b => b.id === currentId);
        if (currentBranch && currentBranch.isLocked && sessionStorage.getItem('mediflow_logged_in') === 'true') {
            // Update local memory and trigger lock screen
            branches = updatedBranches;
            checkLoginStatus();
        }
    }
});

// --- Digital Menu Card Module ---
let activeMenuCategory = 'ALL';
let activeMenuViewMode = 'grid';

function renderMenuCard(query) {
    const container = document.getElementById('menu-card-content');
    const searchInput = document.getElementById('menu-card-search');
    const clearBtn = document.getElementById('menu-search-clear');
    if (!container) return;

    const searchQuery = (query !== undefined ? query : (searchInput ? searchInput.value : '')).toLowerCase().trim();

    if (clearBtn) {
        clearBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
    }

    // 1. Calculate KPI Metrics
    const totalCount = products.length;
    const inStockCount = products.filter(p => (p.stock || 0) > 0 || (p.stock >= 999999)).length;
    const categorySet = new Set(products.map(p => p.category || 'General'));
    
    const kpiTotal = document.getElementById('menu-kpi-total');
    const kpiInStock = document.getElementById('menu-kpi-instock');
    const kpiCats = document.getElementById('menu-kpi-categories');
    if (kpiTotal) kpiTotal.textContent = totalCount;
    if (kpiInStock) kpiInStock.textContent = inStockCount;
    if (kpiCats) kpiCats.textContent = categorySet.size;

    // 2. Render Category Pills Bar
    renderCategoryPills(categorySet);

    // 3. Filter Products
    let filteredProducts = products.filter(p => {
        const matchesSearch = searchQuery === '' || 
            p.name.toLowerCase().includes(searchQuery) ||
            (p.category && p.category.toLowerCase().includes(searchQuery)) ||
            (p.barcode && p.barcode.toLowerCase().includes(searchQuery)) ||
            (p.hsn && p.hsn.toLowerCase().includes(searchQuery));

        if (!matchesSearch) return false;

        if (activeMenuCategory === 'INSTOCK') {
            return (p.stock || 0) > 0 || (p.stock >= 999999);
        } else if (activeMenuCategory !== 'ALL') {
            return (p.category || 'General') === activeMenuCategory;
        }
        return true;
    });

    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    container.className = `menu-card-content ${activeMenuViewMode}-layout`;

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--card-bg); border: 1px dashed var(--border-color); border-radius: 16px; color: var(--text-muted);">
                <i data-lucide="package-search" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-muted);"></i>
                <h4 style="color: var(--text-main); margin-bottom: 4px; font-size: 1.1rem;">No products found</h4>
                <p style="font-size: 0.85rem;">Try adjusting your search query or category filter.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Group by first letter
    const groups = {};
    filteredProducts.forEach(p => {
        let firstChar = p.name.charAt(0).toUpperCase();
        if (/[0-9]/.test(firstChar)) {
            firstChar = '0-9';
        } else if (!/[A-Z]/.test(firstChar)) {
            firstChar = '#';
        }
        if (!groups[firstChar]) groups[firstChar] = [];
        groups[firstChar].push(p);
    });

    let html = '';
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === '0-9') return -1;
        if (b === '0-9') return 1;
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
        html += `
            <div class="menu-group">
                <div class="menu-group-title">
                    <i data-lucide="bookmark" style="width: 18px;"></i> ${key}
                </div>
            </div>
        `;

        groups[key].forEach(p => {
            const stockVal = parseFloat(p.stock) || 0;
            const isInfinite = stockVal >= 999999;
            const stockText = isInfinite ? '∞ Infinite' : stockVal.toString();
            
            let stockBadgeClass = 'badge-instock';
            let stockLabel = `In Stock: ${stockText}`;
            if (stockVal <= 0 && !isInfinite) {
                stockBadgeClass = 'badge-outstock';
                stockLabel = 'Out of Stock';
            } else if (stockVal <= 10 && !isInfinite) {
                stockBadgeClass = 'badge-lowstock';
                stockLabel = `Low Stock: ${stockText}`;
            }

            const mrpVal = parseFloat(p.mrp) || 0;
            const saleVal = parseFloat(p.salePrice) || 0;
            const showMrp = mrpVal > saleVal;

            // Check if item is in Digital Order Cart
            const orderItem = menuOrderCart.find(item => item.id === p.id);
            const orderedQty = orderItem ? orderItem.qty : 0;

            html += `
                <div class="menu-item-card">
                    <div class="menu-card-top">
                        <div>
                            <div class="menu-item-title">${p.name}</div>
                            <div class="menu-badges" style="margin-top: 6px;">
                                <span class="badge-cat">${p.category || 'General'}</span>
                                <span class="badge-stock ${stockBadgeClass}">${stockLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div class="menu-details-meta">
                        ${p.hsn ? `<span class="meta-tag"><i data-lucide="barcode" style="width: 14px;"></i> HSN: ${p.hsn}</span>` : ''}
                        ${p.batch ? `<span class="meta-tag"><i data-lucide="layers" style="width: 14px;"></i> Batch: ${p.batch}</span>` : ''}
                        ${p.expiry ? `<span class="meta-tag"><i data-lucide="calendar" style="width: 14px;"></i> Exp: ${p.expiry}</span>` : ''}
                        ${p.gst ? `<span class="meta-tag"><i data-lucide="percent" style="width: 14px;"></i> GST: ${p.gst}%</span>` : ''}
                    </div>

                    <div class="menu-card-bottom">
                        <div class="price-wrapper">
                            ${showMrp ? `<span class="price-mrp">${settings.currency}${mrpVal.toFixed(2)}</span>` : ''}
                            <span class="price-sale">${settings.currency}${saleVal.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${stockVal > 0 || isInfinite ? (
                                orderedQty > 0 ? `
                                    <div class="menu-qty-ctrl">
                                        <button type="button" class="btn-qty" onclick="updateMenuOrderQuantity('${p.id}', -1)">-</button>
                                        <span class="qty-val">${orderedQty}</span>
                                        <button type="button" class="btn-qty" onclick="updateMenuOrderQuantity('${p.id}', 1)">+</button>
                                    </div>
                                ` : `
                                    <button class="btn btn-secondary" onclick="updateMenuOrderQuantity('${p.id}', 1)" title="Add item to digital order cart" style="padding: 0.45rem 0.8rem; font-size: 0.82rem;">
                                        <i data-lucide="shopping-bag" style="width: 15px;"></i> Order
                                    </button>
                                `
                            ) : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
    lucide.createIcons();
    updateMenuOrderDrawer();
}

function renderCategoryPills(categorySet) {
    const container = document.getElementById('menu-category-pills');
    if (!container) return;

    const categories = Array.from(categorySet).sort();
    
    const catCounts = {};
    products.forEach(p => {
        const cat = p.category || 'General';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const inStockCount = products.filter(p => (p.stock || 0) > 0 || (p.stock >= 999999)).length;

    let html = `
        <button class="category-pill ${activeMenuCategory === 'ALL' ? 'active' : ''}" onclick="setMenuCategoryFilter('ALL')">
            All Items <span class="pill-count">${products.length}</span>
        </button>
        <button class="category-pill ${activeMenuCategory === 'INSTOCK' ? 'active' : ''}" onclick="setMenuCategoryFilter('INSTOCK')">
            <i data-lucide="check-circle-2" style="width: 14px;"></i> In Stock <span class="pill-count">${inStockCount}</span>
        </button>
    `;

    categories.forEach(cat => {
        const isActive = activeMenuCategory === cat;
        const safeCat = cat.replace(/'/g, "\\'");
        html += `
            <button class="category-pill ${isActive ? 'active' : ''}" onclick="setMenuCategoryFilter('${safeCat}')">
                ${cat} <span class="pill-count">${catCounts[cat] || 0}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function setMenuCategoryFilter(cat) {
    activeMenuCategory = cat;
    const searchInput = document.getElementById('menu-card-search');
    renderMenuCard(searchInput ? searchInput.value : '');
}

function addMenuProductToBill(productId) {
    if (typeof addProductToCart === 'function') {
        addProductToCart(productId, 1);
        showMenuToast('Product added to Billing Terminal!');
    }
}

function showMenuToast(msg) {
    let toast = document.getElementById('menu-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'menu-toast';
    toast.className = 'menu-toast';
    toast.innerHTML = `<i data-lucide="check-circle" style="color: #10b981; width: 18px;"></i> ${msg}`;
    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        if (toast) toast.remove();
    }, 2500);
}

// --- Digital Menu Ordering System ---
let menuOrderCart = [];

function updateMenuOrderQuantity(productId, delta) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let itemIndex = menuOrderCart.findIndex(i => i.id === productId);
    if (itemIndex > -1) {
        menuOrderCart[itemIndex].qty += delta;
        if (menuOrderCart[itemIndex].qty <= 0) {
            menuOrderCart.splice(itemIndex, 1);
        } else if (menuOrderCart[itemIndex].qty > (product.stock || 0) && (product.stock < 999999)) {
            alert('Exceeds available stock quantity!');
            menuOrderCart[itemIndex].qty -= delta;
            return;
        }
    } else if (delta > 0) {
        if ((product.stock || 0) <= 0 && product.stock < 999999) {
            alert('Item is out of stock!');
            return;
        }
        menuOrderCart.push({
            id: product.id,
            name: product.name,
            salePrice: parseFloat(product.salePrice) || 0,
            mrp: parseFloat(product.mrp) || 0,
            gst: parseFloat(product.gst) || 0,
            batch: product.batch || '',
            stock: product.stock,
            qty: delta
        });
    }

    updateMenuOrderDrawer();
    renderMenuCard();
}

function updateMenuOrderDrawer() {
    const drawer = document.getElementById('menu-order-drawer');
    const badge = document.getElementById('menu-drawer-badge');
    const countEl = document.getElementById('menu-drawer-count');
    const totalEl = document.getElementById('menu-drawer-total');
    if (!drawer) return;

    let totalQty = 0;
    let totalPrice = 0;

    menuOrderCart.forEach(item => {
        totalQty += item.qty;
        totalPrice += (item.salePrice * item.qty);
    });

    if (badge) badge.textContent = totalQty;
    if (countEl) countEl.textContent = `${totalQty} Item${totalQty === 1 ? '' : 's'}`;
    if (totalEl) totalEl.textContent = `${settings.currency}${totalPrice.toFixed(2)}`;

    if (totalQty > 0) {
        drawer.classList.add('active');
    } else {
        drawer.classList.remove('active');
    }
}

function clearMenuOrder() {
    menuOrderCart = [];
    updateMenuOrderDrawer();
    renderMenuCard();
}

function openMenuOrderCheckoutModal() {
    if (menuOrderCart.length === 0) {
        alert('Your digital order cart is empty!');
        return;
    }

    const tbody = document.getElementById('menu-order-items-list');
    const grandTotalEl = document.getElementById('menu-order-grand-total');
    if (!tbody) return;

    let html = '';
    let grandTotal = 0;

    menuOrderCart.forEach(item => {
        const lineTotal = item.salePrice * item.qty;
        grandTotal += lineTotal;

        html += `
            <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td>${settings.currency}${item.salePrice.toFixed(2)}</td>
                <td>
                    <div class="menu-qty-ctrl">
                        <button type="button" class="btn-qty" onclick="updateMenuOrderQuantity('${item.id}', -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button type="button" class="btn-qty" onclick="updateMenuOrderQuantity('${item.id}', 1)">+</button>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 700;">${settings.currency}${lineTotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn btn-outline" onclick="updateMenuOrderQuantity('${item.id}', -${item.qty})" style="padding: 2px 6px; color: var(--danger-color); border: none;">
                        <i data-lucide="trash" style="width: 15px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (grandTotalEl) grandTotalEl.textContent = `${settings.currency}${grandTotal.toFixed(2)}`;

    const loggedUser = sessionStorage.getItem('mediflow_user');
    const nameInput = document.getElementById('morder-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = (loggedUser && loggedUser !== 'VIKI') ? loggedUser : '';
    }

    document.getElementById('menu-order-modal').style.display = 'flex';
    lucide.createIcons();
}

function closeMenuOrderModal() {
    const modal = document.getElementById('menu-order-modal');
    if (modal) modal.style.display = 'none';
}

function sendOrderToBillingTerminal() {
    if (menuOrderCart.length === 0) return;

    menuOrderCart.forEach(orderItem => {
        const existing = cart.find(c => c.id === orderItem.id);
        if (existing) {
            existing.qty += orderItem.qty;
        } else {
            const product = products.find(p => p.id === orderItem.id);
            if (product) {
                cart.push({ ...product, qty: orderItem.qty });
            }
        }
    });

    const nameVal = document.getElementById('morder-name').value.trim();
    const phoneVal = document.getElementById('morder-phone').value.trim();
    if (nameVal && document.getElementById('customer-name')) {
        document.getElementById('customer-name').value = nameVal;
    }
    if (phoneVal && document.getElementById('customer-phone')) {
        document.getElementById('customer-phone').value = phoneVal;
    }

    closeMenuOrderModal();
    clearMenuOrder();
    renderCart();
    switchSection('billing');
    showMenuToast('Order loaded into Billing Terminal!');
}

function handleMenuOrderSubmit(e) {
    e.preventDefault();
    if (menuOrderCart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const name = document.getElementById('morder-name').value.trim();
    const phone = document.getElementById('morder-phone').value.trim();
    const orderType = document.getElementById('morder-type').value;
    const ref = document.getElementById('morder-ref').value.trim();
    const notes = document.getElementById('morder-notes').value.trim();

    let grandTotal = 0;
    menuOrderCart.forEach(i => grandTotal += (i.salePrice * i.qty));

    const orderId = 'ORD-' + Date.now().toString().slice(-6);

    const saleRecord = {
        id: 'S' + Date.now(),
        invoiceNo: orderId,
        date: new Date().toISOString(),
        customer: { name: name, phone: phone },
        items: menuOrderCart.map(i => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            salePrice: i.salePrice,
            gst: i.gst,
            batch: i.batch
        })),
        paymentMode: 'Pending',
        orderType: orderType,
        orderRef: ref,
        notes: notes,
        subtotal: grandTotal,
        gstTotal: 0,
        discount: 0,
        grandTotal: grandTotal,
        branchId: currentBranchId,
        isDigitalOrder: true
    };

    sales.push(saleRecord);
    localStorage.setItem('mediflow_sales', JSON.stringify(sales));
    syncToCloud('sales', { data: sales });

    // Deduct stock
    menuOrderCart.forEach(orderItem => {
        const prodIndex = products.findIndex(p => p.id === orderItem.id);
        if (prodIndex > -1 && products[prodIndex].stock < 999999) {
            products[prodIndex].stock = Math.max(0, products[prodIndex].stock - orderItem.qty);
        }
    });
    localStorage.setItem('mediflow_products', JSON.stringify(products));

    closeMenuOrderModal();

    document.getElementById('success-order-id').textContent = `#${orderId}`;
    document.getElementById('success-order-customer').textContent = `${name} (${phone})`;
    document.getElementById('success-order-items').textContent = `${menuOrderCart.length} item(s) - ${orderType}`;
    document.getElementById('success-order-total').textContent = `${settings.currency}${grandTotal.toFixed(2)}`;

    const waMsg = encodeURIComponent(`*T7 BillPro Digital Order Confirmation*\nOrder ID: #${orderId}\nCustomer: ${name}\nOrder Type: ${orderType}\nTotal: ${settings.currency}${grandTotal.toFixed(2)}\n\nThank you for ordering!`);
    const waBtn = document.getElementById('success-whatsapp-btn');
    if (waBtn) waBtn.href = `https://wa.me/91${phone}?text=${waMsg}`;

    document.getElementById('menu-order-success-modal').style.display = 'flex';
    lucide.createIcons();

    clearMenuOrder();
}

function closeMenuSuccessModal() {
    const modal = document.getElementById('menu-order-success-modal');
    if (modal) modal.style.display = 'none';
}

// --- Digital Menu Orders Module ---
function renderDigitalOrders() {
    const tbody = document.getElementById('digital-orders-table-body');
    const searchInput = document.getElementById('digital-orders-search');
    const statusFilter = document.getElementById('digital-orders-status-filter');
    if (!tbody) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'ALL';

    let digitalOrders = sales.filter(s => s.isDigitalOrder || (s.invoiceNo && s.invoiceNo.startsWith('ORD-')));

    if (statusVal !== 'ALL') {
        digitalOrders = digitalOrders.filter(s => {
            const currentStatus = s.status || (s.paymentMode === 'Pending' ? 'Pending' : 'Billed');
            return currentStatus.toLowerCase() === statusVal.toLowerCase();
        });
    }

    if (query !== '') {
        digitalOrders = digitalOrders.filter(s => {
            const custName = (s.customer && s.customer.name) ? s.customer.name.toLowerCase() : '';
            const custPhone = (s.customer && s.customer.phone) ? s.customer.phone.toLowerCase() : '';
            const inv = (s.invoiceNo || '').toLowerCase();
            const type = (s.orderType || '').toLowerCase();
            const ref = (s.orderRef || '').toLowerCase();
            return custName.includes(query) || custPhone.includes(query) || inv.includes(query) || type.includes(query) || ref.includes(query);
        });
    }

    digitalOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (digitalOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i data-lucide="clipboard-x" style="width: 40px; height: 40px; margin-bottom: 8px; color: var(--text-muted);"></i>
                    <div>No digital menu orders found.</div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    let html = '';
    digitalOrders.forEach(o => {
        const orderDate = new Date(o.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        const custName = (o.customer && o.customer.name) ? o.customer.name : 'Walk-in';
        const custPhone = (o.customer && o.customer.phone) ? o.customer.phone : '-';
        const orderTypeStr = `${o.orderType || 'Order'}${o.orderRef ? ' (' + o.orderRef + ')' : ''}`;
        const itemsSummary = o.items ? o.items.map(i => `${i.name} x${i.qty}`).join(', ') : '-';
        
        const currentStatus = o.status || (o.paymentMode === 'Pending' ? 'Pending' : 'Billed');
        const isPending = currentStatus === 'Pending';
        const statusBadge = isPending 
            ? `<span class="badge-stock badge-lowstock" style="font-size: 0.8rem; padding: 4px 10px;"><i data-lucide="clock" style="width: 12px; vertical-align: middle;"></i> Pending</span>`
            : `<span class="badge-stock badge-instock" style="font-size: 0.8rem; padding: 4px 10px;"><i data-lucide="check-circle-2" style="width: 12px; vertical-align: middle;"></i> Billed</span>`;

        html += `
            <tr>
                <td><strong>#${o.invoiceNo || o.id}</strong></td>
                <td>${orderDate}</td>
                <td>
                    <div style="font-weight: 600;">${custName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${custPhone}</div>
                </td>
                <td><span class="badge-cat">${orderTypeStr}</span></td>
                <td style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td><strong style="color: var(--primary-color);">${settings.currency}${(parseFloat(o.grandTotal) || 0).toFixed(2)}</strong></td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="btn btn-primary" onclick="loadDigitalOrderToBilling('${o.id}')" title="Load order items into Billing Terminal to Bill now" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;">
                            <i data-lucide="calculator" style="width: 15px;"></i> Bill Order
                        </button>
                        <button type="button" class="btn btn-outline" onclick="deleteDigitalOrder('${o.id}')" title="Delete Order" style="padding: 0.4rem 0.6rem; color: var(--danger-color);">
                            <i data-lucide="trash-2" style="width: 15px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    lucide.createIcons();
}

function loadDigitalOrderToBilling(orderId) {
    const orderIndex = sales.findIndex(s => s.id === orderId || s.invoiceNo === orderId);
    if (orderIndex === -1) {
        alert('Order not found!');
        return;
    }

    const order = sales[orderIndex];

    if (cart.length > 0) {
        if (!confirm('Active billing cart contains items! Replace current cart with this order?')) {
            return;
        }
    }

    cart = [];
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const p = products.find(prod => prod.id === item.id) || {
                id: item.id || ('P' + Date.now()),
                name: item.name,
                salePrice: item.salePrice || 0,
                mrp: item.mrp || item.salePrice || 0,
                gst: item.gst || 0,
                batch: item.batch || 'GENERAL',
                stock: 999999
            };
            cart.push({
                ...p,
                qty: item.qty || 1
            });
        });
    }

    if (order.customer) {
        const custNameEl = document.getElementById('customer-name');
        const custPhoneEl = document.getElementById('customer-phone');
        if (custNameEl) custNameEl.value = order.customer.name || '';
        if (custPhoneEl) custPhoneEl.value = order.customer.phone || '';
    }

    // Clear order from digital orders list once sent to billing
    sales.splice(orderIndex, 1);
    localStorage.setItem('mediflow_sales', JSON.stringify(sales));
    syncToCloud('sales', { data: sales });

    switchSection('billing');
    renderCart();
    showMenuToast(`Order #${order.invoiceNo || order.id} loaded into Billing Terminal!`);
}

function deleteDigitalOrder(orderId) {
    if (!confirm('Are you sure you want to delete/clear this digital order?')) return;
    const index = sales.findIndex(s => s.id === orderId || s.invoiceNo === orderId);
    if (index > -1) {
        sales.splice(index, 1);
        localStorage.setItem('mediflow_sales', JSON.stringify(sales));
        syncToCloud('sales', { data: sales });
        renderDigitalOrders();
        showMenuToast('Digital order cleared successfully.');
    }
}

// --- Reports Module ---
function generateReport() {
    const type = document.getElementById('report-type').value;
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    
    const head = document.getElementById('report-table-head');
    const body = document.getElementById('report-table-body');
    const foot = document.getElementById('report-table-foot');
    const title = document.getElementById('report-table-title');
    
    let htmlHead = '';
    let htmlBody = '';
    let htmlFoot = '';
    let totalItems = 0;
    let totalValue = 0;
    
    const isDateInRange = (dateStr) => {
        if (!dateStr) return false;
        // Handle ISO dates and simple YYYY-MM-DD
        const d = dateStr.includes('T') ? new Date(dateStr).toISOString().split('T')[0] : dateStr;
        return d >= start && d <= end;
    };

    if (type === 'stock') {
        title.textContent = 'Stock Report';
        htmlHead = `<tr><th>Item Code</th><th>Name</th><th>Category</th><th>Stock</th><th>MRP</th><th>Total Value</th></tr>`;
        products.forEach(p => {
            const val = (p.stock || 0) * (parseFloat(p.mrp) || 0);
            totalValue += val;
            totalItems++;
            htmlBody += `<tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td style="color: ${p.stock <= 10 ? 'red' : 'inherit'}">${p.stock}</td>
                <td>${settings.currency}${(parseFloat(p.mrp)||0).toFixed(2)}</td>
                <td>${settings.currency}${val.toFixed(2)}</td>
            </tr>`;
        });
        htmlFoot = `<tr><td colspan="5" style="text-align: right;">Total Inventory Value:</td><td>${settings.currency}${totalValue.toFixed(2)}</td></tr>`;
    } else if (type.startsWith('sales_')) {
        let titleMap = {
            'sales_all': 'Total Sales Report',
            'sales_cash': 'Cash Sales Report',
            'sales_gpay': 'GPay Sales Report',
            'sales_credit': 'Customer Credit Report'
        };
        title.textContent = titleMap[type] + ` (${start} to ${end})`;
        htmlHead = `<tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Payment</th><th>Items</th><th>Total</th></tr>`;
        
        let filteredSales = sales.filter(s => isDateInRange(s.date) && !s.isReturn);
        
        if (type === 'sales_cash') filteredSales = filteredSales.filter(s => s.paymentMode === 'Cash');
        else if (type === 'sales_gpay') filteredSales = filteredSales.filter(s => s.paymentMode === 'GPay');
        else if (type === 'sales_credit') filteredSales = filteredSales.filter(s => s.paymentMode === 'Credit');
        
        filteredSales.forEach(s => {
            totalValue += parseFloat(s.grandTotal) || 0;
            totalItems++;
            htmlBody += `<tr>
                <td>${new Date(s.date).toLocaleDateString()}</td>
                <td>${s.invoiceNo}</td>
                <td>${s.customer ? s.customer.name : 'Cash'}</td>
                <td>${s.paymentMode}</td>
                <td>${s.items ? s.items.length : 0}</td>
                <td>${settings.currency}${(parseFloat(s.grandTotal)||0).toFixed(2)}</td>
            </tr>`;
        });
        htmlFoot = `<tr><td colspan="5" style="text-align: right;">Total Sales Amount:</td><td>${settings.currency}${totalValue.toFixed(2)}</td></tr>`;
    } else if (type === 'purchases') {
        title.textContent = `Purchases Report (${start} to ${end})`;
        htmlHead = `<tr><th>Date</th><th>Invoice</th><th>Supplier</th><th>Item</th><th>Qty</th><th>Cost</th><th>Total</th></tr>`;
        
        let filteredPurchases = purchases.filter(p => isDateInRange(p.date));
        filteredPurchases.forEach(p => {
            totalValue += parseFloat(p.total) || 0;
            htmlBody += `<tr>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.invoice}</td>
                <td>${p.supplier}</td>
                <td>${p.productName}</td>
                <td>${p.qty}</td>
                <td>${settings.currency}${(parseFloat(p.price)||0).toFixed(2)}</td>
                <td>${settings.currency}${(parseFloat(p.total)||0).toFixed(2)}</td>
            </tr>`;
        });
        htmlFoot = `<tr><td colspan="6" style="text-align: right;">Total Purchases:</td><td>${settings.currency}${totalValue.toFixed(2)}</td></tr>`;
    } else if (type === 'expenses') {
        title.textContent = `Expenses Report (${start} to ${end})`;
        htmlHead = `<tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Notes</th></tr>`;
        
        let filteredEx = expenses.filter(e => isDateInRange(e.date));
        filteredEx.forEach(e => {
            totalValue += parseFloat(e.amount) || 0;
            htmlBody += `<tr>
                <td>${new Date(e.date).toLocaleDateString()}</td>
                <td>${e.title}</td>
                <td>${e.category}</td>
                <td>${settings.currency}${(parseFloat(e.amount)||0).toFixed(2)}</td>
                <td>${e.notes || ''}</td>
            </tr>`;
        });
        htmlFoot = `<tr><td colspan="3" style="text-align: right;">Total Expenses:</td><td>${settings.currency}${totalValue.toFixed(2)}</td><td></td></tr>`;
    }
    
    if (!htmlBody) {
        htmlBody = `<tr><td colspan="8" style="text-align: center;">No data found for the selected criteria.</td></tr>`;
    }
    
    head.innerHTML = htmlHead;
    body.innerHTML = htmlBody;
    foot.innerHTML = htmlFoot;
}

function exportReportToCSV() {
    const title = document.getElementById('report-table-title').textContent.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const table = document.getElementById('report-table');
    let csv = [];
    
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
            let data = cols[j].innerText.replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(','));
    }
    
    const csvFile = new Blob([csv.join('\n')], {type: 'text/csv'});
    const downloadLink = document.createElement('a');
    downloadLink.download = `${title}.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// --- Automated Local Directory Backup (File System Access API) ---
const dbName = 'MediFlowFileSystemDB';
const storeName = 'handles';

function initFileSystemDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(storeName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getBackupDirHandle() {
    try {
        const db = await initFileSystemDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get('backupDirHandle');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error('IndexedDB access error:', e);
        return null;
    }
}

async function saveBackupDirHandle(handle) {
    try {
        const db = await initFileSystemDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(handle, 'backupDirHandle');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error('IndexedDB save error:', e);
    }
}

async function updateBackupDirUI() {
    const handle = await getBackupDirHandle();
    const statusEl = document.getElementById('backup-dir-status');
    if (statusEl) {
        if (handle) {
            statusEl.innerHTML = `<i data-lucide="check-circle" style="color: #16a34a; width: 16px; vertical-align: middle;"></i> <strong>Active:</strong> ${handle.name}`;
            lucide.createIcons();
        } else {
            statusEl.textContent = 'No folder selected.';
        }
    }
}

window.selectBackupDir = async function() {
    try {
        if (!window.showDirectoryPicker) {
            alert('Your browser does not support local folder selection. Please use Google Chrome or Microsoft Edge.');
            return;
        }
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveBackupDirHandle(dirHandle);
        updateBackupDirUI();
        alert('Backup folder selected successfully! The system will now automatically save a backup here during shift summaries.');
    } catch (err) {
        console.error(err);
        // User aborted or error
    }
};

// Initialize UI on load
updateBackupDirUI();

window.runAutoLocalBackup = async function() {
    try {
        const dirHandle = await getBackupDirHandle();
        if (!dirHandle) return; // No directory selected

        // Verify permission, request if needed (can happen after browser restart)
        if (await dirHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
            if (await dirHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                console.warn("Permission to backup directory denied.");
                return;
            }
        }

        const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `T7_BillPro_AutoBackup_${dateStr}.json`;
        
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            data: {}
        };
        
        branchSpecificKeys.forEach(k => {
            backupData.data[k] = JSON.parse(localStorage.getItem(k));
        });

        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(backupData, null, 2));
        await writable.close();
        
        console.log(`Auto-backup saved to local folder as ${filename}`);
    } catch (e) {
        console.error("Auto local backup failed:", e);
    }
}

// --- Digital Menu Sharing & QR Code ---
function getDigitalMenuURL() {
    const currentUrl = window.location.href.split('#')[0];
    return `${currentUrl}#menu-card`;
}

function shareDigitalMenuWhatsApp() {
    const shopName = settings.shopName || 'T7 BillPro';
    const menuUrl = getDigitalMenuURL();
    const message = `Hello! Check out our live Digital Catalog & Menu for ${shopName}:\n\n🔗 ${menuUrl}\n\nYou can browse our live stock and place orders directly!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function copyDigitalMenuLink() {
    const menuUrl = getDigitalMenuURL();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(menuUrl).then(() => {
            alert('Digital Menu link copied to clipboard!\n\n' + menuUrl);
        }).catch(() => {
            prompt('Copy your Digital Menu Link below:', menuUrl);
        });
    } else {
        prompt('Copy your Digital Menu Link below:', menuUrl);
    }
}

function showDigitalMenuQRCode() {
    const modal = document.getElementById('qr-code-modal');
    const qrImg = document.getElementById('qr-code-img');
    const qrUrlText = document.getElementById('qr-code-url');
    const shopTitle = document.getElementById('qr-shop-name');
    
    if (!modal) return;
    
    const menuUrl = getDigitalMenuURL();
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(menuUrl)}`;
    
    if (qrImg) qrImg.src = qrApiUrl;
    if (qrUrlText) qrUrlText.textContent = menuUrl;
    if (shopTitle) shopTitle.textContent = settings.shopName || 'T7 BillPro';
    
    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeQRCodeModal() {
    const modal = document.getElementById('qr-code-modal');
    if (modal) modal.style.display = 'none';
}

function printQRCodePoster() {
    const shopName = settings.shopName || 'T7 BillPro';
    const shopAddress = settings.shopAddress || '';
    const shopPhone = settings.shopPhone || '';
    const menuUrl = getDigitalMenuURL();
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`;
    
    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Please allow popups to print the QR Code poster.');
        return;
    }
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${shopName} - Scan QR Code for Digital Menu</title>
            <style>
                body { font-family: 'Inter', system-ui, sans-serif; text-align: center; padding: 40px; color: #1e293b; background: #f8fafc; }
                .poster { border: 4px solid #2563eb; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { color: #2563eb; font-size: 2rem; margin-bottom: 8px; margin-top: 0; }
                p { color: #64748b; font-size: 1rem; margin-bottom: 24px; }
                img { width: 250px; height: 250px; border-radius: 12px; border: 1px solid #cbd5e1; padding: 10px; background: white; }
                .footer { margin-top: 24px; font-weight: bold; color: #0f172a; font-size: 1.1rem; }
                .link { font-size: 0.85rem; color: #64748b; word-break: break-all; margin-top: 10px; font-family: monospace; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="poster">
                <h1>${shopName}</h1>
                <p>Scan QR Code to View Live Digital Catalog & Menu</p>
                <img src="${qrApiUrl}" alt="QR Code">
                <div class="footer">Scan with your Phone Camera to Browse & Order</div>
                ${shopAddress ? `<div style="font-size: 0.9rem; color: #475569; margin-top: 8px;">${shopAddress} | ${shopPhone}</div>` : ''}
                <div class="link">${menuUrl}</div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
}

window.shareDigitalMenuWhatsApp = shareDigitalMenuWhatsApp;
window.copyDigitalMenuLink = copyDigitalMenuLink;
window.showDigitalMenuQRCode = showDigitalMenuQRCode;
window.closeQRCodeModal = closeQRCodeModal;
window.printQRCodePoster = printQRCodePoster;
