<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
|
| Everything the website and the mobile app talk to. The contract lives in
| docs/api.md; accounts, sets and cards are added in the next phases.
|
*/

// Liveness check: proves the API boots and can reach the database.
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $database = 'connected';
    } catch (Throwable $e) {
        $database = 'unreachable';
    }

    return response()->json([
        'status' => 'ok',
        'database' => $database,
        'time' => now()->toIso8601String(),
    ]);
});
