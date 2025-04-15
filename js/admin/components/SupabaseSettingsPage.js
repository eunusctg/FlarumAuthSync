import ExtensionPage from 'flarum/components/ExtensionPage';
import Switch from 'flarum/components/Switch';
import Button from 'flarum/components/Button';
import Select from 'flarum/components/Select';
import saveSettings from 'flarum/utils/saveSettings';
import Alert from 'flarum/components/Alert';
import LoadingIndicator from 'flarum/components/LoadingIndicator';

export default class SupabaseSettingsPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.loading = false;
    this.testingConnection = false;
    this.connectionSuccessful = null;
    
    this.publicUrl = this.setting('supabase.publicUrl')();
    this.publicKey = this.setting('supabase.publicKey')();
    this.privateKey = this.setting('supabase.privateKey')();
    this.enable2FA = this.setting('supabase.enable2FA')() === '1';
    this.require2FA = this.setting('supabase.require2FA')() === '1';
    this.syncAvatar = this.setting('supabase.syncAvatar')() === '1';
    this.syncUserMetadata = this.setting('supabase.syncUserMetadata')() === '1';
    this.socialProviders = this.setting('supabase.socialProviders')() || '["github"]';
    this.avatarBucket = this.setting('supabase.avatarBucket')() || 'avatars';
    
    this.providerOptions = {
      '["github"]': 'GitHub Only',
      '["github", "google"]': 'GitHub and Google',
      '["github", "google", "facebook"]': 'GitHub, Google, and Facebook',
      '["github", "google", "facebook", "twitter"]': 'GitHub, Google, Facebook, and Twitter',
      '["github", "google", "facebook", "twitter", "discord"]': 'GitHub, Google, Facebook, Twitter, and Discord',
      '["github", "google", "facebook", "twitter", "discord", "apple"]': 'All Major Providers'
    };
  }

  content() {
    const providers = JSON.parse(this.socialProviders);
    const providerIcons = {
      github: { icon: 'fab fa-github', color: '#333' },
      google: { icon: 'fab fa-google', color: '#4285F4' },
      facebook: { icon: 'fab fa-facebook', color: '#3b5998' },
      twitter: { icon: 'fab fa-twitter', color: '#1DA1F2' },
      discord: { icon: 'fab fa-discord', color: '#7289DA' },
      apple: { icon: 'fab fa-apple', color: '#000' }
    };
    
    return (
      <div className="SupabaseSettingsPage">
        <div className="container">
          <div className="SupabaseSettingsPage-header">
            <h2>Supabase Authentication Settings</h2>
            <div className="SupabaseSettingsPage-logo">
              <img src="https://supabase.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsupabase-logo-wordmark--dark.d17ca6e9.png&w=256&q=75" 
                   alt="Supabase" 
                   height="30" />
            </div>
          </div>

          <div className="SupabaseSettingsPage-settings">
            <div className="Form-group">
              <div className="SupabaseSettingsPage-section">
                <div className="SupabaseSettingsPage-sectionHeader">
                  <h3><i className="fas fa-key"></i> API Credentials</h3>
                  <p>Connect your Flarum forum to Supabase by entering your project credentials below.</p>
                </div>
              
                <div className="Form-group">
                  <label>Project URL</label>
                  <input 
                    className="FormControl" 
                    value={this.publicUrl} 
                    onChange={e => this.publicUrl = e.target.value}
                    placeholder="https://your-project.supabase.co" 
                  />
                  <div className="helpText">
                    The URL of your Supabase project (e.g., https://your-project.supabase.co)
                  </div>
                </div>
                
                <div className="Form-group">
                  <label>Public API Key</label>
                  <input 
                    className="FormControl" 
                    value={this.publicKey} 
                    onChange={e => this.publicKey = e.target.value}
                    placeholder="your-public-anon-key" 
                  />
                  <div className="helpText">
                    The public (anon) API key from your Supabase project settings
                  </div>
                </div>
                
                <div className="Form-group">
                  <label>Service Role Key (Private)</label>
                  <input 
                    className="FormControl" 
                    type="password"
                    value={this.privateKey} 
                    onChange={e => this.privateKey = e.target.value}
                    placeholder="your-service-role-key" 
                  />
                  <div className="helpText">
                    The service role API key from your Supabase project settings (kept private)
                  </div>
                </div>
                
                <div className="Form-group">
                  <Button 
                    className="Button Button--primary" 
                    loading={this.testingConnection}
                    disabled={!this.publicUrl || !this.publicKey || !this.privateKey || this.testingConnection}
                    onclick={() => this.testConnection()}
                  >
                    Test Connection
                  </Button>
                  
                  {this.connectionSuccessful !== null && (
                    <div className={`SupabaseConnectionStatus ${this.connectionSuccessful ? 'success' : 'error'}`}>
                      {this.connectionSuccessful 
                        ? <><i className="fas fa-check-circle"></i> Connection successful!</>
                        : <><i className="fas fa-times-circle"></i> Connection failed. Please check your credentials.</>
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="Form-group">
              <div className="SupabaseSettingsPage-section">
                <div className="SupabaseSettingsPage-sectionHeader">
                  <h3><i className="fas fa-users"></i> Authentication Options</h3>
                  <p>Configure how users can authenticate with your forum.</p>
                </div>
                
                <div className="Form-group">
                  <label>Social Login Providers</label>
                  <Select 
                    options={this.providerOptions}
                    value={this.socialProviders}
                    onchange={value => this.socialProviders = value}
                  />
                  <div className="helpText">
                    Select which social login providers to enable for your users
                  </div>
                  
                  <div className="SupabaseProviderPreview">
                    <h4>Preview:</h4>
                    <div className="SupabaseProviderPreview-buttons">
                      {providers.map(provider => (
                        <div 
                          className="SupabaseProviderPreview-button"
                          style={{ backgroundColor: providerIcons[provider]?.color || '#666' }}
                        >
                          <i className={providerIcons[provider]?.icon || 'fas fa-external-link-alt'}></i>
                          <span>{provider}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="Form-group">
              <div className="SupabaseSettingsPage-section">
                <div className="SupabaseSettingsPage-sectionHeader">
                  <h3><i className="fas fa-shield-alt"></i> Security Features</h3>
                  <p>Enhance your forum's security with these advanced features.</p>
                </div>
                
                <div className="Form-group">
                  <Switch 
                    state={this.enable2FA} 
                    onchange={value => this.enable2FA = value}
                  >
                    Enable Two-Factor Authentication (2FA)
                  </Switch>
                  <div className="helpText">
                    Allow users to secure their accounts with 2FA using authenticator apps
                  </div>
                </div>
                
                <div className="Form-group">
                  <Switch 
                    state={this.require2FA} 
                    onchange={value => this.require2FA = value}
                    disabled={!this.enable2FA}
                  >
                    Require 2FA for Sensitive Operations
                  </Switch>
                  <div className="helpText">
                    Require 2FA verification for sensitive operations like changing email or password
                  </div>
                </div>
              </div>
            </div>
            
            <div className="Form-group">
              <div className="SupabaseSettingsPage-section">
                <div className="SupabaseSettingsPage-sectionHeader">
                  <h3><i className="fas fa-sync-alt"></i> User Synchronization</h3>
                  <p>Configure how user data synchronizes between Flarum and Supabase.</p>
                </div>
                
                <div className="Form-group">
                  <Switch 
                    state={this.syncAvatar} 
                    onchange={value => this.syncAvatar = value}
                  >
                    Sync User Avatars
                  </Switch>
                  <div className="helpText">
                    Automatically sync user avatars between Flarum and Supabase
                  </div>
                </div>
                
                <div className="Form-group">
                  <Switch 
                    state={this.syncUserMetadata} 
                    onchange={value => this.syncUserMetadata = value}
                  >
                    Sync User Metadata
                  </Switch>
                  <div className="helpText">
                    Sync additional user metadata between Flarum and Supabase
                  </div>
                </div>
                
                <div className="Form-group">
                  <label>Avatar Storage Bucket</label>
                  <input 
                    className="FormControl" 
                    value={this.avatarBucket} 
                    onChange={e => this.avatarBucket = e.target.value}
                    placeholder="avatars" 
                    disabled={!this.syncAvatar}
                  />
                  <div className="helpText">
                    Name of the Supabase storage bucket where user avatars will be stored
                  </div>
                </div>
              </div>
            </div>
            
            <div className="Form-group">
              {this.loading ? (
                <div className="SupabaseSettingsPage-loading">
                  <LoadingIndicator />
                </div>
              ) : (
                <div className="SupabaseSettingsPage-footer">
                  <Button 
                    className="Button Button--primary" 
                    type="submit" 
                    onclick={e => this.onsubmit(e)}
                  >
                    Save Settings
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  testConnection() {
    this.testingConnection = true;
    this.connectionSuccessful = null;
    m.redraw();
    
    // Make an API request to test the connection
    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/test-connection',
      body: {
        url: this.publicUrl,
        publicKey: this.publicKey,
        privateKey: this.privateKey
      }
    }).then(response => {
      this.connectionSuccessful = true;
    }).catch(error => {
      this.connectionSuccessful = false;
      console.error('Supabase connection test failed:', error);
    }).finally(() => {
      this.testingConnection = false;
      m.redraw();
    });
  }

  onsubmit(e) {
    e.preventDefault();
    
    this.loading = true;
    
    // Save the settings to the database
    saveSettings({
      'supabase.publicUrl': this.publicUrl,
      'supabase.publicKey': this.publicKey,
      'supabase.privateKey': this.privateKey,
      'supabase.enable2FA': this.enable2FA ? '1' : '0',
      'supabase.require2FA': this.require2FA ? '1' : '0',
      'supabase.syncAvatar': this.syncAvatar ? '1' : '0',
      'supabase.syncUserMetadata': this.syncUserMetadata ? '1' : '0',
      'supabase.socialProviders': this.socialProviders,
      'supabase.avatarBucket': this.avatarBucket
    }).then(() => {
      app.alerts.show({ type: 'success' }, app.translator.trans('core.admin.settings.saved_message'));
    }).catch(() => {
      app.alerts.show({ type: 'error' }, app.translator.trans('core.admin.settings.save_error_message'));
    }).finally(() => {
      this.loading = false;
      m.redraw();
    });
  }
}