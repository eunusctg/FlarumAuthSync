<?php

namespace ForumEZ\SupabaseAuth\Access;

use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

/**
 * Policy for Supabase users.
 */
class UserPolicy extends AbstractPolicy
{
    /**
     * @param User $actor
     * @param string $ability
     * @return bool|null
     */
    public function can(User $actor, $ability)
    {
        // Allow users to edit their own Supabase settings
        if ($ability === 'supabase.manage' && $actor->id === $this->user->id) {
            return $this->allow();
        }
        
        // Admin can manage Supabase auth settings
        if ($ability === 'supabase.admin' && $actor->isAdmin()) {
            return $this->allow();
        }
        
        return null;
    }
}