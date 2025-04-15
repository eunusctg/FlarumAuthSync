<?php

namespace EunusCTG\SupabaseAuth\Api\Controllers;

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
 * Controller to handle Supabase social login operations.
 */
class SupabaseSocialLoginController extends AbstractShowController
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
        $action = Arr::get($body, 'action', 'connect');
        
        // Handle disconnecting a provider
        if ($action === 'disconnect') {
            return $this->disconnectProvider($actor, $body);
        }
        
        // Get available providers from settings
        $availableProviders = json_decode($this->settings->get('supabase.socialProviders') ?: '["github"]', true);
        
        // Filter to only enabled providers
        return [
            'providers' => $availableProviders,
            'connected' => $this->getConnectedProviders($actor)
        ];
    }

    /**
     * Get connected social providers for a user.
     *
     * @param User $user
     * @return array
     */
    protected function getConnectedProviders($user): array
    {
        if (!$user || $user->isGuest() || !$user->getAttribute('isSupabaseUser')) {
            return [];
        }
        
        $metadata = $user->getAttribute('supabaseMetadata');
        if (!$metadata) {
            return [];
        }
        
        $decodedMetadata = json_decode($metadata, true);
        return $decodedMetadata['providers'] ?? [];
    }

    /**
     * Disconnect a social provider from a user.
     *
     * @param User $user
     * @param array $data
     * @return array
     */
    protected function disconnectProvider($user, array $data): array
    {
        if (!$user || $user->isGuest()) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '401',
                        'code' => 'unauthorized',
                        'title' => 'Unauthorized',
                        'detail' => 'You must be logged in to disconnect a provider.'
                    ]
                ]
            ], 401);
        }
        
        $provider = Arr::get($data, 'provider');
        
        if (!$provider) {
            return new JsonResponse([
                'errors' => [
                    [
                        'status' => '400',
                        'code' => 'missing_provider',
                        'title' => 'Missing Provider',
                        'detail' => 'No provider specified to disconnect.'
                    ]
                ]
            ], 400);
        }
        
        // Get current metadata
        $metadata = $user->getAttribute('supabaseMetadata');
        $decodedMetadata = $metadata ? json_decode($metadata, true) : [];
        
        // Get current providers
        $providers = $decodedMetadata['providers'] ?? [];
        
        // If the provider is not connected, nothing to do
        if (!in_array($provider, $providers)) {
            return [
                'success' => false,
                'message' => 'This provider is not connected to your account.'
            ];
        }
        
        // Remove the provider
        $providers = array_filter($providers, function($p) use ($provider) {
            return $p !== $provider;
        });
        
        // Update the metadata
        $decodedMetadata['providers'] = array_values($providers);
        
        try {
            // Update user metadata in Supabase
            $this->updateSupabaseMetadata($user, $decodedMetadata);
            
            // Update local user metadata
            $this->bus->dispatch(
                new EditUser($user->id, $user, [
                    'attributes' => [
                        'supabaseMetadata' => json_encode($decodedMetadata)
                    ]
                ])
            );
            
            return [
                'success' => true,
                'message' => "Successfully disconnected {$provider} from your account.",
                'providers' => array_values($providers)
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to disconnect provider: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update metadata in Supabase.
     *
     * @param User $user
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
            
            // Update user metadata in Supabase
            $response = $this->client->put("{$supabaseUrl}/auth/v1/admin/users/{$supabaseId}", [
                'headers' => [
                    'Authorization' => "Bearer {$privateKey}",
                    'apikey' => $privateKey,
                    'Content-Type' => 'application/json'
                ],
                'json' => [
                    'user_metadata' => $metadata
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