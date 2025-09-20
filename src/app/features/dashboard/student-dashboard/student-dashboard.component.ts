import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, map, combineLatest } from 'rxjs';

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
  
  learningStats$ = combineLatest([
    this.currentUser$,
    this.courseService.getAllCourses()
  ]).pipe(
    map(([user, allCourses]) => {
      if (!user || !user.enrolledCourses) {
        return {
          totalEnrolled: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          totalHours: 0,
          certificates: 0
        };
      }

      const enrolledCourses = allCourses.filter(course => 
        user.enrolledCourses?.includes(course.id)
      );

      return {
        totalEnrolled: enrolledCourses.length,
        completedCourses: Math.floor(enrolledCourses.length * 0.3), // Mock completion
        inProgressCourses: Math.ceil(enrolledCourses.length * 0.7),
        totalHours: enrolledCourses.reduce((total, course) => {
          const weeks = parseInt(course.duration.split(' ')[0]) || 0;
          return total + (weeks * 4); // Assume 4 hours per week
        }, 0),
        certificates: Math.floor(enrolledCourses.length * 0.3)
      };
    })
  );

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Load enrolled courses
    this.enrolledCourses$ = combineLatest([
      this.currentUser$,
      this.courseService.getAllCourses()
    ]).pipe(
      map(([user, allCourses]) => {
        if (!user || !user.enrolledCourses) return [];
        return allCourses.filter(course => 
          user.enrolledCourses?.includes(course.id)
        );
      })
    );

    // Load recommended courses (courses not enrolled in)
    this.recommendedCourses$ = combineLatest([
      this.currentUser$,
      this.courseService.getPopularCourses(6)
    ]).pipe(
      map(([user, popularCourses]) => {
        if (!user || !user.enrolledCourses) return popularCourses;
        return popularCourses.filter(course => 
          !user.enrolledCourses?.includes(course.id)
        );
      })
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