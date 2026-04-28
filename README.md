# The Shelf

## Project Overview

The Shelf is a full-stack web application that serves as a public-domain EPUB library with user authentication, reading progress tracking, and admin management features. It allows users to browse, read, and track their progress on public-domain books sourced from Project Gutenberg, while providing administrators with tools to ingest new books via scraping or manual upload.

### Tech Stack & Dependencies

**Frontend:**
- React 19 (latest React with concurrent features)
- TypeScript (type-safe JavaScript)
- Vite (fast build tool and development server with HMR)
- React Router DOM (client-side routing)
- Tailwind CSS v4 (utility-first CSS framework)
- Axios (HTTP client for API calls)
- epub.js (client-side EPUB rendering)
- Motion (animation library)
- Lucide React (icons)
- clsx & tailwind-merge (CSS utility functions)

**Backend:**
- Express.js (Node.js web framework)
- TypeScript (server-side type safety)
- tsx (TypeScript execution environment)
- MongoDB (NoSQL database)
- Mongoose (ODM for MongoDB)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- nodemailer (email sending for password reset)
- multer (file upload handling)
- epub (EPUB metadata extraction)
- express-rate-limit (API rate limiting)
- helmet (security headers)
- axios (HTTP client for external APIs)

**Development & Build Tools:**
- @vitejs/plugin-react (Vite React plugin)
- @tailwindcss/vite (Tailwind CSS Vite plugin)
- autoprefixer (CSS vendor prefixing)
- mongodb-memory-server (in-memory MongoDB for testing)
- TypeScript compiler

### Entry Points & How the App Starts

The application starts via `npm run dev`, which runs `tsx server.ts`. This starts the Express server on port 3000, which serves the React frontend in development mode using Vite middleware, and handles all API routes.

In production, the server builds the frontend with `npm run build` and serves the static files directly.

## File & Folder Structure

### Root Level
- `index.html` - Main HTML entry point for the React app
- `metadata.json` - Application metadata (name, description)
- `package.json` - Node.js dependencies and scripts
- `server.ts` - Main Express server file (backend entry point)
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration

### `src/` - Frontend Source Code
- `App.tsx` - Main React app component with routing
- `main.tsx` - React app entry point (renders App to DOM)
- `index.css` - Global styles with Tailwind imports and custom theme colors
- `vite-env.d.ts` - Vite TypeScript declarations

#### `src/components/`
- `Layout.tsx` - Main layout wrapper with navigation and user authentication checks

#### `src/context/`
- `AuthContext.tsx` - React Context for authentication state management

#### `src/lib/`
- `utils.ts` - Utility functions (CSS class merging)

#### `src/pages/` - Route Components
- `Landingpage.tsx` - Public landing page with book showcase
- `Login.tsx` - User login form
- `Signup.tsx` - User registration form
- `ForgotPassword.tsx` - Password reset flow
- `Library.tsx` - Main book browsing interface with search/filter
- `BookDetail.tsx` - Individual book details page
- `Reader.tsx` - EPUB reader with progress tracking
- `Profile.tsx` - User profile with reading history and settings
- `Coverpage.tsx` - Book reading start/resume interface

#### `src/pages/Admin/` - Admin Interface
- `Dashboard.tsx` - Admin dashboard with stats and activity log
- `IngestBooks.tsx` - Book ingestion interface (manual upload, batch, Gutenberg scraping)
- `ManageBooks.tsx` - Book management interface (edit, archive, delete)
- `scraper.py` - Python script for Project Gutenberg scraping

### `storage/` - File Storage
- `covers/` - Uploaded book cover images
- `epub/` - Uploaded EPUB files

### `uploads/` - Temporary Upload Directories
- `covers/` - Temporary cover uploads during processing
- `epub/` - Temporary EPUB uploads during processing

## All Variables — Where They Come From and When They're Used

### Environment Variables (from .env.local)

