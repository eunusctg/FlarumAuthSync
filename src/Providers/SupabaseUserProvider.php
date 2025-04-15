<?php

namespace YourName\SupabaseAuth\Providers;

use Flarum\Foundation\AbstractServiceProvider;
use Flarum\User\User;
use Illuminate\Support\Arr;

class SupabaseUserProvider extends AbstractServiceProvider
{
    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        // Register the provider to handle Supabase authentication
        $this->app->bind('auth.provider.supabase', function ($app) {
            return new SupabaseUserProvider($app);
        });
    }

    /**
     * Retrieves a user by their Supabase token.
     *
     * @param string $token
     * @return User|null
     */
    public function retrieveBySupabaseToken($token)
    {
        $settings = $this->app->make('flarum.settings');
        $supabaseUrl = $settings->get('supabase.publicUrl');
        $supabaseKey = $settings->get('supabase.privateKey');

        if (!$supabaseUrl || !$supabaseKey) {
            return null;
        }

        // Make a request to Supabase to validate the token
        $curl = curl_init($supabaseUrl . '/auth/v1/user');
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'apikey: ' . $supabaseKey
            ]
        ]);
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            return null;
        }

        $userData = json_decode($response, true);
        
        // Find user by email
        $email = Arr::get($userData, 'email');
        
        if (!$email) {
            return null;
        }

        return User::where('email', $email)->first();
    }
}
