import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, switchMap } from 'rxjs';

import { Course, CourseService } from '../../../shared/services/course.service';
import { AuthService } from '../../../shared/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  course$!: Observable<Course | undefined>;

  ngOnInit() {
    this.loadCourse();
  }

  private loadCourse(): void {
    this.course$ = this.route.params.pipe(
      switchMap(params => this.courseService.getCourseById(params['id']))
    );
  }

  get isEnrolled(): boolean {
    const courseId = this.route.snapshot.params['id'];
    return this.authService.isEnrolledInCourse(courseId);
  }

  enrollInCourse(): void {
    const courseId = this.route.snapshot.params['id'];
    
    if (!this.authService.getCurrentUser()) {
      this.notificationService.info('Please log in to enroll in courses');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.authService.isStudent()) {
      this.notificationService.warning('Only students can enroll in courses');
      return;
    }

    this.authService.enrollInCourse(courseId).subscribe({
      next: () => {
        this.notificationService.success('Successfully enrolled in course!');
      },
      error: (error) => {
        this.notificationService.error('Failed to enroll in course');
      }
    });
  }

  deleteCourse(): void {
    const courseId = this.route.snapshot.params['id'];
    
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      this.courseService.deleteCourse(courseId).subscribe({
        next: () => {
          this.notificationService.success('Course deleted successfully');
          this.router.navigate(['/courses']);
        },
        error: (error) => {
          this.notificationService.error('Failed to delete course');
        }
      });
    }
  }

  getFullStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(1);
  }

  hasPartialStar(rating: number): boolean {
    return rating % 1 !== 0;
  }

  getEmptyStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    const emptyCount = 5 - fullStars - (this.hasPartialStar(rating) ? 1 : 0);
    return Array(emptyCount).fill(0);
  }
}