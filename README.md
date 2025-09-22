# CourseCommons - Modern Course Management System

A comprehensive course management platform built with Angular 19 and Supabase, featuring modern UI/UX design, authentication, and full CRUD operations for courses.

## 🚀 Features

### Core Functionality
- **User Authentication**: Complete auth system with login/registration using Supabase
- **Role-Based Access**: Student and Admin roles with different permissions
- **Course Management**: Full CRUD operations for courses (Admin only)
- **Course Enrollment**: Students can enroll/unenroll from courses
- **Course Discovery**: Browse, search, and filter courses by category, level, price
- **Responsive Design**: Mobile-first design with Material Design 3

### User Features
- **Student Dashboard**: View enrolled courses, track progress, recommended courses
- **Admin Dashboard**: Manage all courses, view analytics, user management
- **Profile Management**: Update profile information, change passwords
- **Course Details**: Detailed course pages with syllabus, prerequisites, instructor info
- **Modern UI**: Clean, professional interface with smooth animations

### Technical Features
- **Angular 19**: Latest Angular with standalone components
- **Supabase Integration**: PostgreSQL database with real-time capabilities
- **Material Design 3**: Modern Material Design components
- **Responsive Grid**: CSS Grid and Flexbox layouts
- **Error Handling**: Comprehensive error handling with user notifications
- **Loading States**: Visual feedback for all async operations

## 🛠️ Technology Stack

