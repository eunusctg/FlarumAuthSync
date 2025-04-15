import Component from 'flarum/Component';
import Button from 'flarum/components/Button';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import Alert from 'flarum/components/Alert';
import Dropdown from 'flarum/components/Dropdown';
import ItemList from 'flarum/utils/ItemList';

export default class SupabaseLoginButton extends Component {
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
          onclick={() => this.login('email')}
          icon="fas fa-envelope"
        >
          {this.loading ? (
            <LoadingIndicator size="small" display="inline" />
          ) : (
            <span>Login with Email</span>
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
            onclick={() => this.socialLogin(provider)}
          >
            {this.socialLoading === provider ? (
              <LoadingIndicator size="small" display="inline" />
            ) : (
              <span>{providerInfo.label}</span>
            )}
          </Button>,
          providers[provider].priority || 0
        );
      }
    });
    
    return items;
  }

  async login(provider = 'email') {
    this.loading = true;
    m.redraw();

    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js');
      
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Show login modal from Supabase Auth UI
      const { data, error } = await supabase.auth.signInWithOtp({
        email: prompt('Enter your email address:'),
        options: {
          emailRedirectTo: `${window.location.origin}/supabase/callback`,
        }
      });

      if (error) throw error;

      if (data) {
        app.alerts.show(
          Alert, 
          { type: 'success' }, 
          'Please check your email for a login link.'
        );
      }
    } catch (e) {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        e.message || 'An error occurred while logging in with Supabase'
      );
      console.error('Supabase auth error:', e);
    } finally {
      this.loading = false;
      m.redraw();
    }
  }
  
  async socialLogin(provider) {
    this.socialLoading = provider;
    m.redraw();

    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js');
      
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Initiate social login
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/supabase/callback`,
        }
      });

      if (error) throw error;

      // The user will be redirected to the provider's authentication page
      // They will be returned to our callback URL after authentication
      
    } catch (e) {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        e.message || `An error occurred while logging in with ${provider}`
      );
      console.error(`Supabase ${provider} auth error:`, e);
      this.socialLoading = false;
      m.redraw();
    }
  }
  
  processCallback(token) {
    // Process the callback from Supabase after successful authentication
    return app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/auth',
      body: {
        token: token,
      },
    }).then(() => {
      // Reload the page to apply the new session
      window.location.reload();
    }).catch(error => {
      app.alerts.show(
        Alert, 
        { type: 'error' }, 
        error.message || 'Authentication failed'
      );
    });
  }
}
