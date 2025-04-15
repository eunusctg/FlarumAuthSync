<?php

namespace Supaflow\SupabaseAuth\Listeners;

use Flarum\Api\Event\Serializing;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Contracts\Events\Dispatcher;

/**
 * Add Supabase settings to the client.
 */
class AddClientSettings
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
     * Subscribe to the events.
     *
     * @param Dispatcher $events
     */
    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Serializing::class, [$this, 'addSettings']);
    }

    /**
     * Add Supabase settings to the client.
     *
     * @param Serializing $event
     */
    public function addSettings(Serializing $event): void
    {
        if ($event->isSerializer(ForumSerializer::class)) {
            $event->attributes['supabase.publicUrl'] = $this->settings->get('supabase.publicUrl');
            $event->attributes['supabase.publicKey'] = $this->settings->get('supabase.publicKey');
            $event->attributes['supabase.enable2FA'] = $this->settings->get('supabase.enable2FA');
            $event->attributes['supabase.require2FA'] = $this->settings->get('supabase.require2FA');
            $event->attributes['supabase.socialProviders'] = $this->settings->get('supabase.socialProviders') ?: '["github"]';
        }
    }
}