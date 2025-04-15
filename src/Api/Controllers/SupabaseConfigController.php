<?php

namespace YourName\SupabaseAuth\Api\Controllers;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class SupabaseConfigController extends AbstractShowController
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @param SettingsRepositoryInterface $settings
     */
    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    /**
     * {@inheritdoc}
     */
    public function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);

        // Only return the public values needed for the frontend
        return [
            'publicUrl' => $this->settings->get('supabase.publicUrl'),
            'publicKey' => $this->settings->get('supabase.publicKey'),
            'syncAvatar' => (bool) $this->settings->get('supabase.syncAvatar')
        ];
    }
}
