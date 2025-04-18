import app from 'flarum/app';
import SupabaseSettingsPage from './components/SupabaseSettingsPage';

app.initializers.add('forumez-supabase', () => {
  // Register the settings page for the extension
  app.extensionData
    .for('forumez-supabase')
    .registerPage(SupabaseSettingsPage);
    
  // Add translation keys
  app.translator.addTranslations({
    'forumez-supabase': {
      'admin': {
        'settings': {
          // API Section
          'api_section_title': 'Supabase API Settings',
          'api_section_description': 'Enter your Supabase API credentials. You can find these in your Supabase project settings.',
          'public_url_label': 'Supabase Project URL',
          'public_url_description': 'The URL of your Supabase project (e.g. https://your-project.supabase.co)',
          'public_key_label': 'Public API Key',
          'public_key_description': 'The anon/public API key from your Supabase project',
          'private_key_label': 'Private API Key',
          'private_key_description': 'The service_role key from your Supabase project (kept private)',
          'test_connection_button': 'Test Connection',
          
          // Social Providers Section
          'social_providers_section_title': 'Social Login Providers',
          'social_providers_description': 'Select which social login providers you want to enable for your forum.',
          'enabled_providers_label': 'Enabled Providers',
          'enabled_providers_help': 'Click on a provider to enable or disable it. Make sure to also enable the provider in your Supabase authentication settings.',
          
          // Preview Widget
          'preview_widget': {
            'title': 'Social Login Preview',
            'description': 'This is how your social login buttons will appear to users.',
            'login_preview': 'Login Modal Preview',
            'signup_preview': 'Sign Up Modal Preview',
            'button_click_message': 'This is a preview. In the actual forum, this button would connect to the social provider.'
          },
          
          // Security & Sync Section
          'security_sync_section_title': 'Security & Synchronization',
          'enable_2fa_label': 'Enable Two-Factor Authentication',
          'enable_2fa_help': 'Allow users to secure their accounts with two-factor authentication using authenticator apps.',
          'require_2fa_label': 'Require Two-Factor Authentication',
          'require_2fa_help': 'Require users to set up two-factor authentication for their accounts.',
          'sync_avatar_label': 'Synchronize User Avatars',
          'sync_avatar_help': 'Automatically sync user profile pictures from social providers to Flarum.',
          'sync_metadata_label': 'Synchronize User Metadata',
          'sync_metadata_help': 'Sync additional user information from Supabase to Flarum.',
          'avatar_bucket_label': 'Avatar Storage Bucket',
          'avatar_bucket_help': 'The Supabase storage bucket name for user avatars.',
          
          // Messages
          'save_error': 'Error saving settings: {error}',
          'connection_success': 'Successfully connected to Supabase!',
          'connection_error': 'Connection failed: {error}'
        }
      },
      'forum': {
        'login_with_provider': 'Login with {provider}',
        'signup_with_provider': 'Sign up with {provider}',
        'or_login_with': 'or login with',
        'or_sign_up_with': 'or sign up with'
      }
    }
  });
});