import { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../services/api';

export const useProducts = (initialParams = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [params, setParams] = useState(initialParams);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productAPI.getAll({ ...params, page });
      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
    setPage(1);
  };

  return { products, loading, error, total, page, pages, setPage, params, updateParams, refetch: fetchProducts };
};
