<?php

use App\Http\Controllers\Api\AuthController;
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

/*
|--------------------------------------------------------------------------
| Accounts
|--------------------------------------------------------------------------
*/

// Throttled in AppServiceProvider: register 3/hour per address,
// login 5/minute per username + address.
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});