| Name | Type | Where Defined | Where Used | When Changes | Default Value | Required |
|------|------|---------------|------------|--------------|---------------|----------|
| `MONGODB_URI` | string | `.env.local` | `server.ts:69` | On server start | `"mongodb://localhost:27017/the-shelf"` | Yes |
| `JWT_SECRET` | string | `.env.local` | `server.ts:70`, `AuthContext.tsx:4` | On server start | `"your-secret-key"` | Yes (change in production) |
| `SESSION_DURATION` | string | `.env.local` | `server.ts:71` | On server start | `"24h"` | No |
| `EMAIL_USER` | string | `.env.local` | `server.ts:27` | On server start | N/A | Yes (for password reset) |
| `EMAIL_PASS` | string | `.env.local` | `server.ts:28` | On server start | N/A | Yes (for password reset) |
| `NODE_ENV` | string | `.env.local` | Various files | On server start | `"development"` | No |

### Server-Side Constants (server.ts)

| Name | Type | Where Defined | Where Used | When Changes | Default Value |
|------|------|---------------|------------|--------------|---------------|
| `STORAGE_DIR` | string | `server.ts:39` | `server.ts:40-41` | On server start | `path.join(__dirname, "storage")` |
| `EPUB_DIR` | string | `server.ts:40` | Multiple file operations | On server start | `path.join(STORAGE_DIR, "epub")` |
| `COVERS_DIR` | string | `server.ts:41` | Multiple file operations | On server start | `path.join(STORAGE_DIR, "covers")` |
| `MONGODB_URI` | string | `server.ts:69` | `mongoose.connect()` | On server start | From env or default |
| `JWT_SECRET` | string | `server.ts:70` | JWT sign/verify | On server start | From env or default |
| `SESSION_DURATION` | string | `server.ts:71` | JWT expiration | On server start | From env or default |

### Frontend Constants

| Name | Type | Where Defined | Where Used | When Changes | Default Value |
|------|------|---------------|------------|--------------|---------------|
| `INACTIVITY_LIMIT` | number | `AuthContext.tsx:4` | Session timeout logic | On import | `24 * 60 * 60 * 1000` (24 hours) |
| `ACTIVITY_EVENTS` | string[] | `AuthContext.tsx:5` | Event listeners for activity reset | On import | `["mousemove", "keydown", "mousedown", "touchstart", "scroll"]` |
| `SORT_OPTIONS` | object[] | `Library.tsx:16-22` | Sort dropdown options | On import | Array of sort options |
| `GENRE_OPTIONS` | string[] | `Library.tsx:25-33` | Genre filter options | On import | Array of genre strings |
| `LIGHT_THEME` | object | `Reader.tsx:34-42` | Reader theme colors | On theme change | Color object |
| `DARK_THEME` | object | `Reader.tsx:46-54` | Reader theme colors | On theme change | Color object |

### State Variables (React Components)

| Component | Variable | Type | Initial Value | When Changes | Where Used |
|-----------|----------|------|---------------|--------------|------------|
| AuthContext | `user` | User \| null | `null` | On login/signup/logout | Throughout app for auth checks |
| AuthContext | `token` | string \| null | From localStorage | On login/signup/logout | API requests |
| AuthContext | `isAuthReady` | boolean | `false` | After auth check | Loading states |
| AuthContext | `sessionExpired` | boolean | `false` | On inactivity timeout | Session expired UI |
| Library | `books` | Book[] | `[]` | On API response | Book grid display |
| Library | `search` | string | `""` | On user input | Search API calls |
| Library | `genre` | string | `"All Genres"` | On filter change | Filter API calls |
| Library | `sort` | string | `"newest"` | On sort change | Sort API calls |
| Reader | `bookMeta` | object \| null | `null` | On book load | Reader display |
| Reader | `progress` | number | `0` | On location change | Progress bar |
| Reader | `isFullscreen` | boolean | `false` | On fullscreen toggle | Layout changes |

## Admin Dashboard Features

The admin dashboard provides comprehensive library management with the following modules:

### Dashboard Module (`Dashboard.tsx`)
- **Statistics Display**: Real-time counts of active books, archived books, readers, and reading sessions
- **Activity Feed**: Chronological log of all admin actions with timestamps and action types:
  - `added` — Books uploaded or scraped
  - `updated` — Metadata changes
  - `deleted` — Books permanently removed
  - `archived` — Books hidden from users
  - `restored` — Archived books re-activated
  - `scrape` — Gutenberg scraping events
- **CSV Export**: Download activity history for audit or analytics purposes
- **Responsive Navigation**: Desktop tabs and mobile hamburger menu for admin sections

### Ingest Books Module (`IngestBooks.tsx`)
Three book ingestion methods with duplicate detection:

