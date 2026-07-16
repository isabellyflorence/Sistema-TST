import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const permission = route.data['permission'];
  return auth.isAuthenticated() && auth.canAccess(permission)
    ? true
    : inject(Router).createUrlTree(['/dashboard']);
};
