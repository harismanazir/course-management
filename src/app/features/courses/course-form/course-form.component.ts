import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, switchMap, of } from 'rxjs';

import { Course, CourseService } from '../../../shared/services/course.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { LoadingService } from '../../../shared/services/loading.service';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css']
})
export class CourseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  private notificationService = inject(NotificationService);
  private loadingService = inject(LoadingService);

  courseForm!: FormGroup;
  categories$!: Observable<string[]>;
  isEditMode = false;
  courseId: string | null = null;
  isLoading = false;

  levels = ['Beginner', 'Intermediate', 'Advanced'];

  ngOnInit() {
    this.initializeForm();
    this.loadData();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      instructor: ['', [Validators.required]],
      duration: ['', [Validators.required]],
      category: ['', [Validators.required]],
      level: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      image: ['', [Validators.required]],
      syllabus: this.fb.array([]),
      prerequisites: this.fb.array([]),
      tags: this.fb.array([]),
      isPublished: [true]
    });

    // Initialize with at least one empty item for each array
    this.addSyllabusItem();
    this.addPrerequisiteItem();
    this.addTagItem();
  }

  private loadData(): void {
    this.categories$ = this.courseService.getCategories();
  }

  private checkEditMode(): void {
    this.courseId = this.route.snapshot.params['id'];
    if (this.courseId) {
      this.isEditMode = true;
      this.loadCourseForEdit();
    }
  }

  private loadCourseForEdit(): void {
    if (!this.courseId) return;

    this.isLoading = true;
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        if (course) {
          this.populateForm(course);
        } else {
          this.notificationService.error('Course not found');
          this.router.navigate(['/courses']);
        }
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.error('Failed to load course');
        this.isLoading = false;
        this.router.navigate(['/courses']);
      }
    });
  }

  private populateForm(course: Course): void {
    // Clear existing arrays
    this.clearFormArray('syllabus');
    this.clearFormArray('prerequisites');
    this.clearFormArray('tags');

    // Populate basic fields
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      duration: course.duration,
      category: course.category,
      level: course.level,
      price: course.price,
      image: course.image,
      isPublished: course.isPublished
    });

    // Populate arrays
    course.syllabus.forEach(item => this.addSyllabusItem(item));
    course.prerequisites.forEach(item => this.addPrerequisiteItem(item));
    course.tags.forEach(item => this.addTagItem(item));
  }

  // Form Array Getters
  get syllabusArray(): FormArray {
    return this.courseForm.get('syllabus') as FormArray;
  }

  get prerequisitesArray(): FormArray {
    return this.courseForm.get('prerequisites') as FormArray;
  }

  get tagsArray(): FormArray {
    return this.courseForm.get('tags') as FormArray;
  }

  // Form Array Methods
  addSyllabusItem(value: string = ''): void {
    this.syllabusArray.push(this.fb.control(value, [Validators.required]));
  }

  removeSyllabusItem(index: number): void {
    if (this.syllabusArray.length > 1) {
      this.syllabusArray.removeAt(index);
    }
  }

  addPrerequisiteItem(value: string = ''): void {
    this.prerequisitesArray.push(this.fb.control(value, [Validators.required]));
  }

  removePrerequisiteItem(index: number): void {
    if (this.prerequisitesArray.length > 1) {
      this.prerequisitesArray.removeAt(index);
    }
  }

  addTagItem(value: string = ''): void {
    this.tagsArray.push(this.fb.control(value, [Validators.required]));
  }

  removeTagItem(index: number): void {
    if (this.tagsArray.length > 1) {
      this.tagsArray.removeAt(index);
    }
  }

  private clearFormArray(arrayName: string): void {
    const array = this.courseForm.get(arrayName) as FormArray;
    while (array.length !== 0) {
      array.removeAt(0);
    }
  }

  onSubmit(): void {
    if (this.courseForm.valid) {
      this.isLoading = true;
      this.loadingService.show();

      const formData = this.prepareFormData();

      const operation = this.isEditMode
        ? this.courseService.updateCourse(this.courseId!, formData)
        : this.courseService.createCourse(formData);

      operation.subscribe({
        next: (course) => {
          const message = this.isEditMode 
            ? 'Course updated successfully' 
            : 'Course created successfully';
          this.notificationService.success(message);
          this.router.navigate(['/courses', course.id]);
        },
        error: (error) => {
          const message = this.isEditMode 
            ? 'Failed to update course' 
            : 'Failed to create course';
          this.notificationService.error(message);
        },
        complete: () => {
          this.isLoading = false;
          this.loadingService.hide();
        }
      });
    } else {
      this.markFormGroupTouched();
      this.notificationService.warning('Please fill in all required fields');
    }
  }

  private prepareFormData(): any {
    const formValue = this.courseForm.value;
    
    return {
      ...formValue,
      syllabus: formValue.syllabus.filter((item: string) => item.trim()),
      prerequisites: formValue.prerequisites.filter((item: string) => item.trim()),
      tags: formValue.tags.filter((item: string) => item.trim())
    };
  }

  private markFormGroupTouched(): void {
    Object.keys(this.courseForm.controls).forEach(key => {
      const control = this.courseForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          arrayControl.markAsTouched();
        });
      }
    });
  }

  getErrorMessage(fieldName: string, index?: number): string {
    let control;
    
    if (index !== undefined) {
      const array = this.courseForm.get(fieldName) as FormArray;
      control = array.at(index);
    } else {
      control = this.courseForm.get(fieldName);
    }

    if (control?.hasError('required')) {
      return `${this.capitalizeFirst(fieldName)} is required`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return `${this.capitalizeFirst(fieldName)} must be at least ${requiredLength} characters`;
    }
    
    if (control?.hasError('min')) {
      return `${this.capitalizeFirst(fieldName)} must be greater than or equal to 0`;
    }
    
    return '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  onCancel(): void {
    if (this.isEditMode && this.courseId) {
      this.router.navigate(['/courses', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }
}