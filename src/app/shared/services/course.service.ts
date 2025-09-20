import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
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
    let query = this.supabase.from('courses')
      .select(`
        *,
        categories(name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('categories.name', filters.category);
    }
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        let courses = data?.map(this.mapDbCourseToCourse) || [];

        // Apply text-based filters (search, instructor)
        if (filters?.search) {
          const searchTerm = filters.search.toLowerCase();
          courses = courses.filter(course =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.instructor.toLowerCase().includes(searchTerm) ||
            course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        }

        if (filters?.instructor) {
          courses = courses.filter(course =>
            course.instructor.toLowerCase().includes(filters.instructor!.toLowerCase())
          );
        }

        return courses;
      }),
      catchError(error => {
        console.error('Error fetching courses:', error);
        return throwError(() => error);
      })
    );
  }

  getCourseById(id: string): Observable<Course | undefined> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories(name)
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return undefined; // Not found
          throw error;
        }
        return data ? this.mapDbCourseToCourse(data) : undefined;
      }),
      catchError(error => {
        console.error('Error fetching course:', error);
        return throwError(() => error);
      })
    );
  }

  createCourse(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'studentsEnrolled' | 'rating'>): Observable<Course> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can create courses'));
    }

    // First get category ID
    return from(
      this.supabase.from('categories')
        .select('id')
        .eq('name', courseData.category)
        .single()
    ).pipe(
      switchMap(({ data: categoryData, error: categoryError }) => {
        if (categoryError) throw categoryError;

        return from(
          this.supabase.from('courses').insert({
            title: courseData.title,
            description: courseData.description,
            instructor: courseData.instructor,
            duration: courseData.duration,
            category_id: (categoryData as any).id,
            level: courseData.level,
            price: courseData.price,
            image: courseData.image,
            syllabus: courseData.syllabus,
            prerequisites: courseData.prerequisites,
            tags: courseData.tags,
            is_published: courseData.isPublished,
            created_by: user.id
          } as any).select(`
            *,
            categories(name)
          `).single()
        );
      }),
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapDbCourseToCourse(data);
      }),
      catchError(error => {
        console.error('Error creating course:', error);
        return throwError(() => error);
      })
    );
  }

  updateCourse(id: string, updates: Partial<Course>): Observable<Course> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can update courses'));
    }

    let updateObservable: Observable<any>;

    if (updates.category) {
      // If category is being updated, get the new category ID first
      updateObservable = from(
        this.supabase.from('categories')
          .select('id')
          .eq('name', updates.category)
          .single()
      ).pipe(
        switchMap(({ data: categoryData, error: categoryError }) => {
          if (categoryError) throw categoryError;

          const updateData: any = {
            title: updates.title,
            description: updates.description,
            instructor: updates.instructor,
            duration: updates.duration,
            category_id: (categoryData as any).id,
            level: updates.level,
            price: updates.price,
            image: updates.image,
            syllabus: updates.syllabus,
            prerequisites: updates.prerequisites,
            tags: updates.tags,
            is_published: updates.isPublished
          };

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
              delete updateData[key];
            }
          });

          return from(
            this.supabase.from('courses')
              .update(updateData as any)
              .eq('id', id)
              .select(`
                *,
                categories(name)
              `)
              .single()
          );
        })
      );
    } else {
      const updateData: any = {
        title: updates.title,
        description: updates.description,
        instructor: updates.instructor,
        duration: updates.duration,
        level: updates.level,
        price: updates.price,
        image: updates.image,
        syllabus: updates.syllabus,
        prerequisites: updates.prerequisites,
        tags: updates.tags,
        is_published: updates.isPublished
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      updateObservable = from(
        this.supabase.from('courses')
          .update(updateData as any)
          .eq('id', id)
          .select(`
            *,
            categories(name)
          `)
          .single()
      );
    }

    return updateObservable.pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapDbCourseToCourse(data);
      }),
      catchError(error => {
        console.error('Error updating course:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCourse(id: string): Observable<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return throwError(() => new Error('Only admins can delete courses'));
    }

    return from(
      this.supabase.from('courses')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return true;
      }),
      catchError(error => {
        console.error('Error deleting course:', error);
        return throwError(() => error);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return from(
      this.supabase.from('categories')
        .select('name')
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data?.map((cat: any) => cat.name) || [];
      }),
      catchError(error => {
        console.error('Error fetching categories:', error);
        return throwError(() => error);
      })
    );
  }

  getInstructors(): Observable<string[]> {
    return from(
      this.supabase.from('courses')
        .select('instructor')
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const instructors = [...new Set(data?.map((course: any) => course.instructor) || [])];
        return instructors.sort();
      }),
      catchError(error => {
        console.error('Error fetching instructors:', error);
        return throwError(() => error);
      })
    );
  }

  getFeaturedCourses(limit: number = 3): Observable<Course[]> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories(name)
        `)
        .eq('is_published', true)
        .order('rating', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data?.map(this.mapDbCourseToCourse) || [];
      }),
      catchError(error => {
        console.error('Error fetching featured courses:', error);
        return throwError(() => error);
      })
    );
  }

  getPopularCourses(limit: number = 6): Observable<Course[]> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories(name)
        `)
        .eq('is_published', true)
        .order('students_enrolled', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data?.map(this.mapDbCourseToCourse) || [];
      }),
      catchError(error => {
        console.error('Error fetching popular courses:', error);
        return throwError(() => error);
      })
    );
  }

  getCoursesByIds(ids: string[]): Observable<Course[]> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories(name)
        `)
        .in('id', ids)
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data?.map(this.mapDbCourseToCourse) || [];
      }),
      catchError(error => {
        console.error('Error fetching courses by IDs:', error);
        return throwError(() => error);
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
    return from(Promise.all([
      this.supabase.from('courses').select('rating, students_enrolled', { count: 'exact' }).eq('is_published', true),
      this.supabase.from('categories').select('*', { count: 'exact' })
    ])).pipe(
      map(([coursesResult, categoriesResult]) => {
        const { data: courses, count: totalCourses, error: coursesError } = coursesResult;
        const { count: categoriesCount, error: categoriesError } = categoriesResult;

        if (coursesError) throw coursesError;
        if (categoriesError) throw categoriesError;

        const totalStudents = courses?.reduce((sum: number, course: any) => sum + course.students_enrolled, 0) || 0;
        const averageRating = courses?.length 
          ? courses.reduce((sum: number, course: any) => sum + course.rating, 0) / courses.length 
          : 0;

        return {
          totalCourses: totalCourses || 0,
          totalStudents,
          averageRating: Math.round(averageRating * 10) / 10,
          categoriesCount: categoriesCount || 0
        };
      }),
      catchError(error => {
        console.error('Error fetching course stats:', error);
        return throwError(() => error);
      })
    );
  }

  private mapDbCourseToCourse(dbCourse: any): Course {
    return {
      id: dbCourse.id,
      title: dbCourse.title,
      description: dbCourse.description,
      instructor: dbCourse.instructor,
      duration: dbCourse.duration,
      category: dbCourse.categories?.name || 'Unknown',
      level: dbCourse.level,
      price: dbCourse.price,
      rating: dbCourse.rating,
      studentsEnrolled: dbCourse.students_enrolled,
      image: dbCourse.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
      syllabus: dbCourse.syllabus || [],
      prerequisites: dbCourse.prerequisites || [],
      tags: dbCourse.tags || [],
      createdAt: new Date(dbCourse.created_at),
      updatedAt: new Date(dbCourse.updated_at),
      isPublished: dbCourse.is_published
    };
  }
}