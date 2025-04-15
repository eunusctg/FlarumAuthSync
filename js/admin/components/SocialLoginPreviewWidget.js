import app from 'flarum/app';
import Component from 'flarum/Component';
import Button from 'flarum/common/components/Button';
import icon from 'flarum/common/helpers/icon';
import Switch from 'flarum/components/Switch';
import Dropdown from 'flarum/components/Dropdown';
import ProviderCustomizationModal from './ProviderCustomizationModal';

/**
 * Component for previewing social login buttons in the admin panel.
 */
export default class SocialLoginPreviewWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    
    // Initialize settings and register callback
    this.settings = this.attrs.settings;
    this.onSettingChange = this.attrs.onSettingChange || function() {};
    
    // Define default social providers icons and colors
    this.socialProviders = {
      github: { id: 'github', name: 'GitHub', icon: 'fab fa-github', color: '#24292e', hoverColor: '#000000' },
      google: { id: 'google', name: 'Google', icon: 'fab fa-google', color: '#4285F4', hoverColor: '#3367d6' },
      facebook: { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2', hoverColor: '#0b5fcc' },
      twitter: { id: 'twitter', name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2', hoverColor: '#0c85d0' },
      discord: { id: 'discord', name: 'Discord', icon: 'fab fa-discord', color: '#5865F2', hoverColor: '#4752c4' },
      apple: { id: 'apple', name: 'Apple', icon: 'fab fa-apple', color: '#000000', hoverColor: '#333333' },
      linkedin: { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0A66C2', hoverColor: '#084e96' },
      slack: { id: 'slack', name: 'Slack', icon: 'fab fa-slack', color: '#4A154B', hoverColor: '#2f0e30' },
      spotify: { id: 'spotify', name: 'Spotify', icon: 'fab fa-spotify', color: '#1DB954', hoverColor: '#169c46' },
      twitch: { id: 'twitch', name: 'Twitch', icon: 'fab fa-twitch', color: '#9146FF', hoverColor: '#7b38d8' }
    };
    
    // Get provider customizations from settings
    this.providerCustomizations = {};
    try {
      const customizationsSetting = app.data.settings['supabase.providerCustomizations'] || '{}';
      this.providerCustomizations = JSON.parse(customizationsSetting);
    } catch (e) {
      this.providerCustomizations = {};
    }
    
    // Display modes
    this.displayModes = [
      { value: 'buttons', label: app.translator.trans('forumez-supabase-auth.admin.settings.display_options.buttons_mode') },
      { value: 'icons', label: app.translator.trans('forumez-supabase-auth.admin.settings.display_options.icons_mode') },
      { value: 'dropdown', label: app.translator.trans('forumez-supabase-auth.admin.settings.display_options.dropdown_mode') }
    ];
    
    // Get the display mode from settings
    this.displayMode = app.data.settings['supabase.socialButtonsDisplayMode'] || 'buttons';
    
    // Get separator text
    this.separatorText = app.data.settings['supabase.socialSeparatorText'] || 'or';
    
    // Additional settings
    this.autoDetectColors = app.data.settings['supabase.autoDetectColors'] === '1';
    this.animateButtons = app.data.settings['supabase.animateButtons'] !== '0';
    this.useColorGradients = app.data.settings['supabase.useColorGradients'] === '1';
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
    
    // Sort providers by priority
    const sortedProviders = [...enabledProviders].sort((a, b) => {
      const priorityA = (this.providerCustomizations[a]?.priority || 0);
      const priorityB = (this.providerCustomizations[b]?.priority || 0);
      return priorityB - priorityA; // Higher priority first
    });
    
    return (
      <div className="SocialLoginPreviewWidget">
        <div className="SocialLoginPreviewWidget-header">
          <h3>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.title')}</h3>
          <p className="description">{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.description')}</p>
        </div>
        
        <div className="SocialLoginPreviewWidget-options">
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase-auth.admin.settings.display_options.title')}</label>
            <div className="ButtonGroup">
              {this.displayModes.map(mode => (
                <Button 
                  className={`Button ${this.displayMode === mode.value ? 'Button--primary' : ''}`} 
                  onclick={() => this.setDisplayMode(mode.value)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase-auth.admin.settings.display_options.separator_text')}</label>
            <input 
              className="FormControl"
              type="text"
              value={this.separatorText}
              oninput={e => this.setSeparatorText(e.target.value)}
            />
          </div>
          
          <div className="Form-group">
            <Switch 
              state={this.autoDetectColors}
              onchange={value => this.setAutoDetectColors(value)}
            >
              {app.translator.trans('forumez-supabase-auth.admin.settings.display_options.auto_detect_colors')}
            </Switch>
            
            <Switch 
              state={this.animateButtons}
              onchange={value => this.setAnimateButtons(value)}
            >
              {app.translator.trans('forumez-supabase-auth.admin.settings.display_options.animate_buttons')}
            </Switch>
            
            <Switch 
              state={this.useColorGradients}
              onchange={value => this.setUseColorGradients(value)}
            >
              {app.translator.trans('forumez-supabase-auth.admin.settings.display_options.use_color_gradients')}
            </Switch>
          </div>
        </div>
        
        <div className="SocialLoginPreviewWidget-customization">
          <h4>{app.translator.trans('forumez-supabase-auth.admin.settings.provider_customization.manage_providers')}</h4>
          <div className="SocialLoginPreviewWidget-providers-list">
            {Object.keys(this.socialProviders).map(providerId => {
              const isEnabled = enabledProviders.includes(providerId);
              const provider = this.socialProviders[providerId];
              const customization = this.providerCustomizations[providerId] || {};
              
              return (
                <div className={`provider-item ${isEnabled ? 'enabled' : 'disabled'}`}>
                  <div className="provider-info">
                    {icon(customization.icon || provider.icon, {className: 'provider-icon'})}
                    <span className="provider-name">
                      {customization.display_name || provider.name}
                    </span>
                  </div>
                  
                  <div className="provider-actions">
                    {isEnabled && (
                      <Button 
                        className="Button Button--icon" 
                        onclick={() => this.openCustomizationModal(provider)}
                        icon="fas fa-cog"
                        title={app.translator.trans('forumez-supabase-auth.admin.settings.provider_customization.customize')}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="SocialLoginPreviewWidget-container">
          <div className="SocialLoginPreviewWidget-preview-box">
            <h4>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.login_preview')}</h4>
            
            {/* Separator with text */}
            <div className="SocialLoginPreviewWidget-separator">
              <span>{this.separatorText}</span>
            </div>
            
            {/* Display mode specific rendering */}
            {this.displayMode === 'buttons' && (
              <div className="SocialLoginPreviewWidget-buttons">
                {this.renderSocialButtons(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_login !== false
                ))}
              </div>
            )}
            
            {this.displayMode === 'icons' && (
              <div className="SocialLoginPreviewWidget-icons">
                {this.renderSocialIcons(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_login !== false
                ))}
              </div>
            )}
            
            {this.displayMode === 'dropdown' && (
              <div className="SocialLoginPreviewWidget-dropdown">
                {this.renderSocialDropdown(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_login !== false
                ))}
              </div>
            )}
          </div>
          
          <div className="SocialLoginPreviewWidget-preview-box">
            <h4>{app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.signup_preview')}</h4>
            
            {/* Separator with text */}
            <div className="SocialLoginPreviewWidget-separator">
              <span>{this.separatorText}</span>
            </div>
            
            {/* Display mode specific rendering */}
            {this.displayMode === 'buttons' && (
              <div className="SocialLoginPreviewWidget-buttons">
                {this.renderSocialButtons(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_signup !== false
                ), true)}
              </div>
            )}
            
            {this.displayMode === 'icons' && (
              <div className="SocialLoginPreviewWidget-icons">
                {this.renderSocialIcons(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_signup !== false
                ), true)}
              </div>
            )}
            
            {this.displayMode === 'dropdown' && (
              <div className="SocialLoginPreviewWidget-dropdown">
                {this.renderSocialDropdown(sortedProviders.filter(p => 
                  !this.providerCustomizations[p] || this.providerCustomizations[p].show_on_signup !== false
                ), true)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * Set display mode
   * 
   * @param {String} mode
   */
  setDisplayMode(mode) {
    this.displayMode = mode;
    this.saveSetting('supabase.socialButtonsDisplayMode', mode);
    m.redraw();
  }
  
  /**
   * Set separator text
   * 
   * @param {String} text
   */
  setSeparatorText(text) {
    this.separatorText = text;
    this.saveSetting('supabase.socialSeparatorText', text);
    m.redraw();
  }
  
  /**
   * Set auto detect colors
   * 
   * @param {Boolean} value
   */
  setAutoDetectColors(value) {
    this.autoDetectColors = value;
    this.saveSetting('supabase.autoDetectColors', value ? '1' : '0');
    m.redraw();
  }
  
  /**
   * Set animate buttons
   * 
   * @param {Boolean} value
   */
  setAnimateButtons(value) {
    this.animateButtons = value;
    this.saveSetting('supabase.animateButtons', value ? '1' : '0');
    m.redraw();
  }
  
  /**
   * Set color gradients
   * 
   * @param {Boolean} value
   */
  setUseColorGradients(value) {
    this.useColorGradients = value;
    this.saveSetting('supabase.useColorGradients', value ? '1' : '0');
    m.redraw();
  }
  
  /**
   * Save a setting value
   * 
   * @param {String} key
   * @param {String} value
   */
  saveSetting(key, value) {
    app.data.settings[key] = value;
    if (this.onSettingChange) {
      this.onSettingChange(key, value);
    }
  }
  
  /**
   * Open the customization modal for a provider
   * 
   * @param {Object} provider
   */
  openCustomizationModal(provider) {
    app.modal.show(
      ProviderCustomizationModal, 
      {
        provider: provider,
        providerConfig: this.providerCustomizations[provider.id] || {},
        onSave: this.saveProviderCustomization.bind(this)
      }
    );
  }
  
  /**
   * Save provider customization
   * 
   * @param {String} providerId
   * @param {Object} config
   */
  saveProviderCustomization(providerId, config) {
    // Update the provider customization
    this.providerCustomizations[providerId] = config;
    
    // Save to settings
    this.saveSetting('supabase.providerCustomizations', JSON.stringify(this.providerCustomizations));
    
    // Redraw
    m.redraw();
  }
  
  /**
   * Render social login buttons based on enabled providers
   * 
   * @param {Array} providers List of provider IDs
   * @param {Boolean} isSignup Whether to render for signup vs login
   * @return {Array} Array of button components
   */
  renderSocialButtons(providers, isSignup = false) {
    return providers.map(providerId => {
      const provider = this.socialProviders[providerId] || {
        id: providerId,
        name: providerId,
        icon: 'fas fa-external-link-alt',
        color: '#666',
        hoverColor: '#333'
      };
      
      // Get customizations for this provider
      const customization = this.providerCustomizations[providerId] || {};
      
      // Determine display values
      const displayName = customization.display_name || provider.name;
      const iconClass = customization.icon || provider.icon;
      const buttonColor = customization.button_color || provider.color;
      const textColor = customization.button_text_color || '#ffffff';
      
      // Button text depends on login/signup mode
      const buttonText = isSignup
        ? app.translator.trans('forumez-supabase-auth.forum.signup_with_provider', {provider: displayName})
        : app.translator.trans('forumez-supabase-auth.forum.login_with_provider', {provider: displayName});
      
      // Style with gradients if enabled
      let buttonStyle = {
        backgroundColor: buttonColor,
        color: textColor
      };
      
      if (this.useColorGradients) {
        // Create a gradient effect
        const darkerColor = this.adjustColor(buttonColor, -20);
        buttonStyle.background = `linear-gradient(to bottom, ${buttonColor} 0%, ${darkerColor} 100%)`;
      }
      
      // Apply animation class if enabled
      const buttonClass = `Button Button--social Button--${providerId} ${this.animateButtons ? 'Button--animated' : ''}`;
      
      return (
        <Button
          className={buttonClass}
          style={buttonStyle}
          onclick={this.previewAlert.bind(this)}
        >
          {icon(iconClass, {className: 'Button-icon'})}
          <span className="Button-label">{buttonText}</span>
        </Button>
      );
    });
  }
  
  /**
   * Render social login icons based on enabled providers
   * 
   * @param {Array} providers List of provider IDs
   * @param {Boolean} isSignup Whether to render for signup vs login
   * @return {Array} Array of icon components
   */
  renderSocialIcons(providers, isSignup = false) {
    return providers.map(providerId => {
      const provider = this.socialProviders[providerId] || {
        id: providerId,
        name: providerId,
        icon: 'fas fa-external-link-alt',
        color: '#666',
        hoverColor: '#333'
      };
      
      // Get customizations for this provider
      const customization = this.providerCustomizations[providerId] || {};
      
      // Determine display values
      const displayName = customization.display_name || provider.name;
      const iconClass = customization.icon || provider.icon;
      const buttonColor = customization.button_color || provider.color;
      
      // Button style
      const buttonStyle = {
        backgroundColor: buttonColor,
        color: '#ffffff'
      };
      
      // Title depends on login/signup mode
      const title = isSignup
        ? app.translator.trans('forumez-supabase-auth.forum.signup_with_provider', {provider: displayName})
        : app.translator.trans('forumez-supabase-auth.forum.login_with_provider', {provider: displayName});
      
      return (
        <Button
          className={`Button Button--icon Button--social Button--${providerId}`}
          style={buttonStyle}
          icon={iconClass}
          title={title}
          onclick={this.previewAlert.bind(this)}
        />
      );
    });
  }
  
  /**
   * Render social login dropdown based on enabled providers
   * 
   * @param {Array} providers List of provider IDs
   * @param {Boolean} isSignup Whether to render for signup vs login
   * @return {Dropdown} Dropdown component
   */
  renderSocialDropdown(providers, isSignup = false) {
    // Don't render if no providers
    if (providers.length === 0) {
      return null;
    }
    
    const buttonTitle = isSignup
      ? app.translator.trans('forumez-supabase-auth.forum.sign_up_with')
      : app.translator.trans('forumez-supabase-auth.forum.login_with');
    
    return (
      <Dropdown
        label={buttonTitle}
        buttonClassName="Button Button--block"
      >
        {providers.map(providerId => {
          const provider = this.socialProviders[providerId] || {
            id: providerId,
            name: providerId,
            icon: 'fas fa-external-link-alt',
            color: '#666'
          };
          
          // Get customizations for this provider
          const customization = this.providerCustomizations[providerId] || {};
          
          // Determine display values
          const displayName = customization.display_name || provider.name;
          const iconClass = customization.icon || provider.icon;
          
          return (
            <Button
              className="Button Dropdown-item"
              icon={iconClass}
              onclick={this.previewAlert.bind(this)}
            >
              {displayName}
            </Button>
          );
        })}
      </Dropdown>
    );
  }
  
  /**
   * Display a preview alert when a social button is clicked
   */
  previewAlert() {
    alert(app.translator.trans('forumez-supabase-auth.admin.settings.preview_widget.button_click_message'));
  }
  
  /**
   * Adjust a hex color by a percentage
   * Used for creating darker/lighter versions for gradients
   * 
   * @param {String} color - Hex color
   * @param {Number} percent - Percent to lighten (positive) or darken (negative)
   * @return {String} Adjusted hex color
   */
  adjustColor(color, percent) {
    let R = parseInt(color.substring(1,3), 16);
    let G = parseInt(color.substring(3,5), 16);
    let B = parseInt(color.substring(5,7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;  
    G = (G < 255) ? G : 255;  
    B = (B < 255) ? B : 255;  

    R = Math.max(0, R);
    G = Math.max(0, G);
    B = Math.max(0, B);

    let RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    let GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    let BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  }
}