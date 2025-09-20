import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap, retry } from 'rxjs/operators';
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
    try {
      console.log('Initializing auth state...');
      
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return;
      }
      
      if (session?.user) {
        console.log('Found existing session for user:', session.user.id);
        await this.setCurrentUser(session.user.id);
      } else {
        console.log('No existing session found');
        this.currentUserSubject.next(null);
        this.isLoggedInSubject.next(false);
      }

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.id);
          await this.setCurrentUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          this.currentUserSubject.next(null);
          this.isLoggedInSubject.next(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed for user:', session.user.id);
          // Don't refetch profile on token refresh, just ensure user is still set
          if (!this.currentUserSubject.value) {
            await this.setCurrentUser(session.user.id);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing auth state:', error);
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
    }
  }

  private async setCurrentUser(userId: string) {
    try {
      const { data: profile, error } = await this.supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

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
        console.log('User set:', user);
      }
    } catch (error) {
      console.error('Error setting current user:', error);
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
        if (error) {
          console.error('Login error:', error);
          throw new Error(error.message || 'Login failed');
        }
        
        if (!data.user) {
          throw new Error('No user returned from login');
        }
        
        return this.getUserProfile(data.user.id);
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        console.log('Login successful:', user);
      }),
      catchError(error => {
        console.error('Login process error:', error);
        return throwError(() => new Error(error.message || 'Login failed'));
      })
    );
  }

  register(registerData: RegisterData): Observable<User> {
    console.log('Starting registration process for:', registerData.email);
    
    return from(
      this.supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            name: registerData.name,
            role: registerData.role || 'student'
          }
        }
      })
    ).pipe(
      switchMap(({ data, error }) => {
        console.log('Registration response:', { data: data?.user?.id, error });
        
        if (error) {
          console.error('Supabase registration error:', error);
          throw new Error(error.message || 'Registration failed');
        }
        
        if (!data.user) {
          throw new Error('Registration failed - no user created');
        }

        console.log('User created successfully, waiting for profile...');
        
        // Wait longer for the trigger to create the profile
        return from(
          new Promise<string>(resolve => {
            setTimeout(() => {
              console.log('Attempting to fetch user profile...');
              resolve(data.user!.id);
            }, 2000); // Increased wait time
          })
        ).pipe(
          switchMap(userId => this.getUserProfile(userId)),
          retry(3), // Retry up to 3 times if profile fetch fails
          catchError(profileError => {
            console.error('Profile fetch failed, creating manually:', profileError);
            // If profile doesn't exist, try to create it manually
            return this.createProfileManually(data.user!, registerData);
          })
        );
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        console.log('Registration completed successfully:', user);
      }),
      catchError(error => {
        console.error('Registration process failed:', error);
        return throwError(() => new Error(error.message || 'Registration failed'));
      })
    );
  }

  private createProfileManually(authUser: any, registerData: RegisterData): Observable<User> {
    console.log('Creating profile manually for user:', authUser.id);
    
    const profileData = {
      id: authUser.id,
      email: authUser.email,
      name: registerData.name,
      role: registerData.role || 'student',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerData.name)}&background=667eea&color=fff&size=150`
    };

    return from(
      this.supabase.from('profiles').insert(profileData).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Manual profile creation failed:', error);
          throw new Error('Failed to create user profile');
        }
        
        console.log('Profile created manually:', data);
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

  private getUserProfile(userId: string): Observable<User> {
    return from(
      this.supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Profile fetch error:', error);
          throw new Error('Profile not found');
        }
        
        if (!data) {
          throw new Error('Profile data not found');
        }

        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as 'student' | 'admin',
          avatar: data.avatar || undefined,
          createdAt: new Date(data.created_at)
        };
      }),
      catchError(error => {
        console.error('getUserProfile error:', error);
        return throwError(() => error);
      })
    );
  }

  async logout(): Promise<void> {
    try {
      console.log('Starting logout process...');
      
      // Clear local state first
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
      
      // Sign out from Supabase
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase logout error:', error);
        // Don't throw error, just log it since we already cleared local state
      }
      
      console.log('Logout completed successfully');
      
      // Navigate to home page
      this.router.navigate(['/']);
      
    } catch (error) {
      console.error('Logout process error:', error);
      
      // Even if there's an error, ensure local state is cleared
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
      this.router.navigate(['/']);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
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
      })
    ).pipe(
      switchMap(() => 
        // Update students_enrolled count
        from(this.supabase.client.rpc('increment_students_enrolled', { course_id: courseId }))
      ),
      map(() => {
        console.log('Enrollment successful for course:', courseId);
        return true;
      }),
      catchError(error => {
        console.error('Enrollment error:', error);
        if (error.code === '23505') { // Unique constraint violation
          return throwError(() => new Error('Already enrolled in this course'));
        }
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
      map(() => {
        console.log('Unenrollment successful for course:', courseId);
        return true;
      }),
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
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error checking enrollment:', error);
          return false;
        }
        return !!data;
      }),
      catchError(error => {
        console.error('isEnrolledInCourse error:', error);
        return of(false);
      })
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
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching enrolled courses:', error);
          return [];
        }
        return data?.map((enrollment: any) => enrollment.course_id) || [];
      }),
      catchError(error => {
        console.error('getEnrolledCourses error:', error);
        return of([]);
      })
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
        })
        .eq('id', user.id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Profile update error:', error);
          throw new Error('Failed to update profile');
        }
        
        const updatedUser: User = {
          ...user,
          name: data.name,
          avatar: data.avatar || undefined
        };
        
        this.currentUserSubject.next(updatedUser);
        return updatedUser;
      }),
      catchError(error => {
        console.error('updateProfile error:', error);
        return throwError(() => new Error('Failed to update profile'));
      })
    );
  }

  validateToken(): boolean {
    // With Supabase, we rely on the auth state listener
    return this.isLoggedInSubject.value;
  }
}