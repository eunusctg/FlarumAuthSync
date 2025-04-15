<?php

namespace YourName\SupabaseAuth\Listeners;

use Flarum\Api\Event\Serializing;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Contracts\Events\Dispatcher;

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
     * @param Dispatcher $events
     */
    public function subscribe(Dispatcher $events)
    {
        $events->listen(Serializing::class, [$this, 'addSettings']);
    }

    /**
     * @param Serializing $event
     */
    public function addSettings(Serializing $event)
    {
        if ($event->isSerializer(ForumSerializer::class)) {
            $event->attributes['supabase.publicUrl'] = $this->settings->get('supabase.publicUrl');
            $event->attributes['supabase.publicKey'] = $this->settings->get('supabase.publicKey');
        }
    }
}
