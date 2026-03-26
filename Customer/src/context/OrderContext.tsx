import { createContext, useContext, useState, type ReactNode } from 'react';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  emoji: string;
}

export interface Order {
  id: number;
  date: string;
  items: OrderItem[];
  total: number;
  status: 'placed' | 'shipped' | 'delivered' | 'cancelled';
  address: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
  paymentMethod: string;
}

interface OrderContextType {
  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Order;
  getOrderCount: () => number;
  getDeliveredCount: () => number;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('customer_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const save = (updated: Order[]) => {
    setOrders(updated);
    localStorage.setItem('customer_orders', JSON.stringify(updated));
  };

  const placeOrder = (data: Omit<Order, 'id' | 'date' | 'status'>): Order => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const newOrder: Order = {
      ...data,
      id: Date.now(),
      date: dateStr,
      status: 'placed',
    };
    save([newOrder, ...orders]);
    return newOrder;
  };

  const getOrderCount = () => orders.length;
  const getDeliveredCount = () => orders.filter(o => o.status === 'delivered').length;

  return (
    <OrderContext.Provider value={{ orders, placeOrder, getOrderCount, getDeliveredCount }}>
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used inside OrderProvider');
  return ctx;
};
