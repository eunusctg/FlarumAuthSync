<?php

namespace Supaflow\SupabaseAuth\Providers;

use Flarum\Foundation\AbstractServiceProvider;
use Flarum\Http\RouteCollection;
use Flarum\Http\RouteHandlerFactory;
use Illuminate\Contracts\Container\Container;
use Supaflow\SupabaseAuth\Api\Controllers\SupabaseAuthController;
use Supaflow\SupabaseAuth\Api\Controllers\SupabaseSocialLoginController;
use Supaflow\SupabaseAuth\Api\Controllers\SupabaseUserSyncController;

/**
 * Service provider for Supabase authentication.
 */
class SupabaseUserProvider extends AbstractServiceProvider
{
    /**
     * Register services.
     */
    public function register()
    {
        // Register services for Supabase auth
    }

    /**
     * Bootstrap services.
     */
    public function boot()
    {
        // Register API routes for Supabase auth
        $this->registerApiRoutes();
    }

    /**
     * Register API routes for Supabase auth.
     */
    protected function registerApiRoutes()
    {
        $this->container->resolving('flarum.api.routes', function (RouteCollection $routes) {
            // Supabase authentication routes
            $routes->post('/supabase/auth', 'supabase.auth', $this->getAuthController());
            $routes->post('/supabase/social-login', 'supabase.social-login', $this->getSocialLoginController());
            $routes->post('/supabase/sync', 'supabase.sync', $this->getUserSyncController());
            $routes->post('/supabase/test-connection', 'supabase.test-connection', $this->getTestConnectionController());
            $routes->post('/supabase/disconnect-provider', 'supabase.disconnect-provider', $this->getDisconnectProviderController());
        });
    }

    /**
     * Get the auth controller.
     *
     * @return array
     */
    protected function getAuthController()
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        return $factory->toController(SupabaseAuthController::class);
    }

    /**
     * Get the social login controller.
     *
     * @return array
     */
    protected function getSocialLoginController()
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        return $factory->toController(SupabaseSocialLoginController::class);
    }

    /**
     * Get the user sync controller.
     *
     * @return array
     */
    protected function getUserSyncController()
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        return $factory->toController(SupabaseUserSyncController::class);
    }

    /**
     * Get the test connection controller.
     *
     * @return array
     */
    protected function getTestConnectionController()
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        // We can reuse the auth controller for testing connection
        return $factory->toController(SupabaseAuthController::class);
    }

    /**
     * Get the disconnect provider controller.
     *
     * @return array
     */
    protected function getDisconnectProviderController()
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        // We can reuse the social login controller for disconnecting providers
        return $factory->toController(SupabaseSocialLoginController::class);
    }
}