- **Frontend**: Angular 19, TypeScript, RxJS
- **UI Library**: Angular Material (Material Design 3)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: CSS3 with CSS Custom Properties, Material Design
- **Build Tool**: Angular CLI with Vite
- **Package Manager**: npm

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Create Account](https://supabase.com/)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd course-commons
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Supabase Setup

#### Create a New Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose your organization and fill in project details
4. Wait for the project to be created

#### Get Your Supabase Credentials
1. In your Supabase dashboard, go to Settings → API
2. Copy your Project URL and anon public key

#### Set Up Database Schema

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Programming', 'Software development and coding courses'),
  ('Design', 'UI/UX and graphic design courses'),
  ('Business', 'Business and entrepreneurship courses'),
  ('Marketing', 'Digital marketing and advertising courses'),
  ('Data Science', 'Data analysis and machine learning courses'),
  ('Photography', 'Photography and visual arts courses');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  instructor VARCHAR(100) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  level VARCHAR(20) CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  price DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  students_enrolled INTEGER DEFAULT 0,
  image TEXT,
  syllabus JSONB DEFAULT '[]',
  prerequisites JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

-- Functions for updating students_enrolled count
CREATE OR REPLACE FUNCTION increment_students_enrolled(course_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE courses SET students_enrolled = students_enrolled + 1 WHERE id = course_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_students_enrolled(course_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE courses SET students_enrolled = GREATEST(students_enrolled - 1, 0) WHERE id = course_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can do everything with courses" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own enrollments" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollments" ON enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample courses
INSERT INTO courses (title, description, instructor, duration, category_id, level, price, rating, students_enrolled, image, syllabus, prerequisites, tags, is_published, created_by) VALUES
  (
    'Complete JavaScript Mastery',
    'Master JavaScript from basics to advanced concepts including ES6+, async programming, and modern frameworks.',
    'John Smith',
    '12 weeks',
    (SELECT id FROM categories WHERE name = 'Programming'),
    'Beginner',
    99.99,
    4.8,
    1250,
    'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
    '["Introduction to JavaScript", "Variables and Data Types", "Functions and Scope", "DOM Manipulation", "Async Programming", "ES6+ Features"]',
    '["Basic HTML knowledge", "Computer literacy"]',
    '["JavaScript", "Programming", "Web Development"]',
    true,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'UI/UX Design Fundamentals',
    'Learn the principles of user interface and user experience design with hands-on projects.',
    'Sarah Johnson',
    '8 weeks',
    (SELECT id FROM categories WHERE name = 'Design'),
    'Beginner',
    79.99,
    4.6,
    890,
    'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400&h=250&fit=crop',
    '["Design Principles", "User Research", "Wireframing", "Prototyping", "Visual Design", "Usability Testing"]',
    '["Basic computer skills", "Interest in design"]',
    '["UI Design", "UX Design", "Prototyping", "Figma"]',
    true,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Digital Marketing Strategy',
    'Comprehensive digital marketing course covering SEO, social media, content marketing, and analytics.',
    'Mike Brown',
    '10 weeks',
    (SELECT id FROM categories WHERE name = 'Marketing'),
    'Intermediate',
    129.99,
    4.7,
    675,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
    '["Marketing Fundamentals", "SEO Basics", "Social Media Marketing", "Content Strategy", "Email Marketing", "Analytics and Reporting"]',
    '["Basic business knowledge", "Familiarity with social media"]',
    '["Digital Marketing", "SEO", "Social Media", "Content Marketing"]',
    true,
    (SELECT id FROM auth.users LIMIT 1)
  );
```

#### Set Up RLS Policies (if not already done)
The SQL above includes Row Level Security policies. Make sure they're applied correctly.

### 4. Environment Configuration

#### Update Environment Files

Replace the values in `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: false, // true for prod
  supabase: {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
  }
};
```

**⚠️ Important**: Never commit real credentials to version control!

### 5. Run the Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser.

## 🔐 Default User Accounts

You can create accounts through the registration page, or create them directly in Supabase:

### Create Admin Account
1. Register through the app or Supabase Auth
2. In Supabase, go to Authentication → Users
3. Find your user and update the `raw_user_meta_data` field:
```json
{
  "name": "Admin User",
  "role": "admin"
}
```

### Test Accounts (if you want to create them manually)
Create these via the registration page:
- **Admin**: `admin@courseapp.com` / `admin123` (set role to 'admin' in database)
- **Student**: `student@courseapp.com` / `student123`

## 📁 Project Structure

```
src/
├── app/
│   ├── features/                 # Feature modules
│   │   ├── auth/                 # Authentication (login/register)
│   │   ├── courses/              # Course management
│   │   ├── dashboard/            # Student/Admin dashboards
│   │   ├── home/                 # Landing page
│   │   └── profile/              # User profile management
│   ├── shared/
│   │   ├── components/           # Reusable components
│   │   ├── services/             # Core services
│   │   ├── guards/               # Route guards
│   │   └── interceptors/         # HTTP interceptors
│   ├── app.component.*           # Root component
│   ├── app.config.ts             # App configuration
│   └── app.routes.ts             # Route definitions
├── environments/                 # Environment configs
├── styles.css                    # Global styles
└── index.html                    # Main HTML
```

## 🎯 Available Routes

### Public Routes
- `/` - Landing page
- `/auth/login` - User login
- `/auth/register` - User registration
- `/courses` - Browse courses
- `/courses/:id` - Course details

### Protected Routes (Require Login)
- `/dashboard/student` - Student dashboard
- `/dashboard/admin` - Admin dashboard (Admin only)
- `/profile` - User profile
- `/courses/add` - Add course (Admin only)
- `/courses/edit/:id` - Edit course (Admin only)

## 🎨 UI/UX Features

### Design System
- **Material Design 3**: Modern Material Design components
- **Custom CSS Variables**: Consistent theming system
- **Responsive Grid**: Mobile-first responsive design
- **Modern Typography**: Poppins + Inter font combination
- **Color System**: Professional color palette with gradients
- **Component Library**: Reusable UI components

### Key Features
- **Dark/Light Mode Ready**: CSS custom properties for easy theming
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Loading States**: Visual feedback for all async operations
- **Error Handling**: User-friendly error messages
- **Progressive Enhancement**: Works on all devices

## 🔧 Development

### Code Architecture

#### Services
- **AuthService**: User authentication and session management
- **CourseService**: Course CRUD operations
- **SupabaseService**: Database connection and queries
- **NotificationService**: Toast notifications
- **LoadingService**: Global loading states

#### Components
- **Standalone Components**: All components are standalone
- **Smart/Dumb Pattern**: Container components manage state, presentational components handle UI
- **Reactive Forms**: Form validation and management
- **OnPush Strategy**: Optimized change detection

### Development Commands

```bash
# Start development server
ng serve

# Build for production
ng build --configuration=production

# Run tests
ng test

# Run e2e tests
ng e2e

# Lint code
ng lint

# Generate component
ng generate component feature/component-name --standalone

# Generate service
ng generate service shared/services/service-name
```

### Environment Variables

Create a `.env` file in the root directory (optional, for build scripts):

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Responsive Breakpoints

```css
/* Mobile First */
/* Base styles: 320px and up */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Issues**
   - Verify your environment variables
   - Check Supabase project status
   - Ensure RLS policies are correct

2. **Authentication Not Working**
   - Check if profile trigger is set up
   - Verify user roles in database
   - Clear browser storage and try again

3. **Courses Not Loading**
   - Check if sample data was inserted
   - Verify RLS policies for courses table
   - Check browser console for errors

4. **Build Errors**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Clear Angular cache: `ng cache clean`
   - Update Angular CLI: `npm update -g @angular/cli`

### Database Connection Issues

If you're having database connection issues:

1. Check Supabase project status
2. Verify URL and keys in environment files
3. Test connection in Supabase SQL Editor
4. Check RLS policies are not blocking access

### Development Issues

For development issues:

```bash
# Clear Angular cache
ng cache clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset git (if needed)
git clean -fdx
```

## 🚀 Deployment

### Netlify Deployment

1. Build the project:
```bash
ng build --configuration=production
```

2. Deploy `dist/` folder to Netlify

3. Configure redirects by creating `_redirects` in `dist/`:
```
/*    /index.html   200
```

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize and deploy:
```bash
firebase init hosting
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Use TypeScript strict mode
- Follow Angular style guide
- Write meaningful commit messages
- Add proper documentation
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Angular](https://angular.io/) - The web framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Angular Material](https://material.angular.io/) - UI Components
- [Material Design](https://material.io/) - Design System
- [Unsplash](https://unsplash.com/) - Sample images

## 📞 Support

If you have questions or need help:

1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information
4. Include error messages and browser console output

---

**Happy Coding! 🚀**