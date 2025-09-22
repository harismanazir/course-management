import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    console.log('🔧 Initializing Supabase client...');
    console.log('🔧 Supabase URL:', environment.supabase.url);
    console.log('🔧 Supabase Key:', environment.supabase.anonKey ? 'Present' : 'Missing');
    
    try {
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          },
          global: {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        }
      );
      console.log('✅ Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  get client() {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  from(table: string) {
    console.log(`🔍 Creating query for table: ${table}`);
    return this.supabase.from(table);
  }

  rpc(functionName: string, params?: any) {
    console.log(`🔧 Calling RPC function: ${functionName}`, params);
    return this.supabase.rpc(functionName, params);
  }

  // Test basic connection
  async testConnection(): Promise<any> {
    try {
      console.log('🔍 Testing basic Supabase connection...');
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .limit(1);
        
      if (error) {
        console.error('❌ Connection test failed:', error);
        throw error;
      }
      
      console.log('✅ Connection test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Connection test error:', error);
      throw error;
    }
  }
}