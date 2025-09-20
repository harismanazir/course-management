import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, map, combineLatest } from 'rxjs';

import { AuthService, User } from '../../../shared/services/auth.service';
import { CourseService, Course } from '../../../shared/services/course.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private courseService = inject(CourseService);
  private notificationService = inject(NotificationService);

  currentUser$: Observable<User | null> = this.authService.currentUser$;
  allCourses$!: Observable<Course[]>;
  
  adminStats$ = combineLatest([
    this.courseService.getAllCourses(),
    this.courseService.getCategories()
  ]).pipe(
    map(([courses, categories]) => {
      const totalStudents = courses.reduce((total, course) => total + course.studentsEnrolled, 0);
      const publishedCourses = courses.filter(course => course.isPublished).length;
      const averageRating = courses.length > 0 ? courses.reduce((total, course) => total + course.rating, 0) / courses.length : 0;
      
      return {
        totalCourses: courses.length,
        publishedCourses,
        totalStudents,
        totalCategories: categories.length,
        averageRating: Math.round(averageRating * 10) / 10,
        recentCourses: courses
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
      };
    })
  );

  displayedColumns: string[] = ['title', 'instructor', 'category', 'level', 'students', 'rating', 'status', 'actions'];

  // Add Math property to make it available in template
  Math = Math;

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.allCourses$ = this.courseService.getAllCourses();
  }

  editCourse(courseId: string): void {
    // Navigation handled by routerLink in template
  }

  deleteCourse(course: Course): void {
    if (confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
      this.courseService.deleteCourse(course.id).subscribe({
        next: () => {
          this.notificationService.success(`Course "${course.title}" deleted successfully`);
          this.loadDashboardData();
        },
        error: (error) => {
          this.notificationService.error('Failed to delete course');
        }
      });
    }
  }

  toggleCourseStatus(course: Course): void {
    const updatedStatus = !course.isPublished;
    this.courseService.updateCourse(course.id, { isPublished: updatedStatus }).subscribe({
      next: () => {
        const status = updatedStatus ? 'published' : 'unpublished';
        this.notificationService.success(`Course ${status} successfully`);
        this.loadDashboardData();
      },
      error: (error) => {
        this.notificationService.error('Failed to update course status');
      }
    });
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'danger';
      default: return 'primary';
    }
  }

  getStatusColor(isPublished: boolean): string {
    return isPublished ? 'success' : 'warn';
  }

  getStatusText(isPublished: boolean): string {
    return isPublished ? 'Published' : 'Draft';
  }

  formatPrice(price: number): string {
    return price === 0 ? 'Free' : `${price}`;
  }
}