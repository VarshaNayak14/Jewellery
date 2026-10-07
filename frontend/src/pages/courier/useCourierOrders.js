import { useEffect, useState, useCallback } from 'react';
import { courierAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ACTIVE_STATUSES = ['ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'];
const FINAL_STATUSES = ['delivered', 'failed_delivery'];

// Shared by every courier panel page — one fetch of "my orders", each page
// just slices the part it cares about (active vs history vs earnings math).
export function useCourierOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courierAPI.getMyOrders();
      setOrders(data.orders || []);
      setSettlements(data.settlements || []);
    } catch (error) { toast.error(error.message || 'Unable to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const history = orders.filter(o => FINAL_STATUSES.includes(o.status));
  const delivered = orders.filter(o => o.status === 'delivered');
  const failed = orders.filter(o => o.status === 'failed_delivery');

  return { orders, active, history, delivered, failed, settlements, loading, reload: load, setOrders };
}
