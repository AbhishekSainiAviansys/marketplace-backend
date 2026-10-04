<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // NOTE: statefulApi() was removed on purpose.
        //
        // It injected Sanctum's EnsureFrontendRequestsAreStateful into the `api`
        // group. That middleware treats a request as "stateful" when its
        // Origin/Referer matches SANCTUM_STATEFUL_DOMAINS (which lists the three
        // dev ports), and then injects VerifyCsrfToken - so every browser login
        // POST /api/v1/auth/login failed with 419 "CSRF token mismatch". Curl
        // appeared to work because it sends no Origin header.
        //
        // All three panels authenticate with a Sanctum personal access token
        // (Authorization: Bearer ...), which is unaffected by CSRF. The API is
        // therefore a pure token API and needs no cookie/session middleware.

        // This app is API-only and has no `login` route. Without this, an
        // unauthenticated api/* call makes Authenticate ask for a guest
        // redirect, and Laravel's handler falls back to route('login') ->
        // "Route [login] not defined" -> HTTP 500 instead of a 401.
        // Passing null makes redirectTo() return null, which the exception
        // renderer then answers as a JSON 401.
        $middleware->redirectGuestsTo(null);

        // Route-level role guard used in routes/api.php: middleware('role:admin')
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // This app is API-only: there is no `login` route. Laravel's
        // Authenticate middleware builds a redirect to route('login') when an
        // unauthenticated request arrives, which threw
        // "Route [login] not defined" -> HTTP 500 on every guarded endpoint.
        // Return a proper 401 so the axios interceptor in each panel can see
        // the real status, drop the stale session and bounce to /login.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })->create();
