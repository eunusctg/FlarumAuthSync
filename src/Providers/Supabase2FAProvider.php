<?php

namespace Supaflow\SupabaseAuth\Providers;

use Flarum\Foundation\AbstractServiceProvider;
use Flarum\Http\Middleware\AuthenticateWithSession;
use Flarum\Http\Middleware\CheckCsrfToken;
use Flarum\Http\RouteCollection;
use Flarum\Http\RouteHandlerFactory;
use Illuminate\Contracts\Container\Container;
use Supaflow\SupabaseAuth\Api\Controllers\Supabase2FASetupController;
use Supaflow\SupabaseAuth\Api\Controllers\Supabase2FAVerifyController;
use Supaflow\SupabaseAuth\Middleware\Supabase2FAMiddleware;

/**
 * Service provider for Supabase 2FA.
 */
class Supabase2FAProvider extends AbstractServiceProvider
{
    /**
     * Register services.
     */
    public function register()
    {
        // Register the 2FA middleware
        $this->container->singleton(Supabase2FAMiddleware::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot()
    {
        // Register API routes for 2FA
        $this->registerApiRoutes();
    }

    /**
     * Register API routes for 2FA.
     */
    protected function registerApiRoutes()
    {
        $this->container->resolving('flarum.api.routes', function (RouteCollection $routes) {
            $routes->post('/supabase/2fa/setup', 'supabase.2fa.setup', $this->getSetupController());
            $routes->post('/supabase/2fa/verify', 'supabase.2fa.verify', $this->getVerifyController());
            $routes->delete('/supabase/2fa/disable', 'supabase.2fa.disable', $this->getDisableController());
        });
    }

    /**
     * Get the 2FA setup controller.
     *
     * @return array
     */
    protected function getSetupController()
    {
        return $this->getRouteHandler(Supabase2FASetupController::class);
    }

    /**
     * Get the 2FA verify controller.
     *
     * @return array
     */
    protected function getVerifyController()
    {
        return $this->getRouteHandler(Supabase2FAVerifyController::class);
    }

    /**
     * Get the 2FA disable controller.
     *
     * @return array
     */
    protected function getDisableController()
    {
        // We can reuse the verify controller for disabling 2FA
        return $this->getRouteHandler(Supabase2FAVerifyController::class);
    }

    /**
     * Get a route handler for the given controller.
     *
     * @param string $controller
     * @return array
     */
    protected function getRouteHandler($controller)
    {
        /** @var RouteHandlerFactory $factory */
        $factory = $this->container->make(RouteHandlerFactory::class);

        return $factory->toController($controller)
            ->skipCsrf()  // Skip CSRF for API calls
            ->middleware([
                AuthenticateWithSession::class  // Require authentication
            ]);
    }
}