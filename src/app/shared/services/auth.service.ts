// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
// import { map, tap, catchError, switchMap } from 'rxjs/operators';
// import { Router } from '@angular/router';
// import { SupabaseService } from './supabase.service';

// export interface User {
//   id: string;
//   email: string;
//   name: string;
//   role: 'student' | 'admin';
//   avatar?: string;
//   createdAt: Date;
// }

// export interface LoginCredentials {
//   email: string;
//   password: string;
// }

// export interface RegisterData {
//   name: string;
//   email: string;
//   password: string;
//   role?: 'student' | 'admin';
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   private currentUserSubject = new BehaviorSubject<User | null>(null);
//   private isLoggedInSubject = new BehaviorSubject<boolean>(false);

//   public currentUser$ = this.currentUserSubject.asObservable();
//   public isLoggedIn$ = this.isLoggedInSubject.asObservable();

//   constructor(
//     private router: Router,
//     private supabase: SupabaseService
//   ) {
//     this.initializeAuthState();
//   }

//   private async initializeAuthState() {
//     try {
//       const { data: { session } } = await this.supabase.auth.getSession();
      
//       if (session?.user) {
//         await this.setCurrentUserFromAuthUser(session.user);
//       }

//       // Listen for auth changes
//       this.supabase.auth.onAuthStateChange(async (event, session) => {
//         if (event === 'SIGNED_IN' && session?.user) {
//           await this.setCurrentUserFromAuthUser(session.user);
//         } else if (event === 'SIGNED_OUT') {
//           this.currentUserSubject.next(null);
//           this.isLoggedInSubject.next(false);
//         }
//       });
//     } catch (error) {
//       console.error('Auth init error:', error);
//     }
//   }

//   private async setCurrentUserFromAuthUser(authUser: any): Promise<User | null> {
//     try {
//       // First try to get from database
//       const { data: profile, error } = await this.supabase.from('profiles')
//         .select('*')
//         .eq('id', authUser.id)
//         .single();

//       let user: User;

//       if (profile && !error) {
//         // Profile exists in database
//         user = {
//           id: profile.id,
//           email: profile.email,
//           name: profile.name,
//           role: profile.role as 'student' | 'admin',
//           avatar: profile.avatar || undefined,
//           createdAt: new Date(profile.created_at)
//         };
//       } else {
//         // Create user from auth metadata if profile doesn't exist
//         console.log('Profile not found, creating from auth user:', authUser);
        
//         const name = authUser.user_metadata?.['name'] || authUser.email?.split('@')[0] || 'User';
//         const role = authUser.user_metadata?.['role'] || 'student';
        
//         user = {
//           id: authUser.id,
//           email: authUser.email,
//           name: name,
//           role: role as 'student' | 'admin',
//           avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=150`,
//           createdAt: new Date(authUser.created_at)
//         };

//         // Try to create profile in database (don't wait for it)
//         this.createProfileInBackground(user);
//       }
      
//       this.currentUserSubject.next(user);
//       this.isLoggedInSubject.next(true);
//       return user;
//     } catch (error) {
//       console.error('Error setting user:', error);
//       return null;
//     }
//   }

//   login(credentials: LoginCredentials): Observable<User> {
//     console.log('🔐 Logging in:', credentials.email);
    
//     return from(
//       this.supabase.auth.signInWithPassword({
//         email: credentials.email,
//         password: credentials.password
//       })
//     ).pipe(
//       switchMap(({ data, error }) => {
//         console.log('🔐 Login response:', { user: data.user?.id, error });
        
//         if (error) {
//           throw new Error(error.message);
//         }
        
//         if (!data.user) {
//           throw new Error('Login failed');
//         }
        
//         // Create user object from auth response immediately
//         const authUser = data.user;
//         const name = authUser.user_metadata?.['name'] || authUser.email?.split('@')[0] || 'User';
//         const role = authUser.user_metadata?.['role'] || 'student';
        
//         const user: User = {
//           id: authUser.id,
//           email: authUser.email!,
//           name: name,
//           role: role as 'student' | 'admin',
//           avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=150`,
//           createdAt: new Date(authUser.created_at!)
//         };
        
//         // Set user state immediately
//         this.currentUserSubject.next(user);
//         this.isLoggedInSubject.next(true);
        
