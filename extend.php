<?php

/*
 * This file is part of supaflow/flarum-ext-supabase-auth.
 *
 * Copyright (c) 2025 Supaflow Team.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

use Flarum\Extend;
use Supaflow\SupabaseAuth\Api\Controllers;
use Supaflow\SupabaseAuth\Listeners;
use Supaflow\SupabaseAuth\Providers;
use Supaflow\SupabaseAuth\Middleware;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/resources/less/forum.less')
        ->route('/supabase/callback', 'supabase.callback'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Routes('api'))
        ->post('/supabase/auth', 'supabase.auth', Controllers\SupabaseAuthController::class)
        ->get('/supabase/config', 'supabase.config', Controllers\SupabaseConfigController::class)
        ->post('/supabase/social-login', 'supabase.social', Controllers\SupabaseSocialLoginController::class)
        ->post('/supabase/2fa/setup', 'supabase.2fa.setup', Controllers\Supabase2FASetupController::class)
        ->post('/supabase/2fa/verify', 'supabase.2fa.verify', Controllers\Supabase2FAVerifyController::class)
        ->post('/supabase/user/sync', 'supabase.user.sync', Controllers\SupabaseUserSyncController::class),

    (new Extend\ServiceProvider())
        ->register(Providers\SupabaseUserProvider::class)
        ->register(Providers\Supabase2FAProvider::class),

    (new Extend\Middleware('forum'))
        ->add(Middleware\Supabase2FAMiddleware::class),

    (new Extend\Settings())
        ->serializeToForum('supabase.publicUrl', 'supabase.publicUrl')
        ->serializeToForum('supabase.publicKey', 'supabase.publicKey')
        ->serializeToForum('supabase.socialProviders', 'supabase.socialProviders')
        ->serializeToForum('supabase.enable2FA', 'supabase.enable2FA'),

    (new Extend\Event())
        ->listen('Flarum\Forum\Auth\LogOut', Listeners\AddClientSettings::class)
        ->listen('Flarum\User\Event\Saving', Listeners\SyncUserWithSupabase::class)
        ->listen('Flarum\User\Event\AvatarChanged', Listeners\SyncUserAvatarWithSupabase::class),
        
    (new Extend\ApiSerializer('Flarum\Api\Serializer\UserSerializer'))
        ->attributes(function ($serializer, $user, $attributes) {
            $attributes['isSupabaseUser'] = (bool) $user->is_supabase_user;
            $attributes['has2FAEnabled'] = (bool) $user->has_2fa_enabled;
            $attributes['supbaseConnectedProviders'] = $user->connected_providers;
            return $attributes;
        }),
];
