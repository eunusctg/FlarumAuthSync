<?php

namespace YourName\SupabaseAuth\Api\Controllers;

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

class SupabaseAuthController extends AbstractCreateController
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
     * @param UserRepository $users
     * @param SettingsRepositoryInterface $settings
     * @param Dispatcher $bus
     */
    public function __construct(UserRepository $users, SettingsRepositoryInterface $settings, Dispatcher $bus)
    {
        $this->users = $users;
        $this->settings = $settings;
        $this->bus = $bus;
    }

    /**
     * {@inheritdoc}
     */
    public function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);
        $data = $request->getParsedBody();
        $token = Arr::get($data, 'token');
        $isSignUp = Arr::get($data, 'isSignUp', false);

        if (!$token) {
            return new JsonResponse(['error' => 'No token provided'], 400);
        }

        // Verify and decode the token using Supabase
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $supabaseKey = $this->settings->get('supabase.privateKey');

        if (!$supabaseUrl || !$supabaseKey) {
            return new JsonResponse(['error' => 'Supabase is not configured'], 500);
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
            return new JsonResponse(['error' => 'Invalid token'], 401);
        }

        $userData = json_decode($response, true);
        
        // Check if the user exists in our database
        $email = $userData['email'];
        $user = $this->users->findByEmail($email);

        // Create a new user if they don't exist
        if (!$user) {
            if (!$isSignUp && !$this->settings->get('allow_sign_up')) {
                throw new PermissionDeniedException('Sign up is disabled');
            }

            // Generate a username from the email
            $username = explode('@', $email)[0];
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

            // Update user with additional Supabase data if available
            if (isset($userData['user_metadata']) && is_array($userData['user_metadata'])) {
                $user->username = Arr::get($userData['user_metadata'], 'username', $user->username);
                $user->save();
            }
        }

        // Generate and return a Flarum token for the user
        $token = $user->createToken();

        return [
            'token' => $token->token,
            'userId' => $user->id
        ];
    }
}
