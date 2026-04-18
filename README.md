<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# The Shelf

A web-based public-domain EPUB library with progress tracking and admin ingestion.

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js, MongoDB Atlas account

### Database Setup (MongoDB Atlas)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier)
3. Create a database user and whitelist your IP
4. Get your connection string from Atlas
5. Update `MONGODB_URI` in `.env.local` with your Atlas connection string

### Application Setup
1. Install dependencies:
   `npm install`
2. Set the `MONGODB_URI` in [.env.local](.env.local) to your MongoDB Atlas connection string
3. Run the app:
   `npm run dev`

## Admin User Setup
By default, new users are created with the `reader` role. To create an admin user, update the `role` field for a user document in MongoDB to `admin`.

If you are using MongoDB Atlas, you can do this from the Atlas UI or via the MongoDB shell:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Once a user has `role: "admin"`, they can access protected admin routes such as book ingestion and management.

## Technology Stack & Architecture

### Overview
The Shelf is a full-stack web application built with modern JavaScript/TypeScript technologies. It follows a client-server architecture with a React frontend and an Express.js backend, using MongoDB for data persistence.

### Frontend (React + TypeScript)

**Core Technologies:**
- **React 19** - Modern React with concurrent features and automatic batching
- **TypeScript** - Type-safe JavaScript for better developer experience and fewer runtime errors
- **Vite** - Fast build tool and development server with HMR (Hot Module Replacement)
- **React Router DOM** - Client-side routing for single-page application navigation

**UI & Styling:**
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Tailwind CSS v4** - Latest version with improved performance and features
- **Lucide React** - Beautiful, customizable icons
- **Motion** - Animation library for smooth UI transitions
- **clsx & tailwind-merge** - Utility functions for conditional CSS classes

**State Management:**
- **React Context API** - Global state management for authentication and user data
- **Custom Hooks** - Reusable logic for authentication (`useAuth`) and other features

**HTTP Client:**
- **Axios** - Promise-based HTTP client for API communication

**File Structure:**
```
src/
├── components/     # Reusable UI components (Layout, etc.)
├── context/        # React Context providers (AuthContext)
├── lib/           # Utility functions and helpers
├── pages/         # Route components (Login, Library, Reader, etc.)
├── App.tsx        # Main app component with routing
├── main.tsx       # React app entry point
└── index.css      # Global styles and Tailwind imports
```

### Backend (Express.js + TypeScript)

**Core Technologies:**
- **Express.js** - Fast, unopinionated web framework for Node.js
- **TypeScript** - Type-safe server-side code
- **tsx** - TypeScript execution environment for development

**Database & Data:**
- **MongoDB** - NoSQL document database for flexible data storage
- **Mongoose** - ODM (Object Document Mapping) for MongoDB with schema validation

**Authentication & Security:**
- **bcryptjs** - Password hashing for secure credential storage
- **jsonwebtoken (JWT)** - Token-based authentication for session management
- **Custom middleware** - Authentication verification and admin role checking

**External APIs:**
- **Axios** - HTTP client for external API calls (Project Gutenberg scraping)

**Data Models:**
- **User** - Authentication, roles (reader/admin), profile data
- **Book** - EPUB metadata, Gutenberg integration, status tracking
- **ReadingProgress** - User reading progress, bookmarks, chapter tracking

### Key Features & Architecture

**Authentication Flow:**
1. User registers/logs in through React frontend
2. Credentials sent to Express API endpoints (`/api/auth/login`, `/api/auth/signup`)
3. Password hashed with bcrypt, JWT token generated
4. Token stored in localStorage and included in subsequent requests
5. `verifyToken` middleware validates requests on protected routes

**Book Management:**
- Admin users can scrape books from Project Gutenberg API
- Books stored in MongoDB with metadata (title, author, genre, EPUB URLs)
- Public access to browse and read books

**Reading Experience:**
- **EPUB.js** - Client-side EPUB rendering and navigation
- Progress tracking stored per user per book
- Chapter and CFI (EPUB Canonical Fragment Identifier) based positioning

**Development Workflow:**
- **Vite** serves frontend in development with HMR
- **Express server** handles API routes and serves built frontend in production
- **Single package.json** with unified dependency management
- **TypeScript** provides type safety across frontend and backend

### API Endpoints

**Authentication:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

**Books:**
- `GET /api/books` - List all books
- `GET /api/books/:id` - Get specific book details

**Reading Progress:**
- `GET /api/progress/:bookId` - Get user's reading progress
- `POST /api/progress` - Update reading progress

**Admin (Protected):**
- `POST /api/admin/books/scrape` - Import books from Gutenberg
- `DELETE /api/admin/books/:id` - Remove books
- `PUT /api/admin/books/:id` - Update book details

**Profile Management:**
- `GET /api/profile/history` - User's reading history
- `PUT /api/profile` - Update user profile
- `PUT /api/profile/password` - Change password

### Environment Variables

Create a `.env.local` file with:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/the-shelf?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Development
NODE_ENV=development
```

**Note:** Replace the `MONGODB_URI` with your actual MongoDB Atlas connection string. You can find this in your Atlas dashboard under "Connect" > "Connect your application".

### Development Commands

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - TypeScript type checking
- `npm run clean` - Remove build artifacts

### Deployment

The application is designed to run on a single server in production:
1. Build frontend with `npm run build`
2. Express server serves static files and handles API routes
3. Connect to MongoDB instance
4. Set environment variables for production

This architecture provides a scalable, maintainable foundation for an EPUB reading platform with user management and progress tracking.
