import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private loadingCounter = 0;
  private loadingTimeouts = new Set<NodeJS.Timeout>();

  constructor() {}

  show(): void {
    this.loadingCounter++;
    this.loadingSubject.next(true);
    
    // Auto-hide after 30 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Loading timeout reached, auto-hiding loader');
      this.hide();
    }, 30000);
    
    this.loadingTimeouts.add(timeout);
  }

  hide(): void {
    this.loadingCounter = Math.max(0, this.loadingCounter - 1);
    
    if (this.loadingCounter === 0) {
      this.loadingSubject.next(false);
      
      // Clear all timeouts
      this.loadingTimeouts.forEach(timeout => clearTimeout(timeout));
      this.loadingTimeouts.clear();
    }
  }

  reset(): void {
    this.loadingCounter = 0;
    this.loadingSubject.next(false);
    
    // Clear all timeouts
    this.loadingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.loadingTimeouts.clear();
  }

  forceHide(): void {
    this.loadingCounter = 0;
    this.loadingSubject.next(false);
    
    // Clear all timeouts
    this.loadingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.loadingTimeouts.clear();
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }
}