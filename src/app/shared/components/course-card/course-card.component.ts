import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

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
    MatBadgeModule
  ],
  templateUrl: './course-card.component.html',
  styleUrls: ['./course-card.component.css']
})
export class CourseCardComponent {
  @Input() course!: Course;
  @Input() showActions = true;
  @Input() showEnrollButton = true;

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  get isEnrolled(): boolean {
    return this.authService.isEnrolledInCourse(this.course.id);
  }

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

  get levelColor(): string {
    switch (this.course.level) {
      case 'Beginner':
        return 'success';
      case 'Intermediate':
        return 'warning';
      case 'Advanced':
        return 'danger';
      default:
        return 'primary';
    }
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

    if (this.isEnrolled) {
      this.authService.unenrollFromCourse(this.course.id).subscribe({
        next: () => {
          this.notificationService.success('Successfully unenrolled from course');
        },
        error: (error) => {
          this.notificationService.error('Failed to unenroll from course');
        }
      });
    } else {
      this.authService.enrollInCourse(this.course.id).subscribe({
        next: () => {
          this.notificationService.success('Successfully enrolled in course!');
        },
        error: (error) => {
          this.notificationService.error('Failed to enroll in course');
        }
      });
    }
  }

  formatDuration(duration: string): string {
    return duration.replace('weeks', 'wk').replace('week', 'wk');
  }

  formatPrice(price: number): string {
    return price === 0 ? 'Free' : `$${price}`;
  }
}