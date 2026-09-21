<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A flashcard set. Ownership lives here: cards inherit their owner from the
 * set they belong to, so there is exactly one place it can be wrong.
 */
class Set extends Model
{
    use HasFactory;

    protected $table = 'sets';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['title', 'description'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }
}
