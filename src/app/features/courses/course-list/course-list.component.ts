import { Component, OnInit, inject } from '@angular/core';
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
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, startWith, debounceTime, catchError, tap } from 'rxjs/operators';

import { CourseService, Course, CourseFilters } from '../../../shared/services/course.service';
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
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);
  private fb = inject(FormBuilder);
  protected authService = inject(AuthService);

  filtersForm!: FormGroup;
  courses$!: Observable<Course[]>;
  filteredCourses$!: Observable<Course[]>;
  categories$!: Observable<string[]>;
  instructors$!: Observable<string[]>;
  
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  isLoading$ = this.isLoadingSubject.asObservable();
  
  private enrolledCourseIds: string[] = [];

  ngOnInit() {
    console.log('CourseListComponent initialized');
    this.initializeForm();
    this.loadData();
    this.setupFiltering();
    this.loadEnrollments();
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
    console.log('Loading course data...');
    
    // Load courses with error handling
    this.courses$ = this.courseService.getAllCourses().pipe(
      tap(courses => {
        console.log('Courses loaded:', courses);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading courses:', error);
        this.isLoadingSubject.next(false);
        return of([]); // Return empty array on error
      })
    );
    
    // Load categories with error handling
    this.categories$ = this.courseService.getCategories().pipe(
      tap(categories => console.log('Categories loaded:', categories)),
      catchError(error => {
        console.error('Error loading categories:', error);
        return of([]); // Return empty array on error
      })
    );
    
    // Load instructors with error handling
    this.instructors$ = this.courseService.getInstructors().pipe(
      tap(instructors => console.log('Instructors loaded:', instructors)),
      catchError(error => {
        console.error('Error loading instructors:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  private loadEnrollments(): void {
    if (this.authService.isStudent()) {
      this.authService.getEnrolledCourses().subscribe({
        next: courseIds => {
          this.enrolledCourseIds = courseIds;
          console.log('Enrolled course IDs:', courseIds);
        },
        error: error => {
          console.error('Error loading enrollments:', error);
        }
      });
    }
  }

  private setupFiltering(): void {
    const filters$ = this.filtersForm.valueChanges.pipe(
      startWith(this.filtersForm.value),
      debounceTime(300),
      tap(filters => console.log('Filters changed:', filters))
    );

    this.filteredCourses$ = combineLatest([
      this.courses$,
      filters$
    ]).pipe(
      map(([courses, filters]) => {
        console.log('Filtering courses:', { coursesCount: courses.length, filters });
        
        if (!courses || courses.length === 0) {
          console.log('No courses to filter');
          return [];
        }

        let filtered = courses;

        // Search filter
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase().trim();
          filtered = filtered.filter(course =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.instructor.toLowerCase().includes(searchTerm) ||
            course.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
          );
          console.log(`After search filter (${searchTerm}):`, filtered.length);
        }

        // Category filter
        if (filters.category) {
          filtered = filtered.filter(course => course.category === filters.category);
          console.log(`After category filter (${filters.category}):`, filtered.length);
        }

        // Level filter
        if (filters.level) {
          filtered = filtered.filter(course => course.level === filters.level);
          console.log(`After level filter (${filters.level}):`, filtered.length);
        }

        // Instructor filter
        if (filters.instructor) {
          filtered = filtered.filter(course => course.instructor === filters.instructor);
          console.log(`After instructor filter (${filters.instructor}):`, filtered.length);
        }

        // Price range filter
        if (filters.minPrice !== null && filters.maxPrice !== null) {
          filtered = filtered.filter(course => 
            course.price >= filters.minPrice && course.price <= filters.maxPrice
          );
          console.log(`After price filter (${filters.minPrice}-${filters.maxPrice}):`, filtered.length);
        }

        console.log('Final filtered courses:', filtered);
        return filtered;
      }),
      catchError(error => {
        console.error('Error in filtering:', error);
        return of([]);
      })
    );
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds.includes(courseId);
  }

  clearFilters(): void {
    console.log('Clearing filters');
    this.filtersForm.reset({
      search: '',
      category: '',
      level: '',
      instructor: '',
      minPrice: 0,
      maxPrice: 500
    });
  }

  trackByCourse(index: number, course: Course): string {
    return course.id;
  }
}