#### 1. **Manual Upload**
- Upload single EPUB with optional cover image
- Auto-extraction of metadata (title, author, language) from EPUB file
- Manual override for metadata fields if needed
- Optional Gutenberg ID linking
- Metadata form includes: Title, Author, Genre, Language, Description

#### 2. **Batch Upload**
- Upload multiple EPUB files at once
- Real-time progress tracking (pending → uploading → done/error)
- Automatic metadata extraction for each file
- Continue upload queue even if individual files fail

#### 3. **Project Gutenberg Scraper**
- Search Gutenberg API by query, author, or title
- Language filtering (English, French, German, Spanish)
- Configurable result limits (5, 10, 20, 50 books)
- Automatic EPUB download and storage
- Automatic cover image extraction and storage
- Duplicate detection (skips books already in database by gutenbergId)
- Detailed results: Added count, Skipped (duplicates), Failed count
- Book list showing all successfully ingested titles

### Manage Books Module (`ManageBooks.tsx`)
- Browse all books (Active and Archived)
- Filter and search by title/author
- **Edit metadata**: Update title, author, genre, description, publication year
- **Cover management**: Upload or replace book covers
- **Archive/Restore**: Hide books from users without deletion
- **Delete**: Permanently remove books from database
- Activity logged for all changes

## Book Archive Feature

Books can now have a `status` field (Active or Archived):
- **Active**: Visible to all users in the main library
- **Archived**: Hidden from user-facing routes but retained in database for admin management
- Admin-only routes can see all books regardless of status
- User route `/api/books` filters to `status: "Active"` only

## API Routes (Updated)

### Admin Routes
- `GET /api/admin/stats` — Get library statistics
- `GET /api/admin/activity` — Fetch activity log
- `GET /api/admin/activity/export` — Download activity as CSV
- `GET /api/admin/books` — List all books (including archived)
- `PUT /api/admin/books/:id` — Update book metadata and status
- `DELETE /api/admin/books/:id` — Permanently delete book
- `POST /api/admin/books/:id/cover` — Upload book cover image
- `POST /api/admin/books/upload` — Manual EPUB upload
- `POST /api/admin/books/scrape` — Gutenberg API scraper
- `GET /api/admin/test-gutenberg-api` — Debug Gutenberg API connectivity

### User Routes (Updated)
- `GET /api/books` — List active books only (filters `status: "Active"`)
- Reading progress routes function as before

## Environment Variables (Updated)

Create a `.env.local` file in the project root with the following variables:

```
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/the-shelf

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
SESSION_DURATION=24h

# Email (Gmail / Nodemailer for password reset)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

# Gutenberg API (RapidAPI)
RAPIDAPI_KEY=your-rapidapi-key-here
RAPIDAPI_HOST=project-gutenberg-free-books-api1.p.rapidapi.com

# Environment
NODE_ENV=development
```

### Environment Variable Details

