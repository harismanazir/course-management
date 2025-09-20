import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';

import { AuthService, User } from '../../shared/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'app-profile',
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
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private loadingService = inject(LoadingService);

  currentUser$: Observable<User | null> = this.authService.currentUser$;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isEditingProfile = false;
  isChangingPassword = false;
  isLoading = false;

  // Add Math property to make it available in template
  Math = Math;

  ngOnInit() {
    this.initializeForms();
    this.loadUserData();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      avatar: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private loadUserData(): void {
    this.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          name: user.name,
          email: user.email,
          avatar: user.avatar || ''
        });
      }
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile) {
      this.loadUserData(); // Reset form if canceling
    }
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.loadingService.show();

      const updates = this.profileForm.value;
      
      this.authService.updateProfile(updates).subscribe({
        next: (updatedUser) => {
          this.notificationService.success('Profile updated successfully');
          this.isEditingProfile = false;
        },
        error: (error) => {
          this.notificationService.error('Failed to update profile');
        },
        complete: () => {
          this.isLoading = false;
          this.loadingService.hide();
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      this.loadingService.show();

      // Simulate password change (in real app, call actual API)
      setTimeout(() => {
        this.notificationService.success('Password changed successfully');
        this.passwordForm.reset();
        this.isChangingPassword = false;
        this.isLoading = false;
        this.loadingService.hide();
      }, 1000);
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    
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

    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  onDeleteAccount(): void {
    const confirmMessage = 'Are you sure you want to delete your account? This action cannot be undone and you will lose access to all your enrolled courses.';
    
    if (confirm(confirmMessage)) {
      // In a real app, implement account deletion
      this.notificationService.warning('Account deletion is not implemented in this demo');
    }
  }

  // Helper methods for template calculations
  getCompletedCourses(enrolledCount: number): number {
    return Math.floor(enrolledCount * 0.3);
  }

  getCertificates(enrolledCount: number): number {
    return Math.floor(enrolledCount * 0.3);
  }
}