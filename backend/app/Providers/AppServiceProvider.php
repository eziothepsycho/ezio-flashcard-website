<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Login: 5 tries a minute per username + address, so one account or one
        // machine cannot grind through passwords.
        RateLimiter::for('login', function (Request $request) {
            $username = Str::lower((string) $request->input('username'));

            return Limit::perMinute(5)
                ->by($username.'|'.$request->ip())
                ->response(fn (Request $request, array $headers) => response()->json([
                    'error' => [
                        'code' => 'too_many_attempts',
                        'message' => 'Too many login attempts. Please wait a minute and try again.',
                    ],
                ], 429, $headers));
        });

        // Registrations: 3 an hour per address. During development the counters
        // live in the cache, so "php artisan cache:clear" resets them.
        RateLimiter::for('register', function (Request $request) {
            return Limit::perHour(3)
                ->by($request->ip())
                ->response(fn (Request $request, array $headers) => response()->json([
                    'error' => [
                        'code' => 'too_many_attempts',
                        'message' => 'Too many accounts created from here. Please try again later.',
                    ],
                ], 429, $headers));
        });
    }
}
