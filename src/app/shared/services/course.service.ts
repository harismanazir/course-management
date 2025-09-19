import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  rating: number;
  studentsEnrolled: number;
  image: string;
  syllabus: string[];
  prerequisites: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
}

export interface CourseFilters {
  category?: string;
  level?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  instructor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private coursesSubject = new BehaviorSubject<Course[]>([]);
  public courses$ = this.coursesSubject.asObservable();

  private categoriesSubject = new BehaviorSubject<string[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  private mockCourses: Course[] = [
    {
      id: '1',
      title: 'Complete Angular Development',
      description: 'Master Angular from basics to advanced concepts with hands-on projects and real-world applications.',
      instructor: 'Dr. Sarah Johnson',
      duration: '12 weeks',
      category: 'Web Development',
      level: 'Intermediate',
      price: 299,
      rating: 4.8,
      studentsEnrolled: 1247,
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop',
      syllabus: [
        'Introduction to Angular and TypeScript',
        'Components and Data Binding',
        'Services and Dependency Injection',
        'Routing and Navigation',
        'Forms and Validation',
        'HTTP Client and APIs',
        'State Management with NgRx',
        'Testing and Deployment'
      ],
      prerequisites: ['Basic JavaScript', 'HTML/CSS', 'TypeScript (recommended)'],
      tags: ['angular', 'typescript', 'web-development', 'frontend'],
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-01-10'),
      isPublished: true
    },
    {
      id: '2',
      title: 'Python for Data Science',
      description: 'Learn Python programming with focus on data analysis, machine learning, and scientific computing.',
      instructor: 'Prof. Michael Chen',
      duration: '10 weeks',
      category: 'Data Science',
      level: 'Beginner',
      price: 249,
      rating: 4.9,
      studentsEnrolled: 2156,
      image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop',
      syllabus: [
        'Python Basics and Syntax',
        'Data Structures and Libraries',
        'NumPy and Pandas',
        'Data Visualization with Matplotlib',
        'Statistical Analysis',
        'Introduction to Machine Learning',
        'Scikit-learn Fundamentals',
        'Real-world Projects'
      ],
      prerequisites: ['Basic programming knowledge', 'High school mathematics'],
      tags: ['python', 'data-science', 'machine-learning', 'analytics'],
      createdAt: new Date('2023-02-20'),
      updatedAt: new Date('2024-01-15'),
      isPublished: true
    },
    {
      id: '3',
      title: 'Advanced React Development',
      description: 'Deep dive into React ecosystem with Redux, TypeScript, testing, and performance optimization.',
      instructor: 'Alex Rodriguez',
      duration: '8 weeks',
      category: 'Web Development',
      level: 'Advanced',
      price: 399,
      rating: 4.7,
      studentsEnrolled: 856,
      image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
      syllabus: [
        'Advanced React Patterns',
        'State Management with Redux Toolkit',
        'TypeScript with React',
        'Performance Optimization',
        'Testing Strategies',
        'Server-side Rendering',
        'GraphQL Integration',
        'Production Deployment'
      ],
      prerequisites: ['Solid React experience', 'JavaScript ES6+', 'Basic TypeScript'],
      tags: ['react', 'redux', 'typescript', 'frontend', 'advanced'],
      createdAt: new Date('2023-03-10'),
      updatedAt: new Date('2024-01-05'),
      isPublished: true
    },
    {
      id: '4',
      title: 'Mobile App Development with Flutter',
      description: 'Build beautiful, native mobile apps for iOS and Android using Google\'s Flutter framework.',
      instructor: 'Emma Thompson',
      duration: '14 weeks',
      category: 'Mobile Development',
      level: 'Intermediate',
      price: 349,
      rating: 4.6,
      studentsEnrolled: 967,
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop',
      syllabus: [
        'Introduction to Flutter and Dart',
        'Widget System and Layouts',
        'State Management Solutions',
        'Navigation and Routing',
        'Working with APIs',
        'Local Storage and Databases',
        'Platform-specific Features',
        'App Store Deployment'
      ],
      prerequisites: ['Basic programming experience', 'Object-oriented concepts'],
      tags: ['flutter', 'dart', 'mobile', 'ios', 'android'],
      createdAt: new Date('2023-04-05'),
      updatedAt: new Date('2024-01-20'),
      isPublished: true
    },
    {
      id: '5',
      title: 'DevOps and Cloud Computing',
      description: 'Master modern DevOps practices with Docker, Kubernetes, CI/CD, and cloud platforms.',
      instructor: 'Robert Kim',
      duration: '16 weeks',
      category: 'DevOps',
      level: 'Advanced',
      price: 449,
      rating: 4.8,
      studentsEnrolled: 743,
      image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=250&fit=crop',
      syllabus: [
        'DevOps Fundamentals',
        'Containerization with Docker',
        'Container Orchestration with Kubernetes',
        'CI/CD Pipelines',
        'Infrastructure as Code',
        'Monitoring and Logging',
        'Cloud Platforms (AWS/Azure)',
        'Security Best Practices'
      ],
      prerequisites: ['Linux basics', 'Command line experience', 'Basic networking'],
      tags: ['devops', 'docker', 'kubernetes', 'cloud', 'aws'],
      createdAt: new Date('2023-05-15'),
      updatedAt: new Date('2024-01-12'),
      isPublished: true
    },
    {
      id: '6',
      title: 'UI/UX Design Fundamentals',
      description: 'Learn user interface and user experience design principles with practical design projects.',
      instructor: 'Jessica Liu',
      duration: '6 weeks',
      category: 'Design',
      level: 'Beginner',
      price: 199,
      rating: 4.7,
      studentsEnrolled: 1532,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop',
      syllabus: [
        'Design Thinking Process',
        'User Research Methods',
        'Wireframing and Prototyping',
        'Visual Design Principles',
        'Color Theory and Typography',
        'Usability Testing',
        'Design Tools (Figma, Adobe XD)',
        'Portfolio Development'
      ],
      prerequisites: ['No prior experience required', 'Creative mindset'],
      tags: ['ui', 'ux', 'design', 'figma', 'prototyping'],
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date('2024-01-08'),
      isPublished: true
    }
  ];

  private mockCategories = [
    'Web Development',
    'Data Science',
    'Mobile Development',
    'DevOps',
    'Design',
    'Machine Learning',
    'Cybersecurity',
    'Database',
    'Game Development',
    'Blockchain'
  ];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.coursesSubject.next(this.mockCourses);
    this.categoriesSubject.next(this.mockCategories);
  }

