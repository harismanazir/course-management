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
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, debounceTime } from 'rxjs/operators';

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
    this.courses$ = this.courseService.getAllCourses();
    this.categories$ = this.courseService.getCategories();
    this.instructors$ = this.courseService.getInstructors();
  }

  private loadEnrollments(): void {
    if (this.authService.isStudent()) {
      this.authService.getEnrolledCourses().subscribe(courseIds => {
        this.enrolledCourseIds = courseIds;
      });
    }
  }

  private setupFiltering(): void {
    const filters$ = this.filtersForm.valueChanges.pipe(
      startWith(this.filtersForm.value),
      debounceTime(300)
    );

    this.filteredCourses$ = combineLatest([
      this.courses$,
      filters$
    ]).pipe(
      map(([courses, filters]) => {
        this.isLoadingSubject.next(true);
        
        let filtered = courses;

        // Search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
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

        setTimeout(() => this.isLoadingSubject.next(false), 500);
        return filtered;
      })
    );
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds.includes(courseId);
  }

  clearFilters(): void {
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