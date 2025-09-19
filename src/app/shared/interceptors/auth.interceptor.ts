import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const loadingService = inject(LoadingService);
  const notificationService = inject(NotificationService);

  // Show loading spinner for API calls
  loadingService.show();

  // Add auth token if available
  const token = authService.getAuthToken();
  let authReq = req;

  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError(error => {
      // Handle different types of HTTP errors
      if (error.status === 401) {
        // Unauthorized - invalid or expired token
        notificationService.error('Session expired. Please log in again.');
        authService.logout();
      } else if (error.status === 403) {
        // Forbidden - insufficient permissions
        notificationService.error('Access denied. Insufficient permissions.');
      } else if (error.status === 500) {
        // Server error
        notificationService.error('Server error. Please try again later.');
      } else if (error.status === 0) {
        // Network error
        notificationService.error('Network error. Please check your connection.');
      } else {
        // Other errors
        const errorMessage = error.error?.message || 'An unexpected error occurred.';
        notificationService.error(errorMessage);
      }
      
      return throwError(() => error);
    }),
    finalize(() => {
      // Hide loading spinner when request completes
      loadingService.hide();
    })
  );
};