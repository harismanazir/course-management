import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Course } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-card class="course-card">
      <div class="course-image-container">
        <img [src]="course.image" [alt]="course.title" class="course-image">
        <div class="price-badge">{{formatPrice(course.price)}}</div>
      </div>
      
      <mat-card-content>
        <div class="course-header">
          <span class="course-category">{{course.category}}</span>
          <span class="course-level">{{course.level}}</span>
        </div>
        
        <h3 class="course-title">{{course.title}}</h3>
        <p class="course-description">{{course.description | slice:0:100}}{{course.description.length > 100 ? '...' : ''}}</p>
        
        <div class="course-meta">
          <span class="instructor">👨‍🏫 {{course.instructor}}</span>
          <span class="duration">⏱️ {{course.duration}}</span>
          <span class="students">👥 {{course.studentsEnrolled}} students</span>
          <span class="rating">⭐ {{course.rating}}/5</span>
        </div>
      </mat-card-content>
      
      <mat-card-actions>
        <button mat-button [routerLink]="['/courses', course.id]">
          <mat-icon>visibility</mat-icon>
          View Details
        </button>
        
        <button mat-raised-button 
                *ngIf="isStudent && showEnrollButton"
                (click)="onEnroll()"
                [color]="isEnrolled ? 'accent' : 'primary'">
          <mat-icon>{{isEnrolled ? 'check' : 'add'}}</mat-icon>
          {{isEnrolled ? 'Enrolled' : 'Enroll'}}
        </button>
        
        <button mat-raised-button 
                [routerLink]="['/courses/edit', course.id]"
                *ngIf="isAdmin"
                color="warn">
          <mat-icon>edit</mat-icon>
          Edit
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .course-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .course-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    
    .course-image-container {
      position: relative;
      height: 200px;
      overflow: hidden;
    }
    
    .course-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .price-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #4F46E5;
      color: white;
      padding: 6px 12px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .course-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .course-category {
      background: #E5E7EB;
      color: #374151;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .course-level {
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      background: #DBEAFE;
      color: #1E40AF;
    }
    
    .course-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 8px 0;
      line-height: 1.4;
      color: #111827;
    }
    
    .course-description {
      color: #6B7280;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    
    .course-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 0.75rem;
      color: #6B7280;
      margin-bottom: 16px;
    }
    
    .course-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    mat-card-content {
      flex: 1;
      padding: 16px;
    }
    
    mat-card-actions {
      padding: 16px;
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }
    
    .price-badge.free {
      background: #10B981;
    }
  `]
})
export class CourseCardComponent {
  @Input() course!: Course;
  @Input() showActions = true;
  @Input() showEnrollButton = true;
  @Input() isEnrolled = false;

  private authService = inject(AuthService);

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isStudent(): boolean {
    return this.authService.isStudent();
  }

  formatPrice(price: number): string {
    if (price === 0) return 'Free';
    return `${price}`;
  }

  onEnroll(): void {
    console.log('Enroll clicked for course:', this.course.id);
    // For now, just log - the actual enrollment will be handled by parent component
  }
}