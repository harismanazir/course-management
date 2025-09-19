import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const user = authService.getCurrentUser();
  
  if (user && user.role === 'admin') {
    return true;
  } else {
    notificationService.error('Access denied. Admin privileges required.');
    router.navigate(['/dashboard']);
    return false;
  }
};