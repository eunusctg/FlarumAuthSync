import ExtensionPage from 'flarum/components/ExtensionPage';
import Switch from 'flarum/components/Switch';
import Button from 'flarum/components/Button';
import Alert from 'flarum/components/Alert';

export default class SupabaseSettingsPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.settings = {
      'supabase.publicUrl': this.setting('supabase.publicUrl')(),
      'supabase.publicKey': this.setting('supabase.publicKey')(),
      'supabase.privateKey': this.setting('supabase.privateKey')(),
      'supabase.syncAvatar': this.setting('supabase.syncAvatar')() === '1',
    };
  }

  content() {
    return (
      <div className="SupabaseSettingsPage">
        <div className="container">
          <form onsubmit={this.onsubmit.bind(this)}>
            <div className="Form-group">
              <label>{app.translator.trans('yourname-supabase-auth.admin.settings.public_url_label')}</label>
              <input 
                className="FormControl"
                value={this.settings['supabase.publicUrl']}
                oninput={e => this.settings['supabase.publicUrl'] = e.target.value}
              />
              <div className="helpText">
                {app.translator.trans('yourname-supabase-auth.admin.settings.public_url_help')}
              </div>
            </div>

            <div className="Form-group">
              <label>{app.translator.trans('yourname-supabase-auth.admin.settings.public_key_label')}</label>
              <input 
                className="FormControl"
                value={this.settings['supabase.publicKey']}
                oninput={e => this.settings['supabase.publicKey'] = e.target.value}
              />
              <div className="helpText">
                {app.translator.trans('yourname-supabase-auth.admin.settings.public_key_help')}
              </div>
            </div>

            <div className="Form-group">
              <label>{app.translator.trans('yourname-supabase-auth.admin.settings.private_key_label')}</label>
              <input 
                className="FormControl" 
                type="password"
                value={this.settings['supabase.privateKey']}
                oninput={e => this.settings['supabase.privateKey'] = e.target.value}
              />
              <div className="helpText">
                {app.translator.trans('yourname-supabase-auth.admin.settings.private_key_help')}
              </div>
            </div>

            <div className="Form-group">
              <Switch
                state={this.settings['supabase.syncAvatar']}
                onchange={value => this.settings['supabase.syncAvatar'] = value}
              >
                {app.translator.trans('yourname-supabase-auth.admin.settings.sync_avatar_label')}
              </Switch>
              <div className="helpText">
                {app.translator.trans('yourname-supabase-auth.admin.settings.sync_avatar_help')}
              </div>
            </div>

            <div className="Form-group">
              {this.submitButton()}
            </div>
          </form>

          <div className="SupabaseSettingsPage-docs">
            <h3>{app.translator.trans('yourname-supabase-auth.admin.settings.docs_title')}</h3>
            <p>{app.translator.trans('yourname-supabase-auth.admin.settings.docs_text')}</p>
            <ul>
              <li>{app.translator.trans('yourname-supabase-auth.admin.settings.docs_step1')}</li>
              <li>{app.translator.trans('yourname-supabase-auth.admin.settings.docs_step2')}</li>
              <li>{app.translator.trans('yourname-supabase-auth.admin.settings.docs_step3')}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  onsubmit(e) {
    e.preventDefault();

    // Save settings
    this.saving = true;

    this.setting('supabase.publicUrl')(this.settings['supabase.publicUrl']);
    this.setting('supabase.publicKey')(this.settings['supabase.publicKey']);
    this.setting('supabase.privateKey')(this.settings['supabase.privateKey']);
    this.setting('supabase.syncAvatar')(this.settings['supabase.syncAvatar'] ? '1' : '0');

    app.alerts.show(
      { type: 'success' }, 
      app.translator.trans('core.admin.settings.saved_message')
    );

    this.saving = false;
  }
}
