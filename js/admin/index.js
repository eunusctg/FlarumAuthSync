import app from 'flarum/app';
import SupabaseSettingsPage from './components/SupabaseSettingsPage';

app.initializers.add('supaflow-supabase-auth', () => {
  app.extensionData
    .for('supaflow-supabase-auth')
    .registerPermission(
      {
        icon: 'fas fa-sign-in-alt',
        label: app.translator.trans('supaflow-supabase-auth.admin.permissions.use_supabase_auth_label'),
        permission: 'supabase.login'
      },
      'start'
    )
    .registerPermission(
      {
        icon: 'fas fa-shield-alt',
        label: app.translator.trans('supaflow-supabase-auth.admin.permissions.require_2fa_label'),
        permission: 'supabase.require2fa'
      },
      'moderate'
    )
    .registerPermission(
      {
        icon: 'fas fa-users-cog',
        label: app.translator.trans('supaflow-supabase-auth.admin.permissions.manage_social_providers_label'),
        permission: 'supabase.manageSocialProviders'
      },
      'moderate'
    )
    .registerSetting(
      {
        setting: 'supabase.publicUrl',
        name: 'supabase.publicUrl',
        type: 'text',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.public_url_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.public_url_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.publicKey',
        name: 'supabase.publicKey',
        type: 'text',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.public_key_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.public_key_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.privateKey',
        name: 'supabase.privateKey',
        type: 'password',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.private_key_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.private_key_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.enable2FA',
        name: 'supabase.enable2FA',
        type: 'boolean',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.enable_2fa_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.enable_2fa_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.require2FA',
        name: 'supabase.require2FA',
        type: 'boolean',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.require_2fa_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.require_2fa_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.socialProviders',
        name: 'supabase.socialProviders',
        type: 'select',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.social_providers_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.social_providers_help'),
        options: {
          '["github"]': 'GitHub Only',
          '["github", "google"]': 'GitHub and Google',
          '["github", "google", "facebook"]': 'GitHub, Google, and Facebook',
          '["github", "google", "facebook", "twitter"]': 'GitHub, Google, Facebook, and Twitter',
          '["github", "google", "facebook", "twitter", "discord"]': 'GitHub, Google, Facebook, Twitter, and Discord',
          '["github", "google", "facebook", "twitter", "discord", "apple"]': 'All Major Providers'
        },
        default: '["github"]'
      }
    )
    .registerSetting(
      {
        setting: 'supabase.syncAvatar',
        name: 'supabase.syncAvatar',
        type: 'boolean',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.sync_avatar_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.sync_avatar_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.syncUserMetadata',
        name: 'supabase.syncUserMetadata',
        type: 'boolean',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.sync_user_metadata_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.sync_user_metadata_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.avatarBucket',
        name: 'supabase.avatarBucket',
        type: 'text',
        label: app.translator.trans('supaflow-supabase-auth.admin.settings.avatar_bucket_label'),
        help: app.translator.trans('supaflow-supabase-auth.admin.settings.avatar_bucket_help'),
        default: 'avatars'
      }
    )
    .registerPage(SupabaseSettingsPage);
});
