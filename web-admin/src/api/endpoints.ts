// API Endpoints constants - Synchronized with Backend (Guid-based IDs)
export const API_ENDPOINTS = {
    // Auth
    auth: {
        login: '/api/auth/login',
        refreshToken: '/api/auth/refresh-token',
        me: '/api/auth/me',
    },

    // Warehouse
    warehouses: {
        list: '/api/warehouses',
        get: (id: string) => `/api/warehouses/${id}`,
        create: '/api/warehouses',
        update: (id: string) => `/api/warehouses/${id}`,
        delete: (id: string) => `/api/warehouses/${id}`,
    },

    // Zone
    zones: {
        list: '/api/zones',
        get: (id: string) => `/api/zones/${id}`,
        create: '/api/zones',
        update: (id: string) => `/api/zones/${id}`,
        delete: (id: string) => `/api/zones/${id}`,
    },

    // Product
    products: {
        list: '/api/products',
        get: (id: string) => `/api/products/${id}`,
        create: '/api/products',
        update: (id: string) => `/api/products/${id}`,
        delete: (id: string) => `/api/products/${id}`,
        byBarcode: (barcode: string) => `/api/products/barcode/${barcode}`,
    },

    // Category
    categories: {
        list: '/api/categories',
        get: (id: string) => `/api/categories/${id}`,
        create: '/api/categories',
        update: (id: string) => `/api/categories/${id}`,
        delete: (id: string) => `/api/categories/${id}`,
    },

    // Supplier
    suppliers: {
        list: '/api/suppliers',
        get: (id: string) => `/api/suppliers/${id}`,
        create: '/api/suppliers',
        update: (id: string) => `/api/suppliers/${id}`,
        delete: (id: string) => `/api/suppliers/${id}`,
    },

    // Customer
    customers: {
        list: '/api/customers',
        get: (id: string) => `/api/customers/${id}`,
        create: '/api/customers',
        update: (id: string) => `/api/customers/${id}`,
        delete: (id: string) => `/api/customers/${id}`,
    },

    // Receipt (Phiếu Nhập)
    receipts: {
        list: '/api/receipts',
        get: (id: string) => `/api/receipts/${id}`,
        create: '/api/receipts',
        approveQc: (id: string) => `/api/receipts/${id}/approve-qc`,
        completePutaway: (id: string) => `/api/receipts/${id}/complete-putaway`,
        ocr: '/api/receipts/ocr',
    },

    // Issue (Phiếu Xuất)
    issues: {
        list: '/api/issues',
        get: (id: string) => `/api/issues/${id}`,
        create: '/api/issues',
        pickingPlan: (id: string) => `/api/issues/${id}/picking-plan`,
        confirmPick: (id: string) => `/api/issues/${id}/confirm-pick`,
        handover: (id: string) => `/api/issues/${id}/handover`,
    },

    // Inventory
    inventory: {
        list: '/api/inventory',
        stockSummary: '/api/inventory/stock-summary',
        transactions: '/api/inventory/transactions',
        adjust: '/api/inventory/adjust',
    },

    // Analytics
    analytics: {
        kpis: '/api/analytics/kpis',
        lowStock: '/api/analytics/low-stock',
        stockMovements: '/api/analytics/stock-movements',
    },

    // Users
    users: {
        list: '/api/users',
        get: (id: string) => `/api/users/${id}`,
        create: '/api/users',
        update: (id: string) => `/api/users/${id}`,
        delete: (id: string) => `/api/users/${id}`,
        changePassword: (id: string) => `/api/users/${id}/change-password`,
        roles: '/api/users/roles',
    },
};

export default API_ENDPOINTS;
