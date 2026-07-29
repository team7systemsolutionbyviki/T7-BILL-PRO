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
const branchSpecificKeys = ['mediflow_products', 'mediflow_sales', 'mediflow_settings', 'mediflow_purchases', 'mediflow_expenses', 'mediflow_categories', 'mediflow_expense_categories', 'mediflow_customers', 'mediflow_customer_payments', 'mediflow_suppliers', 'mediflow_supplier_payments', 'mediflow_held_carts', 'mediflow_amc', 'mediflow_staff', 'mediflow_attendance', 'mediflow_staff_advances', 'mediflow_salary_payments', 'mediflow_digital_orders'];

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
let staffList = [];
let attendanceLogs = [];
let staffAdvances = [];
let salaryPayments = [];

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
        shopName: 'T7 BillPro', shopAddress: '123 Medical Street, City Center', shopPhone: '+91 9876543210', shopLogo: '', printerType: '3inch', printerName: 'Default System Printer', printCopies: 1, gstDefault: true, kotEnabled: true, currency: '₹'
    };
    if (settings.kotEnabled === undefined) settings.kotEnabled = true;
    if (!settings.printerName) settings.printerName = 'Default System Printer';
    if (!settings.printCopies) settings.printCopies = 1;
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
    
    const storedStaff = localStorage.getItem('mediflow_staff');
    if (storedStaff === null) {
        if (currentBranchId === 'branch_default' || currentBranchId === 'main') {
            staffList = [
                { id: 'STF01', name: 'Ramesh Kumar', phone: '9876543210', role: 'Pharmacist', salaryType: 'Monthly', salaryRate: 18000, joiningDate: '2025-01-10', status: 'Active', address: 'Main Street', branchId: currentBranchId },
                { id: 'STF02', name: 'Suresh Kumar', phone: '9876543211', role: 'Sales Assistant', salaryType: 'Daily', salaryRate: 600, joiningDate: '2025-03-15', status: 'Active', address: 'Cross Road', branchId: currentBranchId }
            ];
        } else {
            staffList = [];
        }
        localStorage.setItem('mediflow_staff', JSON.stringify(staffList));
    } else {
        try {
            staffList = JSON.parse(storedStaff) || [];
        } catch (e) {
            staffList = [];
        }
    }
    attendanceLogs = JSON.parse(localStorage.getItem('mediflow_attendance')) || [];
    staffAdvances = JSON.parse(localStorage.getItem('mediflow_staff_advances')) || [];
    salaryPayments = JSON.parse(localStorage.getItem('mediflow_salary_payments')) || [];
    cart = [];
    if (typeof renderBarcodeProductOptions === 'function') renderBarcodeProductOptions();
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
        if (typeof renderStaffManagement === 'function') renderStaffManagement();
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
        if (collectionName === 'staffAdvances') docName = 'staff_advances';
        if (collectionName === 'salaryPayments') docName = 'salary_payments';
        
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
        const collections = ['products', 'sales', 'settings', 'purchases', 'expenses', 'categories', 'expense_categories', 'customers', 'suppliers', 'admins', 'supplierPayments', 'customerPayments', 'branches', 'staff', 'attendance', 'staff_advances', 'salary_payments'];
        
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
                    else if (col === 'staff') staffList = arrayData;
                    else if (col === 'attendance') attendanceLogs = arrayData;
                    else if (col === 'staff_advances') staffAdvances = arrayData;
                    else if (col === 'salary_payments') salaryPayments = arrayData;

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
    const isCustomerView = window.location.hash === '#menu-card' || 
                           window.location.hash === '#menu' ||
                           window.location.search.includes('mode=customer') || 
                           window.location.search.includes('menu=true');

    if (isCustomerView && sessionStorage.getItem('mediflow_logged_in') !== 'true') {
        enableCustomerMenuView();
        return;
    }

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
        if (isCustomerView) {
            enableCustomerMenuView();
            return;
        }
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

        // Table Management nav visibility
        const navTableBtn = document.getElementById('nav-table-mgmt');
        if (navTableBtn) navTableBtn.style.display = settings.enableTableMgmt ? 'flex' : 'none';
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
        'branches': 'Branch Management',
        'staff-management': 'Staff Management & Payroll',
        'barcode-labels': 'Product Barcode Label Printer'
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
        const kotBtn = document.getElementById('print-kot-btn');
        if (kotBtn) kotBtn.style.display = (settings.kotEnabled !== false) ? 'inline-flex' : 'none';
        
        const waiterContainer = document.getElementById('billing-waiter-container');
        if (waiterContainer) {
            waiterContainer.style.display = settings.enableWaiterSelect ? 'block' : 'none';
            if (settings.enableWaiterSelect && typeof renderBillingWaiterOptions === 'function') renderBillingWaiterOptions();
        }
        const doctorContainer = document.getElementById('billing-doctor-container');
        if (doctorContainer) {
            doctorContainer.style.display = settings.enableDoctorSelect ? 'block' : 'none';
            if (settings.enableDoctorSelect && typeof renderBillingDoctorOptions === 'function') renderBillingDoctorOptions();
        }
        const tableContainer = document.getElementById('billing-table-container');
        if (tableContainer) {
            tableContainer.style.display = settings.enableTableMgmt ? 'block' : 'none';
        }
    }
    if (sectionId === 'settings') {
        if (typeof loadSettingsFields === 'function') loadSettingsFields();
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
    if (sectionId === 'table-management') {
        if (typeof renderTableManagement === 'function') renderTableManagement();
    }
    if (sectionId === 'digital-orders') {
        renderDigitalOrders();
    }
    if (sectionId === 'staff-management') {
        renderStaffManagement();
    }
    if (sectionId === 'barcode-labels') {
        if (typeof renderBarcodeProductOptions === 'function') renderBarcodeProductOptions();
        if (typeof renderBarcodeLabelsPreview === 'function') renderBarcodeLabelsPreview();
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
        const query = e.target.value.trim().toLowerCase();

        if (e.key === 'ArrowDown') {
            if (items.length > 0) {
                e.preventDefault();
                searchSelectedIndex = Math.min(searchSelectedIndex + 1, items.length - 1);
                updateSearchSelection(items);
            }
        } else if (e.key === 'ArrowUp') {
            if (items.length > 0) {
                e.preventDefault();
                searchSelectedIndex = Math.max(searchSelectedIndex - 1, 0);
                updateSearchSelection(items);
            }
        } else if (e.key === 'Enter') {
            if (e.ctrlKey) return; // Let the global shortcut handle it
            e.preventDefault();

            if (query === '') {
                if (cart.length > 0) {
                    processSale(true);
                }
                return;
            }

            // 1. Check for exact barcode match first
            const exactMatch = products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === query);
            if (exactMatch) {
                addToCart(exactMatch.id);
                e.target.value = '';
                resultsDiv.style.display = 'none';
                searchSelectedIndex = -1;
                return;
            }

            // 2. If user selected an item with arrow keys
            if (searchSelectedIndex >= 0 && searchSelectedIndex < items.length) {
                items[searchSelectedIndex].click();
                return;
            }

            // 3. Otherwise, if search result dropdown items exist, click the first one
            if (items.length > 0) {
                items[0].click();
            } else {
                // 4. Fallback check in products array if dropdown is empty or closed
                const matchProduct = products.find(p => 
                    p.barcode && String(p.barcode).trim().toLowerCase() === query
                ) || products.find(p => 
                    p.name && p.name.toLowerCase() === query
                );
                if (matchProduct) {
                    addToCart(matchProduct.id);
                    e.target.value = '';
                    resultsDiv.style.display = 'none';
                    searchSelectedIndex = -1;
                }
            }
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

    const importProductsBtn = document.getElementById('import-products-btn');
    const productImportInput = document.getElementById('product-import-input');

    if (importProductsBtn && productImportInput) {
        importProductsBtn.addEventListener('click', () => {
            productImportInput.click();
        });

        productImportInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleProductImportFile(file);
                e.target.value = '';
            }
        });
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
            printerName: document.getElementById('set-printer-name') ? document.getElementById('set-printer-name').value.trim() : 'Default System Printer',
            printCopies: document.getElementById('set-print-copies') ? Number(document.getElementById('set-print-copies').value) : 1,
            gstDefault: document.getElementById('set-gst-default').checked,
            kotEnabled: document.getElementById('set-kot-enabled') ? document.getElementById('set-kot-enabled').checked : true,
            enableWaiterSelect: document.getElementById('set-enable-waiter') ? document.getElementById('set-enable-waiter').checked : false,
            enableDoctorSelect: document.getElementById('set-enable-doctor') ? document.getElementById('set-enable-doctor').checked : false,
            enableTableMgmt: document.getElementById('set-enable-table-mgmt') ? document.getElementById('set-enable-table-mgmt').checked : false,
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
                case 'w': e.preventDefault(); switchSection('staff-management'); break;
                case 'l': e.preventDefault(); switchSection('barcode-labels'); break;
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
                case 'k':
                    if (activeSection === 'billing') {
                        e.preventDefault();
                        if (typeof printKOT === 'function') printKOT();
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
                (p.name && p.name.toLowerCase().includes(query)) || 
                (p.barcode && String(p.barcode).toLowerCase().includes(query)) || 
                (p.batch && String(p.batch).toLowerCase().includes(query)) ||
                (p.category && String(p.category).toLowerCase().includes(query))
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
let lastBillingSearchTime = 0;
let lastBillingSearchLength = 0;

function handleBillingSearch(e) {
    searchSelectedIndex = -1;
    const query = e.target.value.trim().toLowerCase();
    const rawVal = e.target.value;
    const resultsDiv = document.getElementById('search-results');
    
    if (query.length < 1) {
        resultsDiv.style.display = 'none';
        lastBillingSearchTime = Date.now();
        lastBillingSearchLength = 0;
        return;
    }

    const now = Date.now();
    const timeDiff = now - lastBillingSearchTime;
    const lengthDiff = rawVal.length - lastBillingSearchLength;
    lastBillingSearchTime = now;
    lastBillingSearchLength = rawVal.length;

    // Fast scanner input: pasted multi-character input (> 1 char at once) or super fast keystroke sequence (< 40ms apart)
    const isFastInput = lengthDiff > 1 || (timeDiff < 40 && timeDiff > 0);

    // Auto-add on exact barcode match on `input` ONLY for fast hardware scanners / paste.
    // Manual human typing will not be interrupted prematurely when typing longer codes (e.g. typing 44CODE when barcode 4 exists).
    if (isFastInput) {
        const exactMatch = products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === query);
        if (exactMatch) {
            addToCart(exactMatch.id);
            e.target.value = '';
            resultsDiv.style.display = 'none';
            lastBillingSearchLength = 0;
            return;
        }
    }

    const filtered = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) || 
        (p.barcode && String(p.barcode).toLowerCase().includes(query)) ||
        (p.batch && String(p.batch).toLowerCase().includes(query))
    ).slice(0, 5);

    if (filtered.length > 0) {
        resultsDiv.innerHTML = filtered.map(p => `
            <div class="search-item" onclick="addToCart('${p.id}')">
                <span class="name">${p.name} <small>(${p.category || ''})</small></span>
                <span class="details">Barcode: ${p.barcode || 'N/A'} | Batch: ${p.batch || ''} | Price: ${settings.currency}${p.salePrice}</span>
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

    const waiterSelect = document.getElementById('billing-waiter-select');
    const doctorInput = document.getElementById('billing-doctor-name');
    const tableSelect = document.getElementById('billing-table-select');

    const waiterName = (waiterSelect && waiterSelect.value) ? waiterSelect.value : '';
    const doctorName = (doctorInput && doctorInput.value) ? doctorInput.value.trim() : '';
    const tableName = (tableSelect && tableSelect.value) ? tableSelect.value : '';

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
        isReturn: isReturnMode,
        waiterName: waiterName,
        doctorName: doctorName,
        tableName: tableName
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
                    <button class="btn btn-outline" onclick="reprintBill('${s.id}')" title="Reprint Bill" style="padding: 5px;"><i data-lucide="printer" style="width: 16px;"></i></button>
                    <button class="btn btn-outline" onclick="sendWhatsAppBill('${s.id}')" title="WhatsApp Bill" style="padding: 5px; color: #25d366;"><i data-lucide="message-square" style="width: 16px;"></i></button>
                    ${!s.isReturn ? `<button class="btn btn-outline" onclick="openReturnBillModal('${s.invoiceNo || s.id}')" title="Return Bill" style="padding: 5px; color: var(--danger-color);"><i data-lucide="rotate-ccw" style="width: 16px;"></i></button>` : ''}
                    ${sessionStorage.getItem('mediflow_user') === 'VIKI' ? `<button class="btn btn-outline" onclick="deleteSale('${s.id}')" title="Delete Sale" style="padding: 5px; color: var(--danger-color);"><i data-lucide="trash" style="width: 16px;"></i></button>` : ''}
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
            (p.name && p.name.toLowerCase().includes(searchQuery)) ||
            (p.category && String(p.category).toLowerCase().includes(searchQuery)) ||
            (p.barcode && String(p.barcode).toLowerCase().includes(searchQuery)) ||
            (p.hsn && String(p.hsn).toLowerCase().includes(searchQuery));

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

// --- Staff Management & Payroll Module ---
let activeStaffTab = 'profiles';
let tempDailyAttendance = {};

function switchStaffSubTab(tabName) {
    activeStaffTab = tabName;
    document.querySelectorAll('.staff-subtab-btn').forEach(btn => {
        if (btn.dataset.staffTab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    document.querySelectorAll('.staff-subtab-content').forEach(content => {
        content.style.display = 'none';
    });

    const target = document.getElementById(`staff-subtab-${tabName}`);
    if (target) target.style.display = 'block';

    if (tabName === 'profiles') renderStaffProfiles();
    else if (tabName === 'attendance') renderManualAttendance();
    else if (tabName === 'advances') renderStaffAdvances();
    else if (tabName === 'payroll') renderPayroll();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderStaffManagement() {
    switchStaffSubTab(activeStaffTab || 'profiles');
}

function renderStaffProfiles() {
    const tableBody = document.getElementById('staff-table-body');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('staff-search-input')?.value || '').toLowerCase();
    const filtered = staffList.filter(s => 
        (s.name || '').toLowerCase().includes(searchTerm) || 
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.role && s.role.toLowerCase().includes(searchTerm))
    );

    // Compute Stats
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter(s => s.status === 'Active').length;
    
    let totalPendingAdvances = 0;
    staffList.forEach(s => {
        totalPendingAdvances += getStaffOutstandingAdvance(s.id);
    });

    let totalMonthlyBase = staffList.reduce((acc, s) => {
        if (s.status === 'Active') {
            return acc + (s.salaryType === 'Monthly' ? Number(s.salaryRate || 0) : Number(s.salaryRate || 0) * 26);
        }
        return acc;
    }, 0);

    if (document.getElementById('staff-stat-total')) document.getElementById('staff-stat-total').textContent = totalStaff;
    if (document.getElementById('staff-stat-active')) document.getElementById('staff-stat-active').textContent = activeStaff;
    if (document.getElementById('staff-stat-advances')) document.getElementById('staff-stat-advances').textContent = `₹${totalPendingAdvances.toFixed(2)}`;
    if (document.getElementById('staff-stat-payroll')) document.getElementById('staff-stat-payroll').textContent = `₹${totalMonthlyBase.toFixed(2)}`;

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No staff members found</td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const advBal = getStaffOutstandingAdvance(s.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>${escapeHtml(s.role || '-')}</td>
            <td>${escapeHtml(s.phone || '-')}</td>
            <td><span class="badge-status" style="background:#e0f2fe; color:#0369a1;">${s.salaryType || 'Monthly'}</span></td>
            <td>₹${Number(s.salaryRate || 0).toFixed(2)}${s.salaryType === 'Daily' ? ' / day' : ' / mo'}</td>
            <td style="font-weight:600; color:${advBal > 0 ? '#dc2626' : 'var(--text-main)'};">₹${advBal.toFixed(2)}</td>
            <td><span class="badge-status ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${s.status || 'Active'}</span></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem;" onclick="openStaffModal('${s.id}')" title="Edit Staff">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; color:#dc2626;" onclick="deleteStaff('${s.id}')" title="Delete Staff">
                        <i data-lucide="trash-2"></i>
                    </button>
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem;" onclick="openAdvanceModal('${s.id}', 'given')" title="Give Advance">
                        <i data-lucide="plus-circle"></i> Adv
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getStaffOutstandingAdvance(staffId) {
    let totalGiven = 0;
    let totalReturnedOrDeducted = 0;
    staffAdvances.filter(a => a.staffId === staffId).forEach(a => {
        if (a.type === 'given') totalGiven += Number(a.amount || 0);
        else totalReturnedOrDeducted += Number(a.amount || 0);
    });
    return Math.max(0, totalGiven - totalReturnedOrDeducted);
}

function openStaffModal(staffId = null) {
    const modal = document.getElementById('staff-modal');
    if (!modal) return;
    document.getElementById('staff-form').reset();
    document.getElementById('edit-staff-id').value = '';

    if (staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (staff) {
            document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
            document.getElementById('edit-staff-id').value = staff.id;
            document.getElementById('staff-name').value = staff.name;
            document.getElementById('staff-phone').value = staff.phone || '';
            document.getElementById('staff-role').value = staff.role || 'Cashier';
            document.getElementById('staff-salary-type').value = staff.salaryType || 'Monthly';
            document.getElementById('staff-salary-rate').value = staff.salaryRate || 0;
            document.getElementById('staff-joining-date').value = staff.joiningDate || '';
            document.getElementById('staff-status').value = staff.status || 'Active';
            document.getElementById('staff-address').value = staff.address || '';
        }
    } else {
        document.getElementById('staff-modal-title').textContent = 'Add New Staff Member';
        document.getElementById('staff-joining-date').value = new Date().toISOString().split('T')[0];
    }
    modal.style.display = 'flex';
}

function closeStaffModal() {
    const modal = document.getElementById('staff-modal');
    if (modal) modal.style.display = 'none';
}

function saveStaff(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-staff-id').value;
    const name = document.getElementById('staff-name').value.trim();
    const phone = document.getElementById('staff-phone').value.trim();
    const role = document.getElementById('staff-role').value;
    const salaryType = document.getElementById('staff-salary-type').value;
    const salaryRate = Number(document.getElementById('staff-salary-rate').value) || 0;
    const joiningDate = document.getElementById('staff-joining-date').value;
    const status = document.getElementById('staff-status').value;
    const address = document.getElementById('staff-address').value.trim();

    if (editId) {
        const index = staffList.findIndex(s => s.id === editId);
        if (index !== -1) {
            staffList[index] = { ...staffList[index], name, phone, role, salaryType, salaryRate, joiningDate, status, address };
        }
    } else {
        const newId = 'STF' + String(staffList.length + 1).padStart(2, '0');
        staffList.push({ id: newId, name, phone, role, salaryType, salaryRate, joiningDate, status, address });
    }

    localStorage.setItem('mediflow_staff', JSON.stringify(staffList));
    syncToCloud('staff', staffList);
    closeStaffModal();
    renderStaffProfiles();
}

function deleteStaff(staffId) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    staffList = staffList.filter(s => s.id !== staffId);
    localStorage.setItem('mediflow_staff', JSON.stringify(staffList));
    syncToCloud('staff', staffList);
    renderStaffProfiles();
}

function renderManualAttendance() {
    const picker = document.getElementById('attendance-date-picker');
    if (picker && !picker.value) {
        picker.value = new Date().toISOString().split('T')[0];
    }
    const selectedDate = picker ? picker.value : new Date().toISOString().split('T')[0];
    const tableBody = document.getElementById('attendance-table-body');
    if (!tableBody) return;

    // Load saved logs for selected date
    const existingLog = attendanceLogs.find(l => l.date === selectedDate);
    const savedMap = {};
    if (existingLog && existingLog.records) {
        existingLog.records.forEach(r => { savedMap[r.staffId] = r; });
    }

    const activeStaff = staffList.filter(s => s.status === 'Active');
    tableBody.innerHTML = '';

    if (activeStaff.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No active staff members available. Please add staff first.</td></tr>`;
        return;
    }

    activeStaff.forEach(s => {
        const saved = savedMap[s.id] || { status: 'Present', overtime: 0, remarks: '' };
        const currentStatus = tempDailyAttendance[s.id]?.status || saved.status || 'Present';
        const currentOt = tempDailyAttendance[s.id]?.overtime !== undefined ? tempDailyAttendance[s.id].overtime : (saved.overtime || 0);
        const currentRemarks = tempDailyAttendance[s.id]?.remarks !== undefined ? tempDailyAttendance[s.id].remarks : (saved.remarks || '');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(s.name)}</strong> <small style="color:var(--text-muted);">(${s.id})</small></td>
            <td>${escapeHtml(s.role || '-')}</td>
            <td>
                <div class="attendance-badge-group">
                    <button type="button" class="att-btn ${currentStatus === 'Present' ? 'active-present' : ''}" onclick="setStaffAttStatus('${s.id}', 'Present')">Present</button>
                    <button type="button" class="att-btn ${currentStatus === 'Absent' ? 'active-absent' : ''}" onclick="setStaffAttStatus('${s.id}', 'Absent')">Absent</button>
                    <button type="button" class="att-btn ${currentStatus === 'Half Day' ? 'active-halfday' : ''}" onclick="setStaffAttStatus('${s.id}', 'Half Day')">Half Day</button>
                    <button type="button" class="att-btn ${currentStatus === 'Leave' ? 'active-leave' : ''}" onclick="setStaffAttStatus('${s.id}', 'Leave')">Leave</button>
                </div>
            </td>
            <td>
                <input type="number" step="0.5" class="form-control" style="width: 80px;" value="${currentOt}" onchange="setStaffAttOvertime('${s.id}', this.value)">
            </td>
            <td>
                <input type="text" class="form-control" placeholder="Optional notes" value="${escapeHtml(currentRemarks)}" onchange="setStaffAttRemarks('${s.id}', this.value)">
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function setStaffAttStatus(staffId, status) {
    if (!tempDailyAttendance[staffId]) tempDailyAttendance[staffId] = {};
    tempDailyAttendance[staffId].status = status;
    renderManualAttendance();
}

function setStaffAttOvertime(staffId, ot) {
    if (!tempDailyAttendance[staffId]) tempDailyAttendance[staffId] = {};
    tempDailyAttendance[staffId].overtime = Number(ot) || 0;
}

function setStaffAttRemarks(staffId, remarks) {
    if (!tempDailyAttendance[staffId]) tempDailyAttendance[staffId] = {};
    tempDailyAttendance[staffId].remarks = remarks;
}

function markAllPresent() {
    const activeStaff = staffList.filter(s => s.status === 'Active');
    activeStaff.forEach(s => {
        if (!tempDailyAttendance[s.id]) tempDailyAttendance[s.id] = {};
        tempDailyAttendance[s.id].status = 'Present';
    });
    renderManualAttendance();
}

function saveDailyAttendance() {
    const picker = document.getElementById('attendance-date-picker');
    const selectedDate = picker ? picker.value : new Date().toISOString().split('T')[0];
    if (!selectedDate) {
        alert('Please select a date');
        return;
    }

    const activeStaff = staffList.filter(s => s.status === 'Active');
    const records = activeStaff.map(s => {
        const saved = tempDailyAttendance[s.id] || {};
        const existingLog = attendanceLogs.find(l => l.date === selectedDate);
        const existingRec = existingLog && existingLog.records ? existingLog.records.find(r => r.staffId === s.id) : null;

        return {
            staffId: s.id,
            status: saved.status || (existingRec ? existingRec.status : 'Present'),
            overtime: saved.overtime !== undefined ? saved.overtime : (existingRec ? existingRec.overtime : 0),
            remarks: saved.remarks !== undefined ? saved.remarks : (existingRec ? existingRec.remarks : '')
        };
    });

    const index = attendanceLogs.findIndex(l => l.date === selectedDate);
    if (index !== -1) {
        attendanceLogs[index].records = records;
    } else {
        attendanceLogs.push({ date: selectedDate, records });
    }

    localStorage.setItem('mediflow_attendance', JSON.stringify(attendanceLogs));
    syncToCloud('attendance', attendanceLogs);
    tempDailyAttendance = {};
    alert(`Attendance for ${selectedDate} saved successfully!`);
    renderManualAttendance();
}

function renderStaffAdvances() {
    const tableBody = document.getElementById('advances-table-body');
    const filterSelect = document.getElementById('advance-filter-staff');
    if (!tableBody) return;

    // Populate filter select options
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = `<option value="all">All Staff Members</option>`;
        staffList.forEach(s => {
            filterSelect.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
        });
        filterSelect.value = currentVal || 'all';
    }

    const filterStaffId = filterSelect ? filterSelect.value : 'all';
    const filtered = staffAdvances.filter(a => filterStaffId === 'all' || a.staffId === filterStaffId);

    // Compute Totals
    let totalGiven = 0;
    let totalReturned = 0;

    staffAdvances.forEach(a => {
        if (a.type === 'given') totalGiven += Number(a.amount || 0);
        else totalReturned += Number(a.amount || 0);
    });

    if (document.getElementById('advance-stat-given')) document.getElementById('advance-stat-given').textContent = `₹${totalGiven.toFixed(2)}`;
    if (document.getElementById('advance-stat-returned')) document.getElementById('advance-stat-returned').textContent = `₹${totalReturned.toFixed(2)}`;
    if (document.getElementById('advance-stat-net')) document.getElementById('advance-stat-net').textContent = `₹${Math.max(0, totalGiven - totalReturned).toFixed(2)}`;

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No advance transactions recorded</td></tr>`;
        return;
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(a => {
        const staff = staffList.find(s => s.id === a.staffId) || { name: 'Unknown' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.date || '-'}</td>
            <td><strong>${escapeHtml(staff.name)}</strong></td>
            <td>
                <span class="badge-status" style="background:${a.type === 'given' ? '#fee2e2' : '#d1fae5'}; color:${a.type === 'given' ? '#dc2626' : '#065f46'};">
                    ${a.type === 'given' ? 'Advance Given (+)' : 'Return / Deducted (-)'}
                </span>
            </td>
            <td><strong>₹${Number(a.amount || 0).toFixed(2)}</strong></td>
            <td>${escapeHtml(a.paymentMode || 'Cash')}</td>
            <td>${escapeHtml(a.notes || '-')}</td>
            <td>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; color:#dc2626;" onclick="deleteAdvanceRecord('${a.id}')" title="Delete Transaction">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAdvanceModal(staffId = '', type = 'given') {
    const modal = document.getElementById('advance-modal');
    if (!modal) return;
    document.getElementById('advance-form').reset();

    const staffSelect = document.getElementById('advance-staff-id');
    if (staffSelect) {
        staffSelect.innerHTML = '';
        staffList.forEach(s => {
            staffSelect.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)} (${s.id})</option>`;
        });
        if (staffId) staffSelect.value = staffId;
    }

    document.getElementById('advance-type').value = type;
    document.getElementById('advance-date').value = new Date().toISOString().split('T')[0];
    modal.style.display = 'flex';
}

