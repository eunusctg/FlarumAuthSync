<?php

/*
 * This file is part of yourname/flarum-ext-supabase-auth.
 *
 * Copyright (c) 2023 Your Name.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

use Flarum\Extend;
use YourName\SupabaseAuth\Api\Controllers;
use YourName\SupabaseAuth\Listeners;
use YourName\SupabaseAuth\Providers;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/resources/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Routes('api'))
        ->post('/supabase/auth', 'supabase.auth', Controllers\SupabaseAuthController::class)
        ->get('/supabase/config', 'supabase.config', Controllers\SupabaseConfigController::class),

    (new Extend\ServiceProvider())
        ->register(Providers\SupabaseUserProvider::class),

    (new Extend\Settings())
        ->serializeToForum('supabase.publicUrl', 'supabase.publicUrl')
        ->serializeToForum('supabase.publicKey', 'supabase.publicKey'),

    (new Extend\Event())
        ->listen('Flarum\Forum\Auth\LogOut', Listeners\AddClientSettings::class),
];
