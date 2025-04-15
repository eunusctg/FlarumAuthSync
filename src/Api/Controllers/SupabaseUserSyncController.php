<?php

namespace Supaflow\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractCreateController;
use Flarum\Http\RequestUtil;
use Flarum\User\User;
use Flarum\User\UserRepository;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;
use Laminas\Diactoros\Response\JsonResponse;
use GuzzleHttp\Client;

class SupabaseUserSyncController extends AbstractCreateController
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
     * @var Client
     */
    protected $httpClient;

    /**
     * @param UserRepository $users
     * @param SettingsRepositoryInterface $settings
     */
    public function __construct(UserRepository $users, SettingsRepositoryInterface $settings)
    {
        $this->users = $users;
        $this->settings = $settings;
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
        
        // Only admins can perform a full sync
        if (!$actor->isAdmin() && Arr::get($request->getParsedBody(), 'fullSync', false)) {
            return new JsonResponse(['error' => 'Only administrators can perform a full sync'], 403);
        }

        // Get user ID to sync (default to current user)
        $userId = Arr::get($request->getParsedBody(), 'userId') ?: $actor->id;
        
        // If syncing another user, must be admin
        if ($userId != $actor->id && !$actor->isAdmin()) {
            return new JsonResponse(['error' => 'Permission denied'], 403);
        }

        $user = $this->users->findOrFail($userId);
        
        // Verify and use Supabase API
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $supabaseKey = $this->settings->get('supabase.privateKey');
        $userToken = Arr::get($request->getParsedBody(), 'userToken');

        if (!$supabaseUrl || !$supabaseKey) {
            return new JsonResponse(['error' => 'Supabase is not configured'], 500);
        }

        try {
            // If doing a one-way sync from Supabase to Flarum
            if (Arr::get($request->getParsedBody(), 'direction', 'fromSupabase') === 'fromSupabase') {
                // Get user data from Supabase
                $response = $this->httpClient->request('GET', $supabaseUrl . '/auth/v1/user', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $userToken,
                        'apikey' => $supabaseKey
                    ]
                ]);

                $supabaseUser = json_decode($response->getBody(), true);
                
                // Update Flarum user with Supabase data
                if (!empty($supabaseUser)) {
                    // Sync basic user data
                    if (isset($supabaseUser['user_metadata']['username'])) {
                        $user->username = $supabaseUser['user_metadata']['username'];
                    }
                    
                    if (isset($supabaseUser['user_metadata']['full_name']) || isset($supabaseUser['user_metadata']['name'])) {
                        $fullName = $supabaseUser['user_metadata']['full_name'] ?? $supabaseUser['user_metadata']['name'];
                        // In a real implementation, we'd store this to a user profile field
                    }
                    
                    // Sync avatar if enabled
                    if ($this->settings->get('supabase.syncAvatar') == '1' && 
                        isset($supabaseUser['user_metadata']['avatar_url'])) {
                        // This would need additional avatar handling code
                        // $user->changeAvatarPath($avatarPath);
                    }
                    
                    $user->save();
                    
                    return [
                        'success' => true,
                        'userId' => $user->id,
                        'message' => 'User data synced from Supabase'
                    ];
                }
                
                return new JsonResponse(['error' => 'No data found in Supabase for this user'], 404);
                
            } else {
                // Sync from Flarum to Supabase
                // This would update Supabase with data from Flarum
                $response = $this->httpClient->request('PUT', $supabaseUrl . '/auth/v1/user', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $userToken,
                        'apikey' => $supabaseKey,
                        'Content-Type' => 'application/json'
                    ],
                    'json' => [
                        'user_metadata' => [
                            'username' => $user->username,
                            'flarum_id' => $user->id,
                            // Add other fields as needed
                        ]
                    ]
                ]);
                
                return [
                    'success' => true,
                    'userId' => $user->id,
                    'message' => 'User data synced to Supabase'
                ];
            }
        } catch (\Exception $e) {
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }
}