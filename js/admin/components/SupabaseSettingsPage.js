import app from 'flarum/app';
import ExtensionPage from 'flarum/components/ExtensionPage';
import Button from 'flarum/components/Button';
import Switch from 'flarum/components/Switch';
import Select from 'flarum/components/Select';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import saveSettings from 'flarum/utils/saveSettings';
import icon from 'flarum/common/helpers/icon';
import SocialLoginPreviewWidget from './SocialLoginPreviewWidget';

/**
 * The Settings page for the ForumEZ Supabase Auth extension.
 */
export default class SupabaseSettingsPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.loading = false;
    this.testingConnection = false;
    this.connectionStatus = null;
    
    // Initialize settings with default values
    this.settings = {
      'supabase.publicUrl': '',
      'supabase.publicKey': '',
      'supabase.privateKey': '',
      'supabase.enable2FA': false,
      'supabase.require2FA': false,
      'supabase.syncAvatar': true,
      'supabase.syncUserMetadata': true,
      'supabase.socialProviders': ['github'],
      'supabase.avatarBucket': 'avatars'
    };
    
    // Available social providers with their icons
    this.availableSocialProviders = [
      { id: 'github', name: 'GitHub', icon: 'fab fa-github' },
      { id: 'google', name: 'Google', icon: 'fab fa-google' },
      { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook-f' },
      { id: 'twitter', name: 'Twitter', icon: 'fab fa-twitter' },
      { id: 'discord', name: 'Discord', icon: 'fab fa-discord' },
      { id: 'apple', name: 'Apple', icon: 'fab fa-apple' },
      { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin-in' },
      { id: 'slack', name: 'Slack', icon: 'fab fa-slack' },
      { id: 'spotify', name: 'Spotify', icon: 'fab fa-spotify' },
      { id: 'twitch', name: 'Twitch', icon: 'fab fa-twitch' }
    ];
    
    // Load current settings from the database
    this.loadSettings();
  }

  content() {
    if (this.loading) {
      return <LoadingIndicator />;
    }

    return (
      <div className="SupabaseSettingsPage">
        <div className="container">
          <form onsubmit={this.onsubmit.bind(this)}>
            {/* Supabase API Settings */}
            <div className="Form-section">
              <h3>{app.translator.trans('forumez-supabase-auth.admin.settings.api_section_title')}</h3>
              <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.api_section_description')}</p>
              
              <div className="Form-group">
                <label>{app.translator.trans('forumez-supabase-auth.admin.settings.public_url_label')}</label>
                <input 
                  className="FormControl" 
                  value={this.settings['supabase.publicUrl']} 
                  oninput={e => {
                    this.settings['supabase.publicUrl'] = e.target.value;
                    m.redraw();
                  }}
                  placeholder="https://your-project.supabase.co"
                />
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.public_url_description')}</p>
              </div>
              
              <div className="Form-group">
                <label>{app.translator.trans('forumez-supabase-auth.admin.settings.public_key_label')}</label>
                <input 
                  className="FormControl" 
                  value={this.settings['supabase.publicKey']}
                  oninput={e => {
                    this.settings['supabase.publicKey'] = e.target.value;
                    m.redraw();
                  }}
                  placeholder="eyJ0eXA..."
                />
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.public_key_description')}</p>
              </div>
              
              <div className="Form-group">
                <label>{app.translator.trans('forumez-supabase-auth.admin.settings.private_key_label')}</label>
                <input 
                  className="FormControl" 
                  type="password"
                  value={this.settings['supabase.privateKey']}
                  oninput={e => {
                    this.settings['supabase.privateKey'] = e.target.value;
                    m.redraw();
                  }}
                  placeholder="eyJ0eXA..."
                />
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.private_key_description')}</p>
              </div>
              
              <Button 
                className="Button Button--primary testConnectionButton" 
                onclick={this.testConnection.bind(this)}
                loading={this.testingConnection}
                disabled={!this.settings['supabase.publicUrl'] || !this.settings['supabase.publicKey'] || !this.settings['supabase.privateKey']}
              >
                {app.translator.trans('forumez-supabase-auth.admin.settings.test_connection_button')}
              </Button>
              
              {this.connectionStatus && (
                <div className={`connectionStatus ${this.connectionStatus.success ? 'success' : 'error'}`}>
                  {this.connectionStatus.message}
                </div>
              )}
            </div>
            
            {/* Social Providers Settings */}
            <div className="Form-section">
              <h3>{app.translator.trans('forumez-supabase-auth.admin.settings.social_providers_section_title')}</h3>
              <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.social_providers_description')}</p>
              
              <div className="Form-group">
                <label>{app.translator.trans('forumez-supabase-auth.admin.settings.enabled_providers_label')}</label>
                <div className="providerSelect">
                  {this.availableSocialProviders.map(provider => (
                    <div 
                      className={`providerOption ${this.isProviderSelected(provider.id) ? 'selected' : ''}`}
                      onclick={() => this.toggleProvider(provider.id)}
                    >
                      {icon(provider.icon, {className: 'icon'})}
                      <span>{provider.name}</span>
                    </div>
                  ))}
                </div>
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.enabled_providers_help')}</p>
              </div>
              
              {/* Social Login Preview Widget */}
              <SocialLoginPreviewWidget />
            </div>
            
            {/* Security & Sync Settings */}
            <div className="Form-section">
              <h3>{app.translator.trans('forumez-supabase-auth.admin.settings.security_sync_section_title')}</h3>
              
              <div className="Form-group">
                <Switch 
                  state={this.settings['supabase.enable2FA']}
                  onchange={value => {
                    this.settings['supabase.enable2FA'] = value;
                    m.redraw();
                  }}
                >
                  {app.translator.trans('forumez-supabase-auth.admin.settings.enable_2fa_label')}
                </Switch>
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.enable_2fa_help')}</p>
              </div>
              
              {this.settings['supabase.enable2FA'] && (
                <div className="Form-group">
                  <Switch 
                    state={this.settings['supabase.require2FA']}
                    onchange={value => {
                      this.settings['supabase.require2FA'] = value;
                      m.redraw();
                    }}
                  >
                    {app.translator.trans('forumez-supabase-auth.admin.settings.require_2fa_label')}
                  </Switch>
                  <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.require_2fa_help')}</p>
                </div>
              )}
              
              <div className="Form-group">
                <Switch 
                  state={this.settings['supabase.syncAvatar']}
                  onchange={value => {
                    this.settings['supabase.syncAvatar'] = value;
                    m.redraw();
                  }}
                >
                  {app.translator.trans('forumez-supabase-auth.admin.settings.sync_avatar_label')}
                </Switch>
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.sync_avatar_help')}</p>
              </div>
              
              <div className="Form-group">
                <Switch 
                  state={this.settings['supabase.syncUserMetadata']}
                  onchange={value => {
                    this.settings['supabase.syncUserMetadata'] = value;
                    m.redraw();
                  }}
                >
                  {app.translator.trans('forumez-supabase-auth.admin.settings.sync_metadata_label')}
                </Switch>
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.sync_metadata_help')}</p>
              </div>
              
              <div className="Form-group">
                <label>{app.translator.trans('forumez-supabase-auth.admin.settings.avatar_bucket_label')}</label>
                <input 
                  className="FormControl" 
                  value={this.settings['supabase.avatarBucket']}
                  oninput={e => {
                    this.settings['supabase.avatarBucket'] = e.target.value;
                    m.redraw();
                  }}
                  placeholder="avatars"
                />
                <p className="helpText">{app.translator.trans('forumez-supabase-auth.admin.settings.avatar_bucket_help')}</p>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="Form-group">
              {this.submitButton()}
            </div>
          </form>
        </div>
      </div>
    );
  }

  /**
   * Test the Supabase connection
   */
  testConnection() {
    this.testingConnection = true;
    this.connectionStatus = null;
    
    app
      .request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/supabase/test-connection',
        body: {
          action: 'test',
          url: this.settings['supabase.publicUrl'],
          publicKey: this.settings['supabase.publicKey'],
          privateKey: this.settings['supabase.privateKey']
        }
      })
      .then(response => {
        this.connectionStatus = {
          success: response.success,
          message: response.message
        };
        
        this.testingConnection = false;
        m.redraw();
      })
      .catch(error => {
        this.connectionStatus = {
          success: false,
          message: error.message || 'Unknown error occurred'
        };
        
        this.testingConnection = false;
        m.redraw();
      });
  }

  /**
   * Load settings from database
   */
  loadSettings() {
    this.loading = true;
    
    // Load settings from the database
    const dbSettings = app.data.settings;
    
    if (dbSettings['supabase.publicUrl']) {
      this.settings['supabase.publicUrl'] = dbSettings['supabase.publicUrl'];
    }
    
    if (dbSettings['supabase.publicKey']) {
      this.settings['supabase.publicKey'] = dbSettings['supabase.publicKey'];
    }
    
    if (dbSettings['supabase.privateKey']) {
      this.settings['supabase.privateKey'] = dbSettings['supabase.privateKey'];
    }
    
    if (dbSettings['supabase.enable2FA'] !== undefined) {
      this.settings['supabase.enable2FA'] = dbSettings['supabase.enable2FA'] === '1';
    }
    
    if (dbSettings['supabase.require2FA'] !== undefined) {
      this.settings['supabase.require2FA'] = dbSettings['supabase.require2FA'] === '1';
    }
    
    if (dbSettings['supabase.syncAvatar'] !== undefined) {
      this.settings['supabase.syncAvatar'] = dbSettings['supabase.syncAvatar'] === '1';
    }
    
    if (dbSettings['supabase.syncUserMetadata'] !== undefined) {
      this.settings['supabase.syncUserMetadata'] = dbSettings['supabase.syncUserMetadata'] === '1';
    }
    
    if (dbSettings['supabase.avatarBucket']) {
      this.settings['supabase.avatarBucket'] = dbSettings['supabase.avatarBucket'];
    }
    
    // Load social providers
    if (dbSettings['supabase.socialProviders']) {
      try {
        this.settings['supabase.socialProviders'] = JSON.parse(dbSettings['supabase.socialProviders']);
      } catch (e) {
        // If there's an error parsing, use the default
        this.settings['supabase.socialProviders'] = ['github'];
      }
    }
    
    this.loading = false;
    m.redraw();
  }

  /**
   * Check if a provider is selected
   * 
   * @param {String} providerId
   * @return {Boolean}
   */
  isProviderSelected(providerId) {
    return this.settings['supabase.socialProviders'].includes(providerId);
  }

  /**
   * Toggle provider selection
   * 
   * @param {String} providerId
   */
  toggleProvider(providerId) {
    const providers = this.settings['supabase.socialProviders'];
    
    if (this.isProviderSelected(providerId)) {
      // Remove provider if already selected
      const index = providers.indexOf(providerId);
      providers.splice(index, 1);
    } else {
      // Add provider if not already selected
      providers.push(providerId);
    }
    
    m.redraw();
  }

  /**
   * Save settings when form is submitted
   * 
   * @param {Event} e
   */
  onsubmit(e) {
    e.preventDefault();
    
    // Don't submit if already saving
    if (this.saving) return;
    
    // Start saving
    this.saving = true;
    
    // Convert boolean values to strings for database storage
    const settingsToSave = {
      'supabase.publicUrl': this.settings['supabase.publicUrl'],
      'supabase.publicKey': this.settings['supabase.publicKey'],
      'supabase.privateKey': this.settings['supabase.privateKey'],
      'supabase.enable2FA': this.settings['supabase.enable2FA'] ? '1' : '0',
      'supabase.require2FA': this.settings['supabase.require2FA'] ? '1' : '0',
      'supabase.syncAvatar': this.settings['supabase.syncAvatar'] ? '1' : '0',
      'supabase.syncUserMetadata': this.settings['supabase.syncUserMetadata'] ? '1' : '0',
      'supabase.avatarBucket': this.settings['supabase.avatarBucket'],
      'supabase.socialProviders': JSON.stringify(this.settings['supabase.socialProviders'])
    };
    
    // Save settings to database
    saveSettings(settingsToSave)
      .then(() => {
        this.saving = false;
        
        // Show saved alert
        app.alerts.show({ type: 'success' }, app.translator.trans('core.admin.settings.saved_message'));
      })
      .catch(err => {
        this.saving = false;
        
        // Show error alert
        app.alerts.show({ type: 'error' }, app.translator.trans('forumez-supabase-auth.admin.settings.save_error', {error: err.message || 'Unknown error'}));
      });
  }
}