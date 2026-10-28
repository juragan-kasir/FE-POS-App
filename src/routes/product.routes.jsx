import React from "react";
import { Route } from "react-router-dom";

// Product
const ProductList = React.lazy(() => import("@/page/product/ProductList"));
const AddProduct = React.lazy(() => import("@/page/product/AddProduct"));
const EditProduct = React.lazy(() => import("@/page/product/EditProduct"));
const DetailProduct = React.lazy(() => import("@/page/product/DetailProduct"));

// Category
const CategoryList = React.lazy(() => import("@/page/category/CategoryList"));
const AddCategory = React.lazy(() => import("@/page/category/AddCategory"));
const EditCategory = React.lazy(() => import("@/page/category/EditCategory"));
const DetailCategory = React.lazy(() => import("@/page/category/DetailCategory"));

export const productRoutes = (
  <>
    <Route path="/product-list" element={<ProductList />} />
    <Route path="/add-product" element={<AddProduct />} />
    <Route path="/edit-product" element={<EditProduct />} />
    <Route path="/detail-product/:id" element={<DetailProduct />} />

    <Route path="/category-list" element={<CategoryList />} />
    <Route path="/add-category" element={<AddCategory />} />
    <Route path="/edit-category" element={<EditCategory />} />
    <Route path="/detail-category" element={<DetailCategory />} />
  </>
);
