import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatar?: string;
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

  constructor(
    private router: Router,
    private supabase: SupabaseService
  ) {
    this.initializeAuthState();
  }

  private async initializeAuthState() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      await this.setCurrentUser(session.user.id);
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.setCurrentUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        this.currentUserSubject.next(null);
        this.isLoggedInSubject.next(false);
      }
    });
  }

  private async setCurrentUser(userId: string) {
    const { data: profile } = await this.supabase.from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as 'student' | 'admin',
        avatar: profile.avatar || undefined,
        createdAt: new Date(profile.created_at)
      };
      
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<User> {
    return from(
      this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        if (!data.user) throw new Error('No user returned');
        
        return this.getUserProfile(data.user.id);
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.message || 'Login failed'));
      })
    );
  }

  register(registerData: RegisterData): Observable<User> {
    return from(
      this.supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
      })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        if (!data.user) throw new Error('Registration failed');

        // Create profile
        return from(
          this.supabase.from('profiles').insert({
            id: data.user.id,
            email: registerData.email,
            name: registerData.name,
            role: registerData.role || 'student',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerData.name)}&background=667eea&color=fff&size=150`
          } as any)
        ).pipe(
          switchMap(() => this.getUserProfile(data.user!.id))
        );
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => new Error(error.message || 'Registration failed'));
      })
    );
  }

  private getUserProfile(userId: string): Observable<User> {
    return from(
      this.supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Profile not found');

        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as 'student' | 'admin',
          avatar: data.avatar || undefined,
          createdAt: new Date(data.created_at)
        };
      })
    );
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAuthToken(): string | null {
    // This method is not needed with Supabase, but keeping for compatibility
    return null;
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

    return from(
      this.supabase.from('enrollments').insert({
        user_id: user.id,
        course_id: courseId,
        progress: 0
      } as any)
    ).pipe(
      switchMap(() => 
        // Update students_enrolled count
        from(this.supabase.client.rpc('increment_students_enrolled', { course_id: courseId }))
      ),
      map(() => true),
      catchError(error => {
        console.error('Enrollment error:', error);
        return throwError(() => new Error('Failed to enroll in course'));
      })
    );
  }

  unenrollFromCourse(courseId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('User not logged in'));
    }

    return from(
      this.supabase.from('enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId)
    ).pipe(
      switchMap(() => 
        // Decrement students_enrolled count
        from(this.supabase.client.rpc('decrement_students_enrolled', { course_id: courseId }))
      ),
      map(() => true),
      catchError(error => {
        console.error('Unenrollment error:', error);
        return throwError(() => new Error('Failed to unenroll from course'));
      })
    );
  }

  isEnrolledInCourse(courseId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user) return of(false);

    return from(
      this.supabase.from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()
    ).pipe(
      map(({ data }) => !!data),
      catchError(() => of(false))
    );
  }

  getEnrolledCourses(): Observable<string[]> {
    const user = this.getCurrentUser();
    if (!user) return of([]);

    return from(
      this.supabase.from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
    ).pipe(
      map(({ data }) => data?.map((enrollment: any) => enrollment.course_id) || []),
      catchError(() => of([]))
    );
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('No user logged in'));
    }

    return from(
      this.supabase.from('profiles')
        .update({
          name: updates.name,
          avatar: updates.avatar
        } as any)
        .eq('id', user.id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        const updatedUser: User = {
          ...user,
          name: data.name,
          avatar: data.avatar || undefined
        };
        
        this.currentUserSubject.next(updatedUser);
        return updatedUser;
      }),
      catchError(error => {
        console.error('Profile update error:', error);
        return throwError(() => new Error('Failed to update profile'));
      })
    );
  }

  validateToken(): boolean {
    // With Supabase, we rely on the auth state listener
    return this.isLoggedInSubject.value;
  }
}