<?php

namespace App\Models;

use App\Models\Concerns\HasUuidKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single flashcard. There is no user_id column — a card belongs to the
 * account that owns its set. learning_status stays null until Study Mode
 * grades it ("known" or "learning").
 */
class Card extends Model
{
    use HasFactory, HasUuidKey;

    protected $table = 'cards';

    protected $fillable = ['id', 'term', 'definition', 'learning_status'];

    public function set(): BelongsTo
    {
        return $this->belongsTo(Set::class);
    }
}