function closeAdvanceModal() {
    const modal = document.getElementById('advance-modal');
    if (modal) modal.style.display = 'none';
}

function saveAdvanceRecord(e) {
    e.preventDefault();
    const staffId = document.getElementById('advance-staff-id').value;
    const type = document.getElementById('advance-type').value;
    const date = document.getElementById('advance-date').value;
    const amount = Number(document.getElementById('advance-amount').value) || 0;
    const paymentMode = document.getElementById('advance-mode').value;
    const notes = document.getElementById('advance-notes').value.trim();

    if (amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const newId = 'ADV' + Date.now();
    staffAdvances.push({ id: newId, staffId, type, date, amount, paymentMode, notes });

    localStorage.setItem('mediflow_staff_advances', JSON.stringify(staffAdvances));
    syncToCloud('staff_advances', staffAdvances);
    closeAdvanceModal();
    renderStaffAdvances();
    renderStaffProfiles();
}

function deleteAdvanceRecord(id) {
    if (!confirm('Are you sure you want to delete this advance record?')) return;
    staffAdvances = staffAdvances.filter(a => a.id !== id);
    localStorage.setItem('mediflow_staff_advances', JSON.stringify(staffAdvances));
    syncToCloud('staff_advances', staffAdvances);
    renderStaffAdvances();
    renderStaffProfiles();
}

function renderPayroll() {
    const monthPicker = document.getElementById('payroll-month-picker');
    if (monthPicker && !monthPicker.value) {
        const now = new Date();
        const yearStr = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        monthPicker.value = `${yearStr}-${monthStr}`;
    }

    const selectedMonth = monthPicker ? monthPicker.value : '';
    const tableBody = document.getElementById('payroll-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (staffList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No staff members available.</td></tr>`;
        return;
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    staffList.forEach(s => {
        // Attendance stats for month
        let presentDays = 0;
        let halfDays = 0;
        let overtimeHours = 0;

        attendanceLogs.forEach(log => {
            if (log.date.startsWith(selectedMonth)) {
                const rec = log.records ? log.records.find(r => r.staffId === s.id) : null;
                if (rec) {
                    if (rec.status === 'Present') presentDays++;
                    else if (rec.status === 'Half Day') halfDays++;
                    overtimeHours += Number(rec.overtime || 0);
                }
            }
        });

        const effectivePresentDays = presentDays + (halfDays * 0.5);
        let grossSalary = 0;
        if (s.salaryType === 'Daily') {
            grossSalary = effectivePresentDays * Number(s.salaryRate || 0);
        } else {
            const dailyRate = Number(s.salaryRate || 0) / (totalDaysInMonth || 30);
            grossSalary = effectivePresentDays > 0 ? dailyRate * effectivePresentDays : Number(s.salaryRate || 0);
        }

        const overtimePay = overtimeHours * 50;
        grossSalary += overtimePay;

        const outstandingAdv = getStaffOutstandingAdvance(s.id);
        const autoAdvanceDeduct = Math.min(outstandingAdv, grossSalary);

        // Check if salary already paid for this month
        const existingPayment = salaryPayments.find(p => p.staffId === s.id && p.monthYear === selectedMonth);
        const netPayable = Math.max(0, grossSalary - autoAdvanceDeduct);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(s.name)}</strong> <br><small style="color:var(--text-muted);">${s.role || ''}</small></td>
            <td>${s.salaryType || 'Monthly'} @ ₹${Number(s.salaryRate || 0).toFixed(2)}</td>
            <td>${effectivePresentDays} / ${totalDaysInMonth} days <br><small style="color:var(--text-muted);">${overtimeHours} hrs OT</small></td>
            <td><strong>₹${grossSalary.toFixed(2)}</strong></td>
            <td style="color:#dc2626;">₹${(existingPayment ? existingPayment.advanceDeducted : autoAdvanceDeduct).toFixed(2)}</td>
            <td style="color:#16a34a;">+₹${(existingPayment ? existingPayment.bonus : 0).toFixed(2)}</td>
            <td style="font-size:1.05rem; font-weight:700; color:var(--primary-color);">
                ₹${(existingPayment ? existingPayment.netPayable : netPayable).toFixed(2)}
            </td>
            <td>
                <span class="badge-status ${existingPayment ? 'badge-paid' : 'badge-unpaid'}">
                    ${existingPayment ? `Paid (₹${existingPayment.amountPaid})` : 'Unpaid'}
                </span>
            </td>
            <td>
                <div style="display:flex; gap:6px;">
                    ${existingPayment ? `
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem;" onclick="printPaySlip('${existingPayment.id}')" title="Print Pay Slip">
                            <i data-lucide="printer"></i> Pay Slip
                        </button>
                    ` : `
                        <button class="btn btn-primary" style="padding:4px 10px; font-size:0.8rem;" onclick="openSalaryPayModal('${s.id}', '${selectedMonth}')">
                            <i data-lucide="credit-card"></i> Pay Salary
                        </button>
                    `}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openSalaryPayModal(staffId, monthYear) {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    const modal = document.getElementById('salary-pay-modal');
    if (!modal) return;

    const [year, month] = monthYear.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    let presentDays = 0;
    let halfDays = 0;
    let overtimeHours = 0;

    attendanceLogs.forEach(log => {
        if (log.date.startsWith(monthYear)) {
            const rec = log.records ? log.records.find(r => r.staffId === staff.id) : null;
            if (rec) {
                if (rec.status === 'Present') presentDays++;
                else if (rec.status === 'Half Day') halfDays++;
                overtimeHours += Number(rec.overtime || 0);
            }
        }
    });

    const effectivePresentDays = presentDays + (halfDays * 0.5);
    let grossSalary = 0;
    if (staff.salaryType === 'Daily') {
        grossSalary = effectivePresentDays * Number(staff.salaryRate || 0);
    } else {
        const dailyRate = Number(staff.salaryRate || 0) / (totalDaysInMonth || 30);
        grossSalary = effectivePresentDays > 0 ? dailyRate * effectivePresentDays : Number(staff.salaryRate || 0);
    }
    grossSalary += overtimeHours * 50;

    const outstandingAdv = getStaffOutstandingAdvance(staff.id);
    const suggestedAdvanceDeduct = Math.min(outstandingAdv, grossSalary);

    document.getElementById('sp-staff-id').value = staff.id;
    document.getElementById('sp-month-year').value = monthYear;
    document.getElementById('sp-staff-details').textContent = `Staff: ${staff.name} (${staff.role || 'Staff'}) | Month: ${monthYear}`;
    document.getElementById('sp-calculation-summary').textContent = `Calculated Gross: ₹${grossSalary.toFixed(2)} | Outstanding Advances Balance: ₹${outstandingAdv.toFixed(2)}`;

    document.getElementById('sp-gross-salary').value = grossSalary.toFixed(2);
    document.getElementById('sp-advance-deduction').value = suggestedAdvanceDeduct.toFixed(2);
    document.getElementById('sp-bonus').value = '0';
    document.getElementById('sp-other-deduction').value = '0';
    document.getElementById('sp-payment-date').value = new Date().toISOString().split('T')[0];

    recalculateNetPayable();
    modal.style.display = 'flex';
}

function recalculateNetPayable() {
    const gross = Number(document.getElementById('sp-gross-salary').value) || 0;
    const advDeduct = Number(document.getElementById('sp-advance-deduction').value) || 0;
    const bonus = Number(document.getElementById('sp-bonus').value) || 0;
    const otherDeduct = Number(document.getElementById('sp-other-deduction').value) || 0;

    const net = Math.max(0, gross - advDeduct + bonus - otherDeduct);
    document.getElementById('sp-net-payable').value = net.toFixed(2);
    document.getElementById('sp-amount-paid').value = net.toFixed(2);
}

function closeSalaryPayModal() {
    const modal = document.getElementById('salary-pay-modal');
    if (modal) modal.style.display = 'none';
}

function processSalaryPayment(e) {
    e.preventDefault();
    const staffId = document.getElementById('sp-staff-id').value;
    const monthYear = document.getElementById('sp-month-year').value;
    const grossSalary = Number(document.getElementById('sp-gross-salary').value) || 0;
    const advanceDeducted = Number(document.getElementById('sp-advance-deduction').value) || 0;
    const bonus = Number(document.getElementById('sp-bonus').value) || 0;
    const otherDeductions = Number(document.getElementById('sp-other-deduction').value) || 0;
    const netPayable = Number(document.getElementById('sp-net-payable').value) || 0;
    const amountPaid = Number(document.getElementById('sp-amount-paid').value) || 0;
    const paymentDate = document.getElementById('sp-payment-date').value;
    const paymentMode = document.getElementById('sp-payment-mode').value;
    const referenceNo = document.getElementById('sp-ref-no').value.trim();
    const remarks = document.getElementById('sp-remarks').value.trim();

    if (amountPaid <= 0) {
        alert('Please enter a valid payout amount');
        return;
    }

    const paymentId = 'PAY' + Date.now();
    const paymentRecord = {
        id: paymentId,
        staffId,
        monthYear,
        grossSalary,
        advanceDeducted,
        bonus,
        otherDeductions,
        netPayable,
        amountPaid,
        paymentDate,
        paymentMode,
        referenceNo,
        remarks,
        paidAt: new Date().toISOString()
    };

    salaryPayments.push(paymentRecord);
    localStorage.setItem('mediflow_salary_payments', JSON.stringify(salaryPayments));

    if (advanceDeducted > 0) {
        staffAdvances.push({
            id: 'ADV_DED_' + Date.now(),
            staffId,
            type: 'returned',
            date: paymentDate,
            amount: advanceDeducted,
            paymentMode: 'Salary Deduction',
            notes: `Auto-deducted during ${monthYear} salary payment`
        });
        localStorage.setItem('mediflow_staff_advances', JSON.stringify(staffAdvances));
        syncToCloud('staff_advances', staffAdvances);
    }

    syncToCloud('salary_payments', salaryPayments);
    closeSalaryPayModal();
    alert('Salary payment recorded successfully!');
    renderPayroll();
    printPaySlip(paymentId);
}

function printPaySlip(paymentId) {
    const payment = salaryPayments.find(p => p.id === paymentId);
    if (!payment) return;

    const staff = staffList.find(s => s.id === payment.staffId) || { name: 'Staff Member', role: 'Employee', phone: '' };
    const shopName = settings.shopName || 'T7 BillPro';
    const shopAddress = settings.shopAddress || '';
    const shopPhone = settings.shopPhone || '';

    const container = document.getElementById('payslip-printable-content');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 1rem; margin-bottom: 1rem;">
            <h2 style="margin: 0; color: #2563eb;">${escapeHtml(shopName)}</h2>
            <p style="margin: 2px 0; font-size: 0.85rem; color: #555;">${escapeHtml(shopAddress)}</p>
            <p style="margin: 2px 0; font-size: 0.85rem; color: #555;">Phone: ${escapeHtml(shopPhone)}</p>
            <h3 style="margin-top: 10px; margin-bottom: 0; background: #f1f5f9; display: inline-block; padding: 4px 16px; border-radius: 4px;">SALARY PAY SLIP - ${payment.monthYear}</h3>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.9rem;">
            <div>
                <strong>Staff Details:</strong><br>
                Name: ${escapeHtml(staff.name)}<br>
                Designation: ${escapeHtml(staff.role || 'Staff')}<br>
                Phone: ${escapeHtml(staff.phone || '-')}
            </div>
            <div style="text-align: right;">
                <strong>Payment Ref:</strong> ${payment.id}<br>
                <strong>Date:</strong> ${payment.paymentDate}<br>
                <strong>Payment Mode:</strong> ${payment.paymentMode} ${payment.referenceNo ? `(${payment.referenceNo})` : ''}
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.9rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                    <th style="padding: 8px;">Description</th>
                    <th style="padding: 8px; text-align: right;">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">Gross Calculated Salary</td>
                    <td style="padding: 8px; text-align: right;">₹${Number(payment.grossSalary).toFixed(2)}</td>
                </tr>
                ${payment.advanceDeducted > 0 ? `
                <tr style="border-bottom: 1px solid #eee; color: #dc2626;">
                    <td style="padding: 8px;">Less: Advance Deduction</td>
                    <td style="padding: 8px; text-align: right;">-₹${Number(payment.advanceDeducted).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${payment.bonus > 0 ? `
                <tr style="border-bottom: 1px solid #eee; color: #16a34a;">
                    <td style="padding: 8px;">Add: Bonus / Incentive</td>
                    <td style="padding: 8px; text-align: right;">+₹${Number(payment.bonus).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${payment.otherDeductions > 0 ? `
                <tr style="border-bottom: 1px solid #eee; color: #dc2626;">
                    <td style="padding: 8px;">Less: Other Deductions</td>
                    <td style="padding: 8px; text-align: right;">-₹${Number(payment.otherDeductions).toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #333; font-weight: bold; font-size: 1rem;">
                    <td style="padding: 10px 8px;">Net Paid Salary</td>
                    <td style="padding: 10px 8px; text-align: right; color: #2563eb;">₹${Number(payment.amountPaid).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        ${payment.remarks ? `<p style="font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;"><strong>Remarks:</strong> ${escapeHtml(payment.remarks)}</p>` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 3rem; font-size: 0.85rem;">
            <div>_____________________<br>Employer Signature</div>
            <div>_____________________<br>Staff Signature</div>
        </div>
    `;

    const modal = document.getElementById('payslip-modal');
    if (modal) modal.style.display = 'flex';
}

function closePaySlipModal() {
    const modal = document.getElementById('payslip-modal');
    if (modal) modal.style.display = 'none';
}

function triggerPrintPaySlip() {
    window.print();
}

window.switchStaffSubTab = switchStaffSubTab;
window.renderStaffManagement = renderStaffManagement;
window.renderStaffProfiles = renderStaffProfiles;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;
window.saveStaff = saveStaff;
window.deleteStaff = deleteStaff;
window.renderManualAttendance = renderManualAttendance;
window.setStaffAttStatus = setStaffAttStatus;
window.setStaffAttOvertime = setStaffAttOvertime;
window.setStaffAttRemarks = setStaffAttRemarks;
window.markAllPresent = markAllPresent;
window.saveDailyAttendance = saveDailyAttendance;
window.renderStaffAdvances = renderStaffAdvances;
window.openAdvanceModal = openAdvanceModal;
window.closeAdvanceModal = closeAdvanceModal;
window.saveAdvanceRecord = saveAdvanceRecord;
window.deleteAdvanceRecord = deleteAdvanceRecord;
window.renderPayroll = renderPayroll;
window.openSalaryPayModal = openSalaryPayModal;
window.recalculateNetPayable = recalculateNetPayable;
window.closeSalaryPayModal = closeSalaryPayModal;
window.processSalaryPayment = processSalaryPayment;
window.printPaySlip = printPaySlip;
window.closePaySlipModal = closePaySlipModal;
window.triggerPrintPaySlip = triggerPrintPaySlip;

// --- Customer Digital Menu View & Ordering ---
let isCustomerViewActive = false;

function enableCustomerMenuView() {
    isCustomerViewActive = true;
    document.body.classList.add('customer-mode');
    
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.classList.add('active-app');
    }

    loadBranchData();

    // Populate customer header with shop info
    if (document.getElementById('cust-shop-name')) {
        document.getElementById('cust-shop-name').textContent = settings.shopName || 'T7 BillPro';
    }
    if (document.getElementById('cust-shop-phone')) {
        document.getElementById('cust-shop-phone').textContent = settings.shopAddress ? `${settings.shopAddress} | ${settings.shopPhone || ''}` : (settings.shopPhone || 'Digital Catalog & Menu');
    }

    switchSection('menu-card');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAdminLoginFromCustomerView() {
    document.body.classList.remove('customer-mode');
    sessionStorage.removeItem('mediflow_logged_in');
    sessionStorage.removeItem('mediflow_user');
    window.location.hash = '';
    window.location.reload();
}

function openMenuOrderCheckoutModal() {
    if (!cart || cart.length === 0) {
        alert('Your digital cart is empty. Please add items to place an order.');
        return;
    }

    const modal = document.getElementById('menu-checkout-modal');
    if (!modal) return;

    const totalQty = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.salePrice || item.mrp || 0)), 0);

    if (document.getElementById('checkout-item-count')) document.getElementById('checkout-item-count').textContent = totalQty;
    if (document.getElementById('checkout-total-amount')) document.getElementById('checkout-total-amount').textContent = totalPrice.toFixed(2);

    modal.style.display = 'flex';
}

function closeMenuOrderCheckoutModal() {
    const modal = document.getElementById('menu-checkout-modal');
    if (modal) modal.style.display = 'none';
}

function submitCustomerDigitalOrder(e) {
    e.preventDefault();
    if (!cart || cart.length === 0) {
        alert('Cart is empty.');
        return;
    }

    const name = document.getElementById('cust-order-name').value.trim();
    const phone = document.getElementById('cust-order-phone').value.trim();
    const orderType = document.getElementById('cust-order-type').value;
    const notes = document.getElementById('cust-order-notes').value.trim();

    const orderRef = 'ORD' + String(Date.now()).slice(-6);
    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.salePrice || item.mrp || 0)), 0);

    const digitalOrder = {
        id: orderRef,
        date: new Date().toISOString(),
        customerName: name,
        customerPhone: phone,
        orderType: orderType,
        notes: notes,
        items: [...cart],
        totalAmount: totalPrice,
        status: 'Pending',
        createdAt: new Date().toLocaleString()
    };

    let digitalOrders = JSON.parse(localStorage.getItem('mediflow_digital_orders')) || [];
    digitalOrders.unshift(digitalOrder);
    localStorage.setItem('mediflow_digital_orders', JSON.stringify(digitalOrders));
    syncToCloud('digital_orders', digitalOrders);

    closeMenuOrderCheckoutModal();

    if (document.getElementById('success-order-ref')) document.getElementById('success-order-ref').textContent = orderRef;
    const successModal = document.getElementById('menu-order-success-modal');
    if (successModal) successModal.style.display = 'flex';

    cart = [];
    if (typeof updateMenuOrderDrawer === 'function') updateMenuOrderDrawer();
    if (typeof renderMenuCard === 'function') renderMenuCard();
}

function closeMenuOrderSuccessModal() {
    const modal = document.getElementById('menu-order-success-modal');
    if (modal) modal.style.display = 'none';
}

window.addEventListener('hashchange', () => {
    if ((window.location.hash === '#menu-card' || window.location.hash === '#menu') && sessionStorage.getItem('mediflow_logged_in') !== 'true') {
        enableCustomerMenuView();
    }
});

window.enableCustomerMenuView = enableCustomerMenuView;
window.openAdminLoginFromCustomerView = openAdminLoginFromCustomerView;
window.openMenuOrderCheckoutModal = openMenuOrderCheckoutModal;
window.closeMenuOrderCheckoutModal = closeMenuOrderCheckoutModal;
window.submitCustomerDigitalOrder = submitCustomerDigitalOrder;
window.closeMenuOrderSuccessModal = closeMenuOrderSuccessModal;

// --- KOT (Kitchen Order Ticket) Feature ---
function loadSettingsFields() {
    if (document.getElementById('set-shop-name')) document.getElementById('set-shop-name').value = settings.shopName || '';
    if (document.getElementById('set-shop-address')) document.getElementById('set-shop-address').value = settings.shopAddress || '';
    if (document.getElementById('set-shop-phone')) document.getElementById('set-shop-phone').value = settings.shopPhone || '';
    if (document.getElementById('set-shop-gstin')) document.getElementById('set-shop-gstin').value = settings.shopGstin || '';
    if (document.getElementById('set-shop-logo')) document.getElementById('set-shop-logo').value = settings.shopLogo || '';
    if (document.getElementById('set-shop-upi')) document.getElementById('set-shop-upi').value = settings.shopUpi || '';
    if (document.getElementById('set-printer-type')) document.getElementById('set-printer-type').value = settings.printerType || '3inch';
    if (document.getElementById('set-printer-name')) document.getElementById('set-printer-name').value = settings.printerName || 'Default System Printer';
    if (document.getElementById('set-print-copies')) document.getElementById('set-print-copies').value = settings.printCopies || 1;
    if (document.getElementById('set-gst-default')) document.getElementById('set-gst-default').checked = (settings.gstDefault !== false);
    if (document.getElementById('set-kot-enabled')) document.getElementById('set-kot-enabled').checked = (settings.kotEnabled !== false);
    if (document.getElementById('set-enable-waiter')) document.getElementById('set-enable-waiter').checked = !!settings.enableWaiterSelect;
    if (document.getElementById('set-enable-doctor')) document.getElementById('set-enable-doctor').checked = !!settings.enableDoctorSelect;
    if (document.getElementById('set-enable-table-mgmt')) document.getElementById('set-enable-table-mgmt').checked = !!settings.enableTableMgmt;
    if (document.getElementById('set-currency')) document.getElementById('set-currency').value = settings.currency || '₹';

    const kotBtn = document.getElementById('print-kot-btn');
    if (kotBtn) kotBtn.style.display = (settings.kotEnabled !== false) ? 'inline-flex' : 'none';

    if (typeof renderSuperAdminSettingsPermissions === 'function') renderSuperAdminSettingsPermissions();
    if (typeof applyBranchSettingsPermissions === 'function') applyBranchSettingsPermissions();
}

function printKOT() {
    if (!cart || cart.length === 0) {
        alert('Cart is empty. Please add items to print Kitchen Order Ticket (KOT).');
        return;
    }

    const shopName = settings.shopName || 'T7 BillPro';
    const invoiceNo = document.getElementById('invoice-number')?.value || ('KOT-' + String(Date.now()).slice(-4));
    const custName = document.getElementById('customer-name')?.value || 'Walk-in Customer';
    const custPhone = document.getElementById('customer-phone')?.value || '';
    const nowStr = new Date().toLocaleString();
    const copies = Math.max(1, Number(settings.printCopies || 1));
    const printerName = settings.printerName || 'Default System Printer';

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Please allow popups to print KOT.');
        return;
    }

    let itemsHtml = '';
    cart.forEach((item, index) => {
        itemsHtml += `
            <tr style="border-bottom: 1px dashed #cbd5e1;">
                <td style="padding: 6px 0; font-size: 1rem;">${index + 1}. <strong>${escapeHtml(item.name)}</strong></td>
                <td style="padding: 6px 0; text-align: right; font-size: 1.1rem; font-weight: bold;">${item.quantity || 1}</td>
            </tr>
        `;
    });

    let ticketsHtml = '';
    const copyLabels = ['KITCHEN COPY', 'PANTRY COPY', 'COUNTER COPY', 'EXTRA COPY'];

    for (let i = 0; i < copies; i++) {
        const copyTag = copyLabels[i] || `COPY ${i + 1}`;
        ticketsHtml += `
            <div class="kot-ticket" style="${i > 0 ? 'page-break-before: always; margin-top: 20px;' : ''}">
                <div class="header">
                    <h2>KITCHEN ORDER TICKET</h2>
                    <h3>${escapeHtml(shopName)}</h3>
                    <div style="font-size: 0.8rem; font-weight: bold; background: #000; color: #fff; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-top: 4px;">${copyTag} (${i + 1}/${copies})</div>
                </div>
                <div class="meta">
                    <div><strong>Ref / Token:</strong> ${escapeHtml(invoiceNo)}</div>
                    <div><strong>Date & Time:</strong> ${nowStr}</div>
                    <div><strong>Customer / Table:</strong> ${escapeHtml(custName)} ${custPhone ? `(${custPhone})` : ''}</div>
                    ${printerName ? `<div style="font-size: 0.75rem; color: #555;">Target Printer: ${escapeHtml(printerName)}</div>` : ''}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ITEM NAME</th>
                            <th style="text-align: right;">QTY</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="footer">
                    *** ${copyTag} ***
                </div>
            </div>
        `;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>KOT - ${invoiceNo} (${copies} Copies)</title>
            <style>
                body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 12px; color: #000; width: 280px; }
                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                .header h2 { margin: 0; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 1px; }
                .header h3 { margin: 4px 0 0 0; font-size: 0.95rem; color: #333; }
                .meta { font-size: 0.85rem; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 0.85rem; }
                .footer { text-align: center; border-top: 2px dashed #000; padding-top: 8px; font-size: 0.85rem; font-weight: bold; }
                @media print {
                    .kot-ticket { page-break-after: always; }
                    .kot-ticket:last-child { page-break-after: avoid; }
                }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${ticketsHtml}
        </body>
        </html>
    `);
    printWin.document.close();
}

window.loadSettingsFields = loadSettingsFields;
window.printKOT = printKOT;

// --- Product Deduplication & Smart Import ---

function removeDuplicateProducts() {
    if (!products || products.length === 0) {
        alert('Product list is empty.');
        return;
    }

    const initialCount = products.length;
    const nameMap = {};
    const deduplicatedProducts = [];
    let mergedCount = 0;

    products.forEach(p => {
        const normName = (p.name || '').trim().toLowerCase();
        if (!normName) return;

        if (nameMap[normName]) {
            // Duplicate found! Add stock to existing product
            const existing = nameMap[normName];
            existing.stock = Number(existing.stock || 0) + Number(p.stock || 0);

            // Update prices if duplicate has higher/newer price
            if (Number(p.mrp || 0) > Number(existing.mrp || 0)) existing.mrp = p.mrp;
            if (Number(p.salePrice || 0) > Number(existing.salePrice || 0)) existing.salePrice = p.salePrice;
            if (!existing.hsn && p.hsn) existing.hsn = p.hsn;
            if (!existing.batch && p.batch) existing.batch = p.batch;
            if (!existing.expiry && p.expiry) existing.expiry = p.expiry;

            mergedCount++;
        } else {
            // First occurrence: store copy
            const copy = { ...p, stock: Number(p.stock || 0) };
            nameMap[normName] = copy;
            deduplicatedProducts.push(copy);
        }
    });

    if (mergedCount === 0) {
        alert('No duplicate products found.');
        return;
    }

    products = deduplicatedProducts;
    localStorage.setItem('mediflow_products', JSON.stringify(products));
    syncToCloud('products', products);

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderProductDropdown === 'function') renderProductDropdown();

    alert(`Successfully merged ${mergedCount} duplicate product entry(s)!\n\n- Original Total Items: ${initialCount}\n- New Clean Items: ${products.length}`);
}

function handleProductImportFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            let importedItems = [];

            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    importedItems = parsed;
                } else if (parsed.data && Array.isArray(parsed.data.mediflow_products)) {
                    importedItems = parsed.data.mediflow_products;
                } else if (parsed.products && Array.isArray(parsed.products)) {
                    importedItems = parsed.products;
                }
            } else if (file.name.endsWith('.csv')) {
                importedItems = parseProductsCSV(content);
            }

            if (!importedItems || importedItems.length === 0) {
                alert('No valid product data found in the selected file.');
                return;
            }

            let updatedExistingCount = 0;
            let addedNewCount = 0;

            importedItems.forEach(item => {
                const name = (item.name || item.Name || item.product_name || '').trim();
                if (!name) return;

                const normName = name.toLowerCase();
                const existing = products.find(p => (p.name || '').trim().toLowerCase() === normName || (item.id && p.id === item.id));

                const impQty = Number(item.stock !== undefined ? item.stock : (item.Quantity || item.qty || item.quantity || 0));
                const impMrp = Number(item.mrp !== undefined ? item.mrp : (item.MRP || item.price || 0));
                const impSalePrice = Number(item.salePrice !== undefined ? item.salePrice : (item.SalePrice || item.sale_price || item.mrp || 0));
                const impCategory = item.category || item.Category || 'Other';
                const impUnit = item.unit || item.Unit || 'Pcs';
                const impHsn = item.hsn || item.HSN || '';
                const impBatch = item.batch || item.Batch || '';
                const impExpiry = item.expiry || item.Expiry || '';
                const impGst = Number(item.gst !== undefined ? item.gst : (item.GST || 12));

                if (existing) {
                    // Update existing: ADD quantity to current stock
                    existing.stock = Number(existing.stock || 0) + impQty;
                    if (impMrp > 0) existing.mrp = impMrp;
                    if (impSalePrice > 0) existing.salePrice = impSalePrice;
                    if (impHsn) existing.hsn = impHsn;
                    if (impBatch) existing.batch = impBatch;
                    if (impExpiry) existing.expiry = impExpiry;
                    updatedExistingCount++;
                } else {
                    // Add new product
                    const newId = item.id || ('P' + String(products.length + 1).padStart(2, '0'));
                    products.push({
                        id: newId,
                        name: name,
                        category: impCategory,
                        unit: impUnit,
                        hsn: impHsn,
                        batch: impBatch,
                        expiry: impExpiry,
                        mrp: impMrp,
                        salePrice: impSalePrice,
                        stock: impQty,
                        gst: impGst
                    });
                    addedNewCount++;
                }
            });

            localStorage.setItem('mediflow_products', JSON.stringify(products));
            syncToCloud('products', products);

            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderProductDropdown === 'function') renderProductDropdown();

            alert(`Product Import Complete!\n\n- Updated Existing Products (Added Stock): ${updatedExistingCount}\n- New Products Added: ${addedNewCount}\n- Total Active Inventory: ${products.length} items`);
        } catch (err) {
            console.error(err);
            alert('Failed to import file. Please check file format and try again.');
        }
    };

    reader.readAsText(file);
}

function parseProductsCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length < 1 || !values[0]) continue;

        const rowObj = {};
        headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
        });

        items.push({
            name: rowObj['name'] || rowObj['product name'] || rowObj['item'] || values[0],
            category: rowObj['category'] || values[1] || 'Other',
            unit: rowObj['unit'] || values[2] || 'Pcs',
            hsn: rowObj['hsn'] || values[3] || '',
            batch: rowObj['batch'] || values[4] || '',
            expiry: rowObj['expiry'] || values[5] || '',
            mrp: Number(rowObj['mrp'] || values[6] || 0),
            salePrice: Number(rowObj['saleprice'] || rowObj['sale price'] || values[7] || rowObj['mrp'] || 0),
            stock: Number(rowObj['stock'] || rowObj['qty'] || values[8] || 0),
            gst: Number(rowObj['gst'] || values[9] || 12)
        });
    }

    return items;
}

window.removeDuplicateProducts = removeDuplicateProducts;
window.handleProductImportFile = handleProductImportFile;
window.parseProductsCSV = parseProductsCSV;

// --- Product Barcode Label Printing Module ---

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

let selectedBarcodeProductId = null;

function renderBarcodeProductOptions() {
    const select = document.getElementById('lbl-product-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">Select a Product...</option>';

    if (!products || products.length === 0) return;

    const sorted = [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} | Stock: ${p.stock || 0} | ₹${p.salePrice || p.mrp || 0}`;
        if (p.id === currentVal) opt.selected = true;
        select.appendChild(opt);
    });

    if (settings && settings.printerName && document.getElementById('lbl-printer-path')) {
        if (!document.getElementById('lbl-printer-path').value) {
            document.getElementById('lbl-printer-path').value = settings.printerName || '';
        }
    }
}

function onBarcodeProductSelect() {
    const select = document.getElementById('lbl-product-select');
    if (!select) return;

    selectedBarcodeProductId = select.value;
    const prod = products.find(p => p.id === selectedBarcodeProductId);
    if (prod && prod.stock > 0) {
        document.getElementById('lbl-quantity').value = Math.min(Math.max(1, prod.stock), 100);
    }
    renderBarcodeLabelsPreview();
}

function useCurrentProductStockQty() {
    const select = document.getElementById('lbl-product-select');
    if (!select || !select.value) {
        alert('Please select a product first.');
        return;
    }
    const prod = products.find(p => p.id === select.value);
    if (prod) {
        document.getElementById('lbl-quantity').value = Math.max(1, Number(prod.stock || 1));
        renderBarcodeLabelsPreview();
    }
}

function renderBarcodeLabelsPreview() {
    const container = document.getElementById('barcode-stickers-container');
    const countSpan = document.getElementById('lbl-preview-count');
    if (!container) return;

    const productId = document.getElementById('lbl-product-select')?.value;
    const prod = products.find(p => p.id === productId);

    if (!prod) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">Please select a product from the left menu to preview barcode stickers.</div>';
        if (countSpan) countSpan.textContent = '0 Stickers';
        return;
    }

    const qty = Math.min(Math.max(1, Number(document.getElementById('lbl-quantity')?.value || 1)), 500);
    const size = document.getElementById('lbl-size')?.value || '50x25';
    const showLogo = document.getElementById('lbl-show-logo')?.checked !== false;
    const showShop = document.getElementById('lbl-show-shop')?.checked !== false;
    const showName = document.getElementById('lbl-show-name')?.checked !== false;
    const showPrice = document.getElementById('lbl-show-price')?.checked !== false;
    const showExpiry = document.getElementById('lbl-show-expiry')?.checked !== false;
    const showBarcode = document.getElementById('lbl-show-barcode')?.checked !== false;
    const shopName = settings.shopName || 'T7 BillPro';
    const shopLogo = settings.shopLogo || '';

    if (countSpan) countSpan.textContent = `${qty} Sticker(s) Preview (${size})`;

    let stickersHtml = '';
    const codeVal = prod.id || ('PROD-' + prod.name.replace(/\s+/g, '').toUpperCase());
    const barSvg = generateCode128Svg(codeVal);

    for (let i = 0; i < Math.min(qty, 36); i++) {
        stickersHtml += `
            <div class="barcode-sticker-card" style="width: 220px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: #000;">
                ${(showLogo && shopLogo) ? `<div style="text-align: center; margin-bottom: 2px;"><img src="${shopLogo}" style="max-height: 18px; max-width: 60px; object-fit: contain;"></div>` : ''}
                ${showShop ? `<div style="font-size: 0.7rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 2px;">${escapeHtml(shopName)}</div>` : ''}
                ${showName ? `<div style="font-size: 0.85rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 3px;">${escapeHtml(prod.name)}</div>` : ''}
                
                ${showPrice ? `
                    <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 3px;">
                        Sale: ₹${prod.salePrice || prod.mrp || 0} ${prod.mrp ? `<span style="font-weight: normal; text-decoration: line-through; color: #64748b; font-size: 0.72rem;">MRP: ₹${prod.mrp}</span>` : ''}
                    </div>
                ` : ''}

                ${showExpiry && (prod.batch || prod.expiry) ? `
                    <div style="font-size: 0.68rem; color: #334155; margin-bottom: 3px;">
                        ${prod.batch ? `B.No: ${escapeHtml(prod.batch)}` : ''} ${prod.expiry ? `Exp: ${escapeHtml(prod.expiry)}` : ''}
                    </div>
                ` : ''}

                ${showBarcode ? `
                    <div style="margin: 4px 0 2px 0;">
                        ${barSvg}
                        <div style="font-size: 0.65rem; font-family: monospace; letter-spacing: 1px; color: #000; font-weight: bold;">*${escapeHtml(codeVal)}*</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    if (qty > 36) {
        stickersHtml += `<div style="width: 100%; text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 8px;">... and ${qty - 36} more stickers ready for printing.</div>`;
    }

    container.innerHTML = stickersHtml;
}

function generateCode128Svg(text) {
    let barsHtml = '';
    let x = 10;
    
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const w1 = (charCode % 3) + 1;
        const w2 = ((charCode * 2) % 3) + 1;
        
        barsHtml += `<rect x="${x}" y="0" width="${w1}" height="28" fill="#000" />`;
        x += w1 + w2;
    }
    
    barsHtml += `<rect x="${x}" y="0" width="3" height="28" fill="#000" />`;
    x += 5;

    return `<svg width="100%" height="28" viewBox="0 0 ${Math.max(x, 140)} 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${barsHtml}</svg>`;
}