//         console.log('✅ User logged in:', user);
//         return of(user);
//       }),
//       catchError(error => {
//         console.error('❌ Login error:', error);
//         return throwError(() => new Error(error.message || 'Login failed'));
//       })
//     );
//   }

//   register(registerData: RegisterData): Observable<User> {
//     console.log('📝 Registering:', registerData.email);
    
//     return from(
//       this.supabase.auth.signUp({
//         email: registerData.email,
//         password: registerData.password,
//         options: {
//           data: {
//             name: registerData.name,
//             role: registerData.role || 'student'
//           }
//         }
//       })
//     ).pipe(
//       switchMap(({ data, error }) => {
//         console.log('📝 Register response:', { user: data.user?.id, error });
        
//         if (error) {
//           throw new Error(error.message);
//         }
        
//         if (!data.user) {
//           throw new Error('Registration failed');
//         }

//         // Create user object immediately
//         const user: User = {
//           id: data.user.id,
//           email: data.user.email!,
//           name: registerData.name,
//           role: registerData.role || 'student',
//           avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerData.name)}&background=667eea&color=fff&size=150`,
//           createdAt: new Date()
//         };
        
//         // Set user state immediately
//         this.currentUserSubject.next(user);
//         this.isLoggedInSubject.next(true);
        
//         // Try to create profile in database (don't wait)
//         this.createProfileInBackground(user);
        
//         console.log('✅ User registered:', user);
//         return of(user);
//       }),
//       catchError(error => {
//         console.error('❌ Registration error:', error);
//         return throwError(() => new Error(error.message || 'Registration failed'));
//       })
//     );
//   }

//   private async createProfileInBackground(user: User): Promise<void> {
//     try {
//       await this.supabase.from('profiles').upsert({
//         id: user.id,
//         email: user.email,
//         name: user.name,
//         role: user.role,
//         avatar: user.avatar
//       });
//       console.log('✅ Profile created in database');
//     } catch (err) {
//       console.log('Profile creation failed, but continuing:', err);
//     }
//   }

//   async logout(): Promise<void> {
//     try {
//       this.currentUserSubject.next(null);
//       this.isLoggedInSubject.next(false);
      
//       await this.supabase.auth.signOut();
//       this.router.navigate(['/']);
//     } catch (error) {
//       console.error('Logout error:', error);
//       this.currentUserSubject.next(null);
//       this.isLoggedInSubject.next(false);
//       this.router.navigate(['/']);
//     }
//   }

//   getCurrentUser(): User | null {
//     return this.currentUserSubject.value;
//   }

//   isAdmin(): boolean {
//     const user = this.getCurrentUser();
//     return user?.role === 'admin';
//   }

//   isStudent(): boolean {
//     const user = this.getCurrentUser();
//     return user?.role === 'student';
//   }

//   enrollInCourse(courseId: string): Observable<boolean> {
//     const user = this.getCurrentUser();
//     if (!user || user.role !== 'student') {
//       return throwError(() => new Error('Only students can enroll in courses'));
//     }

//     console.log('📚 Enrolling in course:', courseId);

//     return from(
//       this.supabase.from('enrollments').insert({
//         user_id: user.id,
//         course_id: courseId,
//         progress: 0
//       })
//     ).pipe(
//       switchMap(({ error }) => {
//         if (error) {
//           if (error.code === '23505') {
//             return throwError(() => new Error('Already enrolled in this course'));
//           }
//           throw error;
//         }

//         // Increment students_enrolled count
//         return from(
//           this.supabase.rpc('increment_students_enrolled', { course_id: courseId })
//         );
//       }),
//       map(() => {
//         console.log('✅ Successfully enrolled in course');
//         return true;
//       }),
//       catchError(error => {
//         console.error('❌ Enrollment error:', error);
//         return throwError(() => new Error('Failed to enroll in course'));
//       })
//     );
//   }

//   unenrollFromCourse(courseId: string): Observable<boolean> {
//     const user = this.getCurrentUser();
//     if (!user) {
//       return throwError(() => new Error('User not logged in'));
//     }

//     console.log('📚 Unenrolling from course:', courseId);

