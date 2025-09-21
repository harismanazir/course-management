import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService, RegisterData } from '../../../shared/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-register',
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
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  registerForm!: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;

  roles = [
    { value: 'student', label: 'Student' },
    { value: 'admin', label: 'Administrator' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.checkIfAlreadyLoggedIn();
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordValidator]],
      confirmPassword: ['', [Validators.required]],
      role: ['student', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private checkIfAlreadyLoggedIn(): void {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }

  private passwordValidator(control: AbstractControl): {[key: string]: any} | null {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasMinLength = value.length >= 6;

    const passwordValid = hasNumber && hasUpper && hasLower && hasMinLength;

    return passwordValid ? null : {
      passwordStrength: {
        hasNumber,
        hasUpper,
        hasLower,
        hasMinLength
      }
    };
  }

  private passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;

      const { confirmPassword, terms, ...registerData }: RegisterData & { confirmPassword: string; terms: boolean } = this.registerForm.value;

      this.authService.register(registerData).subscribe({
        next: (user) => {
          this.isLoading = false;
          this.notificationService.success(`Welcome to CourseHub, ${user.name}!`);
          this.navigateAfterRegistration(user);
        },
        error: (error) => {
          this.isLoading = false;
          
          let errorMessage = 'Registration failed. Please try again.';
          if (error.message) {
            if (error.message.includes('email')) {
              errorMessage = 'This email is already registered. Please use a different email or try logging in.';
            } else if (error.message.includes('password')) {
              errorMessage = 'Password does not meet requirements. Please choose a stronger password.';
            } else {
              errorMessage = error.message;
            }
          }
          
          this.notificationService.error(errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched();
      this.notificationService.warning('Please fill in all required fields correctly');
    }
  }

  private navigateAfterRegistration(user: any): void {
    // Force navigation immediately
    const dashboardUrl = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/student';
    this.router.navigateByUrl(dashboardUrl);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${this.capitalizeFirst(fieldName)} is required`;
    }
    
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return `${this.capitalizeFirst(fieldName)} must be at least ${requiredLength} characters`;
    }

    if (control?.hasError('passwordStrength')) {
      return 'Password must contain uppercase, lowercase, number and be 6+ characters';
    }

    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }

    if (control?.hasError('requiredTrue')) {
      return 'You must accept the terms and conditions';
    }
    
    return '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.hidePassword = !this.hidePassword;
    } else {
      this.hideConfirmPassword = !this.hideConfirmPassword;
    }
  }

  getPasswordStrength(): string {
    const passwordControl = this.registerForm.get('password');
    if (!passwordControl?.value) return '';

    const password = passwordControl.value;
    const hasNumber = /[0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasMinLength = password.length >= 6;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasNumber, hasUpper, hasLower, hasMinLength, hasSpecial].filter(Boolean).length;

    if (score < 3) return 'weak';
    if (score < 4) return 'medium';
    return 'strong';
  }

  getPasswordStrengthColor(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return '#f5576c';
      case 'medium': return '#fcb69f';
      case 'strong': return '#4facfe';
      default: return '#e2e8f0';
    }
  }
}