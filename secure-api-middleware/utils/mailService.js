/**
 * Mail Service Module
 * Handles email sending functionality using nodemailer
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

// Read email configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'TravelTales <noreply@traveltales.com>';

// Define base URLs for different environments
const PRODUCTION_URL = 'https://traveltalesblog.netlify.app';
const DEVELOPMENT_URL = 'http://localhost:3000';

// Determine which base URL to use based on environment
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.FRONTEND_URL || PRODUCTION_URL)
  : (process.env.BASE_URL || DEVELOPMENT_URL);

console.log(`Mail service configured with base URL: ${BASE_URL}`);

const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// Create a nodemailer transporter using environment variables
let transporter;

// Skip actual email sending if credentials are not provided or in development mode
if (!EMAIL_USER || !EMAIL_PASSWORD || SKIP_EMAIL_VERIFICATION) {
  // Use a fake transporter that doesn't actually send emails
  transporter = {
    sendMail: async (options) => {
      console.log(`[DEV MODE] Email would be sent to: ${options.to}`);
      console.log(`[DEV MODE] Subject: ${options.subject}`);
      console.log(`[DEV MODE] Links would use base URL: ${BASE_URL}`);
      return { messageId: 'fake-message-id-' + Date.now() };
    }
  };
} else {
  // Use real email service with provided credentials
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' // Set to true in production
    }
  });
}

/**
 * Send email verification link to user
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @param {string} userId - User ID
 * @returns {Promise} - Email sending result
 */
const sendVerificationEmail = async (to, token, userId) => {
  try {
    const verificationUrl = `${BASE_URL}/verify-email?token=${token}&userId=${userId}`;
    
    // Create email options
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject: 'Verify Your TravelTales Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Welcome to TravelTales!</h2>
          <p>Thank you for registering with us. To complete your registration and start sharing your travel experiences, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #BE3144; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours for security reasons.</p>
          <p>If you didn't create an account on TravelTales, you can safely ignore this email.</p>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset link to user
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @param {string} userId - User ID
 * @returns {Promise} - Email sending result
 */
const sendPasswordResetEmail = async (to, token, userId) => {
  try {
    const resetUrl = `${BASE_URL}/reset-password?token=${token}&userId=${userId}`;
    
    // Create email options
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject: 'Reset Your TravelTales Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Password Reset Request</h2>
          <p>We received a request to reset your password for your TravelTales account. To create a new password, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #BE3144; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
          <p>This password reset link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send confirmation email after password change
 * @param {string} to - Recipient email
 * @returns {Promise} - Email sending result
 */
const sendPasswordChangeConfirmation = async (to) => {
  try {
    // Create email options
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject: 'Your TravelTales Password Has Been Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Password Changed Successfully</h2>
          <p>This email confirms that your TravelTales account password was recently changed.</p>
          <p>If you made this change, no further action is required.</p>
          <p>If you did NOT change your password, please contact us immediately and secure your account.</p>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change confirmation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password change verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @param {string} userId - User ID
 * @returns {Promise} - Email sending result
 */
const sendPasswordChangeVerificationEmail = async (to, token, userId) => {
  try {
    // Create verification URL
    const verificationUrl = `${BASE_URL}/verify-password-change?token=${token}&userId=${userId}`;
    
    // Create email options
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject: 'Verify Your TravelTales Password Change',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Verify Your Password Change</h2>
          <p>You recently requested to change your password for your TravelTales account. Please click the button below to verify this change:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #BE3144; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Password Change</a>
          </div>
          
          <p>If you did not request this change, please ignore this email or contact us immediately if you believe your account has been compromised.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #888;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #BE3144; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email change verification email
 * @param {string} to - New email address
 * @param {string} token - Verification token
 * @param {string} userId - User ID
 * @returns {Promise} - Email sending result
 */
const sendEmailChangeVerificationEmail = async (to, token, userId) => {
  try {
    // Create verification URL
    const verificationUrl = `${BASE_URL}/verify-email-change?token=${token}&userId=${userId}`;
    
    // Create email options
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject: 'Verify Your New TravelTales Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Verify Your New Email Address</h2>
          <p>You recently requested to change the email address for your TravelTales account. Please click the button below to verify this new email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #BE3144; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify New Email</a>
          </div>
          
          <p>If you did not request this change, please ignore this email or contact us immediately if you believe your account has been compromised.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #888;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #BE3144; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email change verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email change confirmation
 * @param {string} oldEmail - Previous email address
 * @param {string} newEmail - New email address
 * @returns {Promise} - Email sending result
 */
const sendEmailChangeConfirmation = async (oldEmail, newEmail) => {
  try {
    // Create email options for old email
    const oldEmailOptions = {
      from: EMAIL_FROM,
      to: oldEmail,
      subject: 'Your TravelTales Email Has Been Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Email Address Changed</h2>
          <p>This email confirms that your TravelTales account email has been changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
          <p>If you made this change, no further action is required.</p>
          <p>If you did NOT change your email, please contact us immediately and secure your account.</p>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    // Create email options for new email
    const newEmailOptions = {
      from: EMAIL_FROM,
      to: newEmail,
      subject: 'Your TravelTales Email Change is Complete',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #BE3144; text-align: center;">Email Address Change Successful</h2>
          <p>Congratulations! Your TravelTales account email has been successfully changed to this address.</p>
          <p>You can now use this email address to log in to your account.</p>
          <p>If you did not make this change, please contact us immediately.</p>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>TravelTales - Share Your Journey</p>
          </div>
        </div>
      `
    };
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email change confirmation:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
  sendPasswordChangeVerificationEmail,
  sendEmailChangeVerificationEmail,
  sendEmailChangeConfirmation
}; 