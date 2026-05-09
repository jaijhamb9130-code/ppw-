import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || (Array.isArray(required) && required.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) return false;

    // Admins have all permissions automatically
    if (user.role === 'admin') {
      return true;
    }

    // Role-based default system permissions
    // This ensures staff can still access basic pages even if their 'permissions' 
    // column is primarily used for data-level (brand/category) restrictions.
    const roleDefaults: Record<string, string[]> = {
      manager: ['dashboard', 'inventory', 'orders', 'ledgers', 'staff', 'sync'],
      employee: ['inventory', 'orders', 'ledgers', 'sync'],
      user: ['inventory', 'orders'],
    };

    const defaultPerms = roleDefaults[user.role] || [];

    // Support both old format (array of strings) and new format (object with system key)
    let explicitPerms: string[] = [];
    if (Array.isArray(user.permissions)) {
      explicitPerms = user.permissions;
    } else if (user.permissions && Array.isArray(user.permissions.system)) {
      explicitPerms = user.permissions.system;
    }

    const allUserPerms = [...new Set([...defaultPerms, ...explicitPerms])];

    const requiredList = Array.isArray(required) ? required : [required];
    const hasAny = requiredList.some((p) => allUserPerms.includes(p));

    if (!hasAny) {
      throw new ForbiddenException(
        `Insufficient permission. Need one of: ${requiredList.join(', ')}`,
      );
    }

    return true;
  }
}
