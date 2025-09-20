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
    console.log('Fetching all courses with filters:', filters);
    
    // Query with proper category join
    const query = this.supabase.from('courses')
      .select(`
        *,
        categories!inner(name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching courses:', error);
          throw error;
        }
        
        console.log('Raw course data from database:', data);
        
        if (!data || data.length === 0) {
          console.log('No courses found in database');
          return [];
        }

        let courses = data.map(course => {
          console.log('Mapping course:', course);
          return this.mapDbCourseToCourse(course);
        });

        console.log('Mapped courses:', courses);

        // Apply filters
        if (filters) {
          courses = this.applyFilters(courses, filters);
          console.log('Filtered courses:', courses);
        }

        return courses;
      }),
      catchError(error => {
        console.error('Error in getAllCourses:', error);
        // Return empty array instead of throwing to prevent UI breaking
        return of([]);
      })
    );
  }

  private applyFilters(courses: Course[], filters: CourseFilters): Course[] {
    return courses.filter(course => {
      // Category filter
      if (filters.category && course.category !== filters.category) {
        return false;
      }

      // Level filter
      if (filters.level && course.level !== filters.level) {
        return false;
      }

      // Price range filter
      if (filters.minPrice !== undefined && course.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && course.price > filters.maxPrice) {
        return false;
      }

      // Search filter
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

      // Instructor filter
      if (filters.instructor && !course.instructor.toLowerCase().includes(filters.instructor.toLowerCase())) {
        return false;
      }

      return true;
    });
  }

  getCourseById(id: string): Observable<Course | undefined> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('id', id)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching course by ID:', error);
          return undefined;
        }
        return data ? this.mapDbCourseToCourse(data) : undefined;
      }),
      catchError(error => {
        console.error('getCourseById error:', error);
        return of(undefined);
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
        .maybeSingle()
    ).pipe(
      switchMap(({ data: categoryData, error: categoryError }) => {
        if (categoryError) {
          console.error('Category error:', categoryError);
          throw new Error('Failed to find category');
        }

        if (!categoryData) {
          throw new Error(`Category "${courseData.category}" not found`);
        }

        const insertData = {
          title: courseData.title,
          description: courseData.description,
          instructor: courseData.instructor,
          duration: courseData.duration,
          category_id: categoryData.id,
          level: courseData.level,
          price: courseData.price,
          image: courseData.image,
          syllabus: courseData.syllabus,
          prerequisites: courseData.prerequisites,
          tags: courseData.tags,
          is_published: courseData.isPublished,
          created_by: user.id,
          rating: 4.5, // Default rating
          students_enrolled: 0
        };

        return from(
          this.supabase.from('courses').insert(insertData).select(`
            *,
            categories!inner(name)
          `).single()
        );
      }),
      map(({ data, error }) => {
        if (error) {
          console.error('Course creation error:', error);
          throw error;
        }
        return this.mapDbCourseToCourse(data);
      }),
      catchError(error => {
        console.error('createCourse error:', error);
        return throwError(() => new Error('Failed to create course'));
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
            category_id: categoryData.id,
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
              .select(`
                *,
                categories!inner(name)
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
        is_published: updates.isPublished,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      updateObservable = from(
        this.supabase.from('courses')
          .update(updateData)
          .eq('id', id)
          .select(`
            *,
            categories!inner(name)
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
        console.error('updateCourse error:', error);
        return throwError(() => new Error('Failed to update course'));
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
        console.error('deleteCourse error:', error);
        return throwError(() => new Error('Failed to delete course'));
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
        if (error) {
          console.error('Error fetching categories:', error);
          return [];
        }
        return data?.map((cat: any) => cat.name) || [];
      }),
      catchError(error => {
        console.error('getCategories error:', error);
        return of([]);
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
        if (error) {
          console.error('Error fetching instructors:', error);
          return [];
        }
        const instructors = [...new Set(data?.map((course: any) => course.instructor) || [])];
        return instructors.sort();
      }),
      catchError(error => {
        console.error('getInstructors error:', error);
        return of([]);
      })
    );
  }

  getFeaturedCourses(limit: number = 3): Observable<Course[]> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('is_published', true)
        .order('rating', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching featured courses:', error);
          return [];
        }
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('getFeaturedCourses error:', error);
        return of([]);
      })
    );
  }

  getPopularCourses(limit: number = 6): Observable<Course[]> {
    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('is_published', true)
        .order('students_enrolled', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching popular courses:', error);
          return [];
        }
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('getPopularCourses error:', error);
        return of([]);
      })
    );
  }

  getCoursesByIds(ids: string[]): Observable<Course[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }

    return from(
      this.supabase.from('courses')
        .select(`
          *,
          categories!inner(name)
        `)
        .in('id', ids)
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching courses by IDs:', error);
          return [];
        }
        return data?.map(this.mapDbCourseToCourse.bind(this)) || [];
      }),
      catchError(error => {
        console.error('getCoursesByIds error:', error);
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
    return from(Promise.all([
      this.supabase.from('courses').select('rating, students_enrolled', { count: 'exact' }).eq('is_published', true),
      this.supabase.from('categories').select('*', { count: 'exact' })
    ])).pipe(
      map(([coursesResult, categoriesResult]) => {
        const { data: courses, count: totalCourses, error: coursesError } = coursesResult;
        const { count: categoriesCount, error: categoriesError } = categoriesResult;

        if (coursesError || categoriesError) {
          console.error('Error fetching course stats:', coursesError || categoriesError);
          return {
            totalCourses: 0,
            totalStudents: 0,
            averageRating: 0,
            categoriesCount: 0
          };
        }

        const totalStudents = courses?.reduce((sum: number, course: any) => sum + (course.students_enrolled || 0), 0) || 0;
        const averageRating = courses?.length 
          ? courses.reduce((sum: number, course: any) => sum + (course.rating || 0), 0) / courses.length 
          : 0;

        return {
          totalCourses: totalCourses || 0,
          totalStudents,
          averageRating: Math.round(averageRating * 10) / 10,
          categoriesCount: categoriesCount || 0
        };
      }),
      catchError(error => {
        console.error('getCourseStats error:', error);
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
    console.log('Mapping database course:', dbCourse);
    
    // Handle category name from the joined categories table
    let categoryName = 'Unknown';
    if (dbCourse.categories) {
      if (Array.isArray(dbCourse.categories) && dbCourse.categories.length > 0) {
        categoryName = dbCourse.categories[0].name;
      } else if (dbCourse.categories.name) {
        categoryName = dbCourse.categories.name;
      }
    }
    
    const course: Course = {
      id: dbCourse.id,
      title: dbCourse.title || 'Untitled Course',
      description: dbCourse.description || 'No description available',
      instructor: dbCourse.instructor || 'Unknown Instructor',
      duration: dbCourse.duration || 'Not specified',
      category: categoryName,
      level: dbCourse.level || 'Beginner',
      price: dbCourse.price || 0,
      rating: dbCourse.rating || 0,
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
    
    console.log('Mapped course result:', course);
    return course;
  }
}