<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;

/**
 * Amazon-style go-live gate: a vendor whose application is not yet approved
 * may hold a token (registration/resume issue one) but cannot use any
 * selling endpoint until an admin approves. Alias: 'approved'.
 */
class ApprovedMiddleware {
    public function handle(Request $request, Closure $next) {
        $user = $request->user();
        // Resolve the role-specific profile: vendor, school or coaching institute.
        $profile = $user?->vendor ?? $user?->school ?? $user?->coachingInstitute;
        if (!$profile || !$profile->isApproved()) {
            return response()->json([
                'message' => 'Your application is not approved yet',
                'code' => 'onboarding_' . ($profile->onboarding_status ?? 'draft'),
            ], 403);
        }
        return $next($request);
    }
}