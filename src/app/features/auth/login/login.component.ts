import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckbox } from '@angular/material/checkbox';

import { AuthService, LoginCredentials } from '../../../shared/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCheckbox
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  returnUrl = '/';

  demoAccounts = [
    { email: 'admin@courseapp.com', password: 'admin123', role: 'Admin' },
    { email: 'student@courseapp.com', password: 'student123', role: 'Student' },
    { email: 'jane.doe@courseapp.com', password: 'password123', role: 'Student' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.getReturnUrl();
    this.checkIfAlreadyLoggedIn();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private getReturnUrl(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  private checkIfAlreadyLoggedIn(): void {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        const user = this.authService.getCurrentUser();
        if (user) {
          this.navigateAfterLogin(user);
        }
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      const credentials: LoginCredentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (user) => {
          this.isLoading = false;
          this.notificationService.success(`Welcome back, ${user.name}!`);
          this.navigateAfterLogin(user);
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationService.error(error.message || 'Login failed. Please try again.');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private navigateAfterLogin(user: any): void {
    // Force navigation immediately
    if (this.returnUrl !== '/') {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      const dashboardUrl = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/student';
      this.router.navigateByUrl(dashboardUrl);
    }
  }

  useDemoAccount(email: string, password: string): void {
    if (this.isLoading) return;
    
    this.loginForm.patchValue({ email, password });
    this.onSubmit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${this.capitalizeFirst(fieldName)} is required`;
    }
    
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (control?.hasError('minlength')) {
      return `${this.capitalizeFirst(fieldName)} must be at least 6 characters`;
    }
    
    return '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}