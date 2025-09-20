import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, map, combineLatest, switchMap, of } from 'rxjs';

import { AuthService, User } from '../../../shared/services/auth.service';
import { CourseService, Course } from '../../../shared/services/course.service';
import { CourseCardComponent } from '../../../shared/components/course-card/course-card.component';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatBadgeModule,
    CourseCardComponent
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private courseService = inject(CourseService);

  currentUser$: Observable<User | null> = this.authService.currentUser$;
  enrolledCourses$!: Observable<Course[]>;
  recommendedCourses$!: Observable<Course[]>;
  
  learningStats$ = this.authService.getEnrolledCourses().pipe(
    switchMap((courseIds: string[]) => {
      if (courseIds.length === 0) {
        return of({
          totalEnrolled: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          totalHours: 0,
          certificates: 0
        });
      }

      return this.courseService.getCoursesByIds(courseIds).pipe(
        map(courses => ({
          totalEnrolled: courses.length,
          completedCourses: Math.floor(courses.length * 0.3),
          inProgressCourses: Math.ceil(courses.length * 0.7),
          totalHours: courses.reduce((total, course) => {
            const weeks = parseInt(course.duration.split(' ')[0]) || 0;
            return total + (weeks * 4);
          }, 0),
          certificates: Math.floor(courses.length * 0.3)
        }))
      );
    })
  );

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Load enrolled courses with real data
    this.enrolledCourses$ = this.authService.getEnrolledCourses().pipe(
      switchMap((courseIds: string[]) => 
        courseIds.length > 0 
          ? this.courseService.getCoursesByIds(courseIds)
          : of([])
      )
    );

    // Load recommended courses (exclude enrolled ones)
    this.recommendedCourses$ = combineLatest([
      this.authService.getEnrolledCourses(),
      this.courseService.getPopularCourses(6)
    ]).pipe(
      map(([enrolledIds, popularCourses]) => 
        popularCourses.filter(course => !enrolledIds.includes(course.id))
      )
    );
  }

  getProgressPercentage(course: Course): number {
    // Mock progress calculation
    return Math.floor(Math.random() * 100);
  }

  getCourseStatus(course: Course): string {
    const progress = this.getProgressPercentage(course);
    if (progress === 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Not Started';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'primary';
      case 'Not Started': return 'warn';
      default: return 'primary';
    }
  }
}