function printBarcodeLabels() {
    const productId = document.getElementById('lbl-product-select')?.value;
    const prod = products.find(p => p.id === productId);

    if (!prod) {
        alert('Please select a product to print barcode labels.');
        return;
    }

    const qty = Math.max(1, Number(document.getElementById('lbl-quantity')?.value || 1));
    const size = document.getElementById('lbl-size')?.value || '50x25';
    const printerPath = document.getElementById('lbl-printer-path')?.value || settings.printerName || 'Default System Printer';
    const showLogo = document.getElementById('lbl-show-logo')?.checked !== false;
    const showShop = document.getElementById('lbl-show-shop')?.checked !== false;
    const showName = document.getElementById('lbl-show-name')?.checked !== false;
    const showPrice = document.getElementById('lbl-show-price')?.checked !== false;
    const showExpiry = document.getElementById('lbl-show-expiry')?.checked !== false;
    const showBarcode = document.getElementById('lbl-show-barcode')?.checked !== false;
    const shopName = settings.shopName || 'T7 BillPro';
    const shopLogo = settings.shopLogo || '';
    const codeVal = prod.id || ('PROD-' + prod.name.replace(/\s+/g, '').toUpperCase());
    const barSvg = generateCode128Svg(codeVal);

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Please allow popups to print barcode labels.');
        return;
    }

    let stickerWidth = '33mm';
    let stickerHeight = '33.5mm';
    let pageSize = '102mm 34mm';
    let containerCss = 'display: grid; grid-template-columns: repeat(3, 33mm); column-gap: 1.5mm; row-gap: 1.5mm; width: 102mm; margin: 0 auto;';

    if (size === '33x34_3up') {
        stickerWidth = '33mm';
        stickerHeight = '33.5mm';
        pageSize = '102mm 34mm';
        containerCss = 'display: grid; grid-template-columns: repeat(3, 33mm); column-gap: 1.5mm; row-gap: 1.5mm; width: 102mm; margin: 0 auto;';
    } else if (size === '102x34') {
        stickerWidth = '100mm';
        stickerHeight = '33.5mm';
        pageSize = '102mm 34mm';
        containerCss = 'display: flex; flex-direction: column; gap: 2mm; width: 102mm; margin: 0 auto;';
    } else if (size === '38x25') {
        stickerWidth = '36mm';
        stickerHeight = '23mm';
        pageSize = 'auto';
        containerCss = 'display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start;';
    } else if (size === '40x30') {
        stickerWidth = '38mm';
        stickerHeight = '28mm';
        pageSize = 'auto';
        containerCss = 'display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start;';
    } else if (size === '3inch') {
        stickerWidth = '76mm';
        stickerHeight = '30mm';
        pageSize = '80mm auto';
        containerCss = 'display: flex; flex-direction: column; gap: 2mm; width: 78mm; margin: 0 auto;';
    } else {
        stickerWidth = '48mm';
        stickerHeight = '23mm';
        pageSize = 'auto';
        containerCss = 'display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start;';
    }

    let stickersHtml = '';
    for (let i = 0; i < qty; i++) {
        stickersHtml += `
            <div class="sticker-box">
                ${(showLogo && shopLogo) ? `<div style="text-align: center; margin-bottom: 1px;"><img src="${shopLogo}" style="max-height: 14px; max-width: 50px; object-fit: contain;"></div>` : ''}
                ${showShop ? `<div class="shop-title">${escapeHtml(shopName)}</div>` : ''}
                ${showName ? `<div class="prod-title">${escapeHtml(prod.name)}</div>` : ''}
                ${showPrice ? `<div class="price-line">Price: <strong>₹${prod.salePrice || prod.mrp || 0}</strong> ${prod.mrp ? `<span class="mrp">MRP: ₹${prod.mrp}</span>` : ''}</div>` : ''}
                ${showExpiry && (prod.batch || prod.expiry) ? `<div class="exp-line">${prod.batch ? `B:${escapeHtml(prod.batch)}` : ''} ${prod.expiry ? `E:${escapeHtml(prod.expiry)}` : ''}</div>` : ''}
                ${showBarcode ? `
                    <div class="barcode-wrapper">
                        ${barSvg}
                        <div class="code-str">*${escapeHtml(codeVal)}*</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Barcode Labels - ${escapeHtml(prod.name)} (${qty} Stickers)</title>
            <style>
                @page { margin: 1mm; size: ${pageSize}; }
                body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 2mm; color: #000; background: #fff; }
                .printer-info { font-size: 0.75rem; color: #64748b; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
                .stickers-wrapper { ${containerCss} }
                .sticker-box {
                    width: ${stickerWidth};
                    height: ${stickerHeight};
                    box-sizing: border-box;
                    border: 1px solid #94a3b8;
                    border-radius: 4px;
                    padding: 2mm;
                    text-align: center;
                    overflow: hidden;
                    page-break-inside: avoid;
                    background: #fff;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .shop-title { font-size: 6.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.1; color: #334155; }
                .prod-title { font-size: 7.5pt; font-weight: bold; line-height: 1.1; max-height: 2.2em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
                .price-line { font-size: 7pt; margin-top: 1px; }
                .price-line .mrp { font-size: 6pt; text-decoration: line-through; color: #64748b; }
                .exp-line { font-size: 6pt; color: #334155; }
                .barcode-wrapper { width: 100%; margin-top: 2px; text-align: center; }
                .code-str { font-size: 5.5pt; font-family: monospace; font-weight: bold; }
                @media print {
                    .printer-info { display: none; }
                    .sticker-box { border: 1px solid #cbd5e1; }
                }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="printer-info">
                Target Label Printer: <strong>${escapeHtml(printerPath)}</strong> | Size: ${size} | Total Stickers: ${qty}
            </div>
            <div class="stickers-wrapper">
                ${stickersHtml}
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
}

window.renderBarcodeProductOptions = renderBarcodeProductOptions;
window.onBarcodeProductSelect = onBarcodeProductSelect;
window.useCurrentProductStockQty = useCurrentProductStockQty;
window.renderBarcodeLabelsPreview = renderBarcodeLabelsPreview;
window.generateCode128Svg = generateCode128Svg;
window.printBarcodeLabels = printBarcodeLabels;

// --- Waiter & Doctor Billing Options & Sales Reports ---

function renderBillingWaiterOptions() {
    const select = document.getElementById('billing-waiter-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">Select Waiter / Staff (Optional)</option>';

    const activeStaff = (staffList || []).filter(s => 
        (s.status || 'Active').toLowerCase() === 'active' && 
        (!s.branchId || s.branchId === currentBranchId)
    );
    activeStaff.forEach(stf => {
        const opt = document.createElement('option');
        opt.value = stf.name;
        opt.textContent = `${stf.name} (${stf.role || 'Staff'})`;
        if (stf.name === currentVal) opt.selected = true;
        select.appendChild(opt);
    });
}

function renderBillingDoctorOptions() {
    const datalist = document.getElementById('doctor-suggestions-list');
    if (!datalist) return;

    datalist.innerHTML = '';
    const doctorSet = new Set();

    (sales || []).forEach(s => {
        if (s.doctorName && s.doctorName.trim()) {
            doctorSet.add(s.doctorName.trim());
        }
    });

    doctorSet.forEach(docName => {
        const opt = document.createElement('option');
        opt.value = docName;
        datalist.appendChild(opt);
    });
}

function generateReport() {
    const reportType = document.getElementById('report-type')?.value || 'stock';
    const startDateVal = document.getElementById('report-start')?.value;
    const endDateVal = document.getElementById('report-end')?.value;

    const tableTitle = document.getElementById('report-table-title');
    const tableHead = document.getElementById('report-table-head');
    const tableBody = document.querySelector('#report-table tbody');

    if (!tableHead || !tableBody) return;

    let filteredSales = [...(sales || [])];
    if (startDateVal) {
        filteredSales = filteredSales.filter(s => s.date && new Date(s.date) >= new Date(startDateVal));
    }
    if (endDateVal) {
        const end = new Date(endDateVal);
        end.setHours(23, 59, 59, 999);
        filteredSales = filteredSales.filter(s => s.date && new Date(s.date) <= end);
    }

    if (reportType === 'waiter_sales' || reportType === 'waiter-sales') {
        if (tableTitle) tableTitle.textContent = 'Waiter-wise Sales Report';
        
        const waiterMap = {};
        filteredSales.forEach(sale => {
            const waiter = sale.waiterName || 'Unassigned / Counter';
            if (!waiterMap[waiter]) {
                waiterMap[waiter] = { waiterName: waiter, ordersCount: 0, itemsCount: 0, totalRevenue: 0 };
            }
            waiterMap[waiter].ordersCount += 1;
            waiterMap[waiter].itemsCount += (sale.items ? sale.items.reduce((sum, i) => sum + Math.abs(i.qty || 1), 0) : 0);
            waiterMap[waiter].totalRevenue += Number(sale.grandTotal || 0);
        });

        tableHead.innerHTML = `
            <tr>
                <th>Waiter / Staff Name</th>
                <th style="text-align: center;">Total Bills</th>
                <th style="text-align: center;">Total Items Sold</th>
                <th style="text-align: right;">Total Revenue (${settings.currency || '₹'})</th>
            </tr>
        `;

        const summaryList = Object.values(waiterMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (summaryList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No waiter sales recorded in selected date range.</td></tr>`;
        } else {
            let grandOrders = 0, grandItems = 0, grandRev = 0;
            tableBody.innerHTML = summaryList.map(w => {
                grandOrders += w.ordersCount;
                grandItems += w.itemsCount;
                grandRev += w.totalRevenue;
                return `
                    <tr>
                        <td><strong>${escapeHtml(w.waiterName)}</strong></td>
                        <td style="text-align: center;">${w.ordersCount}</td>
                        <td style="text-align: center;">${w.itemsCount}</td>
                        <td style="text-align: right; font-weight: bold; color: var(--success-color);">${settings.currency || '₹'}${w.totalRevenue.toFixed(2)}</td>
                    </tr>
                `;
            }).join('') + `
                <tr style="background: var(--primary-light); font-weight: bold;">
                    <td>TOTAL OVERALL SUMMARY</td>
                    <td style="text-align: center;">${grandOrders}</td>
                    <td style="text-align: center;">${grandItems}</td>
                    <td style="text-align: right; color: var(--primary-color);">${settings.currency || '₹'}${grandRev.toFixed(2)}</td>
                </tr>
            `;
        }
        return;
    }

    if (reportType === 'doctor_sales' || reportType === 'doctor-sales') {
        if (tableTitle) tableTitle.textContent = 'Doctor-wise Sales Report';

        const doctorMap = {};
        filteredSales.forEach(sale => {
            const doctor = sale.doctorName || 'Self / Direct Sale';
            if (!doctorMap[doctor]) {
                doctorMap[doctor] = { doctorName: doctor, prescriptionCount: 0, totalRevenue: 0 };
            }
            doctorMap[doctor].prescriptionCount += 1;
            doctorMap[doctor].totalRevenue += Number(sale.grandTotal || 0);
        });

        tableHead.innerHTML = `
            <tr>
                <th>Doctor / Prescriber Name</th>
                <th style="text-align: center;">Prescription Bills</th>
                <th style="text-align: right;">Total Sales Revenue (${settings.currency || '₹'})</th>
            </tr>
        `;

        const summaryList = Object.values(doctorMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (summaryList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">No doctor sales recorded in selected date range.</td></tr>`;
        } else {
            let grandRx = 0, grandRev = 0;
            tableBody.innerHTML = summaryList.map(d => {
                grandRx += d.prescriptionCount;
                grandRev += d.totalRevenue;
                return `
                    <tr>
                        <td><strong>${escapeHtml(d.doctorName)}</strong></td>
                        <td style="text-align: center;">${d.prescriptionCount}</td>
                        <td style="text-align: right; font-weight: bold; color: var(--success-color);">${settings.currency || '₹'}${d.totalRevenue.toFixed(2)}</td>
                    </tr>
                `;
            }).join('') + `
                <tr style="background: var(--primary-light); font-weight: bold;">
                    <td>TOTAL OVERALL SUMMARY</td>
                    <td style="text-align: center;">${grandRx}</td>
                    <td style="text-align: right; color: var(--primary-color);">${settings.currency || '₹'}${grandRev.toFixed(2)}</td>
                </tr>
            `;
        }
        return;
    }

    if (reportType === 'table_sales' || reportType === 'table-sales') {
        if (tableTitle) tableTitle.textContent = 'Table-wise Sales Report';

        const tableMap = {};
        filteredSales.filter(s => !s.isReturn).forEach(sale => {
            const tbl = sale.tableName || 'Takeaway / Counter';
            if (!tableMap[tbl]) {
                tableMap[tbl] = { tableName: tbl, billsCount: 0, itemsCount: 0, totalRevenue: 0 };
            }
            tableMap[tbl].billsCount += 1;
            tableMap[tbl].itemsCount += (sale.items ? sale.items.reduce((sum, i) => sum + Math.abs(i.qty || 1), 0) : 0);
            tableMap[tbl].totalRevenue += Number(sale.grandTotal || 0);
        });

        tableHead.innerHTML = `
            <tr>
                <th>Table / Zone</th>
                <th style="text-align: center;">Total Bills</th>
                <th style="text-align: center;">Total Items Sold</th>
                <th style="text-align: right;">Total Revenue (${settings.currency || '₹'})</th>
            </tr>
        `;

        const summaryList = Object.values(tableMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (summaryList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No table sales recorded in selected date range. Enable Table Management in Settings to start tracking.</td></tr>`;
        } else {
            let grandBills = 0, grandItems = 0, grandRev = 0;
            tableBody.innerHTML = summaryList.map(t => {
                grandBills += t.billsCount;
                grandItems += t.itemsCount;
                grandRev += t.totalRevenue;
                return `
                    <tr>
                        <td><strong>${escapeHtml(t.tableName)}</strong></td>
                        <td style="text-align: center;">${t.billsCount}</td>
                        <td style="text-align: center;">${t.itemsCount}</td>
                        <td style="text-align: right; font-weight: bold; color: var(--success-color);">${settings.currency || '₹'}${t.totalRevenue.toFixed(2)}</td>
                    </tr>
                `;
            }).join('') + `
                <tr style="background: var(--primary-light); font-weight: bold;">
                    <td>TOTAL OVERALL SUMMARY</td>
                    <td style="text-align: center;">${grandBills}</td>
                    <td style="text-align: center;">${grandItems}</td>
                    <td style="text-align: right; color: var(--primary-color);">${settings.currency || '₹'}${grandRev.toFixed(2)}</td>
                </tr>
            `;
        }
        return;
    }

    if (reportType === 'stock') {
        if (tableTitle) tableTitle.textContent = 'Stock Report';
        tableHead.innerHTML = `
            <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Stock Qty</th>
                <th>MRP</th>
                <th>Sale Price</th>
            </tr>
        `;
        tableBody.innerHTML = (products || []).map(p => `
            <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${escapeHtml(p.category || 'General')}</td>
                <td>${escapeHtml(p.batch || '---')}</td>
                <td>${escapeHtml(p.expiry || '---')}</td>
                <td>${p.stock || 0}</td>
                <td>${settings.currency || '₹'}${parseFloat(p.mrp || 0).toFixed(2)}</td>
                <td>${settings.currency || '₹'}${parseFloat(p.salePrice || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } else if (reportType.startsWith('sales_')) {
        const mode = reportType.replace('sales_', '');
        let targetSales = filteredSales;
        if (mode === 'cash') targetSales = filteredSales.filter(s => (s.paymentMode || 'Cash') === 'Cash');
        if (mode === 'gpay') targetSales = filteredSales.filter(s => (s.paymentMode || '').toLowerCase().includes('gpay') || (s.paymentMode || '').toLowerCase().includes('upi'));
        if (mode === 'credit') targetSales = filteredSales.filter(s => s.paymentMode === 'Credit');

        if (tableTitle) tableTitle.textContent = `${mode.toUpperCase()} Sales Report`;
        tableHead.innerHTML = `
            <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Payment Mode</th>
                <th style="text-align: right;">Amount (${settings.currency || '₹'})</th>
            </tr>
        `;
        let totalAmt = 0;
        tableBody.innerHTML = targetSales.map(s => {
            const amt = Number(s.grandTotal || 0);
            totalAmt += amt;
            return `
                <tr>
                    <td>#${escapeHtml(s.invoiceNo || '---')}</td>
                    <td>${s.date ? new Date(s.date).toLocaleString() : '---'}</td>
                    <td>${escapeHtml(s.customer ? s.customer.name : 'Cash Customer')}</td>
                    <td>${escapeHtml(s.customer ? s.customer.phone : '---')}</td>
                    <td><span class="badge">${s.paymentMode || 'Cash'}</span></td>
                    <td style="text-align: right; font-weight: bold;">${settings.currency || '₹'}${amt.toFixed(2)}</td>
                </tr>
            `;
        }).join('') + `
            <tr style="background: var(--primary-light); font-weight: bold;">
                <td colspan="5">TOTAL SALES AMOUNT</td>
                <td style="text-align: right; color: var(--primary-color);">${settings.currency || '₹'}${totalAmt.toFixed(2)}</td>
            </tr>
        `;
    } else if (reportType === 'purchases') {
        if (tableTitle) tableTitle.textContent = 'Purchases Report';
        tableHead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Product Name</th>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Qty</th>
                <th style="text-align: right;">Total (${settings.currency || '₹'})</th>
            </tr>
        `;
        tableBody.innerHTML = (purchases || []).map(p => `
            <tr>
                <td>${p.date || '---'}</td>
                <td>${escapeHtml(p.productName || '---')}</td>
                <td>${escapeHtml(p.supplier || '---')}</td>
                <td>${escapeHtml(p.invoice || '---')}</td>
                <td>${p.qty || 0}</td>
                <td style="text-align: right;">${settings.currency || '₹'}${parseFloat(p.total || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } else if (reportType === 'expenses') {
        if (tableTitle) tableTitle.textContent = 'Expenses Report';
        tableHead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style="text-align: right;">Amount (${settings.currency || '₹'})</th>
            </tr>
        `;
        tableBody.innerHTML = (expenses || []).map(e => `
            <tr>
                <td>${e.date || '---'}</td>
                <td>${escapeHtml(e.category || '---')}</td>
                <td>${escapeHtml(e.description || '---')}</td>
                <td style="text-align: right;">${settings.currency || '₹'}${parseFloat(e.amount || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    }
}

function exportReportToCSV() {
    const table = document.getElementById('report-table');
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => rowData.push('"' + col.innerText.replace(/"/g, '""') + '"'));
        csv.push(rowData.join(','));
    });

    const reportType = document.getElementById('report-type')?.value || 'report';
    downloadBlob(csv.join('\n'), `Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

window.renderBillingWaiterOptions = renderBillingWaiterOptions;
window.renderBillingDoctorOptions = renderBillingDoctorOptions;
window.generateReport = generateReport;
window.exportReportToCSV = exportReportToCSV;

// --- Super Admin Branch Settings Permissions Module ---

let branchSettingsPermissions = JSON.parse(localStorage.getItem('mediflow_branch_settings_permissions')) || {};

function getDefaultBranchPermissions() {
    return {
        editShop: true,
        editPrinter: true,
        editGst: true,
        editKot: true,
        editTableMgmt: true,
        editWaiter: true,
        editDoctor: true,
        manageCategories: true,
        manageExpCategories: true
    };
}

function getBranchPermissions(branchId) {
    const targetBranch = branchId || currentBranchId || 'main';
    return branchSettingsPermissions[targetBranch] || getDefaultBranchPermissions();
}

function renderSuperAdminSettingsPermissions() {
    const permPanel = document.getElementById('super-admin-settings-permissions');
    if (!permPanel) return;

    const loggedInUser = sessionStorage.getItem('mediflow_user');
    const isSuperAdmin = !loggedInUser || loggedInUser === 'VIKI' || (loggedInUser && loggedInUser.toLowerCase() === 'viki');

    if (!isSuperAdmin) {
        permPanel.style.display = 'none';
        return;
    }

    permPanel.style.display = 'block';

    const branchSelect = document.getElementById('perm-target-branch');
    if (branchSelect) {
        const currentVal = branchSelect.value;
        branchSelect.innerHTML = '';
        (branches || []).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.name} (${b.id})`;
            if (b.id === currentVal) opt.selected = true;
            branchSelect.appendChild(opt);
        });

        if (!branchSelect.value && branches && branches.length > 0) {
            branchSelect.value = branches[0].id;
        }
    }

    onPermBranchSelectChange();
}

function onPermBranchSelectChange() {
    const branchSelect = document.getElementById('perm-target-branch');
    if (!branchSelect) return;

    const branchId = branchSelect.value || currentBranchId || 'main';
    const perms = getBranchPermissions(branchId);

    if (document.getElementById('perm-edit-shop')) document.getElementById('perm-edit-shop').checked = perms.editShop !== false;
    if (document.getElementById('perm-edit-printer')) document.getElementById('perm-edit-printer').checked = perms.editPrinter !== false;
    if (document.getElementById('perm-edit-gst')) document.getElementById('perm-edit-gst').checked = (perms.editGst !== undefined ? perms.editGst : perms.editGstKot) !== false;
    if (document.getElementById('perm-edit-kot')) document.getElementById('perm-edit-kot').checked = (perms.editKot !== undefined ? perms.editKot : perms.editGstKot) !== false;
    if (document.getElementById('perm-edit-table-mgmt')) document.getElementById('perm-edit-table-mgmt').checked = perms.editTableMgmt !== false;
    if (document.getElementById('perm-edit-waiter')) document.getElementById('perm-edit-waiter').checked = (perms.editWaiter !== undefined ? perms.editWaiter : perms.editWaiterDoctor) !== false;
    if (document.getElementById('perm-edit-doctor')) document.getElementById('perm-edit-doctor').checked = (perms.editDoctor !== undefined ? perms.editDoctor : perms.editWaiterDoctor) !== false;
    if (document.getElementById('perm-manage-categories')) document.getElementById('perm-manage-categories').checked = perms.manageCategories !== false;
    if (document.getElementById('perm-manage-exp-categories')) document.getElementById('perm-manage-exp-categories').checked = perms.manageExpCategories !== false;
}

function saveBranchSettingsPermissions() {
    const branchSelect = document.getElementById('perm-target-branch');
    if (!branchSelect) return;

    const branchId = branchSelect.value;
    if (!branchId) return;

    branchSettingsPermissions[branchId] = {
        editShop: document.getElementById('perm-edit-shop')?.checked !== false,
        editPrinter: document.getElementById('perm-edit-printer')?.checked !== false,
        editGst: document.getElementById('perm-edit-gst')?.checked !== false,
        editKot: document.getElementById('perm-edit-kot')?.checked !== false,
        editTableMgmt: document.getElementById('perm-edit-table-mgmt')?.checked !== false,
        editWaiter: document.getElementById('perm-edit-waiter')?.checked !== false,
        editDoctor: document.getElementById('perm-edit-doctor')?.checked !== false,
        manageCategories: document.getElementById('perm-manage-categories')?.checked !== false,
        manageExpCategories: document.getElementById('perm-manage-exp-categories')?.checked !== false
    };

    localStorage.setItem('mediflow_branch_settings_permissions', JSON.stringify(branchSettingsPermissions));
    syncToCloud('branch_settings_permissions', branchSettingsPermissions);

    alert(`Application Settings Permissions saved for Branch (${branchId}) successfully!`);
    applyBranchSettingsPermissions();
}

function applyBranchSettingsPermissions() {
    const loggedInUser = sessionStorage.getItem('mediflow_user');
    const isSuperAdmin = !loggedInUser || loggedInUser === 'VIKI' || (loggedInUser && loggedInUser.toLowerCase() === 'viki');

    if (isSuperAdmin) {
        const inputs = document.querySelectorAll('#settings-form input, #settings-form select, #settings-form button');
        inputs.forEach(el => el.disabled = false);
        return;
    }

    const perms = getBranchPermissions(currentBranchId);

    // Shop Details
    ['set-shop-name', 'set-shop-address', 'set-shop-phone', 'set-shop-gstin', 'set-shop-logo', 'set-shop-upi'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !perms.editShop;
    });

    // Printer Details
    ['set-printer-type', 'set-printer-name', 'set-print-copies'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !perms.editPrinter;
    });

    // GST System
    if (document.getElementById('set-gst-default')) {
        const gstAllowed = perms.editGst !== undefined ? perms.editGst : perms.editGstKot;
        document.getElementById('set-gst-default').disabled = !gstAllowed;
    }

    // KOT Printing System
    if (document.getElementById('set-kot-enabled')) {
        const kotAllowed = perms.editKot !== undefined ? perms.editKot : perms.editGstKot;
        document.getElementById('set-kot-enabled').disabled = !kotAllowed;
    }

    // Table Management Toggle
    if (document.getElementById('set-enable-table-mgmt')) {
        document.getElementById('set-enable-table-mgmt').disabled = !perms.editTableMgmt;
    }

    // Waiter Selection Toggle
    if (document.getElementById('set-enable-waiter')) {
        const waiterAllowed = perms.editWaiter !== undefined ? perms.editWaiter : perms.editWaiterDoctor;
        document.getElementById('set-enable-waiter').disabled = !waiterAllowed;
    }

    // Doctor Selection Toggle
    if (document.getElementById('set-enable-doctor')) {
        const doctorAllowed = perms.editDoctor !== undefined ? perms.editDoctor : perms.editWaiterDoctor;
        document.getElementById('set-enable-doctor').disabled = !doctorAllowed;
    }

    // Categories
    const newCatInput = document.getElementById('new-category-name');
    if (newCatInput) newCatInput.disabled = !perms.manageCategories;
    const newExpCatInput = document.getElementById('new-exp-category-name');
    if (newExpCatInput) newExpCatInput.disabled = !perms.manageExpCategories;
}

window.renderSuperAdminSettingsPermissions = renderSuperAdminSettingsPermissions;
window.onPermBranchSelectChange = onPermBranchSelectChange;
window.saveBranchSettingsPermissions = saveBranchSettingsPermissions;
window.applyBranchSettingsPermissions = applyBranchSettingsPermissions;

// --- Return Bill Engine ---

let activeReturnTargetSale = null;

function openReturnBillModal(invNo) {
    const modal = document.getElementById('return-bill-modal');
    if (!modal) return;

    activeReturnTargetSale = null;
    const input = document.getElementById('return-bill-id-input');
    const detailsContainer = document.getElementById('return-bill-details-container');

    if (detailsContainer) detailsContainer.style.display = 'none';

    if (input) {
        input.value = invNo || '';
    }

    modal.style.display = 'flex';

    if (invNo) {
        lookupReturnBill();
    }
}

function closeReturnBillModal() {
    const modal = document.getElementById('return-bill-modal');
    if (modal) modal.style.display = 'none';
    activeReturnTargetSale = null;
}

function lookupReturnBill() {
    const input = document.getElementById('return-bill-id-input');
    if (!input) return;

    const query = input.value.trim().toLowerCase();
    if (!query) {
        alert('Please enter a Bill ID or Invoice Number.');
        return;
    }

    const cleanQuery = query.replace(/[^a-z0-9]/g, '');
    const foundSale = (sales || []).find(s => {
        if (!s) return false;
        const inv = (s.invoiceNo || '').toLowerCase();
        const cleanInv = inv.replace(/[^a-z0-9]/g, '');
        const id = (s.id || '').toLowerCase();
        return inv === query || (cleanQuery && cleanInv === cleanQuery) || (cleanQuery && cleanInv.includes(cleanQuery)) || id === query;
    });

    if (!foundSale) {
        alert(`No bill found matching Invoice ID "${input.value}". Please check the Invoice Number.`);
        return;
    }

    if (foundSale.isReturn) {
        alert(`Bill #${foundSale.invoiceNo} is already a Return Invoice.`);
        return;
    }

    activeReturnTargetSale = foundSale;

    document.getElementById('return-bill-inv-no').textContent = foundSale.invoiceNo || foundSale.id;
    document.getElementById('return-bill-customer').textContent = foundSale.customer ? foundSale.customer.name : 'Cash Customer';
    document.getElementById('return-bill-date').textContent = foundSale.date ? new Date(foundSale.date).toLocaleDateString() : '---';
    document.getElementById('return-bill-orig-total').textContent = `${settings.currency || '₹'}${Number(foundSale.grandTotal || 0).toFixed(2)}`;

    const tbody = document.getElementById('return-items-tbody');
    tbody.innerHTML = '';

    (foundSale.items || []).forEach((item, index) => {
        const tr = document.createElement('tr');
        const unitPrice = Number(item.salePrice || item.mrp || item.price || 0);
        const soldQty = Math.abs(item.quantity || item.qty || 1);

        tr.innerHTML = `
            <td><strong>${escapeHtml(item.name || item.productName || 'Item')}</strong></td>
            <td style="text-align: center;">${settings.currency || '₹'}${unitPrice.toFixed(2)}</td>
            <td style="text-align: center;"><strong>${soldQty}</strong></td>
            <td style="text-align: center;">
                <input type="number" class="form-control return-qty-input" data-index="${index}" data-price="${unitPrice}" data-max="${soldQty}" value="${soldQty}" min="0" max="${soldQty}" style="width: 80px; text-align: center; margin: 0 auto;" oninput="updateReturnTotals()">
            </td>
            <td style="text-align: right; font-weight: bold; color: var(--danger-color);" class="return-item-subtotal">${settings.currency || '₹'}${(unitPrice * soldQty).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('return-bill-details-container').style.display = 'block';
    updateReturnTotals();
}

function updateReturnTotals() {
    const inputs = document.querySelectorAll('.return-qty-input');
    let grandRefund = 0;

    inputs.forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const max = parseFloat(input.getAttribute('data-max')) || 0;
        const price = parseFloat(input.getAttribute('data-price')) || 0;

        if (qty > max) {
            input.value = max;
        }

        const validQty = Math.min(Math.max(0, qty), max);
        const itemSubtotal = validQty * price;
        grandRefund += itemSubtotal;

        const row = input.closest('tr');
        if (row) {
            const subtotalEl = row.querySelector('.return-item-subtotal');
            if (subtotalEl) subtotalEl.textContent = `${settings.currency || '₹'}${itemSubtotal.toFixed(2)}`;
        }
    });

    const refundText = document.getElementById('return-total-refund-text');
    if (refundText) refundText.textContent = `${settings.currency || '₹'}${grandRefund.toFixed(2)}`;
}

function confirmProcessReturnBill() {
    if (!activeReturnTargetSale) {
        alert('No active bill selected to return.');
        return;
    }

    const inputs = document.querySelectorAll('.return-qty-input');
    const returnItems = [];
    let totalRefundAmount = 0;

    inputs.forEach(input => {
        const index = parseInt(input.getAttribute('data-index'));
        const returnQty = parseFloat(input.value) || 0;
        const price = parseFloat(input.getAttribute('data-price')) || 0;
        const originalItem = activeReturnTargetSale.items[index];

        if (returnQty > 0 && originalItem) {
            const subtotal = returnQty * price;
            totalRefundAmount += subtotal;

            returnItems.push({
                ...originalItem,
                quantity: returnQty,
                qty: returnQty,
                price: price,
                salePrice: price,
                total: subtotal
            });

            // Restock items in products array
            const prodIndex = (products || []).findIndex(p => p.id === originalItem.id || p.name === originalItem.name);
            if (prodIndex > -1) {
                products[prodIndex].stock = Number(products[prodIndex].stock || 0) + returnQty;
            }
        }
    });

    if (returnItems.length === 0 || totalRefundAmount <= 0) {
        alert('Please specify at least 1 item return quantity greater than 0.');
        return;
    }

    const returnInvoiceNo = `RET-${activeReturnTargetSale.invoiceNo || Date.now()}`;
    const returnSaleData = {
        id: 'SALE_RET_' + Date.now(),
        invoiceNo: returnInvoiceNo,
        date: new Date().toISOString(),
        customer: activeReturnTargetSale.customer || { name: 'Cash Customer' },
        items: returnItems,
        subtotal: -totalRefundAmount,
        gst: 0,
        discount: 0,
        grandTotal: -totalRefundAmount,
        paymentMode: activeReturnTargetSale.paymentMode || 'Cash',
        isReturn: true,
        refInvoiceNo: activeReturnTargetSale.invoiceNo,
        waiterName: activeReturnTargetSale.waiterName || '',
        doctorName: activeReturnTargetSale.doctorName || ''
    };

    sales.unshift(returnSaleData);

    localStorage.setItem('mediflow_products', JSON.stringify(products));
    localStorage.setItem('mediflow_sales', JSON.stringify(sales));
    syncToCloud('products', products);
    syncToCloud('sales', sales);

    alert(`Return Bill #${returnInvoiceNo} processed successfully! Refund Amount: ${settings.currency || '₹'}${totalRefundAmount.toFixed(2)}`);

    closeReturnBillModal();
    renderSalesHistory();
    renderDashboard();
    if (activeSection === 'products') renderProducts();

    // Print Return Bill Receipt
    printBill(returnSaleData);
}

function toggleReturnMode() {
    openReturnBillModal();
    const input = document.getElementById('return-bill-id-input');
    if (input) {
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
    }
}

window.toggleReturnMode = toggleReturnMode;
window.openReturnBillModal = openReturnBillModal;
window.closeReturnBillModal = closeReturnBillModal;
window.lookupReturnBill = lookupReturnBill;
window.updateReturnTotals = updateReturnTotals;
window.confirmProcessReturnBill = confirmProcessReturnBill;

// --- Table Management Engine ---

let tableList = [];

function loadTableList() {
    try {
        tableList = JSON.parse(localStorage.getItem('mediflow_tables')) || [];
    } catch (e) {
        tableList = [];
    }
    // Seed default tables if empty and table mgmt is enabled
    if (tableList.length === 0 && settings.enableTableMgmt) {
        tableList = [
            { id: 'TBL1', name: 'Table 1', capacity: 4, zone: 'General', status: 'Available' },
            { id: 'TBL2', name: 'Table 2', capacity: 4, zone: 'General', status: 'Available' },
            { id: 'TBL3', name: 'Table 3', capacity: 4, zone: 'General', status: 'Available' },
            { id: 'TBL4', name: 'Table 4', capacity: 6, zone: 'General', status: 'Available' },
            { id: 'TBL5', name: 'Table 5', capacity: 2, zone: 'General', status: 'Available' },
            { id: 'AC1',  name: 'AC Table 1', capacity: 4, zone: 'AC Section', status: 'Available' },
            { id: 'AC2',  name: 'AC Table 2', capacity: 4, zone: 'AC Section', status: 'Available' },
            { id: 'TKW',  name: 'Takeaway / Parcel', capacity: 0, zone: 'Takeaway', status: 'Available' }
        ];
        localStorage.setItem('mediflow_tables', JSON.stringify(tableList));
    }
}

function saveTableList() {
    localStorage.setItem('mediflow_tables', JSON.stringify(tableList));
    syncToCloud('tables', tableList);
}

function renderTableManagement() {
    loadTableList();

    // Show/hide nav item based on setting
    const navBtn = document.getElementById('nav-table-mgmt');
    if (navBtn) navBtn.style.display = settings.enableTableMgmt ? 'flex' : 'none';

    // Update billing table dropdown with custom table list
    const billingSelect = document.getElementById('billing-table-select');
    if (billingSelect && tableList.length > 0) {
        billingSelect.innerHTML = '<option value="">Select Table (Optional)</option>';
        tableList.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.textContent = `${t.name} (${t.zone || 'General'}, ${t.capacity > 0 ? t.capacity + ' seats' : 'Takeaway'})`;
            billingSelect.appendChild(opt);
        });
    }

    const grid = document.getElementById('table-status-grid');
    if (!grid) return;

    if (tableList.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i data-lucide="layout-grid" style="width: 48px; height: 48px; margin: 0 auto 1rem; display: block; opacity: 0.4;"></i>
                <p>No tables added yet. Click <strong>Add Table</strong> to create your first dining table.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const today = new Date().toDateString();
    const todaySales = (sales || []).filter(s => s.tableName && new Date(s.date).toDateString() === today && !s.isReturn);

    grid.innerHTML = tableList.map((t, idx) => {
        const tableSales = todaySales.filter(s => s.tableName === t.name);
        const todayRevenue = tableSales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
        const statusColor = t.status === 'Occupied' ? '#dc2626' : t.status === 'Reserved' ? '#d97706' : '#16a34a';
        const statusBg = t.status === 'Occupied' ? '#fee2e2' : t.status === 'Reserved' ? '#fef3c7' : '#dcfce7';

        return `
            <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="font-size: 1rem; color: var(--text-main);">${escapeHtml(t.name)}</strong>
                    <span style="font-size: 0.75rem; font-weight: 600; background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 20px;">${t.status || 'Available'}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    <i data-lucide="tag" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${escapeHtml(t.zone || 'General')}
                    ${t.capacity > 0 ? `&nbsp; <i data-lucide="users" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${t.capacity} seats` : ''}
                </div>
                <div style="font-size: 0.85rem; color: var(--success-color); font-weight: 600; margin-top: 4px;">
                    Today: ${settings.currency || '₹'}${todayRevenue.toFixed(2)} (${tableSales.length} bills)
                </div>
                <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                    <button class="btn btn-outline" onclick="setTableStatus(${idx}, 'Available')" style="padding: 3px 8px; font-size: 0.78rem; color: #16a34a; border-color: #16a34a;" title="Mark Available">✓ Free</button>
                    <button class="btn btn-outline" onclick="setTableStatus(${idx}, 'Occupied')" style="padding: 3px 8px; font-size: 0.78rem; color: #dc2626; border-color: #dc2626;" title="Mark Occupied">🪑 Occupied</button>
                    <button class="btn btn-outline" onclick="editTableEntry(${idx})" style="padding: 3px 8px; font-size: 0.78rem;" title="Edit"><i data-lucide="edit-2" style="width: 12px;"></i></button>
                    <button class="btn btn-outline" onclick="deleteTableEntry(${idx})" style="padding: 3px 8px; font-size: 0.78rem; color: var(--danger-color);" title="Delete"><i data-lucide="trash-2" style="width: 12px;"></i></button>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Render today's revenue summary
    const tbody = document.getElementById('table-revenue-tbody');
    if (tbody) {
        if (todaySales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">No table sales recorded today.</td></tr>';
        } else {
            const tMap = {};
            todaySales.forEach(s => {
                const k = s.tableName || 'Unknown';
                if (!tMap[k]) tMap[k] = { bills: 0, rev: 0 };
                tMap[k].bills++;
                tMap[k].rev += Number(s.grandTotal || 0);
            });
            let grandBills = 0, grandRev = 0;
            tbody.innerHTML = Object.entries(tMap).map(([name, v]) => {
                grandBills += v.bills;
                grandRev += v.rev;
                return `<tr><td><strong>${escapeHtml(name)}</strong></td><td style="text-align: center;">${v.bills}</td><td style="text-align: right; font-weight: bold; color: var(--success-color);">${settings.currency || '₹'}${v.rev.toFixed(2)}</td></tr>`;
            }).join('') + `<tr style="background: var(--primary-light); font-weight: bold;"><td>TOTAL</td><td style="text-align: center;">${grandBills}</td><td style="text-align: right; color: var(--primary-color);">${settings.currency || '₹'}${grandRev.toFixed(2)}</td></tr>`;
        }
    }
}

function setTableStatus(idx, status) {
    if (tableList[idx]) {
        tableList[idx].status = status;
        saveTableList();
        renderTableManagement();
    }
}

function openAddTableModal(idx = null) {
    const modal = document.getElementById('add-table-modal');
    if (!modal) return;

    document.getElementById('edit-table-index').value = idx !== null ? idx : '';
    document.getElementById('add-table-modal-title').textContent = idx !== null ? 'Edit Table' : 'Add Table';

    if (idx !== null && tableList[idx]) {
        const t = tableList[idx];
        document.getElementById('table-name-input').value = t.name || '';
        document.getElementById('table-capacity-input').value = t.capacity || 4;
        document.getElementById('table-zone-input').value = t.zone || 'General';
    } else {
        document.getElementById('table-name-input').value = '';
        document.getElementById('table-capacity-input').value = 4;
        document.getElementById('table-zone-input').value = 'General';
    }

    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('table-name-input').focus(), 100);
}

function closeAddTableModal() {
    const modal = document.getElementById('add-table-modal');
    if (modal) modal.style.display = 'none';
}

function saveTableEntry() {
    const name = (document.getElementById('table-name-input')?.value || '').trim();
    if (!name) { alert('Please enter a table name.'); return; }

    const capacity = parseInt(document.getElementById('table-capacity-input')?.value) || 4;
    const zone = document.getElementById('table-zone-input')?.value || 'General';
    const idxVal = document.getElementById('edit-table-index')?.value;
    const idx = idxVal !== '' ? parseInt(idxVal) : null;

    if (idx !== null && tableList[idx]) {
        tableList[idx].name = name;
        tableList[idx].capacity = capacity;
        tableList[idx].zone = zone;
    } else {
        tableList.push({
            id: 'TBL' + Date.now(),
            name,
            capacity,
            zone,
            status: 'Available'
        });
    }

    saveTableList();
    closeAddTableModal();
    renderTableManagement();
}

function editTableEntry(idx) {
    openAddTableModal(idx);
}

function deleteTableEntry(idx) {
    if (!confirm(`Delete "${tableList[idx]?.name}"? This cannot be undone.`)) return;
    tableList.splice(idx, 1);
    saveTableList();
    renderTableManagement();
}

window.renderTableManagement = renderTableManagement;
window.openAddTableModal = openAddTableModal;
window.closeAddTableModal = closeAddTableModal;
window.saveTableEntry = saveTableEntry;
window.editTableEntry = editTableEntry;
window.deleteTableEntry = deleteTableEntry;
window.setTableStatus = setTableStatus;

