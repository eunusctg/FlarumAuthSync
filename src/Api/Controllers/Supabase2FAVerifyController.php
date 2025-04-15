<?php

namespace EunusCTG\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Command\EditUser;
use Flarum\User\UserRepository;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Arr;
use OTPHP\TOTP;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Controller to handle 2FA verification.
 */
class Supabase2FAVerifyController extends AbstractShowController
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @var UserRepository
     */
    protected $users;

    /**
     * @var Dispatcher
     */
    protected $bus;

    /**
     * @param SettingsRepositoryInterface $settings
     * @param UserRepository $users
     * @param Dispatcher $bus
     */
    public function __construct(SettingsRepositoryInterface $settings, UserRepository $users, Dispatcher $bus)
    {
        $this->settings = $settings;
        $this->users = $users;
        $this->bus = $bus;
    }

    /**
     * Get the data to be serialized and returned with the response.
     *
     * @param ServerRequestInterface $request
     * @param array $data
     * @return array
     */
    protected function data(ServerRequestInterface $request, array $data)
    {
        // Check if 2FA is enabled
        if ($this->settings->get('supabase.enable2FA') !== '1') {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '403',
                        'code' => '2fa_disabled',
                        'title' => 'Two-Factor Authentication Disabled',
                        'detail' => 'Two-factor authentication is not enabled for this forum.'
                    ]
                ]
            ], 403);
        }

        // Get the actor
        $actor = RequestUtil::getActor($request);

        // Check if the user is authenticated
        if ($actor->isGuest()) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '401',
                        'code' => 'unauthorized',
                        'title' => 'Unauthorized',
                        'detail' => 'You must be logged in to verify two-factor authentication.'
                    ]
                ]
            ], 401);
        }

        // Get the verification code from the request
        $body = $request->getParsedBody();
        $code = Arr::get($body, 'code');

        if (!$code || strlen($code) !== 6 || !ctype_digit($code)) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '400',
                        'code' => 'invalid_code',
                        'title' => 'Invalid Code',
                        'detail' => 'The verification code must be 6 digits.'
                    ]
                ]
            ], 400);
        }

        // Get the session
        $session = $request->getAttribute('session');

        // Check if we're verifying a new 2FA setup or just validating an existing one
        $factorId = Arr::get($body, 'factorId');

        if ($factorId) {
            // We're verifying a new 2FA setup
            $setupData = $session->get('2fa_setup');

            if (!$setupData || Arr::get($setupData, 'factor_id') !== $factorId) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '400',
                            'code' => 'invalid_setup',
                            'title' => 'Invalid Setup',
                            'detail' => 'The 2FA setup session has expired or is invalid. Please try again.'
                        ]
                    ]
                ], 400);
            }

            $secret = Arr::get($setupData, 'secret');
            $createdAt = Arr::get($setupData, 'created_at', 0);

            // Check if the setup has expired (15 minutes)
            if (time() - $createdAt > 900) {
                $session->remove('2fa_setup');
                
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '400',
                            'code' => 'setup_expired',
                            'title' => 'Setup Expired',
                            'detail' => 'The 2FA setup has expired. Please try again.'
                        ]
                    ]
                ], 400);
            }

            // Verify the code
            if (!$this->verifyCode($code, $secret)) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '400',
                            'code' => 'invalid_code',
                            'title' => 'Invalid Code',
                            'detail' => 'The verification code is incorrect. Please try again with a new code.'
                        ]
                    ]
                ], 400);
            }

            // Code is valid, save the 2FA data to the user
            $this->saveUserTwoFactorData($actor, $secret);

            // Clear the setup data
            $session->remove('2fa_setup');

            // Mark the session as 2FA verified
            $session->put('2fa_verified', true);

            // Return success
            return [
                'success' => true,
                'message' => 'Two-factor authentication has been set up successfully.',
            ];
        } else {
            // We're verifying an existing 2FA setup
            if (!$actor->getAttribute('has2FAEnabled')) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '400',
                            'code' => '2fa_not_enabled',
                            'title' => '2FA Not Enabled',
                            'detail' => 'You have not set up two-factor authentication.'
                        ]
                    ]
                ], 400);
            }

            // Get the user's 2FA secret
            $secret = $actor->getAttribute('twoFactorSecret');

            if (!$secret) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '500',
                            'code' => 'invalid_configuration',
                            'title' => 'Invalid Configuration',
                            'detail' => 'Your two-factor authentication configuration is invalid. Please contact an administrator.'
                        ]
                    ]
                ], 500);
            }

            // Verify the code
            if (!$this->verifyCode($code, $secret)) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '400',
                            'code' => 'invalid_code',
                            'title' => 'Invalid Code',
                            'detail' => 'The verification code is incorrect. Please try again with a new code.'
                        ]
                    ]
                ], 400);
            }

            // Code is valid, mark the session as 2FA verified
            $session->put('2fa_verified', true);
            
            // Update last_verified_at for the user
            $this->bus->dispatch(
                new EditUser($actor->id, $actor, [
                    'attributes' => [
                        'twoFactorLastVerifiedAt' => time()
                    ]
                ])
            );

            // Return success
            return [
                'success' => true,
                'message' => 'Two-factor authentication verified successfully.',
            ];
        }
    }

    /**
     * Verify a TOTP code against a secret.
     *
     * @param string $code
     * @param string $secret
     * @return bool
     */
    protected function verifyCode(string $code, string $secret): bool
    {
        $totp = TOTP::create($secret);
        return $totp->verify($code);
    }

    /**
     * Save the 2FA data to the user.
     *
     * @param User $user
     * @param string $secret
     * @return void
     */
    protected function saveUserTwoFactorData($user, string $secret): void
    {
        $this->bus->dispatch(
            new EditUser($user->id, $user, [
                'attributes' => [
                    'has2FAEnabled' => true,
                    'twoFactorSecret' => $secret,
                    'twoFactorEnabledAt' => time(),
                    'twoFactorLastVerifiedAt' => time()
                ]
            ])
        );
    }
}