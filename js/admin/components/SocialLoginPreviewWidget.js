import Component from 'flarum/Component';
import Button from 'flarum/common/components/Button';
import icon from 'flarum/common/helpers/icon';

/**
 * Component for previewing social login buttons in the admin panel.
 */
export default class SocialLoginPreviewWidget extends Component {
  init() {
    super.init();
    
    // Define default social providers icons and colors
    this.socialProviders = {
      github: { icon: 'fab fa-github', color: '#24292e', hoverColor: '#000000' },
      google: { icon: 'fab fa-google', color: '#4285F4', hoverColor: '#3367d6' },
      facebook: { icon: 'fab fa-facebook-f', color: '#1877F2', hoverColor: '#0b5fcc' },
      twitter: { icon: 'fab fa-twitter', color: '#1DA1F2', hoverColor: '#0c85d0' },
      discord: { icon: 'fab fa-discord', color: '#5865F2', hoverColor: '#4752c4' },
      apple: { icon: 'fab fa-apple', color: '#000000', hoverColor: '#333333' },
      linkedin: { icon: 'fab fa-linkedin-in', color: '#0A66C2', hoverColor: '#084e96' },
      slack: { icon: 'fab fa-slack', color: '#4A154B', hoverColor: '#2f0e30' },
      spotify: { icon: 'fab fa-spotify', color: '#1DB954', hoverColor: '#169c46' },
      twitch: { icon: 'fab fa-twitch', color: '#9146FF', hoverColor: '#7b38d8' }
    };
  }
  
  view() {
    // Get the enabled providers from the settings
    const rawProviders = app.data.settings['supabase.socialProviders'] || '["github"]';
    let enabledProviders = [];
    
    try {
      enabledProviders = JSON.parse(rawProviders);
    } catch (e) {
      enabledProviders = ['github']; // Default to GitHub if parsing fails
    }
    
    return (
      <div className="SocialLoginPreviewWidget">
        <div className="SocialLoginPreviewWidget-header">
          <h3>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.title')}</h3>
          <p className="description">{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.description')}</p>
        </div>
        
        <div className="SocialLoginPreviewWidget-container">
          <div className="SocialLoginPreviewWidget-preview-box">
            <h4>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.login_preview')}</h4>
            <div className="SocialLoginPreviewWidget-buttons">
              {this.renderSocialButtons(enabledProviders)}
            </div>
          </div>
          
          <div className="SocialLoginPreviewWidget-preview-box">
            <h4>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.signup_preview')}</h4>
            <div className="SocialLoginPreviewWidget-buttons">
              {this.renderSocialButtons(enabledProviders, true)}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * Render social login buttons based on enabled providers
   * 
   * @param {Array} enabledProviders List of enabled provider IDs
   * @param {Boolean} isSignup Whether to render for signup vs login
   * @return {Array} Array of button components
   */
  renderSocialButtons(enabledProviders, isSignup = false) {
    return enabledProviders.map(provider => {
      const providerInfo = this.socialProviders[provider] || {
        icon: 'fas fa-external-link-alt',
        color: '#666',
        hoverColor: '#333'
      };
      
      const buttonText = isSignup
        ? app.translator.trans('forumez-supabase-auth.forum.signup_with_provider', {provider: this.capitalizeFirstLetter(provider)})
        : app.translator.trans('forumez-supabase-auth.forum.login_with_provider', {provider: this.capitalizeFirstLetter(provider)});
      
      return (
        <Button
          className={`Button Button--social Button--${provider}`}
          style={{
            backgroundColor: providerInfo.color,
            color: '#fff'
          }}
          onclick={this.previewAlert.bind(this)}
        >
          {icon(providerInfo.icon, {className: 'Button-icon'})}
          <span className="Button-label">{buttonText}</span>
        </Button>
      );
    });
  }
  
  /**
   * Display a preview alert when a social button is clicked
   */
  previewAlert() {
    alert(app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.button_click_message'));
  }
  
  /**
   * Capitalize the first letter of a string
   * 
   * @param {String} string
   * @return {String}
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}