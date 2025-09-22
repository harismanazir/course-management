import { Injectable } from '@angular/core';
import { Observable, from, timer } from 'rxjs';
import { map, catchError, timeout, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseTestService {
  constructor(private supabase: SupabaseService) {}

  testConnection(): Observable<any> {
    console.log('🔍 Testing database connection...');
    
    return from(
      this.supabase.testConnection()
    ).pipe(
      timeout(10000), // 10 second timeout
      map((result) => {
        console.log('✅ Database connection successful:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ Database connection failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      })
    );
  }

  testCoursesTable(): Observable<any> {
    console.log('🔍 Testing courses table...');
    
    return from(
      this.performCoursesQuery()
    ).pipe(
      timeout(15000), // 15 second timeout
      map((result) => {
        console.log('✅ Courses table test successful:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ Courses table test failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          stack: error.stack
        });
        throw error;
      })
    );
  }

  private async performCoursesQuery(): Promise<any> {
    console.log('🔧 Performing courses query...');
    
    try {
      // Test basic courses table access
      console.log('🔧 Step 1: Testing basic courses table access...');
      const basicQuery = await this.supabase.from('courses')
        .select('id, title')
        .limit(1);
        
      console.log('🔧 Basic query result:', basicQuery);
      
      if (basicQuery.error) {
        console.error('❌ Basic query failed:', basicQuery.error);
        throw basicQuery.error;
      }
      
      // Test categories table access
      console.log('🔧 Step 2: Testing categories table access...');
      const categoriesQuery = await this.supabase.from('categories')
        .select('id, name')
        .limit(1);
        
      console.log('🔧 Categories query result:', categoriesQuery);
      
      if (categoriesQuery.error) {
        console.error('❌ Categories query failed:', categoriesQuery.error);
        throw categoriesQuery.error;
      }
      
      // Test joined query
      console.log('🔧 Step 3: Testing joined query...');
      const joinedQuery = await this.supabase.from('courses')
        .select(`
          id,
          title,
          description,
          instructor,
          duration,
          level,
          price,
          rating,
          students_enrolled,
          image,
          is_published,
          created_at,
          categories(name)
        `)
        .eq('is_published', true)
        .limit(5);
        
      console.log('🔧 Joined query result:', joinedQuery);
      
      if (joinedQuery.error) {
        console.error('❌ Joined query failed:', joinedQuery.error);
        throw joinedQuery.error;
      }
      
      const result = {
        success: true,
        basicQuery: basicQuery.data?.length || 0,
        categoriesQuery: categoriesQuery.data?.length || 0,
        joinedQuery: joinedQuery.data?.length || 0,
        data: joinedQuery.data
      };
      
      console.log('✅ All query steps completed successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Query execution failed:', error);
      throw error;
    }
  }

  getAllTables(): Observable<any> {
    console.log('🔍 Testing all tables...');
    
    return from(
      this.performAllTablesTest()
    ).pipe(
      timeout(20000), // 20 second timeout
      map((results) => {
        console.log('✅ All tables test results:', results);
        return results;
      }),
      catchError(error => {
        console.error('❌ All tables test error:', error);
        throw error;
      })
    );
  }

  private async performAllTablesTest(): Promise<any> {
    const results: any = {};
    
    try {
      // Test categories table
      console.log('🔧 Testing categories table...');
      const categoriesResult = await this.supabase.from('categories').select('*').limit(1);
      results.categories = {
        success: !categoriesResult.error,
        count: categoriesResult.data?.length || 0,
        error: categoriesResult.error?.message || null
      };
      console.log('🔧 Categories result:', results.categories);

      // Test courses table  
      console.log('🔧 Testing courses table...');
      const coursesResult = await this.supabase.from('courses').select('*').limit(1);
      results.courses = {
        success: !coursesResult.error,
        count: coursesResult.data?.length || 0,
        error: coursesResult.error?.message || null
      };
      console.log('🔧 Courses result:', results.courses);

      // Test profiles table
      console.log('🔧 Testing profiles table...');
      const profilesResult = await this.supabase.from('profiles').select('*').limit(1);
      results.profiles = {
        success: !profilesResult.error,
        count: profilesResult.data?.length || 0,
        error: profilesResult.error?.message || null
      };
      console.log('🔧 Profiles result:', results.profiles);

      // Test enrollments table
      console.log('🔧 Testing enrollments table...');
      const enrollmentsResult = await this.supabase.from('enrollments').select('*').limit(1);
      results.enrollments = {
        success: !enrollmentsResult.error,
        count: enrollmentsResult.data?.length || 0,
        error: enrollmentsResult.error?.message || null
      };
      console.log('🔧 Enrollments result:', results.enrollments);

      return results;
    } catch (error) {
      console.error('❌ Tables test failed:', error);
      throw error;
    }
  }

  // Test RLS policies
  testRLSPolicies(): Observable<any> {
    console.log('🔍 Testing RLS policies...');
    
    return from(
      this.performRLSTest()
    ).pipe(
      timeout(10000),
      map((result) => {
        console.log('✅ RLS test completed:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ RLS test failed:', error);
        throw error;
      })
    );
  }

  private async performRLSTest(): Promise<any> {
    try {
      // Test without auth (should work for published courses)
      const publicQuery = await this.supabase.from('courses')
        .select('id, title, is_published')
        .eq('is_published', true)
        .limit(1);
        
      console.log('🔧 Public query (no auth):', publicQuery);
      
      return {
        publicAccess: !publicQuery.error,
        publicCount: publicQuery.data?.length || 0,
        error: publicQuery.error?.message || null
      };
    } catch (error) {
      console.error('❌ RLS test error:', error);
      throw error;
    }
  }
}