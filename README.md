# TravelTales: A Global Journey Through Stories

A secure web application for sharing travel experiences and connecting with fellow travelers. The application features a robust blog system with social features, secure API access, and comprehensive user management.

## Key Features

### Blog System
- Create and share travel stories with rich text content
- Like, dislike, and comment on posts
- Follow other travelers and view their stories
- Filter posts by country and author
- Personal feed of stories from followed travelers

### User Management
- Secure email-based registration and authentication
- Two-step email verification for account security
- Profile management with personal information
- Follow/unfollow system for connecting with other travelers
- Password reset functionality with secure tokens

### Admin Features
- Comprehensive user management dashboard
- Monitor and manage API key usage
- View and moderate blog posts
- User activity monitoring
- Security event logging

### API Access
- Secure API key management system
- Primary and secondary API key support
- Rate limiting and usage tracking
- API key activation/deactivation
- Automatic key rotation capabilities

## Security Features

### Authentication & Authorization
- **Password Security**: Bcrypt hashing with proper salt rounds
- **JWT Authentication**: Secure token-based session management
- **HttpOnly Cookies**: Protected token storage preventing XSS attacks
- **CSRF Protection**: All state-changing operations require CSRF tokens
- **Email Verification**: Two-step verification with secure tokens
- **Rate Limiting**: Protection against brute force attempts

### Data Security
- **Input Sanitization**: All user inputs are sanitized before processing
- **Parameterized Queries**: Protection against SQL injection
- **Content Security Policy**: Controlled resource loading
- **Secure Headers**: Comprehensive security headers via Helmet
- **Error Handling**: Sanitized error responses in production

### API Security
- **API Key Authentication**: Secure key-based access
- **Request Throttling**: Rate limiting on API endpoints
- **CORS Protection**: Configured cross-origin resource sharing
- **Input Validation**: Request payload validation
- **Security Logging**: Comprehensive security event tracking

## Environment Setup

### Backend (.env in secure-api-middleware)
```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Email Configuration (for verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_admin_password

# Security Configuration
CSRF_SECRET=your_csrf_secret
COOKIE_SECRET=your_cookie_secret
```

### Frontend (.env in client)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

## Installation & Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd secure-api-middleware
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```
4. Set up environment variables as shown above
5. Start the backend server:
   ```bash
   cd secure-api-middleware
   npm start
   ```
6. Start the frontend development server:
   ```bash
   cd client
   npm start
   ```

## API Endpoints

### Authentication
- `POST /auth/register`: Register new user
- `POST /auth/login`: User login
- `POST /auth/verify-email`: Email verification
- `POST /auth/resend-verification`: Resend verification email
- `POST /auth/forgot-password`: Initiate password reset
- `POST /auth/reset-password`: Complete password reset
- `POST /auth/logout`: User logout

### Blog
- `GET /blog/posts`: Get all blog posts
- `GET /blog/posts/:id`: Get specific post
- `POST /blog/posts`: Create new post
- `PUT /blog/posts/:id`: Update post
- `DELETE /blog/posts/:id`: Delete post
- `POST /blog/posts/:id/reaction`: Add/remove reaction
- `POST /blog/posts/:id/comments`: Add comment
- `GET /blog/feed`: Get personalized feed

### User Management
- `GET /users/:id`: Get user profile
- `PUT /users/:id`: Update profile
- `POST /users/:id/follow`: Follow user
- `DELETE /users/:id/follow`: Unfollow user
- `GET /users/:id/connections`: Get followers/following

### Admin
- `GET /admin/users`: Get all users
- `DELETE /admin/users/:id`: Delete user
- `GET /admin/users/:id/blogs`: Get user's blogs
- `PUT /admin/users/:id/api-keys/:type/toggle`: Toggle API key
- `DELETE /admin/users/:id/api-keys/:type`: Delete API key

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   └── utils/         # Frontend utilities
│   └── public/            # Static files
│
└── secure-api-middleware/ # Backend Node.js application
    ├── controllers/       # Route controllers
    ├── models/           # Database models
    ├── middleware/       # Express middleware
    ├── routes/          # API routes
    ├── utils/           # Utility functions
    └── config/          # Configuration files
```

## Development

- Backend runs on: `http://localhost:5000`
- Frontend runs on: `http://localhost:3000`

## Deployment

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. Set environment variables for production
3. Start the backend server:
   ```bash
   cd secure-api-middleware
   npm start
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 