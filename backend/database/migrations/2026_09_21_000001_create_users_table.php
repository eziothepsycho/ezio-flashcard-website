<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Accounts are a username and a password — no email, no phone, no profile.
 * The column collation (utf8mb4_unicode_ci) makes the unique index
 * case-insensitive, which is what the website already enforces.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('username', 20)->unique();
            $table->string('password_hash');
            $table->timestamps(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
