import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';

import { CourseService, Course } from '../../../shared/services/course.service';
import { AuthService } from '../../../shared/services/auth.service';
import { CourseCardComponent } from '../../../shared/components/course-card/course-card.component';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    CourseCardComponent
  ],
  template: `
    <div class="courses-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="container">
          <h1>Explore Our Courses</h1>
          <p>Discover thousands of courses to advance your skills and career</p>
          
          <!-- Add Course Button for Admins -->
          <div class="header-actions" *ngIf="authService.isAdmin()">
            <button mat-raised-button 
                    routerLink="/courses/add" 
                    class="btn-gradient">
              <mat-icon>add</mat-icon>
              Add New Course
            </button>
          </div>
        </div>
      </div>

      <!-- Debug Info -->
      <div class="container" style="padding: 20px; background: #f0f0f0; margin: 20px auto; border-radius: 8px;">
        <h3>Debug Information:</h3>
        <p><strong>Loading:</strong> {{isLoading}}</p>
        <p><strong>Has Error:</strong> {{hasError}}</p>
        <p><strong>Error Message:</strong> {{errorMessage}}</p>
        <p><strong>All Courses Length:</strong> {{allCourses.length}}</p>
        <p><strong>Filtered Courses Length:</strong> {{filteredCourses.length}}</p>
        <p><strong>Categories Length:</strong> {{categories.length}}</p>
        <p><strong>Current User:</strong> {{authService.getCurrentUser()?.name || 'Not logged in'}}</p>
        
        <button mat-button (click)="debugLoadCourses()" style="margin: 10px;">
          🔄 Debug Load Courses
        </button>
        
        <button mat-button (click)="forceShowMockData()" style="margin: 10px;">
          🧪 Show Mock Data
        </button>
      </div>

      <!-- Results Section -->
      <div class="results-section">
        <div class="container">
          <!-- Results Header -->
          <div class="results-header">
            <h2>
              <span *ngIf="!isLoading && !hasError">
                {{filteredCourses.length}} courses found
              </span>
              <span *ngIf="isLoading">Loading courses...</span>
              <span *ngIf="hasError">Error loading courses</span>
            </h2>
          </div>

          <!-- Loading State -->
          <div class="loading-container" *ngIf="isLoading">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading courses...</p>
          </div>

          <!-- Error State -->
          <div class="error-state" *ngIf="hasError && !isLoading">
            <div class="error-content">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <h3>Oops! Something went wrong</h3>
              <p>{{errorMessage}}</p>
              <button mat-raised-button 
                      (click)="retryLoad()" 
                      class="btn-gradient">
                <mat-icon>refresh</mat-icon>
                Try Again
              </button>
            </div>
          </div>

          <!-- Courses Grid -->
          <div class="courses-grid grid grid-3" 
               *ngIf="!isLoading && !hasError && filteredCourses.length > 0">
            <app-course-card 
              *ngFor="let course of filteredCourses; trackBy: trackByCourse" 
              [course]="course"
              [isEnrolled]="isEnrolled(course.id)"
              class="fade-in-up">
            </app-course-card>
          </div>

          <!-- No Results -->
          <div class="empty-state" 
               *ngIf="!isLoading && !hasError && filteredCourses.length === 0">
            <mat-icon>search_off</mat-icon>
            <h3>No courses found</h3>
            <p>{{allCourses.length === 0 ? 'No courses available in the database' : 'Try adjusting your search criteria'}}</p>
            <button mat-raised-button 
                    (click)="forceShowMockData()" 
                    class="btn-gradient">
              <mat-icon>refresh</mat-icon>
              Show Sample Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private fb = inject(FormBuilder);
  protected authService = inject(AuthService);
  
  private destroy$ = new Subject<void>();

  filtersForm!: FormGroup;
  
  // Simple properties
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  categories: string[] = [];
  instructors: string[] = [];
  enrolledCourseIds: string[] = [];
  
  isLoading = true;
  hasError = false;
  errorMessage = '';

  ngOnInit() {
    console.log('🚀 CourseListComponent initialized');
    this.initializeForm();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filtersForm = this.fb.group({
      search: [''],
      category: [''],
      level: [''],
      instructor: [''],
      minPrice: [0],
      maxPrice: [500]
    });
  }

  private loadData(): void {
    console.log('📊 Loading course data...');
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // Load courses
    this.courseService.getAllCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          console.log('✅ Courses loaded:', courses.length);
          this.allCourses = courses;
          this.filteredCourses = [...courses];
          this.isLoading = false;
          this.extractInstructors();
        },
        error: (error) => {
          console.error('❌ Error loading courses:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to load courses. Please try again.';
          this.isLoading = false;
        }
      });

    // Load categories
    this.courseService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          console.log('✅ Categories loaded:', categories);
          this.categories = categories;
        },
        error: (error) => {
          console.error('❌ Error loading categories:', error);
          this.categories = ['Programming', 'Design', 'Business', 'Marketing'];
        }
      });

    // Load enrollments if student
    this.loadEnrollments();
  }

  private loadEnrollments(): void {
    if (this.authService.isStudent()) {
      this.authService.getEnrolledCourses()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (courseIds) => {
            console.log('✅ Enrollments loaded:', courseIds);
            this.enrolledCourseIds = courseIds;
          },
          error: (error) => {
            console.error('❌ Error loading enrollments:', error);
            this.enrolledCourseIds = [];
          }
        });
    }
  }

  private extractInstructors(): void {
    const instructorSet = new Set(this.allCourses.map(course => course.instructor));
    this.instructors = Array.from(instructorSet).sort();
  }

  // Debug methods
  debugLoadCourses(): void {
    console.log('🔧 Debug: Manual course load triggered');
    this.loadData();
  }

  forceShowMockData(): void {
    console.log('🧪 Debug: Forcing mock data display');
    this.isLoading = false;
    this.hasError = false;
    this.allCourses = [
      {
        id: 'mock-1',
        title: 'Mock JavaScript Course',
        description: 'This is a mock course for testing purposes.',
        instructor: 'Test Instructor',
        duration: '8 weeks',
        category: 'Programming',
        level: 'Beginner',
        price: 99.99,
        rating: 4.5,
        studentsEnrolled: 100,
        image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
        syllabus: ['Introduction', 'Basics', 'Advanced Topics'],
        prerequisites: ['None'],
        tags: ['JavaScript', 'Programming'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true
      }
    ];
    this.filteredCourses = [...this.allCourses];
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds.includes(courseId);
  }

  retryLoad(): void {
    console.log('🔄 Retrying data load...');
    this.loadData();
  }

  trackByCourse(index: number, course: Course): string {
    return course.id;
  }
}