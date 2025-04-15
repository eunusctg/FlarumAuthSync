import app from 'flarum/app';
import { extend } from 'flarum/extend';
import LogInModal from 'flarum/components/LogInModal';
import SignUpModal from 'flarum/components/SignUpModal';
import SupabaseLoginButton from './components/SupabaseLoginButton';
import SupabaseSignUpButton from './components/SupabaseSignUpButton';

app.initializers.add('yourname-supabase-auth', () => {
  // Add Supabase login button to the login modal
  extend(LogInModal.prototype, 'fields', function(items) {
    items.add('supabase-login', 
      <div className="Form-group">
        <SupabaseLoginButton />
      </div>
    );
  });

  // Add Supabase sign-up button to the sign-up modal
  extend(SignUpModal.prototype, 'fields', function(items) {
    items.add('supabase-signup', 
      <div className="Form-group">
        <SupabaseSignUpButton />
      </div>
    );
  });

  // Initialize Supabase client if settings are available
  if (app.forum.attribute('supabase.publicUrl') && app.forum.attribute('supabase.publicKey')) {
    console.log('Supabase Auth Extension initialized');
  }
});