  getAllCourses(filters?: CourseFilters): Observable<Course[]> {
    return of(this.mockCourses).pipe(
      delay(800),
      map(courses => {
        let filteredCourses = courses.filter(course => course.isPublished);

        if (filters) {
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredCourses = filteredCourses.filter(course =>
              course.title.toLowerCase().includes(searchTerm) ||
              course.description.toLowerCase().includes(searchTerm) ||
              course.instructor.toLowerCase().includes(searchTerm) ||
              course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
          }

          if (filters.category) {
            filteredCourses = filteredCourses.filter(course => course.category === filters.category);
          }

          if (filters.level) {
            filteredCourses = filteredCourses.filter(course => course.level === filters.level);
          }

          if (filters.instructor) {
            filteredCourses = filteredCourses.filter(course => 
              course.instructor.toLowerCase().includes(filters.instructor!.toLowerCase())
            );
          }

          if (filters.minPrice !== undefined) {
            filteredCourses = filteredCourses.filter(course => course.price >= filters.minPrice!);
          }

          if (filters.maxPrice !== undefined) {
            filteredCourses = filteredCourses.filter(course => course.price <= filters.maxPrice!);
          }
        }

        return filteredCourses;
      }),
      tap(courses => this.coursesSubject.next(courses))
    );
  }

  getCourseById(id: string): Observable<Course | undefined> {
    return of(this.mockCourses.find(course => course.id === id)).pipe(
      delay(500)
    );
  }

  createCourse(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'studentsEnrolled' | 'rating'>): Observable<Course> {
    const newCourse: Course = {
      ...courseData,
      id: Date.now().toString(),
      rating: 0,
      studentsEnrolled: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true
    };

    return of(newCourse).pipe(
      delay(1000),
      tap(course => {
        this.mockCourses.unshift(course);
        this.coursesSubject.next([...this.mockCourses]);
      })
    );
  }

  updateCourse(id: string, updates: Partial<Course>): Observable<Course> {
    const courseIndex = this.mockCourses.findIndex(course => course.id === id);
    
    if (courseIndex === -1) {
      return throwError(() => new Error('Course not found'));
    }

    return of(null).pipe(
      delay(800),
      tap(() => {
        this.mockCourses[courseIndex] = {
          ...this.mockCourses[courseIndex],
          ...updates,
          updatedAt: new Date()
        };
        this.coursesSubject.next([...this.mockCourses]);
      }),
      map(() => this.mockCourses[courseIndex])
    );
  }

  deleteCourse(id: string): Observable<boolean> {
    const courseIndex = this.mockCourses.findIndex(course => course.id === id);
    
    if (courseIndex === -1) {
      return throwError(() => new Error('Course not found'));
    }

    return of(true).pipe(
      delay(500),
      tap(() => {
        this.mockCourses.splice(courseIndex, 1);
        this.coursesSubject.next([...this.mockCourses]);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return this.categories$;
  }

  getInstructors(): Observable<string[]> {
    return this.courses$.pipe(
      map(courses => [...new Set(courses.map(course => course.instructor))].sort())
    );
  }

  getFeaturedCourses(limit: number = 3): Observable<Course[]> {
    return this.getAllCourses().pipe(
      map(courses => 
        courses
          .sort((a, b) => b.rating - a.rating)
          .slice(0, limit)
      )
    );
  }

  getPopularCourses(limit: number = 6): Observable<Course[]> {
    return this.getAllCourses().pipe(
      map(courses => 
        courses
          .sort((a, b) => b.studentsEnrolled - a.studentsEnrolled)
          .slice(0, limit)
      )
    );
  }

  getCoursesByIds(ids: string[]): Observable<Course[]> {
    return this.getAllCourses().pipe(
      map(courses => courses.filter(course => ids.includes(course.id)))
    );
  }

  searchCourses(query: string): Observable<Course[]> {
    return this.getAllCourses({ search: query });
  }

  // Statistics methods
  getCourseStats(): Observable<{
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    categoriesCount: number;
  }> {
    return this.getAllCourses().pipe(
      map(courses => ({
        totalCourses: courses.length,
        totalStudents: courses.reduce((sum, course) => sum + course.studentsEnrolled, 0),
        averageRating: courses.reduce((sum, course) => sum + course.rating, 0) / courses.length,
        categoriesCount: new Set(courses.map(course => course.category)).size
      }))
    );
  }

  // Development helpers
  addMockCourse(course: Course): void {
    this.mockCourses.push(course);
    this.coursesSubject.next([...this.mockCourses]);
  }

  resetMockData(): void {
    this.mockCourses = [...this.mockCourses];
    this.initializeMockData();
  }
}