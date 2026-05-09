export function getDefaultRoute(user: any): string {
  if (!user) return '/login';
  if (user.role === 'admin') return '/';
  if (user.role === 'manager') return '/stock-items';
  if (user.role === 'employee') return '/create-order';
  return '/login';
}

export function canAccess(user: any, path: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    return path === '/stock-items';
  }
  if (user.role === 'employee') {
    return path === '/create-order' || path === '/orders' || path.startsWith('/orders/');
  }
  return false;
}
