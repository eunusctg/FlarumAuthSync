<?php

namespace Supaflow\SupabaseAuth\Listeners;

use Flarum\User\Event\Saving;
use Flarum\Settings\SettingsRepositoryInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Support\Arr;

/**
 * Sync user data with Supabase.
 */
class SyncUserWithSupabase
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @var Client
     */
    protected $client;

    /**
     * @param SettingsRepositoryInterface $settings
     */
    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
        $this->client = new Client();
    }

    /**
     * Subscribe to the events.
     *
     * @param Dispatcher $events
     */
    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Saving::class, [$this, 'whenUserIsSaving']);
    }

    /**
     * Handle the Saving event.
     *
     * @param Saving $event
     */
    public function whenUserIsSaving(Saving $event): void
    {
        $user = $event->user;
        
        // Only sync if the user is a Supabase user and sync is enabled
        if ($user->exists && 
            $user->getAttribute('isSupabaseUser') && 
            $this->settings->get('supabase.syncUserMetadata') === '1') {
            
            $data = $event->data;
            $actor = $event->actor;
            
            // Get the changed attributes
            $attributes = Arr::get($data, 'attributes', []);
            
            // If email has changed, update it in Supabase
            if (isset($attributes['email']) && $attributes['email'] !== $user->email) {
                $this->updateSupabaseEmail($user, $attributes['email']);
            }
            
            // If username has changed, update it in Supabase metadata
            if (isset($attributes['username']) && $attributes['username'] !== $user->username) {
                $this->updateSupabaseMetadata($user, [
                    'username' => $attributes['username']
                ]);
            }
        }
    }

    /**
     * Update the user's email in Supabase.
     *
     * @param \Flarum\User\User $user
     * @param string $newEmail
     * @return bool
     */
    protected function updateSupabaseEmail($user, string $newEmail): bool
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $privateKey = $this->settings->get('supabase.privateKey');
        
        if (!$supabaseUrl || !$privateKey) {
            return false;
        }
        
        try {
            // Extract Supabase ID from the stored identifier
            $supabaseId = $user->getAttribute('supabase_id');
            if (!$supabaseId) {
                return false;
            }
            
            if (strpos($supabaseId, 'supabase_') === 0) {
                $supabaseId = substr($supabaseId, 9);
            }
            
            // Update user email in Supabase
            $response = $this->client->put("{$supabaseUrl}/auth/v1/admin/users/{$supabaseId}", [
                'headers' => [
                    'Authorization' => "Bearer {$privateKey}",
                    'apikey' => $privateKey,
                    'Content-Type' => 'application/json'
                ],
                'json' => [
                    'email' => $newEmail,
                    'email_confirm' => true
                ]
            ]);
            
            return $response->getStatusCode() === 200;
        } catch (GuzzleException $e) {
            // Log error
            error_log("Error updating Supabase email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update the user's metadata in Supabase.
     *
     * @param \Flarum\User\User $user
     * @param array $metadata
     * @return bool
     */
    protected function updateSupabaseMetadata($user, array $metadata): bool
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $privateKey = $this->settings->get('supabase.privateKey');
        
        if (!$supabaseUrl || !$privateKey) {
            return false;
        }
        
        try {
            // Extract Supabase ID from the stored identifier
            $supabaseId = $user->getAttribute('supabase_id');
            if (!$supabaseId) {
                return false;
            }
            
            if (strpos($supabaseId, 'supabase_') === 0) {
                $supabaseId = substr($supabaseId, 9);
            }
            
            // Get existing metadata
            $existingMetadata = [];
            $supabaseMetadata = $user->getAttribute('supabaseMetadata');
            if ($supabaseMetadata) {
                $existingMetadata = json_decode($supabaseMetadata, true) ?: [];
            }
            
            // Merge with new metadata
            $updatedMetadata = array_merge($existingMetadata, $metadata);
            
            // Update user metadata in Supabase
            $response = $this->client->put("{$supabaseUrl}/auth/v1/admin/users/{$supabaseId}", [
                'headers' => [
                    'Authorization' => "Bearer {$privateKey}",
                    'apikey' => $privateKey,
                    'Content-Type' => 'application/json'
                ],
                'json' => [
                    'user_metadata' => $updatedMetadata
                ]
            ]);
            
            return $response->getStatusCode() === 200;
        } catch (GuzzleException $e) {
            // Log error
            error_log("Error updating Supabase metadata: " . $e->getMessage());
            return false;
        }
    }
}