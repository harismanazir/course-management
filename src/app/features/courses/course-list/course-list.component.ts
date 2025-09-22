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
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, startWith, switchMap, tap } from 'rxjs/operators';

import { CourseService, Course, CourseFilters } from '../../../shared/services/course.service';
import { AuthService } from '../../../shared/services/auth.service';
import { CourseCardComponent } from '../../../shared/components/course-card/course-card.component';
import { DatabaseTestService } from '../../../shared/services/database-test.service';

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
  private dbTest = inject(DatabaseTestService);
  
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
    this.setupFilters();
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

  private setupFilters(): void {
    // Listen to form changes and apply filters
    this.filtersForm.valueChanges.pipe(
      startWith(this.filtersForm.value),
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      this.applyFilters(filters);
    });
  }

  private applyFilters(filters: any): void {
    if (!this.allCourses.length) return;

    this.filteredCourses = this.allCourses.filter(course => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          course.title,
          course.description,
          course.instructor,
          course.category,
          ...course.tags
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Category filter
      if (filters.category && course.category !== filters.category) {
        return false;
      }

      // Level filter
      if (filters.level && course.level !== filters.level) {
        return false;
      }

      // Instructor filter
      if (filters.instructor && course.instructor !== filters.instructor) {
        return false;
      }

      // Price range filter
      if (filters.minPrice !== undefined && course.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && course.price > filters.maxPrice) {
        return false;
      }

      return true;
    });

    console.log(`📊 Applied filters: ${this.filteredCourses.length} of ${this.allCourses.length} courses shown`);
  }

  private loadData(): void {
    console.log('📊 Loading course data...');
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // First test database connectivity
    this.dbTest.testCoursesTable()
      .pipe(
        tap(result => {
          console.log('✅ Database test passed:', result);
        }),
        switchMap(() => this.courseService.getAllCourses()),
        tap(courses => {
          console.log('✅ Courses loaded successfully:', courses.length);
          this.allCourses = courses;
          this.filteredCourses = [...courses];
          this.extractInstructors();
        }),
        switchMap(() => this.courseService.getCategories()),
        tap(categories => {
          console.log('✅ Categories loaded:', categories.length);
          this.categories = categories;
        }),
        switchMap(() => this.loadEnrollments()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          console.log('✅ All data loaded successfully');
          // Apply initial filters
          this.applyFilters(this.filtersForm.value);
        },
        error: (error) => {
          console.error('❌ Error loading data:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to load courses. Please check your database connection.';
          this.isLoading = false;
        }
      });
  }

  private loadEnrollments() {
    if (this.authService.isStudent()) {
      return this.authService.getEnrolledCourses().pipe(
        tap(courseIds => {
          console.log('✅ Enrollments loaded:', courseIds.length);
          this.enrolledCourseIds = courseIds;
        })
      );
    }
    return new Subject().asObservable(); // Return empty observable if not student
  }

  private extractInstructors(): void {
    const instructorSet = new Set(this.allCourses.map(course => course.instructor));
    this.instructors = Array.from(instructorSet).sort();
    console.log('✅ Instructors extracted:', this.instructors.length);
  }

  clearFilters(): void {
    console.log('🧹 Clearing all filters');
    this.filtersForm.reset({
      search: '',
      category: '',
      level: '',
      instructor: '',
      minPrice: 0,
      maxPrice: 500
    });
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

  // Debug methods (can be removed in production)
  debugLoadCourses(): void {
    console.log('🔧 Debug: Manual course load triggered');
    this.loadData();
  }

  testDatabaseConnection(): void {
    console.log('🔧 Debug: Testing database connection');
    this.dbTest.getAllTables().subscribe({
      next: (result) => {
        console.log('✅ Database test results:', result);
        alert('Database test completed. Check console for details.');
      },
      error: (error) => {
        console.error('❌ Database test failed:', error);
        alert('Database test failed. Check console for details.');
      }
    });
  }

  forceShowMockData(): void {
    console.log('🧪 Debug: Forcing mock data display');
    this.isLoading = false;
    this.hasError = false;
    this.allCourses = [
      {
        id: 'mock-1',
        title: 'Mock JavaScript Course',
        description: 'This is a mock course for testing purposes. Learn JavaScript from basics to advanced concepts.',
        instructor: 'Test Instructor',
        duration: '8 weeks',
        category: 'Programming',
        level: 'Beginner',
        price: 99.99,
        rating: 4.5,
        studentsEnrolled: 100,
        image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
        syllabus: ['Introduction to JavaScript', 'Variables and Functions', 'DOM Manipulation', 'Advanced Concepts'],
        prerequisites: ['Basic HTML knowledge', 'Computer literacy'],
        tags: ['JavaScript', 'Programming', 'Web Development'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true
      }
    ];
    this.filteredCourses = [...this.allCourses];
    this.extractInstructors();
  }
}