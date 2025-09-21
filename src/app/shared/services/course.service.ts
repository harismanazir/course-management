import { Injectable } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

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
  constructor(
    private supabase: SupabaseService,
    private authService: AuthService
  ) {}

  getAllCourses(filters?: CourseFilters): Observable<Course[]> {
    console.log('🔍 Fetching all courses...');
    
    return from(
      this.supabase.from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching courses:', error);
          return [];
        }
        
        console.log('✅ Raw courses from database:', data?.length || 0);
        
        if (!data || data.length === 0) {
          console.log('ℹ️ No courses found in database');
          return [];
        }

        let courses = data.map(course => this.mapDbCourseToCourse(course));
        console.log('✅ Mapped courses:', courses.length);

        // Apply filters if provided
        if (filters) {
          courses = this.applyFilters(courses, filters);
          console.log('✅ Filtered courses:', courses.length);
        }

        return courses;
      }),
      catchError(error => {
        console.error('❌ Error in getAllCourses:', error);
        return of([]);
      })
    );
  }

  private applyFilters(courses: Course[], filters: CourseFilters): Course[] {
    return courses.filter(course => {
      if (filters.category && course.category !== filters.category) {
        return false;
      }
      if (filters.level && course.level !== filters.level) {
        return false;
      }
      if (filters.minPrice !== undefined && course.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && course.price > filters.maxPrice) {
        return false;
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          course.title,
          course.description,
          course.instructor,
          ...course.tags
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      if (filters.instructor && !course.instructor.toLowerCase().includes(filters.instructor.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  getCourseById(id: string): Observable<Course | undefined> {
    console.log('🔍 Fetching course by ID:', id);
    
    return from(
      this.supabase.from('courses')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching course by ID:', error);
          return undefined;
        }
        console.log('✅ Course found:', data?.title);
        return data ? this.mapDbCourseToCourse(data) : undefined;
      }),
      catchError(error => {
        console.error('❌ getCourseById error:', error);
        return of(undefined);
      })
    );
  }

  createCourse(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'studentsEnrolled' | 'rating'>): Observable<Course> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can create courses'));
    }

    console.log('📝 Creating course:', courseData.title);

    const insertData = {
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor,
      duration: courseData.duration,
      category: courseData.category,
      level: courseData.level,
      price: courseData.price,
      image: courseData.image,
      syllabus: courseData.syllabus,
      prerequisites: courseData.prerequisites,
      tags: courseData.tags,
      is_published: courseData.isPublished,
      created_by: user.id,
      rating: 4.5,
      students_enrolled: 0
    };

    return from(
      this.supabase.from('courses').insert(insertData).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Course creation error:', error);
          throw error;
        }
        console.log('✅ Course created successfully:', data.title);
        return this.mapDbCourseToCourse(data);
      }),
      catchError(error => {
        console.error('❌ createCourse error:', error);
        return throwError(() => new Error('Failed to create course'));
      })
    );
  }

  updateCourse(id: string, updates: Partial<Course>): Observable<Course> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can update courses'));
    }

    console.log('📝 Updating course:', id);

    const updateData: any = {
      title: updates.title,
      description: updates.description,
      instructor: updates.instructor,
      duration: updates.duration,
      category: updates.category,
      level: updates.level,
      price: updates.price,
      image: updates.image,
      syllabus: updates.syllabus,
      prerequisites: updates.prerequisites,
      tags: updates.tags,
      is_published: updates.isPublished,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return from(
      this.supabase.from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        console.log('✅ Course updated successfully:', data.title);
        return this.mapDbCourseToCourse(data);
      }),
      catchError(error => {
        console.error('❌ updateCourse error:', error);
        return throwError(() => new Error('Failed to update course'));
      })
    );
  }

  deleteCourse(id: string): Observable<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can delete courses'));
    }

    console.log('🗑️ Deleting course:', id);

    return from(
      this.supabase.from('courses').delete().eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        console.log('✅ Course deleted successfully');
        return true;
      }),
      catchError(error => {
        console.error('❌ deleteCourse error:', error);
        return throwError(() => new Error('Failed to delete course'));
      })
    );
  }

  getCategories(): Observable<string[]> {
    console.log('🔍 Fetching categories...');
    
    // Return hardcoded categories for now to ensure it works
    const categories = [
      'Programming',
      'Design',
      'Business',
      'Marketing',
      'Data Science',
      'Web Development',
      'Mobile Development',
      'DevOps',
      'Cybersecurity',
      'AI & Machine Learning'
    ];
    
    console.log('✅ Categories loaded:', categories.length);
    return of(categories);
  }

  getInstructors(): Observable<string[]> {
    return from(
      this.supabase.from('courses')
        .select('instructor')
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching instructors:', error);
          return [];
        }
        const instructors = [...new Set(data?.map((course: any) => course.instructor) || [])];
        console.log('✅ Instructors loaded:', instructors.length);
        return instructors.sort();
      }),
      catchError(error => {
        console.error('❌ getInstructors error:', error);
        return of([]);
      })
    );
  }

  getFeaturedCourses(limit: number = 3): Observable<Course[]> {
    console.log('🔍 Fetching featured courses...');
    
    return from(
      this.supabase.from('courses')
        .select('*')
        .eq('is_published', true)
        .order('rating', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching featured courses:', error);
          return [];
        }
        console.log('✅ Featured courses loaded:', data?.length || 0);
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('❌ getFeaturedCourses error:', error);
        return of([]);
      })
    );
  }

  getPopularCourses(limit: number = 6): Observable<Course[]> {
    console.log('🔍 Fetching popular courses...');
    
    return from(
      this.supabase.from('courses')
        .select('*')
        .eq('is_published', true)
        .order('students_enrolled', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching popular courses:', error);
          return [];
        }
        console.log('✅ Popular courses loaded:', data?.length || 0);
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('❌ getPopularCourses error:', error);
        return of([]);
      })
    );
  }

  getCoursesByIds(ids: string[]): Observable<Course[]> {
    if (!ids || ids.length === 0) {
      console.log('ℹ️ No course IDs provided');
      return of([]);
    }

    console.log('🔍 Fetching courses by IDs:', ids);

    return from(
      this.supabase.from('courses')
        .select('*')
        .in('id', ids)
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching courses by IDs:', error);
          return [];
        }
        console.log('✅ Courses by IDs loaded:', data?.length || 0);
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('❌ getCoursesByIds error:', error);
        return of([]);
      })
    );
  }

  searchCourses(query: string): Observable<Course[]> {
    return this.getAllCourses({ search: query });
  }

  getCourseStats(): Observable<{
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    categoriesCount: number;
  }> {
    console.log('🔍 Fetching course stats...');
    
    return from(
      this.supabase.from('courses')
        .select('rating, students_enrolled')
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching course stats:', error);
          return {
            totalCourses: 0,
            totalStudents: 0,
            averageRating: 0,
            categoriesCount: 0
          };
        }

        const totalCourses = data?.length || 0;
        const totalStudents = data?.reduce((sum: number, course: any) => sum + (course.students_enrolled || 0), 0) || 0;
        const averageRating = data?.length 
          ? data.reduce((sum: number, course: any) => sum + (course.rating || 0), 0) / data.length 
          : 0;

        const stats = {
          totalCourses,
          totalStudents,
          averageRating: Math.round(averageRating * 10) / 10,
          categoriesCount: 10 // Hardcoded for now
        };

        console.log('✅ Course stats loaded:', stats);
        return stats;
      }),
      catchError(error => {
        console.error('❌ getCourseStats error:', error);
        return of({
          totalCourses: 0,
          totalStudents: 0,
          averageRating: 0,
          categoriesCount: 0
        });
      })
    );
  }

  private mapDbCourseToCourse(dbCourse: any): Course {
    const course: Course = {
      id: dbCourse.id,
      title: dbCourse.title || 'Untitled Course',
      description: dbCourse.description || 'No description available',
      instructor: dbCourse.instructor || 'Unknown Instructor',
      duration: dbCourse.duration || 'Not specified',
      category: dbCourse.category || 'General',
      level: dbCourse.level || 'Beginner',
      price: dbCourse.price || 0,
      rating: dbCourse.rating || 4.5,
      studentsEnrolled: dbCourse.students_enrolled || 0,
      image: dbCourse.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
      syllabus: Array.isArray(dbCourse.syllabus) ? dbCourse.syllabus : 
                (typeof dbCourse.syllabus === 'string' ? JSON.parse(dbCourse.syllabus || '[]') : []),
      prerequisites: Array.isArray(dbCourse.prerequisites) ? dbCourse.prerequisites : 
                     (typeof dbCourse.prerequisites === 'string' ? JSON.parse(dbCourse.prerequisites || '[]') : []),
      tags: Array.isArray(dbCourse.tags) ? dbCourse.tags : 
            (typeof dbCourse.tags === 'string' ? JSON.parse(dbCourse.tags || '[]') : []),
      createdAt: new Date(dbCourse.created_at),
      updatedAt: new Date(dbCourse.updated_at || dbCourse.created_at),
      isPublished: dbCourse.is_published || false
    };
    
    return course;
  }
}