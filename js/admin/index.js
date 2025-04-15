import app from 'flarum/app';
import SupabaseSettingsPage from './components/SupabaseSettingsPage';

app.initializers.add('yourname-supabase-auth', () => {
  app.extensionData
    .for('yourname-supabase-auth')
    .registerPermission(
      {
        icon: 'fas fa-sign-in-alt',
        label: app.translator.trans('yourname-supabase-auth.admin.permissions.use_supabase_auth_label'),
        permission: 'supabase.login'
      },
      'start'
    )
    .registerSetting(
      {
        setting: 'supabase.publicUrl',
        name: 'supabase.publicUrl',
        type: 'text',
        label: app.translator.trans('yourname-supabase-auth.admin.settings.public_url_label'),
        help: app.translator.trans('yourname-supabase-auth.admin.settings.public_url_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.publicKey',
        name: 'supabase.publicKey',
        type: 'text',
        label: app.translator.trans('yourname-supabase-auth.admin.settings.public_key_label'),
        help: app.translator.trans('yourname-supabase-auth.admin.settings.public_key_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.privateKey',
        name: 'supabase.privateKey',
        type: 'password',
        label: app.translator.trans('yourname-supabase-auth.admin.settings.private_key_label'),
        help: app.translator.trans('yourname-supabase-auth.admin.settings.private_key_help')
      }
    )
    .registerSetting(
      {
        setting: 'supabase.syncAvatar',
        name: 'supabase.syncAvatar',
        type: 'boolean',
        label: app.translator.trans('yourname-supabase-auth.admin.settings.sync_avatar_label'),
        help: app.translator.trans('yourname-supabase-auth.admin.settings.sync_avatar_help')
      }
    )
    .registerPage(SupabaseSettingsPage);
});