//     return from(
//       this.supabase.from('enrollments')
//         .delete()
//         .eq('user_id', user.id)
//         .eq('course_id', courseId)
//     ).pipe(
//       switchMap(({ error }) => {
//         if (error) throw error;

//         // Decrement students_enrolled count
//         return from(
//           this.supabase.rpc('decrement_students_enrolled', { course_id: courseId })
//         );
//       }),
//       map(() => {
//         console.log('✅ Successfully unenrolled from course');
//         return true;
//       }),
//       catchError(error => {
//         console.error('❌ Unenrollment error:', error);
//         return throwError(() => new Error('Failed to unenroll from course'));
//       })
//     );
//   }

//   isEnrolledInCourse(courseId: string): Observable<boolean> {
//     const user = this.getCurrentUser();
//     if (!user) return of(false);

//     return from(
//       this.supabase.from('enrollments')
//         .select('id')
//         .eq('user_id', user.id)
//         .eq('course_id', courseId)
//         .maybeSingle()
//     ).pipe(
//       map(({ data }) => !!data),
//       catchError(() => of(false))
//     );
//   }

//   getEnrolledCourses(): Observable<string[]> {
//     const user = this.getCurrentUser();
//     if (!user) {
//       console.log('❌ No user logged in for enrollments');
//       return of([]);
//     }

//     console.log('🔍 Fetching enrolled courses for user:', user.id);

//     return from(
//       this.supabase.from('enrollments')
//         .select('course_id')
//         .eq('user_id', user.id)
//     ).pipe(
//       map(({ data, error }) => {
//         if (error) {
//           console.error('❌ Error fetching enrolled courses:', error);
//           return [];
//         }
//         const courseIds = data?.map((enrollment: any) => enrollment.course_id) || [];
//         console.log('✅ Enrolled course IDs:', courseIds);
//         return courseIds;
//       }),
//       catchError(() => {
//         console.log('❌ Failed to fetch enrollments, returning empty array');
//         return of([]);
//       })
//     );
//   }

//   updateProfile(updates: Partial<User>): Observable<User> {
//     const user = this.getCurrentUser();
//     if (!user) {
//       return throwError(() => new Error('No user logged in'));
//     }

//     return from(
//       this.supabase.from('profiles')
//         .update({
//           name: updates.name,
//           avatar: updates.avatar
//         })
//         .eq('id', user.id)
//         .select()
//         .single()
//     ).pipe(
//       map(({ data, error }) => {
//         if (error) {
//           throw new Error('Failed to update profile');
//         }
        
//         const updatedUser: User = {
//           ...user,
//           name: data.name,
//           avatar: data.avatar || undefined
//         };
        
//         this.currentUserSubject.next(updatedUser);
//         return updatedUser;
//       }),
//       catchError(() => throwError(() => new Error('Failed to update profile')))
//     );
//   }

