import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const loadingService = inject(LoadingService);
  const notificationService = inject(NotificationService);

  // Show loading spinner for API calls
  loadingService.show();

  // Supabase handles auth automatically, so we don't need to add tokens manually
  // The Supabase client automatically includes the JWT token in requests
  const authReq = req;

  return next(authReq).pipe(
    catchError(error => {
      console.error('HTTP Error:', error);
      
      // Handle different types of HTTP errors
      if (error.status === 401) {
        // Unauthorized - invalid or expired token
        notificationService.error('Session expired. Please log in again.');
        authService.logout();
      } else if (error.status === 403) {
        // Forbidden - insufficient permissions
        notificationService.error('Access denied. Insufficient permissions.');
      } else if (error.status === 404) {
        // Not found
        notificationService.error('Resource not found.');
      } else if (error.status === 422) {
        // Validation error
        const message = error.error?.message || 'Validation error occurred.';
        notificationService.error(message);
      } else if (error.status === 429) {
        // Too many requests
        notificationService.error('Too many requests. Please try again later.');
      } else if (error.status === 500) {
        // Server error
        notificationService.error('Server error. Please try again later.');
      } else if (error.status === 502 || error.status === 503 || error.status === 504) {
        // Service unavailable
        notificationService.error('Service temporarily unavailable. Please try again later.');
      } else if (error.status === 0) {
        // Network error
        notificationService.error('Network error. Please check your connection.');
      } else {
        // Other errors
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred.';
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