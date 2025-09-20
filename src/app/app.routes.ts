import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { adminGuard } from './shared/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'courses',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/courses/course-list/course-list.component').then(m => m.CourseListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./features/courses/course-form/course-form.component').then(m => m.CourseFormComponent),
        canActivate: [authGuard, adminGuard]
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./features/courses/course-form/course-form.component').then(m => m.CourseFormComponent),
        canActivate: [authGuard, adminGuard]
      },
      {
        path: ':id',
        loadComponent: () => import('./features/courses/course-detail/course-detail.component').then(m => m.CourseDetailComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: 'student',
        loadComponent: () => import('./features/dashboard/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canActivate: [adminGuard]
      },
      {
        path: '',
        redirectTo: 'student',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];