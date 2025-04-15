# Supabase Authentication for Flarum

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Latest Stable Version](https://img.shields.io/packagist/v/supaflow/flarum-ext-supabase-auth.svg)

A comprehensive Supabase authentication integration for Flarum with social login capabilities, user role synchronization, enhanced security features, and user migration tools.

## Features

### Authentication Methods
- **Email/Password Authentication**: Standard authentication using Supabase's secure authentication system
- **Social Login**: Connect with multiple providers:
  - GitHub
  - Google
  - Facebook
  - Twitter
  - Discord
  - Apple
  - LinkedIn
  - Slack
  - Spotify
  - Twitch

### Enhanced Security
- **Two-Factor Authentication (2FA)**: Additional security layer using authenticator apps
- **Sensitive Operation Protection**: Require 2FA verification for critical user actions
- **Role-Based 2FA Enforcement**: Configurable policies for requiring 2FA for specific user groups

### User Synchronization
- **Profile Sync**: Keep user profiles in sync between Flarum and Supabase
- **Avatar Sync**: Automatic synchronization of user avatars
- **Metadata Management**: Synchronize and store additional user metadata from Supabase

### Admin Features
- **Comprehensive Dashboard**: Visually appealing interface for managing Supabase integration
- **Connection Testing**: Test your Supabase credentials directly from the admin panel
- **Provider Selection**: Choose which social login providers to enable
- **Advanced Settings**: Fine-tune synchronization and security settings

## Installation

```bash
composer require supaflow/flarum-ext-supabase-auth
```

## Configuration

### Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to Authentication settings
4. Enable the authentication providers you want to use
5. Configure redirect URLs for each provider (your-forum-url/supabase/callback)
6. Obtain your API keys (public anon key and service role key)

### Flarum Setup

1. Navigate to your Flarum admin panel
2. Go to Extensions → Supabase Authentication
3. Enter your Supabase project URL and API keys
4. Configure desired social login providers
5. Set up security settings (2FA, etc.)
6. Save settings

## User Guide

### Social Login

Users can log in using any of the enabled social providers by clicking the corresponding button on the login modal.

### Two-Factor Authentication

1. Navigate to user settings
2. Find the Two-Factor Authentication section
3. Click "Set Up 2FA"
4. Scan the QR code with your authenticator app
5. Enter the verification code
6. 2FA is now active for your account

### Managing Connected Accounts

1. Navigate to user settings
2. View all connected social accounts
3. Disconnect any unwanted connections

## Developer Documentation

### Extension Architecture

The extension follows a modern architecture with:
- Frontend components using Mithril.js
- Backend controllers and services using PHP
- Secure API communication with Supabase

### Extending the Extension

The extension is designed to be extendable through Flarum's extension system. You can:
- Add custom social login providers
- Extend user synchronization behavior
- Add custom security policies

## Troubleshooting

### Common Issues

- **Connection Errors**: Verify your Supabase credentials and check that your project is running
- **Social Login Failures**: Ensure redirect URLs are correctly configured in Supabase
- **2FA Issues**: Verify that server time is synchronized correctly

### Getting Help

If you encounter any issues, please:
1. Check the [GitHub Issues](https://github.com/supaflow/flarum-ext-supabase-auth/issues) page
2. Create a new issue with detailed information if yours isn't already reported

## License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Credits

Developed by the Supaflow Team.