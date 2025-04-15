import Component from 'flarum/Component';
import Button from 'flarum/components/Button';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import Alert from 'flarum/components/Alert';

export default class SupabaseSignUpButton extends Component {
  init() {
    this.loading = false;
    this.supabaseUrl = app.forum.attribute('supabase.publicUrl');
    this.supabaseKey = app.forum.attribute('supabase.publicKey');
  }

  view() {
    return (
      <Button
        className="Button Button--primary Button--block"
        disabled={this.loading}
        onclick={() => this.signUp()}
      >
        {this.loading ? (
          <LoadingIndicator size="small" display="inline" />
        ) : (
          <span>Sign Up with Supabase</span>
        )}
      </Button>
    );
  }

  async signUp() {
    this.loading = true;
    m.redraw();

    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js');
      
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Show signup modal from Supabase Auth UI
      const { data, error } = await supabase.auth.signUp({
        provider: 'email',
      });

      if (error) throw error;

      if (data && data.session) {
        // Send the token to our backend for verification and user creation
        const response = await app.request({
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/supabase/auth',
          body: {
            token: data.session.access_token,
            isSignUp: true,
          },
        });

        // Reload the page to apply the new session
        window.location.reload();
      } else if (data && data.user && !data.session) {
        // Email confirmation required
        app.alerts.show(
          Alert, 
          { type: 'success' }, 
          'Please check your email to confirm your account before logging in.'
        );
      }
    } catch (e) {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        e.message || 'An error occurred while signing up with Supabase'
      );
      console.error('Supabase auth error:', e);
    } finally {
      this.loading = false;
      m.redraw();
    }
  }
}
