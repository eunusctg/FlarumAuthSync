<?php

namespace ForumEZ\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Command\EditUser;
use Flarum\User\UserRepository;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Controller to handle user synchronization between Flarum and Supabase.
 */
class SupabaseUserSyncController extends AbstractShowController
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
        $actor = RequestUtil::getActor($request);
        $body = $request->getParsedBody();
        $action = Arr::get($body, 'action', 'sync');
        
        // Only admins can use this endpoint
        if (!$actor->isAdmin()) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '403',
                        'code' => 'permission_denied',
                        'title' => 'Permission Denied',
                        'detail' => 'You do not have permission to access this endpoint.'
                    ]
                ]
            ], 403);
        }
        
        // Perform action based on request
        switch ($action) {
            case 'sync-all':
                return $this->syncAllUsers();
            case 'sync-user':
                $userId = Arr::get($body, 'userId');
                return $this->syncSpecificUser($userId);
            default:
                return [
                    'success' => false,
                    'message' => 'Unknown action: ' . $action
                ];
        }
    }

    /**
     * Sync all Supabase users with Flarum.
     *
     * @return array
     */
    protected function syncAllUsers(): array
    {
        // Get all Supabase users
        try {
            $supabaseUsers = $this->fetchSupabaseUsers();
            
            if (empty($supabaseUsers)) {
                return [
                    'success' => false,
                    'message' => 'No users found in Supabase'
                ];
            }
            
            $syncCount = 0;
            $errorCount = 0;
            
            // Go through each user and sync them
            foreach ($supabaseUsers as $supabaseUser) {
                $result = $this->syncUserFromSupabase($supabaseUser);
                if ($result) {
                    $syncCount++;
                } else {
                    $errorCount++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Sync completed. Synced {$syncCount} users. Failed: {$errorCount}.",
                'sync_count' => $syncCount,
                'error_count' => $errorCount
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error syncing users: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Sync a specific user from Supabase.
     *
     * @param string $userId Flarum user ID
     * @return array
     */
    protected function syncSpecificUser(string $userId): array
    {
        if (!$userId) {
            return [
                'success' => false,
                'message' => 'No user ID provided'
            ];
        }
        
        // Find the user in Flarum
        $user = $this->users->findOrFail($userId);
        
        // Check if user has Supabase ID
        $supabaseId = $user->getAttribute('supabase_id');
        if (!$supabaseId) {
            return [
                'success' => false,
                'message' => 'User is not a Supabase user'
            ];
        }
        
        // Extract actual ID if needed
        if (strpos($supabaseId, 'supabase_') === 0) {
            $supabaseId = substr($supabaseId, 9);
        }
        
        try {
            // Get user data from Supabase
            $supabaseUser = $this->fetchSupabaseUser($supabaseId);
            
            if (!$supabaseUser) {
                return [
                    'success' => false,
                    'message' => 'User not found in Supabase'
                ];
            }
            
            // Sync the user
            $success = $this->syncUserFromSupabase($supabaseUser, $user);
            
            return [
                'success' => $success,
                'message' => $success ? 'User synced successfully' : 'Failed to sync user'
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error syncing user: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Fetch users from Supabase.
     *
     * @return array
     */
    protected function fetchSupabaseUsers(): array
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $privateKey = $this->settings->get('supabase.privateKey');
        
        if (!$supabaseUrl || !$privateKey) {
            throw new \Exception('Supabase credentials not configured');
        }
        
        $response = $this->client->get("{$supabaseUrl}/auth/v1/admin/users", [
            'headers' => [
                'Authorization' => "Bearer {$privateKey}",
                'apikey' => $privateKey
            ]
        ]);
        
        return json_decode($response->getBody(), true) ?: [];
    }

    /**
     * Fetch a specific user from Supabase.
     *
     * @param string $supabaseId
     * @return array|null
     */
    protected function fetchSupabaseUser(string $supabaseId): ?array
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $privateKey = $this->settings->get('supabase.privateKey');
        
        if (!$supabaseUrl || !$privateKey) {
            throw new \Exception('Supabase credentials not configured');
        }
        
        try {
            $response = $this->client->get("{$supabaseUrl}/auth/v1/admin/users/{$supabaseId}", [
                'headers' => [
                    'Authorization' => "Bearer {$privateKey}",
                    'apikey' => $privateKey
                ]
            ]);
            
            return json_decode($response->getBody(), true) ?: null;
        } catch (GuzzleException $e) {
            // User not found or other error
            return null;
        }
    }

    /**
     * Sync a user from Supabase data.
     *
     * @param array $supabaseUser Supabase user data
     * @param User|null $user Existing Flarum user or null to find/create one
     * @return bool Success or failure
     */
    protected function syncUserFromSupabase(array $supabaseUser, $user = null): bool
    {
        // If we don't have a user, try to find one by Supabase ID
        if (!$user) {
            $supabaseIdentifier = 'supabase_' . $supabaseUser['id'];
            $user = $this->users->findWhere(['supabase_id' => $supabaseIdentifier])->first();
            
            // If no user found, nothing to sync
            if (!$user) {
                return false;
            }
        }
        
        // Prepare data for synchronization
        $data = [
            'attributes' => [
                'supabaseMetadata' => json_encode($supabaseUser['user_metadata'] ?? [])
            ]
        ];
        
        // Add email if it has changed
        $email = $supabaseUser['email'] ?? null;
        if ($email && $email !== $user->email) {
            $data['attributes']['email'] = $email;
            $data['attributes']['isEmailConfirmed'] = true;
        }
        
        // Add avatar URL if available and sync is enabled
        if ($this->settings->get('supabase.syncAvatar') === '1') {
            $avatarUrl = $supabaseUser['user_metadata']['avatar_url'] ?? null;
            if ($avatarUrl && $avatarUrl !== $user->getAttribute('avatarUrl')) {
                $data['attributes']['avatarUrl'] = $avatarUrl;
            }
        }
        
        try {
            // Update the user
            $this->bus->dispatch(
                new EditUser($user->id, $user, $data)
            );
            
            return true;
        } catch (\Exception $e) {
            // Log error
            error_log("Error syncing user {$user->id}: " . $e->getMessage());
            return false;
        }
    }
}