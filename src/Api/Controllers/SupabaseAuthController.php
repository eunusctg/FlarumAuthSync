<?php

namespace EunusCTG\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Command\RegisterUser;
use Flarum\User\Exception\PermissionDeniedException;
use Flarum\User\User;
use Flarum\User\UserRepository;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Controller to handle Supabase authentication.
 */
class SupabaseAuthController extends AbstractShowController
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
     * @var Client
     */
    protected $client;

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
        $this->client = new Client();
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
        $body = $request->getParsedBody();
        $token = Arr::get($body, 'token');
        $isSignUp = (bool) Arr::get($body, 'isSignUp', false);

        if (!$token) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '400',
                        'code' => 'missing_token',
                        'title' => 'Missing Token',
                        'detail' => 'No authentication token provided.'
                    ]
                ]
            ], 400);
        }

        try {
            // Get user data from Supabase
            $userData = $this->getUserDataFromSupabase($token);

            if (!$userData || !Arr::get($userData, 'id')) {
                return new JsonResponse([
                    'errors' => [
                        [
                            'status' => '401',
                            'code' => 'invalid_token',
                            'title' => 'Invalid Token',
                            'detail' => 'The provided token is invalid or has expired.'
                        ]
                    ]
                ], 401);
            }

            // Check if user exists
            $identifier = $this->getUserIdentifier($userData);
            $user = $this->findUser($identifier);

            // User exists, log them in
            if ($user) {
                return $this->handleExistingUser($user, $userData, $token, $request);
            }

            // No existing user, create one if sign up is allowed
            if ($isSignUp) {
                return $this->handleNewUser($userData, $token, $request);
            }

            // No user found and not signing up
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '404',
                        'code' => 'user_not_found',
                        'title' => 'User Not Found',
                        'detail' => 'No user exists with this identity. Please sign up first.'
                    ]
                ]
            ], 404);
        } catch (GuzzleException $e) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '500',
                        'code' => 'supabase_error',
                        'title' => 'Supabase Error',
                        'detail' => 'There was an error communicating with Supabase: ' . $e->getMessage()
                    ]
                ]
            ], 500);
        } catch (\Exception $e) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '500',
                        'code' => 'error',
                        'title' => 'Error',
                        'detail' => $e->getMessage()
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Get user data from Supabase using the token.
     *
     * @param string $token
     * @return array
     * @throws GuzzleException
     */
    protected function getUserDataFromSupabase(string $token): array
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        
        $response = $this->client->get("{$supabaseUrl}/auth/v1/user", [
            'headers' => [
                'Authorization' => "Bearer {$token}",
                'apikey' => $this->settings->get('supabase.publicKey')
            ]
        ]);

        $data = json_decode($response->getBody(), true);

        return $data ?: [];
    }

    /**
     * Get a unique identifier for the user.
     *
     * @param array $userData
     * @return string
     */
    protected function getUserIdentifier(array $userData): string
    {
        // Using the Supabase ID as the unique identifier
        return 'supabase_' . Arr::get($userData, 'id');
    }

    /**
     * Find a user by their identifier.
     *
     * @param string $identifier
     * @return User|null
     */
    protected function findUser(string $identifier): ?User
    {
        return $this->users->findWhere([
            'supabase_id' => $identifier
        ])->first();
    }

    /**
     * Handle an existing user login.
     *
     * @param User $user
     * @param array $userData
     * @param string $token
     * @param ServerRequestInterface $request
     * @return array
     */
    protected function handleExistingUser(User $user, array $userData, string $token, ServerRequestInterface $request): array
    {
        $actor = RequestUtil::getActor($request);
        $session = $request->getAttribute('session');

        // Update the user's session
        $session->put('user_id', $user->id);
        
        // Store Supabase token
        $session->put('supabase_token', $token);
        
        // Sync user data if enabled
        if ($this->settings->get('supabase.syncUserMetadata') === '1') {
            $this->syncUserData($user, $userData);
        }
        
        // Sync avatar if enabled
        if ($this->settings->get('supabase.syncAvatar') === '1') {
            $this->syncUserAvatar($user, $userData);
        }

        return [
            'token' => $user->token ?: $user->generateAccessToken(),
            'userId' => $user->id,
        ];
    }

    /**
     * Handle a new user registration.
     *
     * @param array $userData
     * @param string $token
     * @param ServerRequestInterface $request
     * @return array
     * @throws PermissionDeniedException
     */
    protected function handleNewUser(array $userData, string $token, ServerRequestInterface $request): array
    {
        $actor = RequestUtil::getActor($request);
        $session = $request->getAttribute('session');

        // Check if sign-ups are allowed
        if (!$this->settings->get('allow_sign_up')) {
            throw new PermissionDeniedException('Sign-ups are disabled');
        }

        // Prepare data for user creation
        $username = $this->generateUsername($userData);
        $email = Arr::get($userData, 'email');
        $provider = Arr::get($userData, 'app_metadata.provider');
        $supabaseId = $this->getUserIdentifier($userData);

        // Register the user
        $data = [
            'username' => $username,
            'email' => $email,
            'isEmailConfirmed' => true, // Email is already verified by Supabase
            'supabase_id' => $supabaseId,
            'supabase_provider' => $provider,
            'isSupabaseUser' => true
        ];

        // Set avatar URL if available
        $avatarUrl = Arr::get($userData, 'user_metadata.avatar_url');
        if ($avatarUrl && $this->settings->get('supabase.syncAvatar') === '1') {
            $data['avatarUrl'] = $avatarUrl;
        }

        $user = $this->bus->dispatch(
            new RegisterUser($actor, $data)
        );

        // Log the user in
        $session->put('user_id', $user->id);
        $session->put('supabase_token', $token);

        return [
            'token' => $user->token ?: $user->generateAccessToken(),
            'userId' => $user->id,
        ];
    }

    /**
     * Generate a username from user data.
     *
     * @param array $userData
     * @return string
     */
    protected function generateUsername(array $userData): string
    {
        // Try to get a useful name from the user data
        $name = Arr::get($userData, 'user_metadata.name') ?: 
                Arr::get($userData, 'user_metadata.full_name') ?: 
                Arr::get($userData, 'user_metadata.preferred_username');

        if ($name) {
            // Convert to a valid username format
            $username = Str::slug($name, '_');
            
            // Ensure it's unique
            $baseUsername = $username;
            $i = 1;
            
            while ($this->users->findWhere(['username' => $username])->exists()) {
                $username = $baseUsername . '_' . $i++;
            }
            
            return $username;
        }

        // Fall back to email-based username
        $email = Arr::get($userData, 'email', '');
        if ($email) {
            $emailName = explode('@', $email)[0];
            $username = Str::slug($emailName, '_');
            
            // Ensure it's unique
            $baseUsername = $username;
            $i = 1;
            
            while ($this->users->findWhere(['username' => $username])->exists()) {
                $username = $baseUsername . '_' . $i++;
            }
            
            return $username;
        }

        // Last resort: generate a random username
        $provider = Arr::get($userData, 'app_metadata.provider', 'user');
        $username = $provider . '_' . Str::random(8);
        
        // Ensure it's unique
        while ($this->users->findWhere(['username' => $username])->exists()) {
            $username = $provider . '_' . Str::random(8);
        }
        
        return $username;
    }

    /**
     * Sync user data from Supabase.
     *
     * @param User $user
     * @param array $userData
     * @return void
     */
    protected function syncUserData(User $user, array $userData): void
    {
        $data = [
            'attributes' => []
        ];

        // Update user email if it has changed
        $email = Arr::get($userData, 'email');
        if ($email && $email !== $user->email) {
            $data['attributes']['email'] = $email;
            $data['attributes']['isEmailConfirmed'] = true;
        }

        // Update any other user data
        $metadata = Arr::get($userData, 'user_metadata', []);
        if (!empty($metadata)) {
            $data['attributes']['supabaseMetadata'] = json_encode($metadata);
        }

        // Only dispatch if we have something to update
        if (!empty($data['attributes'])) {
            $this->bus->dispatch(
                new \Flarum\User\Command\EditUser($user->id, $user, $data)
            );
        }
    }

    /**
     * Sync user avatar from Supabase.
     *
     * @param User $user
     * @param array $userData
     * @return void
     */
    protected function syncUserAvatar(User $user, array $userData): void
    {
        $avatarUrl = Arr::get($userData, 'user_metadata.avatar_url');
        
        if ($avatarUrl && $avatarUrl !== $user->getAttribute('avatarUrl')) {
            $this->bus->dispatch(
                new \Flarum\User\Command\EditUser($user->id, $user, [
                    'attributes' => [
                        'avatarUrl' => $avatarUrl
                    ]
                ])
            );
        }
    }
}