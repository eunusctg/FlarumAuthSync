import app from 'flarum/app';
import { extend } from 'flarum/extend';
import LogInModal from 'flarum/components/LogInModal';
import SignUpModal from 'flarum/components/SignUpModal';
import IndexPage from 'flarum/components/IndexPage';
import HeaderSecondary from 'flarum/components/HeaderSecondary';
import SettingsPage from 'flarum/components/SettingsPage';
import Button from 'flarum/components/Button';
import ItemList from 'flarum/utils/ItemList';

// Import our custom components
import SupabaseLoginButton from './components/SupabaseLoginButton';
import SupabaseSignUpButton from './components/SupabaseSignUpButton';
import Supabase2FASetupPage from './components/Supabase2FASetupPage';
import Supabase2FAVerifyPage from './components/Supabase2FAVerifyPage';
import SupabaseCallbackPage from './components/SupabaseCallbackPage';

app.initializers.add('supaflow-supabase-auth', () => {
  // Register our custom routes
  app.routes['supabase-2fa-setup'] = {
    path: '/2fa/setup',
    component: Supabase2FASetupPage
  };
  
  app.routes['supabase-2fa-verify'] = {
    path: '/2fa/verify',
    component: Supabase2FAVerifyPage
  };
  
  app.routes['supabase-callback'] = {
    path: '/supabase/callback',
    component: SupabaseCallbackPage
  };

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
  
  // Add 2FA settings to the user settings page
  extend(SettingsPage.prototype, 'settingsItems', function(items) {
    const user = app.session.user;
    
    // Only show if 2FA is enabled globally and user is a Supabase user
    if (app.forum.attribute('supabase.enable2FA') === '1' && 
        user && user.attribute('isSupabaseUser')) {
      
      items.add('supabase2FA',
        <div className="SettingsGroup">
          <label>Two-Factor Authentication</label>
          
          {user.attribute('has2FAEnabled') ? (
            <div>
              <div className="SettingsGroup-status">
                <div className="SettingsGroup-status-enabled">
                  <i className="fas fa-check-circle" /> Enabled
                </div>
              </div>
              
              <Button 
                className="Button Button--danger"
                onclick={() => {
                  if (confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
                    this.disable2FA();
                  }
                }}
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div>
              <p>Protect your account with two-factor authentication.</p>
              <Button 
                className="Button Button--primary"
                onclick={() => m.route.set('/2fa/setup')}
              >
                Set Up 2FA
              </Button>
            </div>
          )}
        </div>
      );
    }
  });
  
  // Add connected social accounts to the settings page
  extend(SettingsPage.prototype, 'settingsItems', function(items) {
    const user = app.session.user;
    
    if (user && user.attribute('isSupabaseUser')) {
      const connectedProviders = user.attribute('supbaseConnectedProviders') || [];
      
      items.add('supabaseSocialAccounts',
        <div className="SettingsGroup">
          <label>Connected Social Accounts</label>
          
          {connectedProviders.length > 0 ? (
            <div className="SupabaseSocialAccounts">
              <ul className="SupabaseSocialAccounts-list">
                {connectedProviders.map(provider => (
                  <li className="SupabaseSocialAccounts-provider">
                    <i className={`fab fa-${provider.toLowerCase()}`} />
                    <span>{provider}</span>
                    <Button 
                      className="Button Button--icon" 
                      icon="fas fa-times"
                      aria-label={`Disconnect ${provider}`}
                      onclick={() => this.disconnectSocialProvider(provider)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="SupabaseSocialAccounts-empty">
              <p>No social accounts connected.</p>
            </div>
          )}
          
          <Button 
            className="Button"
            onclick={() => m.route.set('/settings/social')}
          >
            Manage Social Connections
          </Button>
        </div>
      );
    }
  });

  // Add method to disconnect social providers
  SettingsPage.prototype.disconnectSocialProvider = function(provider) {
    if (confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/supabase/disconnect-provider',
        body: { provider }
      }).then(() => {
        app.alerts.show({ type: 'success' }, `${provider} account disconnected successfully.`);
        m.redraw();
      }).catch(error => {
        app.alerts.show({ type: 'error' }, error.message || `Failed to disconnect ${provider} account.`);
      });
    }
  };
  
  // Add method to disable 2FA
  SettingsPage.prototype.disable2FA = function() {
    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/2fa/disable',
      body: {
        userToken: localStorage.getItem('supabaseToken') || ''
      }
    }).then(() => {
      app.alerts.show({ type: 'success' }, 'Two-factor authentication has been disabled.');
      m.redraw();
    }).catch(error => {
      app.alerts.show({ type: 'error' }, error.message || 'Failed to disable two-factor authentication.');
    });
  };

  // Initialize Supabase client if settings are available
  if (app.forum.attribute('supabase.publicUrl') && app.forum.attribute('supabase.publicKey')) {
    console.log('Supabase Auth Extension initialized');
    
    // Check for token expiry and refresh if needed
    const tokenExpiry = localStorage.getItem('supabaseTokenExpiry');
    const refreshToken = localStorage.getItem('supabaseRefreshToken');
    
    if (tokenExpiry && refreshToken && parseInt(tokenExpiry) < Date.now()) {
      // Token is expired, attempt to refresh
      import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js')
        .then(({ createClient }) => {
          const supabase = createClient(
            app.forum.attribute('supabase.publicUrl'),
            app.forum.attribute('supabase.publicKey')
          );
          
          supabase.auth.refreshSession({ refresh_token: refreshToken })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error refreshing token:', error);
                return;
              }
              
              if (data && data.session) {
                localStorage.setItem('supabaseToken', data.session.access_token);
                localStorage.setItem('supabaseRefreshToken', data.session.refresh_token);
                
                const expiresAt = Date.now() + data.session.expires_in * 1000;
                localStorage.setItem('supabaseTokenExpiry', expiresAt.toString());
              }
            });
        });
    }
  }
});