| Variable | Purpose | Required | Default | Notes |
|----------|---------|----------|---------|-------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017/the-shelf` | Update for cloud MongoDB |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes | `your-secret-key` | **Change in production** |
| `SESSION_DURATION` | Token expiration time | No | `24h` | Format: `24h`, `7d`, etc. |
| `EMAIL_USER` | Gmail address for sending password resets | Yes | N/A | Requires App Password (not regular password) |
| `EMAIL_PASS` | Gmail App Password (not account password) | Yes | N/A | Generate in Gmail Security settings |
| `RAPIDAPI_KEY` | API key for Project Gutenberg scraper | Yes | N/A | Get from https://rapidapi.com |
| `RAPIDAPI_HOST` | RapidAPI host for Gutenberg | Yes | N/A | `project-gutenberg-free-books-api1.p.rapidapi.com` |
| `NODE_ENV` | Environment mode | No | `development` | Set to `production` for deployment |

### Setting Up Gmail for Email Notifications

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the generated 16-character password as `EMAIL_PASS` (not your actual Gmail password)

### Setting Up RapidAPI for Gutenberg Scraper

1. Sign up at https://rapidapi.com
2. Search for "Project Gutenberg Free Books API"
3. Subscribe to the free tier
4. Get your API key from the dashboard
5. Use the key in `RAPIDAPI_KEY` and the host in `RAPIDAPI_HOST`

## Database Schema Updates

### Book Model (Updated)
```typescript
{
  title: String (required),
  author: String (required),
  category: String (required),
  epubUrl: String (required),
  coverUrl: String (default ""),
  description: String (default ""),
  language: String (default "en"),
  publicationYear: String (default ""),
  status: Enum ["Active", "Archived"] (default "Active"),  // NEW
  gutenbergId: Number (unique, sparse),
  ingestedAt: Date (default now)
}
```

### AdminActivity Model (New)
```typescript
{
  type: Enum ["added", "updated", "deleted", "archived", "restored", "scrape"],
  message: String,
  adminId: ObjectId (ref User),
  adminName: String (default "Admin"),
  createdAt: Date (default now)
}
```

## Functions & Methods — What They Do and When They Run

### Server-Side Functions (server.ts)

| Function | Location | Purpose | Parameters | Returns | When Called | Side Effects |
|----------|----------|---------|------------|---------|-------------|--------------|
| `startServer` | `server.ts:172` | Initialize and start Express server | None | Promise<void> | On script execution | Starts HTTP server, connects to DB |
| `logActivity` | `server.ts:135-145` | Log admin actions to database | type, message, adminUser | Promise<void> | After admin operations | Inserts AdminActivity document |
| `verifyToken` | `server.ts:149-157` | JWT authentication middleware | req, res, next | void | On protected routes | Sets req.user or returns 401 |
| `isAdmin` | `server.ts:159-163` | Admin role check middleware | req, res, next | void | On admin routes | Returns 403 if not admin |
| `extractEpubMetadata` | `server.ts:805-838` | Extract metadata from EPUB files | filePath: string | Promise<object> | During book upload | Reads EPUB file, extracts cover |

### API Route Handlers

| Route | Method | Handler | Purpose | Parameters | Returns | When Called | Side Effects |
|-------|--------|---------|---------|------------|---------|-------------|--------------|
| `/api/auth/signup` | POST | `server.ts:218-235` | User registration | username, email, password | {token, user} | On signup form submit | Creates User document, sends JWT |
| `/api/auth/login` | POST | `server.ts:237-271` | User authentication | email, password | {token, user} | On login form submit | Updates User document, sends JWT |
| `/api/auth/me` | GET | `server.ts:273-281` | Get current user | None (from token) | user object | On app load | None |
| `/api/books` | GET | `server.ts:320-365` | List books with filtering | query params (page, search, category, sort) | {books, total, page, total_pages} | On library page load/filter | None |
| `/api/books/:id` | GET | `server.ts:367-378` | Get book details | id (URL param) | book object | On book detail page | None |
| `/api/progress/:bookId` | GET | `server.ts:447-455` | Get reading progress | bookId (URL param) | progress object | On book detail/reader load | None |
| `/api/progress/:bookId` | PUT | `server.ts:459-472` | Update reading progress | bookId, last_location, percentage, chapter | 204 No Content | On reader location change | Updates ReadingProgress document |
| `/api/admin/books/scrape` | POST | `server.ts:757-785` | Scrape Gutenberg books | query: string | scrape results | On admin scrape action | Creates Book documents |

### Frontend Functions

| Function | Location | Purpose | Parameters | Returns | When Called | Side Effects |
|----------|----------|---------|------------|---------|-------------|--------------|
| `cn` | `utils.ts:4-6` | Merge CSS classes | ...inputs: ClassValue[] | string | Throughout components | None |
| `useInView` | `Landingpage.tsx:89-101` | Intersection observer hook | threshold | {ref, visible} | On component mount | Sets up observers |
| `useBreakpoint` | `Landingpage.tsx:103-115` | Responsive breakpoint hook | None | breakpoint object | On window resize | Updates state |
| `saveProgress` | `Reader.tsx:112-140` | Save reading progress to server | cfi, pct, chapter, isRetry | Promise<void> | On location change | Makes API call, updates server |
| `fetchBooks` | `Library.tsx:47-65` | Fetch books from API | None | Promise<void> | On mount, search/filter change | Updates books state |
| `handleSubmit` | `Login.tsx:15-25` | Handle login form | e: FormEvent | Promise<void> | On form submit | Calls login API, navigates |

## Data Flow

### User Authentication Flow
1. User submits login/signup form in React frontend
2. Frontend calls `/api/auth/login` or `/api/auth/signup`
3. Backend validates credentials, creates/updates User document in MongoDB
4. Backend generates JWT token, returns to frontend
5. Frontend stores token in localStorage, updates AuthContext state
6. AuthContext checks token validity on app load via `/api/auth/me`

### Book Reading Flow
1. User clicks book in Library, navigates to `/read/:id`
2. Reader component fetches book metadata via `/api/books/:id`
3. Fetches existing progress via `/api/progress/:bookId`
4. Loads EPUB file via `/api/books/epub-proxy/:id`
5. epub.js renders book in browser
6. On location change, calls `saveProgress` → `/api/progress/:bookId` PUT
7. Progress saved to ReadingProgress collection

### Book Ingestion Flow
1. Admin uses IngestBooks interface
2. For Gutenberg: calls `/api/admin/books/scrape` → runs scraper.py
3. scraper.py searches Gutenberg API, downloads EPUBs/covers
4. Backend creates Book documents in MongoDB
5. For manual upload: handles file upload, extracts metadata, creates Book document

### State Management
- **Authentication**: React Context (AuthContext) manages user/token state globally
- **Component State**: Local useState for UI state (loading, forms, filters)
- **Server State**: MongoDB collections (User, Book, ReadingProgress, AdminActivity)

## Environment Variables & Config

| Variable | Purpose | Required | Default | Safe Default |
|----------|---------|----------|---------|--------------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017/the-shelf` | No (contains credentials) |
| `JWT_SECRET` | JWT signing secret | Yes | `your-secret-key` | No (must be unique/secret) |
| `SESSION_DURATION` | JWT token expiration | No | `24h` | Yes |
| `EMAIL_USER` | Gmail address for password reset | Yes (for password reset) | N/A | No (contains credentials) |
| `EMAIL_PASS` | Gmail app password | Yes (for password reset) | N/A | No (contains credentials) |
| `NODE_ENV` | Environment mode | No | `development` | Yes |

