<?php

namespace App\Models;

use App\Models\Concerns\HasUuidKey;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuidKey, Notifiable;

    /**
     * An account is a username and a password — nothing else is accepted.
     * "id" is listable so an import can supply the id it already has;
     * otherwise HasUuidKey generates one.
     *
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'username',
        'password_hash',
    ];

    /**
     * The hash never leaves the server.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * Lets the standard guard verify our password_hash column, e.g.
     * Auth::attempt(['username' => $username, 'password' => $password]).
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    /**
     * A user owns many sets.
     */
    public function sets(): HasMany
    {
        return $this->hasMany(Set::class);
    }

    /**
     * Every card inside every set this user owns. Card routes query through
     * this relation, so another account's card id is simply not found.
     */
    public function cards(): HasManyThrough
    {
        return $this->hasManyThrough(Card::class, Set::class);
    }
}
