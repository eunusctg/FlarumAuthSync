import Page from 'flarum/components/Page';
import Button from 'flarum/components/Button';
import Alert from 'flarum/components/Alert';
import LoadingIndicator from 'flarum/components/LoadingIndicator';

export default class Supabase2FAVerifyPage extends Page {
  init() {
    super.init();
    
    this.loading = false;
    this.verifying = false;
    this.verificationCode = '';
    this.error = null;
  }
  
  view() {
    const user = app.session.user;
    
    if (!user || user.isGuest()) {
      return <div className="Supabase2FAPage">
        <div className="container">
          <div className="Supabase2FAPage-header">
            <h2>Two-Factor Authentication</h2>
          </div>
          <div className="Supabase2FAPage-content">
            <div className="Supabase2FAPage-alert">
              <Alert type="error">
                You must be logged in to use two-factor authentication.
              </Alert>
            </div>
            <Button className="Button" onclick={() => m.route.set('/login')}>
              Log In
            </Button>
          </div>
        </div>
      </div>;
    }
    
    if (this.loading) {
      return <div className="Supabase2FAPage">
        <div className="container">
          <div className="Supabase2FAPage-loading">
            <LoadingIndicator />
          </div>
        </div>
      </div>;
    }
    
    return (
      <div className="Supabase2FAPage">
        <div className="container">
          <div className="Supabase2FAPage-header">
            <h2>Verify Two-Factor Authentication</h2>
            <p>For your security, please enter the code from your authenticator app to continue.</p>
          </div>
          
          {this.error && (
            <div className="Supabase2FAPage-error">
              <Alert type="error" dismissible={true} ondismiss={() => this.error = null}>
                {this.error}
              </Alert>
            </div>
          )}
          
          <div className="Supabase2FAPage-content">
            <div className="Supabase2FAVerify">
              <div className="Form-group">
                <label>Authentication Code</label>
                <input 
                  className="FormControl"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={this.verificationCode}
                  disabled={this.verifying}
                  oninput={(e) => {
                    this.verificationCode = e.target.value.replace(/\D/g, '').substr(0, 6);
                  }}
                />
              </div>
              
              <Button 
                className="Button Button--primary"
                disabled={this.verifying || this.verificationCode.length !== 6}
                loading={this.verifying}
                onclick={() => this.verifyCode()}
              >
                Verify
              </Button>
            </div>
            
            <div className="Supabase2FAVerify-help">
              <h4>Having trouble?</h4>
              <ul>
                <li>Make sure your device's time is correct</li>
                <li>Ensure you're using the correct account in your authenticator app</li>
                <li>Wait for a new code if the current one is about to expire</li>
                <li>Contact the site administrator if you've lost access to your authenticator</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  verifyCode() {
    if (this.verificationCode.length !== 6) {
      this.error = 'Please enter a valid 6-digit verification code';
      return;
    }
    
    this.verifying = true;
    m.redraw();
    
    const userToken = this.getUserToken();
    
    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/2fa/verify',
      body: {
        userToken,
        code: this.verificationCode
      }
    }).then(response => {
      // Set the session as 2FA verified
      app.session.set('2fa_verified', true);
      
      // Redirect to the intended page
      const intendedUrl = app.session.get('intended_url') || '/';
      m.route.set(intendedUrl);
    }).catch(error => {
      this.error = error.message || 'Verification failed. Please try again with a new code.';
      console.error('2FA verification error:', error);
      this.verificationCode = '';
    }).finally(() => {
      this.verifying = false;
      m.redraw();
    });
  }
  
  // Helper method to get the current user's token
  // Implementation will depend on your auth storage mechanism
  getUserToken() {
    // This is a placeholder - you'll need to implement this based on your auth system
    return localStorage.getItem('supabaseToken') || '';
  }
}