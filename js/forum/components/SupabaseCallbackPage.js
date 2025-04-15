import Page from 'flarum/components/Page';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import Alert from 'flarum/components/Alert';
import Button from 'flarum/components/Button';

export default class SupabaseCallbackPage extends Page {
  init() {
    super.init();
    
    this.loading = true;
    this.error = null;
    this.success = false;
    
    this.processCallback();
  }
  
  view() {
    return (
      <div className="SupabaseCallbackPage">
        <div className="container">
          <div className="SupabaseCallbackPage-content">
            {this.loading ? (
              <div className="SupabaseCallbackPage-loading">
                <LoadingIndicator size="large" />
                <p>Processing authentication...</p>
              </div>
            ) : this.error ? (
              <div className="SupabaseCallbackPage-error">
                <Alert type="error">
                  {this.error}
                </Alert>
                <Button 
                  className="Button"
                  onclick={() => m.route.set('/login')}
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <div className="SupabaseCallbackPage-success">
                <Alert type="success">
                  Successfully authenticated! Redirecting...
                </Alert>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  async processCallback() {
    try {
      // Load Supabase client dynamically
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/dist/umd/supabase.min.js');
      
      const supabaseUrl = app.forum.attribute('supabase.publicUrl');
      const supabaseKey = app.forum.attribute('supabase.publicKey');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }
      
      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Get session from URL (Supabase redirects with #access_token=... fragment)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      // Check if we have an access token
      if (!params.has('access_token')) {
        this.error = 'No authentication token found in the URL.';
        this.loading = false;
        m.redraw();
        return;
      }
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const isSignUp = new URLSearchParams(window.location.search).get('is_sign_up') === 'true';
      
      // Validate the token with our backend
      const response = await app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/supabase/auth',
        body: {
          token: accessToken,
          isSignUp
        }
      });
      
      // Store the tokens for future use
      if (accessToken) {
        localStorage.setItem('supabaseToken', accessToken);
      }
      
      if (refreshToken) {
        localStorage.setItem('supabaseRefreshToken', refreshToken);
      }
      
      if (expiresIn) {
        const expiresAt = Date.now() + parseInt(expiresIn) * 1000;
        localStorage.setItem('supabaseTokenExpiry', expiresAt.toString());
      }
      
      // Set success and redirect
      this.success = true;
      m.redraw();
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (e) {
      this.error = e.message || 'An error occurred during authentication.';
      console.error('Supabase callback error:', e);
    } finally {
      this.loading = false;
      m.redraw();
    }
  }
}