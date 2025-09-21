import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Course } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './course-card.component.html',
  styleUrls: ['./course-card.component.css']
})
export class CourseCardComponent {
  @Input() course!: Course;
  @Input() showActions = true;
  @Input() showEnrollButton = true;
  @Input() isEnrolled = false;

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isLoading = false;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isStudent(): boolean {
    return this.authService.isStudent();
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  get ratingStars(): number[] {
    const fullStars = Math.floor(this.course.rating);
    return Array(fullStars).fill(1);
  }

  get hasPartialStar(): boolean {
    return this.course.rating % 1 !== 0;
  }

  get emptyStars(): number[] {
    const fullStars = Math.floor(this.course.rating);
    const emptyCount = 5 - fullStars - (this.hasPartialStar ? 1 : 0);
    return Array(emptyCount).fill(0);
  }

  onEnroll(): void {
    if (!this.isLoggedIn) {
      this.notificationService.info('Please log in to enroll in courses');
      return;
    }

    if (!this.isStudent) {
      this.notificationService.warning('Only students can enroll in courses');
      return;
    }

    this.isLoading = true;

    if (this.isEnrolled) {
      this.authService.unenrollFromCourse(this.course.id).subscribe({
        next: () => {
          this.notificationService.success('Successfully unenrolled from course');
          this.isEnrolled = false;
        },
        error: (error) => {
          this.notificationService.error('Failed to unenroll from course');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.authService.enrollInCourse(this.course.id).subscribe({
        next: () => {
          this.notificationService.success('Successfully enrolled in course!');
          this.isEnrolled = true;
        },
        error: (error) => {
          this.notificationService.error('Failed to enroll in course');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  formatDuration(duration: string): string {
    return duration
      .replace('weeks', 'wk')
      .replace('week', 'wk')
      .replace('months', 'mo')
      .replace('month', 'mo')
      .replace('days', 'd')
      .replace('day', 'd');
  }

  formatPrice(price: number): string {
    if (price === 0) return 'Free';
    if (price < 1000) return `$${price}`;
    return `$${(price / 1000).toFixed(1)}k`;
  }

  getLevelIcon(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'school';
      case 'intermediate':
        return 'psychology';
      case 'advanced':
        return 'rocket_launch';
      default:
        return 'signal_cellular_alt';
    }
  }

  getCategoryIcon(category: string): string {
    const categoryIcons: { [key: string]: string } = {
      'Programming': 'code',
      'Design': 'palette',
      'Business': 'business_center',
      'Marketing': 'campaign',
      'Data Science': 'analytics',
      'Web Development': 'web',
      'Mobile Development': 'phone_android',
      'DevOps': 'settings_applications',
      'Cybersecurity': 'security',
      'AI & Machine Learning': 'smart_toy',
      'Photography': 'camera_alt',
      'Music': 'music_note',
      'Language': 'translate',
      'Health & Fitness': 'fitness_center',
      'Finance': 'account_balance',
      'Personal Development': 'self_improvement',
      'default': 'category'
    };

    return categoryIcons[category] || categoryIcons['default'];
  }

  getLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'danger';
      default:
        return 'primary';
    }
  }

  getProgressPercentage(): number {
    // This would typically come from the enrollment data
    // For now, return a mock value
    return Math.floor(Math.random() * 100);
  }

  onBookmark(): void {
    // Future feature: Save course for later
    this.notificationService.info('Bookmark feature coming soon!');
  }
}