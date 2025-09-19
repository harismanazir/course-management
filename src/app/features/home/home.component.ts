import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Observable } from 'rxjs';

import { CourseService, Course } from '../../shared/services/course.service';
import { AuthService, User } from '../../shared/services/auth.service';
import { CourseCardComponent } from '../../shared/components/course-card/course-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    CourseCardComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private courseService = inject(CourseService);
  private authService = inject(AuthService);

  featuredCourses$!: Observable<Course[]>;
  currentUser$: Observable<User | null> = this.authService.currentUser$;
  isLoggedIn$: Observable<boolean> = this.authService.isLoggedIn$;

  stats = {
    totalCourses: 0,
    totalStudents: 0,
    averageRating: 0,
    categoriesCount: 0
  };

  features = [
    {
      icon: 'school',
      title: 'Expert Instructors',
      description: 'Learn from industry professionals with years of experience'
    },
    {
      icon: 'devices',
      title: 'Multi-Device Access',
      description: 'Access your courses on any device, anywhere, anytime'
    },
    {
      icon: 'verified',
      title: 'Certificates',
      description: 'Earn certificates upon successful completion of courses'
    },
    {
      icon: 'support',
      title: '24/7 Support',
      description: 'Get help whenever you need it with our dedicated support team'
    }
  ];

  ngOnInit() {
    this.loadFeaturedCourses();
    this.loadStats();
  }

  private loadFeaturedCourses(): void {
    this.featuredCourses$ = this.courseService.getFeaturedCourses(6);
  }

  private loadStats(): void {
    this.courseService.getCourseStats().subscribe(stats => {
      this.stats = {
        ...stats,
        averageRating: Math.round(stats.averageRating * 10) / 10
      };
    });
  }

  trackByFeature(index: number, feature: any): string {
    return feature.title;
  }

  trackByCourse(index: number, course: Course): string {
    return course.id;
  }
}