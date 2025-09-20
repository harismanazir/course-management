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
import { BehaviorSubject, Subject } from 'rxjs';
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
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private fb = inject(FormBuilder);
  protected authService = inject(AuthService);
  
  private destroy$ = new Subject<void>();

  filtersForm!: FormGroup;
  
  // Simple properties instead of complex observables
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
    this.setupFiltering();
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

  private setupFiltering(): void {
    this.filtersForm.valueChanges
      .pipe(
        startWith(this.filtersForm.value),
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(filters => {
        console.log('🔍 Applying filters:', filters);
        this.applyFilters(filters);
      });
  }

  private applyFilters(filters: any): void {
    let filtered = [...this.allCourses];

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm) ||
        course.description.toLowerCase().includes(searchTerm) ||
        course.instructor.toLowerCase().includes(searchTerm) ||
        course.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(course => course.category === filters.category);
    }

    // Level filter
    if (filters.level) {
      filtered = filtered.filter(course => course.level === filters.level);
    }

    // Instructor filter
    if (filters.instructor) {
      filtered = filtered.filter(course => course.instructor === filters.instructor);
    }

    // Price range filter
    if (filters.minPrice !== null && filters.maxPrice !== null) {
      filtered = filtered.filter(course => 
        course.price >= filters.minPrice && course.price <= filters.maxPrice
      );
    }

    this.filteredCourses = filtered;
    console.log(`📋 Filtered ${filtered.length} courses from ${this.allCourses.length} total`);
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds.includes(courseId);
  }

  clearFilters(): void {
    console.log('🧹 Clearing filters');
    this.filtersForm.reset({
      search: '',
      category: '',
      level: '',
      instructor: '',
      minPrice: 0,
      maxPrice: 500
    });
  }

  retryLoad(): void {
    console.log('🔄 Retrying data load...');
    this.loadData();
  }

  trackByCourse(index: number, course: Course): string {
    return course.id;
  }
}