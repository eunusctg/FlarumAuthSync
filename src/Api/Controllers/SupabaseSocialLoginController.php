<?php

namespace Supaflow\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractCreateController;
use Flarum\Http\RequestUtil;
use Flarum\User\Command\RegisterUser;
use Flarum\User\Exception\PermissionDeniedException;
use Flarum\User\UserRepository;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;
use Laminas\Diactoros\Response\JsonResponse;
use GuzzleHttp\Client;

class SupabaseSocialLoginController extends AbstractCreateController
{
    /**
     * @var UserRepository
     */
    protected $users;

    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @var Dispatcher
     */
    protected $bus;

    /**
     * @var Client
     */
    protected $httpClient;

    /**
     * @param UserRepository $users
     * @param SettingsRepositoryInterface $settings
     * @param Dispatcher $bus
     */
    public function __construct(UserRepository $users, SettingsRepositoryInterface $settings, Dispatcher $bus)
    {
        $this->users = $users;
        $this->settings = $settings;
        $this->bus = $bus;
        $this->httpClient = new Client([
            'timeout' => 10,
            'connect_timeout' => 5
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);
        $data = $request->getParsedBody();
        $token = Arr::get($data, 'token');
        $provider = Arr::get($data, 'provider', 'github'); // Default to GitHub
        $isSignUp = Arr::get($data, 'isSignUp', false);

        if (!$token) {
            return new JsonResponse(['error' => 'No token provided'], 400);
        }

        // Check if the requested social provider is enabled
        $enabledProviders = json_decode($this->settings->get('supabase.socialProviders', '["github"]'), true);
        if (!in_array($provider, $enabledProviders)) {
            return new JsonResponse(['error' => "Social login with $provider is not enabled"], 400);
        }

        // Verify and decode the token using Supabase
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $supabaseKey = $this->settings->get('supabase.privateKey');

        if (!$supabaseUrl || !$supabaseKey) {
            return new JsonResponse(['error' => 'Supabase is not configured'], 500);
        }

        try {
            // Make a request to Supabase to validate the token
            $response = $this->httpClient->request('GET', $supabaseUrl . '/auth/v1/user', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'apikey' => $supabaseKey
                ]
            ]);

            $userData = json_decode($response->getBody(), true);
            
            // No valid user data
            if (!isset($userData['email'])) {
                return new JsonResponse(['error' => 'Invalid user data from provider'], 400);
            }

            // Check if the user exists in our database
            $email = $userData['email'];
            $user = $this->users->findByEmail($email);

            // Create a new user if they don't exist
            if (!$user) {
                if (!$isSignUp && !$this->settings->get('allow_sign_up')) {
                    throw new PermissionDeniedException('Sign up is disabled');
                }

                // Extract name or username from provider data
                $nameFromProvider = Arr::get($userData, 'user_metadata.full_name') ?? 
                                    Arr::get($userData, 'user_metadata.name') ?? 
                                    Arr::get($userData, 'user_metadata.username');

                // Generate a username from the name or email
                $username = $nameFromProvider ? strtolower(preg_replace('/\s+/', '', $nameFromProvider)) : explode('@', $email)[0];
                $baseUsername = $username;
                $i = 1;

                // Make sure username is unique
                while ($this->users->findByUsername($username)) {
                    $username = $baseUsername . $i++;
                }

                // Register the user
                $user = $this->bus->dispatch(
                    new RegisterUser($actor, [
                        'username' => $username,
                        'email' => $email,
                        'password' => bin2hex(random_bytes(16)), // Random secure password since login is via Supabase
                        'isEmailConfirmed' => true
                    ])
                );

                // Store which provider the user registered with
                $user->is_supabase_user = true;
                $user->connected_providers = json_encode([$provider]);
                $user->save();

                // Sync avatar if available and enabled
                if ($this->settings->get('supabase.syncAvatar') == '1' && 
                    isset($userData['user_metadata']['avatar_url'])) {
                    // Logic to sync avatar would go here
                    // This would require additional implementation
                }
            } else {
                // Update existing user's connected providers
                $connectedProviders = json_decode($user->connected_providers ?? '[]', true);
                if (!in_array($provider, $connectedProviders)) {
                    $connectedProviders[] = $provider;
                    $user->connected_providers = json_encode($connectedProviders);
                    $user->save();
                }
            }

            // Generate and return a Flarum token for the user
            $token = $user->createToken();

            return [
                'token' => $token->token,
                'userId' => $user->id,
                'provider' => $provider,
                'isNewUser' => !$user->exists
            ];
            
        } catch (\Exception $e) {
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }
}