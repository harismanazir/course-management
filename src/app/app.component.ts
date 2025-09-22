import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LoadingService } from './shared/services/loading.service'; 

import { NavbarComponent } from './shared/components/navbar/navbar.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    NavbarComponent,
  ],
  template: `
    <div class="app-container">
      <!-- Global Loading Spinner -->
      <div class="loading-overlay" *ngIf="loadingService.loading$ | async">
        <div class="loading-content">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading...</p>
        </div>
      </div>

      <!-- Navigation -->
      <app-navbar></app-navbar>
      
      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <!-- Footer -->
      <footer class="app-footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-brand">
              <h4>Course Commons</h4>
              <p>Empowering education through technology</p>
            </div>
            <div class="footer-copyright">
              <p>&copy; 2025 All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      padding-top: 64px; /* Account for fixed navbar */
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }

    .loading-content {
      text-align: center;
      background: var(--background-white);
      padding: 40px;
      border-radius: 12px;
      box-shadow: var(--shadow-large);
    }

    .loading-content p {
      margin-top: 16px;
      color: var(--text-medium);
      font-weight: 500;
    }

    .app-footer {
      background: #1f2937;
      color: white;
      padding: 40px 0;
      margin-top: 60px;
      text-align: center;
    }

    .footer-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .footer-brand {
      text-align: center;
    }

    .footer-brand h4 {
      color: white;
      margin-bottom: 12px;
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-heading, 'Poppins', sans-serif);
    }

    .footer-brand p {
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 0;
      font-size: 1rem;
      line-height: 1.6;
    }

    .footer-copyright {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      width: 100%;
    }

    .footer-copyright p {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .main-content {
        padding-top: 56px;
      }
      
      .app-footer {
        padding: 30px 0;
        margin-top: 40px;
      }

      .footer-content {
        gap: 20px;
        padding: 0 20px;
      }

      .footer-brand h4 {
        font-size: 1.25rem;
      }

      .footer-brand p {
        font-size: 0.875rem;
      }
    }

    @media (max-width: 480px) {
      .app-footer {
        padding: 24px 0;
      }

      .footer-content {
        gap: 16px;
        padding: 0 16px;
      }

      .footer-brand h4 {
        font-size: 1.125rem;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Course Management Dashboard';
  loadingService = inject(LoadingService);

  ngOnInit() {
    // Initialize app
    console.log('Course Management Dashboard initialized');
  }
}