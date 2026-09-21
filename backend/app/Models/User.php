<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Ids are UUIDs supplied by the API, not auto-incrementing integers.
     */
    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * An account is a username and a password — nothing else is accepted.
     *
     * @var list<string>
     */
    protected $fillable = [
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
}
