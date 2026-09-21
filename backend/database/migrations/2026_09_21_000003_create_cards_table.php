<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A card belongs to a set; its owner is the set's owner, so there is no
 * user_id column here. learning_status stays null until the card has been
 * graded in Study Mode ("known" or "learning"), exactly as in the browser.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('set_id')->constrained('sets')->cascadeOnDelete();
            $table->text('term');
            $table->text('definition');
            $table->enum('learning_status', ['known', 'learning'])->nullable();
            $table->timestamps(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
