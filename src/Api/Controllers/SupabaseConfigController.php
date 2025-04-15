<?php

namespace EunusCTG\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Controller to handle Supabase configuration and testing.
 */
class SupabaseConfigController extends AbstractShowController
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
     * Get the data to be serialized and returned with the response.
     *
     * @param ServerRequestInterface $request
     * @param array $data
     * @return array
     */
    protected function data(ServerRequestInterface $request, array $data)
    {
        $actor = RequestUtil::getActor($request);
        
        // Only admins can access this endpoint
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
        
        $body = $request->getParsedBody();
        $action = Arr::get($body, 'action', 'get');
        
        if ($action === 'test') {
            return $this->testConnection($body);
        }
        
        // Default action: get configuration
        return [
            'publicUrl' => $this->settings->get('supabase.publicUrl'),
            'publicKey' => $this->settings->get('supabase.publicKey'),
            'enable2FA' => $this->settings->get('supabase.enable2FA'),
            'require2FA' => $this->settings->get('supabase.require2FA'),
            'syncAvatar' => $this->settings->get('supabase.syncAvatar'),
            'syncUserMetadata' => $this->settings->get('supabase.syncUserMetadata'),
            'socialProviders' => $this->settings->get('supabase.socialProviders') ?: '["github"]',
            'avatarBucket' => $this->settings->get('supabase.avatarBucket') ?: 'avatars',
        ];
    }

    /**
     * Test the Supabase connection.
     *
     * @param array $data
     * @return array
     */
    protected function testConnection(array $data): array
    {
        $url = Arr::get($data, 'url');
        $publicKey = Arr::get($data, 'publicKey');
        $privateKey = Arr::get($data, 'privateKey');
        
        if (!$url || !$publicKey || !$privateKey) {
            return [
                'success' => false,
                'message' => 'Missing required parameters. Please provide URL, public key and private key.'
            ];
        }
        
        try {
            // Test public API access
            $publicResponse = $this->client->get("{$url}/rest/v1/?apikey={$publicKey}", [
                'headers' => [
                    'apikey' => $publicKey,
                    'Authorization' => "Bearer {$publicKey}"
                ]
            ]);
            
            // Test authentication API access
            $authResponse = $this->client->get("{$url}/auth/v1/settings", [
                'headers' => [
                    'apikey' => $privateKey,
                    'Authorization' => "Bearer {$privateKey}"
                ]
            ]);
            
            // If we get this far without exceptions, the connection is successful
            return [
                'success' => true,
                'message' => 'Connection successful!',
                'settings' => json_decode($authResponse->getBody(), true)
            ];
        } catch (GuzzleException $e) {
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
                'error' => [
                    'code' => $e->getCode(),
                    'message' => $e->getMessage()
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'error' => [
                    'code' => $e->getCode(),
                    'message' => $e->getMessage()
                ]
            ];
        }
    }
}