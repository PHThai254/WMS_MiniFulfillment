import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { WarehousesPage } from './WarehousesPage';
import { ZonesPage } from './ZonesPage';
import { ProductsPage } from './ProductsPage';
import { CategoriesPage } from './CategoriesPage';
import { SuppliersPage } from './SuppliersPage';
import { CustomersPage } from './CustomersPage';

export const MasterDataRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="zones" element={<ZonesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
        </Routes>
    );
};
