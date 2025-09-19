import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatar?: string;
  enrolledCourses?: string[];
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // Mock users for development
  private mockUsers: User[] = [
    {
      id: '1',
      email: 'admin@courseapp.com',
      name: 'Admin User',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      enrolledCourses: [],
      createdAt: new Date('2023-01-15')
    },
    {
      id: '2',
      email: 'student@courseapp.com',
      name: 'John Student',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      enrolledCourses: ['1', '3'],
      createdAt: new Date('2023-02-20')
    },
    {
      id: '3',
      email: 'jane.doe@courseapp.com',
      name: 'Jane Doe',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      enrolledCourses: ['2'],
      createdAt: new Date('2023-03-10')
    }
  ];

  constructor(private router: Router) {
    this.checkAuthState();
  }

  private checkAuthState(): void {
    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');
    
    if (savedUser && token) {
      const user = JSON.parse(savedUser);
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<User> {
    const user = this.mockUsers.find(u => u.email === credentials.email);
    
    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    // In real app, verify password hash
    const validPasswords: { [key: string]: string } = {
      'admin@courseapp.com': 'admin123',
      'student@courseapp.com': 'student123',
      'jane.doe@courseapp.com': 'password123'
    };

    if (validPasswords[credentials.email] !== credentials.password) {
      return throwError(() => new Error('Invalid credentials'));
    }

    // Simulate API call
    return of(user).pipe(
      delay(1000),
      tap((authenticatedUser) => {
        // Generate mock token
        const token = this.generateToken(authenticatedUser);
        
        // Store in localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
        
        // Update subjects
        this.currentUserSubject.next(authenticatedUser);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  register(registerData: RegisterData): Observable<User> {
    // Check if user already exists
    const existingUser = this.mockUsers.find(u => u.email === registerData.email);
    if (existingUser) {
      return throwError(() => new Error('User already exists'));
    }

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email: registerData.email,
      name: registerData.name,
      role: registerData.role || 'student',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerData.name)}&background=667eea&color=fff&size=150`,
      enrolledCourses: [],
      createdAt: new Date()
    };

    // Add to mock users
    this.mockUsers.push(newUser);

    // Simulate API call
    return of(newUser).pipe(
      delay(1000),
      tap((user) => {
        // Generate token and store
        const token = this.generateToken(user);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Update subjects
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isStudent(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'student';
  }

  enrollInCourse(courseId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'student') {
      return throwError(() => new Error('Only students can enroll in courses'));
    }

    return of(true).pipe(
      delay(500),
      tap(() => {
        if (!user.enrolledCourses) {
          user.enrolledCourses = [];
        }
        
        if (!user.enrolledCourses.includes(courseId)) {
          user.enrolledCourses.push(courseId);
          
          // Update localStorage and subject
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  unenrollFromCourse(courseId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'student') {
      return throwError(() => new Error('Only students can unenroll from courses'));
    }

    return of(true).pipe(
      delay(500),
      tap(() => {
        if (user.enrolledCourses) {
          user.enrolledCourses = user.enrolledCourses.filter(id => id !== courseId);
          
          // Update localStorage and subject
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  isEnrolledInCourse(courseId: string): boolean {
    const user = this.getCurrentUser();
    return user?.enrolledCourses?.includes(courseId) || false;
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('No user logged in'));
    }

    const updatedUser = { ...user, ...updates };
    
    // Update in mock users array
    const userIndex = this.mockUsers.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      this.mockUsers[userIndex] = updatedUser;
    }

    return of(updatedUser).pipe(
      delay(500),
      tap((updated) => {
        // Update localStorage and subject
        localStorage.setItem('currentUser', JSON.stringify(updated));
        this.currentUserSubject.next(updated);
      })
    );
  }

  private generateToken(user: User): string {
    // Simple mock token generation
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    return btoa(JSON.stringify(payload));
  }

  validateToken(): boolean {
    const token = this.getAuthToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  // Development helper methods
  getMockUsers(): User[] {
    return this.mockUsers;
  }

  resetMockData(): void {
    this.mockUsers = [
      {
        id: '1',
        email: 'admin@courseapp.com',
        name: 'Admin User',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        enrolledCourses: [],
        createdAt: new Date('2023-01-15')
      },
      {
        id: '2',
        email: 'student@courseapp.com',
        name: 'John Student',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        enrolledCourses: ['1', '3'],
        createdAt: new Date('2023-02-20')
      },
      {
        id: '3',
        email: 'jane.doe@courseapp.com',
        name: 'Jane Doe',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        enrolledCourses: ['2'],
        createdAt: new Date('2023-03-10')
      }
    ];
  }
}
