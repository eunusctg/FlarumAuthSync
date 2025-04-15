<?php

/*
 * This file is part of eunusctg/supabase-auth.
 *
 * Copyright (c) 2025 Eunus CTG.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

use Flarum\Api\Serializer\UserSerializer;
use Flarum\Extend;
use Flarum\Frontend\Document;
use EunusCTG\SupabaseAuth\Api\Controllers\SupabaseAuthController;
use EunusCTG\SupabaseAuth\Api\Controllers\SupabaseConfigController;
use EunusCTG\SupabaseAuth\Api\Controllers\SupabaseSocialLoginController;
use EunusCTG\SupabaseAuth\Api\Controllers\Supabase2FASetupController;
use EunusCTG\SupabaseAuth\Api\Controllers\Supabase2FAVerifyController;
use EunusCTG\SupabaseAuth\Api\Controllers\SupabaseUserSyncController;
use EunusCTG\SupabaseAuth\Listeners\AddClientSettings;
use EunusCTG\SupabaseAuth\Listeners\SyncUserWithSupabase;
use EunusCTG\SupabaseAuth\Listeners\SyncUserAvatarWithSupabase;
use EunusCTG\SupabaseAuth\Middleware\Supabase2FAMiddleware;
use EunusCTG\SupabaseAuth\Providers\SupabaseUserProvider;
use EunusCTG\SupabaseAuth\Providers\Supabase2FAProvider;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/resources/less/admin.less'),

    new Extend\Locales(__DIR__.'/resources/locale'),

    // Register API endpoints
    (new Extend\Routes('api'))
        ->post('/supabase/auth', 'supabase.auth', SupabaseAuthController::class)
        ->post('/supabase/config', 'supabase.config', SupabaseConfigController::class)
        ->post('/supabase/social-login', 'supabase.social-login', SupabaseSocialLoginController::class)
        ->post('/supabase/2fa/setup', 'supabase.2fa.setup', Supabase2FASetupController::class)
        ->post('/supabase/2fa/verify', 'supabase.2fa.verify', Supabase2FAVerifyController::class)
        ->post('/supabase/sync', 'supabase.sync', SupabaseUserSyncController::class),

    // Register middleware
    (new Extend\Middleware('api'))
        ->add(Supabase2FAMiddleware::class),
        
    // Register service providers
    (new Extend\ServiceProvider())
        ->register(SupabaseUserProvider::class)
        ->register(Supabase2FAProvider::class),

    // Register event listeners
    (new Extend\Event())
        ->subscribe(AddClientSettings::class)
        ->subscribe(SyncUserWithSupabase::class)
        ->subscribe(SyncUserAvatarWithSupabase::class),
        
    // Add custom user attributes for Supabase integration
    (new Extend\ApiSerializer(UserSerializer::class))
        ->attributes(function (UserSerializer $serializer, $user, array $attributes) {
            if ($user->getAttribute('isSupabaseUser')) {
                $attributes['isSupabaseUser'] = true;
                $attributes['has2FAEnabled'] = (bool) $user->getAttribute('has2FAEnabled');
                $attributes['supabaseProvider'] = $user->getAttribute('supabase_provider');
                
                // Include connected social providers for settings page
                $metadata = $user->getAttribute('supabaseMetadata');
                if ($metadata) {
                    $decodedMetadata = json_decode($metadata, true);
                    if (isset($decodedMetadata['providers'])) {
                        $attributes['supabaseConnectedProviders'] = $decodedMetadata['providers'];
                    }
                }
            }
            
            return $attributes;
        }),
    
    // Register permissions
    (new Extend\Policy())
        ->modelPolicy(\Flarum\User\User::class, \ForumEZ\SupabaseAuth\Access\UserPolicy::class),
];