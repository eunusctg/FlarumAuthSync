<?php

namespace Supaflow\SupabaseAuth\Listeners;

use Flarum\User\Event\AvatarChanged;
use Flarum\Settings\SettingsRepositoryInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Support\Arr;

/**
 * Sync user avatar with Supabase.
 */
class SyncUserAvatarWithSupabase
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
     * @var FilesystemFactory
     */
    protected $filesystem;

    /**
     * @param SettingsRepositoryInterface $settings
     * @param FilesystemFactory $filesystem
     */
    public function __construct(SettingsRepositoryInterface $settings, FilesystemFactory $filesystem)
    {
        $this->settings = $settings;
        $this->client = new Client();
        $this->filesystem = $filesystem;
    }

    /**
     * Subscribe to the events.
     *
     * @param Dispatcher $events
     */
    public function subscribe(Dispatcher $events): void
    {
        $events->listen(AvatarChanged::class, [$this, 'whenAvatarChanged']);
    }

    /**
     * Handle the AvatarChanged event.
     *
     * @param AvatarChanged $event
     */
    public function whenAvatarChanged(AvatarChanged $event): void
    {
        $user = $event->user;
        
        // Only sync if the user is a Supabase user and sync is enabled
        if ($user->getAttribute('isSupabaseUser') && 
            $this->settings->get('supabase.syncAvatar') === '1') {
            
            // Get the avatar file
            if ($user->avatar_url) {
                // If the avatar is just a URL (from another source), update the metadata in Supabase
                $this->updateSupabaseAvatarUrl($user, $user->avatar_url);
            } else if ($user->avatar_path) {
                // If we have a local avatar, upload it to Supabase storage
                $this->uploadAvatarToSupabase($user);
            }
        }
    }

    /**
     * Update the user's avatar URL in Supabase metadata.
     *
     * @param \Flarum\User\User $user
     * @param string $avatarUrl
     * @return bool
     */
    protected function updateSupabaseAvatarUrl($user, string $avatarUrl): bool
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
            
            // Update with the new avatar URL
            $updatedMetadata = array_merge($existingMetadata, [
                'avatar_url' => $avatarUrl
            ]);
            
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
            
            if ($response->getStatusCode() === 200) {
                // Update the local metadata store
                $user->setAttribute('supabaseMetadata', json_encode($updatedMetadata));
                $user->save();
                return true;
            }
            
            return false;
        } catch (GuzzleException $e) {
            // Log error
            error_log("Error updating Supabase avatar URL: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Upload the user's avatar to Supabase storage.
     *
     * @param \Flarum\User\User $user
     * @return bool
     */
    protected function uploadAvatarToSupabase($user): bool
    {
        $supabaseUrl = $this->settings->get('supabase.publicUrl');
        $privateKey = $this->settings->get('supabase.privateKey');
        $avatarBucket = $this->settings->get('supabase.avatarBucket') ?: 'avatars';
        
        if (!$supabaseUrl || !$privateKey || !$user->avatar_path) {
            return false;
        }
        
        try {
            // Get the avatar file
            $avatarPath = $user->avatar_path;
            $avatarContents = $this->filesystem->disk('flarum-avatars')->get($avatarPath);
            
            if (!$avatarContents) {
                return false;
            }
            
            // Extract Supabase ID from the stored identifier
            $supabaseId = $user->getAttribute('supabase_id');
            if (!$supabaseId) {
                return false;
            }
            
            if (strpos($supabaseId, 'supabase_') === 0) {
                $supabaseId = substr($supabaseId, 9);
            }
            
            // Determine file extension
            $extension = pathinfo($avatarPath, PATHINFO_EXTENSION) ?: 'jpg';
            
            // Upload to Supabase Storage
            $filePath = "{$supabaseId}/avatar.{$extension}";
            $response = $this->client->post("{$supabaseUrl}/storage/v1/object/{$avatarBucket}/{$filePath}", [
                'headers' => [
                    'Authorization' => "Bearer {$privateKey}",
                    'apikey' => $privateKey,
                    'Content-Type' => $this->getContentType($extension)
                ],
                'body' => $avatarContents
            ]);
            
            if ($response->getStatusCode() === 200) {
                // Get the public URL of the avatar
                $avatarUrl = "{$supabaseUrl}/storage/v1/object/public/{$avatarBucket}/{$filePath}";
                
                // Update the user's metadata with the new avatar URL
                return $this->updateSupabaseAvatarUrl($user, $avatarUrl);
            }
            
            return false;
        } catch (GuzzleException $e) {
            // Log error
            error_log("Error uploading avatar to Supabase: " . $e->getMessage());
            return false;
        } catch (\Exception $e) {
            // Log error
            error_log("Error processing avatar: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get content type based on file extension.
     *
     * @param string $extension
     * @return string
     */
    protected function getContentType(string $extension): string
    {
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp'
        ];
        
        return $contentTypes[strtolower($extension)] ?? 'application/octet-stream';
    }
}