//   validateToken(): boolean {
//     return this.isLoggedInSubject.value;
//   }
// }

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
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session?.user) {
        await this.setCurrentUserFromAuthUser(session.user);
      }

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.setCurrentUserFromAuthUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUserSubject.next(null);
          this.isLoggedInSubject.next(false);
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
    }
  }

  private async setCurrentUserFromAuthUser(authUser: any): Promise<User | null> {
    try {
      // First try to get from database
      const { data: profile, error } = await this.supabase.from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      let user: User;

      if (profile && !error) {
        // Profile exists in database
        user = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role as 'student' | 'admin',
          avatar: profile.avatar || undefined,
          createdAt: new Date(profile.created_at)
        };
      } else {
        // Create user from auth metadata if profile doesn't exist
        console.log('Profile not found, creating from auth user:', authUser);
        
        const name = authUser.user_metadata?.['name'] || authUser.email?.split('@')[0] || 'User';
        const role = authUser.user_metadata?.['role'] || 'student';
        
        user = {
          id: authUser.id,
          email: authUser.email,
          name: name,
          role: role as 'student' | 'admin',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=150`,
          createdAt: new Date(authUser.created_at)
        };

        // Try to create profile in database (don't wait for it)
        this.createProfileInBackground(user);
      }
      
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
      return user;
    } catch (error) {
      console.error('Error setting user:', error);
      return null;
    }
  }

  login(credentials: LoginCredentials): Observable<User> {
    console.log('🔐 Logging in:', credentials.email);
    
    return from(
      this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
    ).pipe(
      switchMap(({ data, error }) => {
        console.log('🔐 Login response:', { user: data.user?.id, error });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data.user) {
          throw new Error('Login failed');
        }
        
        // Create user object from auth response immediately
        const authUser = data.user;
        const name = authUser.user_metadata?.['name'] || authUser.email?.split('@')[0] || 'User';
        const role = authUser.user_metadata?.['role'] || 'student';
        
        const user: User = {
          id: authUser.id,
          email: authUser.email!,
          name: name,
          role: role as 'student' | 'admin',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=150`,
          createdAt: new Date(authUser.created_at!)
        };
        
        // Set user state immediately
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        
        console.log('✅ User logged in:', user);
        return of(user);
      }),
      catchError(error => {
        console.error('❌ Login error:', error);
        return throwError(() => new Error(error.message || 'Login failed'));
      })
    );
  }

  register(registerData: RegisterData): Observable<User> {
    console.log('📝 Registering:', registerData.email);
    
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
        console.log('📝 Register response:', { user: data.user?.id, error });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data.user) {
          throw new Error('Registration failed');
        }

        // Create user object immediately
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: registerData.name,
          role: registerData.role || 'student',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registerData.name)}&background=667eea&color=fff&size=150`,
          createdAt: new Date()
        };
        
        // Set user state immediately
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        
        // Try to create profile in database (don't wait)
        this.createProfileInBackground(user);
        
        console.log('✅ User registered:', user);
        return of(user);
      }),
      catchError(error => {
        console.error('❌ Registration error:', error);
        return throwError(() => new Error(error.message || 'Registration failed'));
      })
    );
  }

  private async createProfileInBackground(user: User): Promise<void> {
    try {
      await this.supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      });
      console.log('✅ Profile created in database');
    } catch (err) {
      console.log('Profile creation failed, but continuing:', err);
    }
  }

  async logout(): Promise<void> {
    try {
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
      
      await this.supabase.auth.signOut();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
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

    console.log('📚 Enrolling in course:', courseId);

    return from(
      this.supabase.from('enrollments').insert({
        user_id: user.id,
        course_id: courseId,
        progress: 0
      })
    ).pipe(
      switchMap(({ error }) => {
        if (error) {
          if (error.code === '23505') {
            return throwError(() => new Error('Already enrolled in this course'));
          }
          throw error;
        }

        // Increment students_enrolled count
        return from(
          this.supabase.rpc('increment_students_enrolled', { course_id: courseId })
        );
      }),
      map(() => {
        console.log('✅ Successfully enrolled in course');
        return true;
      }),
      catchError(error => {
        console.error('❌ Enrollment error:', error);
        return throwError(() => new Error('Failed to enroll in course'));
      })
    );
  }

  unenrollFromCourse(courseId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('User not logged in'));
    }

    console.log('📚 Unenrolling from course:', courseId);

    return from(
      this.supabase.from('enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId)
    ).pipe(
      switchMap(({ error }) => {
        if (error) throw error;

        // Decrement students_enrolled count
        return from(
          this.supabase.rpc('decrement_students_enrolled', { course_id: courseId })
        );
      }),
      map(() => {
        console.log('✅ Successfully unenrolled from course');
        return true;
      }),
      catchError(error => {
        console.error('❌ Unenrollment error:', error);
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
      map(({ data }) => !!data),
      catchError(() => of(false))
    );
  }

  getEnrolledCourses(): Observable<string[]> {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('❌ No user logged in for enrollments');
      return of([]);
    }

    console.log('🔍 Fetching enrolled courses for user:', user.id);

    return from(
      this.supabase.from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching enrolled courses:', error);
          return [];
        }
        const courseIds = data?.map((enrollment: any) => enrollment.course_id) || [];
        console.log('✅ Enrolled course IDs:', courseIds);
        return courseIds;
      }),
      catchError(() => {
        console.log('❌ Failed to fetch enrollments, returning empty array');
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
      catchError(() => throwError(() => new Error('Failed to update profile')))
    );
  }

  validateToken(): boolean {
    return this.isLoggedInSubject.value;
  }
}