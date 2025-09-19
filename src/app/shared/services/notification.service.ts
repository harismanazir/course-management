import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private snackBar: MatSnackBar) { }

  private getConfig(type: 'success' | 'error' | 'warning' | 'info'): MatSnackBarConfig {
    return {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    };
  }

  success(message: string, action?: string): void {
    this.snackBar.open(message, action || 'Close', this.getConfig('success'));
  }

  error(message: string, action?: string): void {
    this.snackBar.open(message, action || 'Close', this.getConfig('error'));
  }

  warning(message: string, action?: string): void {
    this.snackBar.open(message, action || 'Close', this.getConfig('warning'));
  }

  info(message: string, action?: string): void {
    this.snackBar.open(message, action || 'Close', this.getConfig('info'));
  }

  showCustom(message: string, config?: MatSnackBarConfig): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      ...config
    });
  }
}