import app from 'flarum/app';
import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import icon from 'flarum/common/helpers/icon';

/**
 * Modal for customizing individual social login provider settings.
 */
export default class ProviderCustomizationModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    
    // Get the provider data passed to this modal
    this.provider = this.attrs.provider;
    this.providerConfig = this.attrs.providerConfig || {};
    this.onSave = this.attrs.onSave || function() {};
    
    // Create a copy of the provider config for editing
    this.editedConfig = {
      display_name: this.providerConfig.display_name || this.provider.name,
      icon: this.providerConfig.icon || this.provider.icon,
      button_color: this.providerConfig.button_color || this.getDefaultColor(this.provider.id),
      button_text_color: this.providerConfig.button_text_color || '#ffffff',
      priority: this.providerConfig.priority || 0,
      show_on_login: this.providerConfig.show_on_login !== false,
      show_on_signup: this.providerConfig.show_on_signup !== false,
      custom_icon_class: this.providerConfig.custom_icon_class || ''
    };
    
    // Available icon classes
    this.availableIcons = [
      { name: 'GitHub', value: 'fab fa-github' },
      { name: 'Google', value: 'fab fa-google' },
      { name: 'Facebook', value: 'fab fa-facebook-f' },
      { name: 'Twitter', value: 'fab fa-twitter' },
      { name: 'Discord', value: 'fab fa-discord' },
      { name: 'Apple', value: 'fab fa-apple' },
      { name: 'LinkedIn', value: 'fab fa-linkedin-in' },
      { name: 'Slack', value: 'fab fa-slack' },
      { name: 'Spotify', value: 'fab fa-spotify' },
      { name: 'Twitch', value: 'fab fa-twitch' },
      { name: 'Custom', value: 'custom' }
    ];
  }
  
  /**
   * Get default color for a provider
   */
  getDefaultColor(providerId) {
    const colors = {
      github: '#24292e',
      google: '#4285F4',
      facebook: '#1877F2',
      twitter: '#1DA1F2',
      discord: '#5865F2',
      apple: '#000000',
      linkedin: '#0A66C2',
      slack: '#4A154B',
      spotify: '#1DB954',
      twitch: '#9146FF'
    };
    
    return colors[providerId] || '#666666';
  }
  
  className() {
    return 'ProviderCustomizationModal Modal--small';
  }
  
  title() {
    return app.translator.trans('forumez-supabase.admin.settings.provider_customization.title', {provider: this.provider.name});
  }
  
  content() {
    return (
      <div className="Modal-body">
        <div className="Form">
          {/* Display Name */}
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.display_name')}</label>
            <input 
              className="FormControl" 
              type="text" 
              value={this.editedConfig.display_name}
              oninput={e => {
                this.editedConfig.display_name = e.target.value;
                m.redraw();
              }} 
            />
            <p className="helpText">{app.translator.trans('forumez-supabase.admin.settings.provider_customization.display_name_help')}</p>
          </div>
          
          {/* Icon Selection */}
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.icon')}</label>
            <div className="iconSelect">
              <select 
                className="FormControl"
                value={this.editedConfig.icon === this.editedConfig.custom_icon_class ? 'custom' : this.editedConfig.icon}
                onchange={e => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    // Use custom icon class
                    this.editedConfig.icon = this.editedConfig.custom_icon_class || '';
                  } else {
                    // Use selected icon
                    this.editedConfig.icon = value;
                  }
                  m.redraw();
                }}
              >
                {this.availableIcons.map(iconOption => (
                  <option value={iconOption.value}>
                    {iconOption.name}
                  </option>
                ))}
              </select>
              
              {/* Icon Preview */}
              <div className="iconPreview">
                {icon(this.editedConfig.icon, {className: 'icon'})}
              </div>
            </div>
            
            {/* Custom Icon Class */}
            {(this.editedConfig.icon === this.editedConfig.custom_icon_class || this.availableIcons.findIndex(i => i.value === this.editedConfig.icon) === -1) && (
              <div className="customIconInput">
                <input 
                  className="FormControl" 
                  type="text" 
                  placeholder="fa fa-custom-icon"
                  value={this.editedConfig.custom_icon_class}
                  oninput={e => {
                    this.editedConfig.custom_icon_class = e.target.value;
                    this.editedConfig.icon = e.target.value;
                    m.redraw();
                  }} 
                />
                <p className="helpText">{app.translator.trans('forumez-supabase.admin.settings.provider_customization.custom_icon_help')}</p>
              </div>
            )}
          </div>
          
          {/* Button Colors */}
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.button_color')}</label>
            <div className="colorPickerGroup">
              <input 
                type="color" 
                value={this.editedConfig.button_color}
                onchange={e => {
                  this.editedConfig.button_color = e.target.value;
                  m.redraw();
                }} 
              />
              <input 
                className="FormControl" 
                type="text" 
                value={this.editedConfig.button_color}
                oninput={e => {
                  this.editedConfig.button_color = e.target.value;
                  m.redraw();
                }} 
              />
            </div>
            
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.button_text_color')}</label>
            <div className="colorPickerGroup">
              <input 
                type="color" 
                value={this.editedConfig.button_text_color}
                onchange={e => {
                  this.editedConfig.button_text_color = e.target.value;
                  m.redraw();
                }} 
              />
              <input 
                className="FormControl" 
                type="text" 
                value={this.editedConfig.button_text_color}
                oninput={e => {
                  this.editedConfig.button_text_color = e.target.value;
                  m.redraw();
                }} 
              />
            </div>
          </div>
          
          {/* Button Preview */}
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.button_preview')}</label>
            <div className="buttonPreview">
              <Button 
                className="Button" 
                style={{
                  backgroundColor: this.editedConfig.button_color,
                  color: this.editedConfig.button_text_color
                }}
              >
                {icon(this.editedConfig.icon, {className: 'Button-icon'})}
                <span className="Button-label">
                  {app.translator.trans('forumez-supabase.forum.login_with_provider', {provider: this.editedConfig.display_name})}
                </span>
              </Button>
            </div>
          </div>
          
          {/* Display Options */}
          <div className="Form-group">
            <Switch 
              state={this.editedConfig.show_on_login}
              onchange={value => {
                this.editedConfig.show_on_login = value;
                m.redraw();
              }}
            >
              {app.translator.trans('forumez-supabase.admin.settings.provider_customization.show_on_login')}
            </Switch>
            
            <Switch 
              state={this.editedConfig.show_on_signup}
              onchange={value => {
                this.editedConfig.show_on_signup = value;
                m.redraw();
              }}
            >
              {app.translator.trans('forumez-supabase.admin.settings.provider_customization.show_on_signup')}
            </Switch>
          </div>
          
          {/* Priority */}
          <div className="Form-group">
            <label>{app.translator.trans('forumez-supabase.admin.settings.provider_customization.priority')}</label>
            <input 
              className="FormControl" 
              type="number" 
              value={this.editedConfig.priority}
              oninput={e => {
                this.editedConfig.priority = parseInt(e.target.value, 10) || 0;
                m.redraw();
              }} 
            />
            <p className="helpText">{app.translator.trans('forumez-supabase.admin.settings.provider_customization.priority_help')}</p>
          </div>
          
          {/* Reset Button */}
          <div className="Form-group">
            <Button className="Button Button--danger" onclick={this.resetToDefaults.bind(this)}>
              {app.translator.trans('forumez-supabase.admin.settings.provider_customization.reset_defaults')}
            </Button>
          </div>
          
          {/* Save Button */}
          <div className="Form-group">
            <Button className="Button Button--primary" onclick={this.saveChanges.bind(this)}>
              {app.translator.trans('forumez-supabase.admin.settings.provider_customization.save')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * Reset to default values
   */
  resetToDefaults() {
    this.editedConfig = {
      display_name: this.provider.name,
      icon: this.provider.icon,
      button_color: this.getDefaultColor(this.provider.id),
      button_text_color: '#ffffff',
      priority: 0,
      show_on_login: true,
      show_on_signup: true,
      custom_icon_class: ''
    };
    
    m.redraw();
  }
  
  /**
   * Save changes and close the modal
   */
  saveChanges() {
    // Call the onSave callback with the edited config
    this.onSave(this.provider.id, this.editedConfig);
    
    // Close the modal
    this.hide();
  }
}