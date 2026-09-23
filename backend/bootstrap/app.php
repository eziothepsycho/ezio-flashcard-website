<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // This API has no login page and no web routes (see routes/web.php), but the
        // framework's default guest redirect calls route('login') — a route this
        // project has never had. A browser or curl request without
        // `Accept: application/json` therefore threw RouteNotFoundException from the
        // auth middleware and answered 500 instead of the documented 401.
        //
        // The target below only ever applies to a guest on a non-API route (there are
        // none today). Everything under /api answers the JSON envelope registered
        // further down, so API clients get a 401 and never a redirect, whatever
        // Accept header they send.
        $middleware->redirectGuestsTo('/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Everything under /api answers in one envelope, so the website and the
        // mobile app can parse a single shape:
        //   { "error": { "code": "...", "message": "...", "fields": { ... } } }
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'validation_failed',
                    'message' => 'Please check the highlighted fields.',
                    'fields' => collect($e->errors())
                        ->map(fn (array $messages) => $messages[0])
                        ->all(),
                ],
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'unauthenticated',
                    'message' => 'You are not signed in.',
                ],
            ], 401);
        });

        $exceptions->render(function (TooManyRequestsHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'too_many_attempts',
                    'message' => 'Too many attempts. Please try again later.',
                ],
            ], 429, $e->getHeaders());
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'not_found',
                    'message' => 'Not found.',
                ],
            ], 404);
        });
    })->create();
