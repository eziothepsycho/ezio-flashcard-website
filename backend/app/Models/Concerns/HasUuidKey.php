<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * UUID primary keys — the same kind of id the browser already uses
 * (crypto.randomUUID), so no ids have to be rewritten when data moves between
 * the website, the API and the mobile app.
 *
 * Used by User, Set and Card. A model may still supply its own id, because
 * "id" is mass assignable (the Phase 8 import does exactly that); if it does
 * not, one is generated here.
 */
trait HasUuidKey
{
    public function initializeHasUuidKey(): void
    {
        $this->keyType = 'string';
        $this->incrementing = false;
    }

    public static function bootHasUuidKey(): void
    {
        static::creating(function (self $model): void {
            $model->id ??= (string) Str::uuid();
        });
    }
}
