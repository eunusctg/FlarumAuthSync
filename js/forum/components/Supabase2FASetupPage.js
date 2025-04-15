import Page from 'flarum/components/Page';
import Button from 'flarum/components/Button';
import Alert from 'flarum/components/Alert';
import LoadingIndicator from 'flarum/components/LoadingIndicator';

export default class Supabase2FASetupPage extends Page {
  init() {
    super.init();
    
    this.loading = false;
    this.verifying = false;
    this.setupComplete = false;
    this.setupData = null;
    this.verificationCode = '';
    this.error = null;
    
    this.loadSetupData();
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
                You must be logged in to set up two-factor authentication.
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
    
    if (this.setupComplete) {
      return <div className="Supabase2FAPage">
        <div className="container">
          <div className="Supabase2FAPage-header">
            <h2>Two-Factor Authentication Setup Complete</h2>
          </div>
          <div className="Supabase2FAPage-content">
            <div className="Supabase2FAPage-alert">
              <Alert type="success">
                Two-factor authentication has been successfully set up for your account.
                You will be asked for a verification code on new devices or when logging in after a long time.
              </Alert>
            </div>
            <Button className="Button Button--primary" onclick={() => {
              const intendedUrl = app.session.get('intended_url') || '/';
              m.route.set(intendedUrl);
            }}>
              Continue to Forum
            </Button>
          </div>
        </div>
      </div>;
    }
    
    // Setup screen
    return (
      <div className="Supabase2FAPage">
        <div className="container">
          <div className="Supabase2FAPage-header">
            <h2>Set Up Two-Factor Authentication</h2>
            <p>Enhance your account security with 2FA. You'll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.</p>
          </div>
          
          {this.error && (
            <div className="Supabase2FAPage-error">
              <Alert type="error" dismissible={true} ondismiss={() => this.error = null}>
                {this.error}
              </Alert>
            </div>
          )}
          
          <div className="Supabase2FAPage-content">
            {this.setupData ? (
              <div className="Supabase2FASetup">
                <div className="Supabase2FASetup-steps">
                  <div className="Supabase2FASetup-step">
                    <h3>1. Scan this QR code with your authenticator app</h3>
                    <div className="Supabase2FASetup-qrCode">
                      <img src={this.setupData.qrCode} alt="2FA QR Code" />
                    </div>
                  </div>
                  
                  <div className="Supabase2FASetup-step">
                    <h3>2. Or enter this code manually</h3>
                    <div className="Supabase2FASetup-secretKey">
                      <code>{this.setupData.secret}</code>
                      <Button className="Button Button--icon" onclick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(this.setupData.secret);
                        app.alerts.show({ type: 'success' }, 'Secret key copied to clipboard');
                      }}>
                        <i className="fas fa-copy"></i>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="Supabase2FASetup-step">
                    <h3>3. Verify setup with a code from your app</h3>
                    <div className="Supabase2FASetup-verify">
                      <div className="Form-group">
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
                        onclick={() => this.verifySetup()}
                      >
                        Verify and Activate
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="Supabase2FASetup-help">
                  <h4>Important:</h4>
                  <ul>
                    <li>If you lose access to your authenticator app, you won't be able to log in.</li>
                    <li>Consider saving your secret key somewhere safe as a backup.</li>
                    <li>You can disable 2FA from your account settings at any time.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="Supabase2FAPage-start">
                <Button 
                  className="Button Button--primary"
                  onclick={() => this.loadSetupData()}
                  loading={this.loading}
                  disabled={this.loading}
                >
                  Begin Setup
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  loadSetupData() {
    this.loading = true;
    m.redraw();
    
    // Retrieve the current user's token - this depends on your auth implementation
    const userToken = this.getUserToken();
    
    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/supabase/2fa/setup',
      body: {
        userToken
      }
    }).then(response => {
      this.setupData = response;
      this.error = null;
    }).catch(error => {
      this.error = error.message || 'Failed to set up 2FA. Please try again.';
      console.error('2FA setup error:', error);
    }).finally(() => {
      this.loading = false;
      m.redraw();
    });
  }
  
  verifySetup() {
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
        factorId: this.setupData.factorId,
        code: this.verificationCode
      }
    }).then(response => {
      this.setupComplete = true;
      this.error = null;
      
      // Set the session as 2FA verified
      app.session.set('2fa_verified', true);
    }).catch(error => {
      this.error = error.message || 'Verification failed. Please try again with a new code.';
      console.error('2FA verification error:', error);
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