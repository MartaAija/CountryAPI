# Railway Deployment Guide

This guide provides instructions for deploying the TravelTales API on Railway.app with the correct production environment variables.

## Environment Variables

Set the following environment variables in the Railway dashboard for your production deployment:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Sets the environment to production mode |
| `FRONTEND_URL` | `https://traveltalesblog.netlify.app` | URL of the frontend application for email links |
| `PORT` | `5000` (or Railway will set automatically) | Port for the API server |
| `EMAIL_USER` | Your email username/address | Email account for sending verification emails |
| `EMAIL_PASSWORD` | Your email password or app password | Password for the email account |
| `EMAIL_FROM` | `TravelTales <noreply@traveltales.com>` | From address for emails |
| `JWT_SECRET` | A secure random string | Secret for JWT token generation |
| `COOKIE_SECRET` | A secure random string | Secret for cookie signing |
| `DB_HOST` | Your database host | MySQL/MariaDB host |
| `DB_USER` | Your database username | Database credentials |
| `DB_PASSWORD` | Your database password | Database credentials |
| `DB_NAME` | `traveltales` | Database name |
| `ADMIN_USERNAME` | Admin username | Admin account username |
| `ADMIN_PASSWORD` | Admin password | Admin account password |

## Setting Environment Variables in Railway

1. Go to your project in the Railway dashboard
2. Navigate to the "Variables" tab
3. Add each of the environment variables listed above
4. Click "Deploy" to apply the changes

## Verifying Deployment

After deployment, you can verify that your API is running correctly by:

1. Checking the deployment logs to ensure the application starts without errors
2. Visiting the API root URL (e.g., `https://countryapi-production-5484.up.railway.app/`) to see the API status
3. Checking the `/health` endpoint to verify the API is healthy

## Email Functionality

Ensure that the email service is properly configured with valid credentials. For Gmail, you may need to:

1. Use an "App Password" instead of your regular password
2. Enable "Less secure app access" (not recommended for production)
3. Or use a dedicated email service like SendGrid, Mailgun, etc.

## Database Migration

The application will attempt to create necessary tables on startup. Ensure your database user has sufficient privileges to create/alter tables.

## Troubleshooting

If you encounter issues with email links or cross-origin requests:

1. Verify the `FRONTEND_URL` environment variable is set correctly
2. Check that the CORS configuration includes your frontend domain
3. Review the application logs for any errors related to email sending or authentication 