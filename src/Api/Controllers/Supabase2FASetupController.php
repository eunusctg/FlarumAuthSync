<?php

namespace EunusCTG\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;
use Flarum\User\UserRepository;
use Illuminate\Support\Arr;
use OTPHP\TOTP;
use ParagonIE\ConstantTime\Base32;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * Controller to handle 2FA setup.
 */
class Supabase2FASetupController extends AbstractShowController
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
     * @param SettingsRepositoryInterface $settings
     * @param UserRepository $users
     */
    public function __construct(SettingsRepositoryInterface $settings, UserRepository $users)
    {
        $this->settings = $settings;
        $this->users = $users;
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
                        'detail' => 'You must be logged in to set up two-factor authentication.'
                    ]
                ]
            ], 401);
        }

        // Generate a new TOTP secret
        $secret = $this->generateSecretKey();
        
        // Create the TOTP object
        $totp = TOTP::create($secret);
        $totp->setLabel($actor->username);
        $totp->setIssuer($this->settings->get('forum_title', 'Flarum'));

        // Generate a QR code
        $qrCode = $this->generateQrCode($totp->getProvisioningUri());

        // Generate a unique ID for this setup attempt
        $factorId = bin2hex(random_bytes(16));

        // Store the temporary setup data in the user's session
        $session = $request->getAttribute('session');
        $session->put('2fa_setup', [
            'secret' => $secret,
            'factor_id' => $factorId,
            'created_at' => time(),
        ]);

        return [
            'secret' => $secret,
            'qrCode' => $qrCode,
            'factorId' => $factorId,
        ];
    }

    /**
     * Generate a secure secret key for TOTP.
     *
     * @param int $length
     * @return string
     */
    protected function generateSecretKey(int $length = 32): string
    {
        $secret = random_bytes($length);
        return Base32::encodeUpper($secret);
    }

    /**
     * Generate a QR code for the TOTP URI.
     *
     * @param string $provisioningUri
     * @return string
     */
    protected function generateQrCode(string $provisioningUri): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        
        $writer = new Writer($renderer);
        
        // Generate SVG QR code
        $svg = $writer->writeString($provisioningUri);
        
        // Convert to data URI
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}