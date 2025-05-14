# Country Explorer Application

A secure web application for exploring country data and sharing travel experiences.

## Security Features

### Authentication Security
- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **HttpOnly Cookies**: Authentication tokens stored in HttpOnly cookies to prevent XSS attacks
- **CSRF Protection**: Cross-Site Request Forgery protection for all forms and API endpoints
- **Email Verification**: User accounts require email verification
- **Secure Password Reset**: Secure token-based password reset flow
- **Rate Limiting**: Prevents brute force attacks on authentication endpoints
- **Server-side Admin Authentication**: Admin authentication handled securely on the server
- **Security Logging**: Enhanced logging for security events

### API Security
- **Input Validation**: All user inputs are validated
- **Parameterized Queries**: Prevents SQL injection attacks
- **Content Security Policy**: Restricts content sources to prevent XSS attacks
- **API Key Management**: Secure API key generation and management
- **CORS Configuration**: Restricts cross-origin requests

### Database Security
- **Normalized Schema**: Database follows 3NF principles
- **Parameterized Queries**: All database queries use parameterization
- **Secure Credential Storage**: Sensitive data properly secured
- **Access Control**: Proper access control for database operations

## Environment Setup

Create a `.env` file in the `secure-api-middleware` directory with the following variables:

```
# API Configuration
NODE_ENV=development
PORT=5000

# JWT Secret for Authentication
JWT_SECRET=your_secure_jwt_secret_here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password

# Database Configuration
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=your_db_password
DB_NAME=country_api

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
```

## Docker Deployment

The application can be deployed using Docker Compose:

```bash
docker-compose up -d
```

This will start the following containers:
- Frontend client (React)
- Backend API (Node.js/Express)
- Database (MySQL)

## Security Best Practices

1. **Change Default Credentials**: Update all default credentials in the `.env` file
2. **Use Strong Passwords**: Use strong, unique passwords for all accounts
3. **Keep Dependencies Updated**: Regularly update dependencies to patch security vulnerabilities
4. **Enable HTTPS**: Always use HTTPS in production
5. **Implement MFA**: Consider adding multi-factor authentication for admin accounts
6. **Regular Backups**: Maintain regular database backups
7. **Monitor Logs**: Regularly review security logs for suspicious activity

## Features

- **3NF Database Structure**: Fully normalized database design following Third Normal Form principles
- **Secure Authentication**: JWT-based authentication with password hashing
- **API Key Management**: Generate and manage API keys for external service access
- **CSRF Protection**: Protection against Cross-Site Request Forgery attacks
- **Security Best Practices**: Secure API key generation, rate limiting, and input validation
- **DAO Pattern**: Data Access Object pattern for clean separation of concerns
- **RESTful API**: Well-designed RESTful API endpoints

## Database Design

The database follows 3NF (Third Normal Form) principles:

- **Users Table**: Core user authentication data
- **User Profiles Table**: User profile information separated from authentication
- **API Keys Table**: Normalized API key management
- **Countries Table**: Normalized country data
- **Blog Posts Table**: Blog post content with normalized relationships
- **Comments Table**: Comment data with support for threaded replies
- **Post Reactions Table**: Normalized reaction data (likes/dislikes)
- **Followers Table**: User follow relationships

## API Documentation

### Authentication

- `POST /auth/signup`: Register a new user
- `POST /auth/login`: Login and receive JWT token
- `GET /auth/profile`: Get user profile (requires authentication)
- `PUT /auth/profile`: Update user profile (requires authentication)
- `POST /auth/change-password`: Change password (requires authentication)
- `POST /auth/generate-api-key`: Generate new API key (requires authentication)
- `GET /auth/api-keys`: Get user's API keys (requires authentication)

### Blog

- `GET /blog/posts`: Get all blog posts
- `GET /blog/posts/:id`: Get a specific blog post
- `POST /blog/posts`: Create a new blog post (requires authentication)
- `PUT /blog/posts/:id`: Update a blog post (requires authentication)
- `DELETE /blog/posts/:id`: Delete a blog post (requires authentication)
- `POST /blog/posts/:id/comments`: Add a comment (requires authentication)
- `POST /blog/posts/:id/like`: Like a post (requires authentication)
- `POST /blog/posts/:id/dislike`: Dislike a post (requires authentication)

### Countries

- `GET /countries`: Get all countries
- `GET /countries/search`: Search countries by name
- `GET /countries/stats`: Get countries with post counts

## Setup and Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=country_api_db
   CORS_ORIGIN=http://localhost:3000
   ```
4. Run the database migration: `npm run migrate`
5. Start the server: `npm start`

## Migration from Previous Version

If you're upgrading from a previous version, run the migration script to convert your database to the new 3NF structure:

```
npm run migrate
```

This will:
1. Create the new normalized tables
2. Migrate data from the old structure to the new one
3. Preserve all existing data and relationships

## Development

- Run in development mode: `npm run dev`
- Access the API at `http://localhost:5000` 