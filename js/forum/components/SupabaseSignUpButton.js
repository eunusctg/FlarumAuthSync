import Component from 'flarum/Component';
import Button from 'flarum/components/Button';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import Alert from 'flarum/components/Alert';
import Dropdown from 'flarum/components/Dropdown';
import ItemList from 'flarum/utils/ItemList';

export default class SupabaseSignUpButton extends Component {
  init() {
    this.loading = false;
    this.socialLoading = false;
    this.selectedProvider = null;
    this.supabaseUrl = app.forum.attribute('supabase.publicUrl');
    this.supabaseKey = app.forum.attribute('supabase.publicKey');
    this.socialProviders = JSON.parse(app.forum.attribute('supabase.socialProviders') || '["github"]');
  }

  view() {
    return (
      <div className="SupabaseAuth">
        <Button
          className="Button Button--primary Button--block SupabaseAuth-emailButton"
          disabled={this.loading}
          onclick={() => this.signUp('email')}
          icon="fas fa-envelope"
        >
          {this.loading ? (
            <LoadingIndicator size="small" display="inline" />
          ) : (
            <span>Sign Up with Email</span>
          )}
        </Button>

        {this.socialProviders.length > 0 && (
          <div className="SupabaseAuth-socialLogin">
            <div className="SupabaseAuth-socialDivider">
              <span>OR</span>
            </div>
            
            <div className="SupabaseAuth-socialButtons">
              {this.socialProviderButtons().toArray()}
            </div>
          </div>
        )}
      </div>
    );
  }

  socialProviderButtons() {
    const items = new ItemList();
    
    const providers = {
      github: { icon: 'fab fa-github', color: '#333', label: 'GitHub' },
      google: { icon: 'fab fa-google', color: '#4285F4', label: 'Google' },
      facebook: { icon: 'fab fa-facebook', color: '#3b5998', label: 'Facebook' },
      twitter: { icon: 'fab fa-twitter', color: '#1DA1F2', label: 'Twitter' },
      discord: { icon: 'fab fa-discord', color: '#7289DA', label: 'Discord' },
      apple: { icon: 'fab fa-apple', color: '#000', label: 'Apple' },
      slack: { icon: 'fab fa-slack', color: '#4A154B', label: 'Slack' },
      spotify: { icon: 'fab fa-spotify', color: '#1DB954', label: 'Spotify' },
      twitch: { icon: 'fab fa-twitch', color: '#6441A4', label: 'Twitch' },
      linkedin: { icon: 'fab fa-linkedin', color: '#0077B5', label: 'LinkedIn' }
    };
    
    this.socialProviders.forEach(provider => {
      if (providers[provider]) {
        const providerInfo = providers[provider];
        
        items.add(
          provider,
          <Button
            className={`Button SupabaseAuth-socialButton SupabaseAuth-${provider}`}
            style={{ backgroundColor: providerInfo.color, color: '#fff' }}
            disabled={this.socialLoading === provider}
            icon={providerInfo.icon}
            onclick={() => this.socialSignUp(provider)}
          >
            {this.socialLoading === provider ? (
              <LoadingIndicator size="small" display="inline" />
            ) : (
              <span>Sign up with {providerInfo.label}</span>
            )}
          </Button>,
          providers[provider].priority || 0
        );
      }
    });
    
    return items;
  }

  async signUp(provider = 'email') {
    this.loading = true;
    m.redraw();

    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js');
      
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Get user input for registration
      const email = prompt('Enter your email address:');
      const password = prompt('Create a password (min 8 characters):');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Show signup modal from Supabase Auth UI
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/supabase/callback`,
          data: {
            signed_up_at: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      if (data && data.session) {
        // Send the token to our backend for verification and user creation
        await app.request({
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
  
  async socialSignUp(provider) {
    this.socialLoading = provider;
    m.redraw();

    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js');
      
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Initiate social sign up
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/supabase/callback`,
          queryParams: {
            is_sign_up: 'true'
          }
        }
      });

      if (error) throw error;

      // The user will be redirected to the provider's authentication page
      // After authentication, they will be redirected to our callback URL
      
    } catch (e) {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        e.message || `An error occurred while signing up with ${provider}`
      );
      console.error(`Supabase ${provider} auth error:`, e);
      this.socialLoading = false;
      m.redraw();
    }
  }
  
  processCallback(token, isSignUp = true) {
    // Process the callback after successful authentication
    return app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/auth',
      body: {
        token: token,
        isSignUp: isSignUp
      },
    }).then(() => {
      // Reload the page to apply the new session
      window.location.reload();
    }).catch(error => {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        error.message || 'Registration failed'
      );
    });
  }
}