## Minor to Major Things I Should Know

### Hardcoded Values
- Theme colors defined in `index.css` and Reader component
- Activity timeout of 24 hours in AuthContext
- File size limits (500MB for EPUB, 10MB for covers) in multer config
- Rate limiting (100 requests per 15 minutes) in server.ts
- Default sort order "newest" in Library component
- Admin role check uses string "admin" throughout

### TODOs or FIXMEs Found
- None explicitly marked, but some areas could be improved:
  - Password reset email template is hardcoded HTML
  - No input validation on some admin forms
  - Error handling could be more comprehensive

### Non-Obvious Logic
- Books with `status: "Archived"` are hidden from user-facing routes but visible to admins
- Reading progress uses CFI (EPUB Canonical Fragment Identifier) for precise positioning
- Admin activity logging happens after operations, not before
- File uploads go to `uploads/` first, then moved to `storage/` after processing
- Duplicate Gutenberg books are skipped based on `gutenbergId` field

### Edge Cases
- Users can have multiple reading sessions for same book (only latest progress kept)
- Failed login attempts lock account for 15 minutes after 5 failures
- Password reset tokens expire in 30 minutes
- Book search is case-insensitive regex on title and author
- Cover images are extracted from EPUB if not provided separately

### Critical Behaviors
- All admin routes require `role: "admin"` in user document
- JWT tokens are checked on every protected request
- File uploads are validated for type and size server-side
- MongoDB indexes are created automatically on server start
- Production build serves static files without Vite middleware

### Development Notes
- `npm run dev` uses tsx for TypeScript execution
- Vite HMR works for frontend changes
- Backend changes require server restart
- MongoDB connection is required for app to start
- Email functionality requires Gmail app password setup

### Security Considerations
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens have configurable expiration
- File uploads restricted to EPUB and image types
- Rate limiting prevents abuse
- Helmet adds security headers
- CSP headers configured for EPUB reading

### Performance Notes
- Book list pagination (20 per page)
- Search debounced (400ms delay)
- Reading progress auto-saves every few seconds
- Images lazy-loaded with referrer policy
- EPUB files streamed directly from disk

### Deployment Requirements
- Node.js environment
- MongoDB instance (Atlas or local)
- File system write permissions for uploads/storage
- Email service configured for password reset
- HTTPS recommended for production (JWT over HTTP)
