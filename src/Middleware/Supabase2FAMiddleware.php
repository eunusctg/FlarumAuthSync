<?php

namespace Supaflow\SupabaseAuth\Middleware;

use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Middleware to enforce 2FA verification for sensitive operations.
 */
class Supabase2FAMiddleware implements MiddlewareInterface
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @param SettingsRepositoryInterface $settings
     */
    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    /**
     * Process an incoming server request.
     *
     * @param ServerRequestInterface $request
     * @param RequestHandlerInterface $handler
     * @return ResponseInterface
     */
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();
        $method = $request->getMethod();
        
        // Skip middleware if 2FA is not enabled globally
        if ($this->settings->get('supabase.enable2FA') !== '1') {
            return $handler->handle($request);
        }

        // Get the current user
        $actor = RequestUtil::getActor($request);
        
        // Check if this path/method combination requires 2FA verification
        if ($this->requires2FA($path, $method, $actor)) {
            // Check if the user has 2FA enabled
            if ($actor->getAttribute('has2FAEnabled')) {
                // Check if the user has verified their 2FA for this session
                $session = $request->getAttribute('session');
                
                if (!$session->get('2fa_verified')) {
                    // 2FA verification required
                    return new JsonResponse([
                        'errors' => [
                            [
                                'status' => '403',
                                'code' => '2fa_required',
                                'title' => 'Two-Factor Authentication Required',
                                'detail' => 'For security reasons, this action requires 2FA verification.',
                                'source' => [
                                    'pointer' => $path
                                ],
                                'links' => [
                                    'verify' => '/2fa/verify'
                                ]
                            ]
                        ]
                    ], 403);
                }
            } else if ($this->settings->get('supabase.require2FA') === '1' && $this->isUserRequired2FA($actor)) {
                // User needs to set up 2FA first
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '403',
                            'code' => '2fa_setup_required',
                            'title' => 'Two-Factor Authentication Setup Required',
                            'detail' => 'For security reasons, you must set up two-factor authentication before performing this action.',
                            'source' => [
                                'pointer' => $path
                            ],
                            'links' => [
                                'setup' => '/2fa/setup'
                            ]
                        ]
                    ]
                ], 403);
            }
        }

        return $handler->handle($request);
    }

    /**
     * Check if a path/method combination requires 2FA verification.
     *
     * @param string $path
     * @param string $method
     * @param User $actor
     * @return bool
     */
    protected function requires2FA(string $path, string $method, User $actor): bool
    {
        // Skip for guests
        if ($actor->isGuest()) {
            return false;
        }

        // List of sensitive paths that require 2FA
        $sensitivePaths = [
            // User settings and account changes
            '/api/users/' . $actor->id => ['PATCH', 'DELETE'],
            '/api/users/' . $actor->id . '/email' => ['POST'],
            '/api/users/' . $actor->id . '/password' => ['POST'],
            
            // Admin operations if user is admin
            '/api/settings' => $actor->isAdmin() ? ['POST'] : [],
            '/api/extensions' => $actor->isAdmin() ? ['PATCH', 'DELETE'] : [],
            
            // Supabase specific operations
            '/api/supabase/disconnect-provider' => ['POST'],
            '/api/supabase/2fa/disable' => ['POST'],
        ];

        // Check if the current path and method match any sensitive paths
        foreach ($sensitivePaths as $sensitivePath => $methods) {
            if (preg_match('#^' . str_replace('/', '\/', $sensitivePath) . '#', $path) && in_array($method, $methods)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a user is required to have 2FA based on their groups.
     *
     * @param User $user
     * @return bool
     */
    protected function isUserRequired2FA(User $user): bool
    {
        // Admins are always required to have 2FA if global setting is enabled
        if ($user->isAdmin()) {
            return true;
        }

        // Check if the user has the permission that requires 2FA
        return $user->hasPermission('supabase.require2fa');
    }
}