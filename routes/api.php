<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\CommonController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\VendorOnboardingController;
use App\Http\Controllers\SchoolOnboardingController;
use App\Http\Controllers\CoachingController;
use App\Http\Controllers\CoachingKeywordController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\EnquiryController;

Route::get('health', fn()=>response()->json(['ok'=>true,'service'=>'marketplace-api']));

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    // Pending seller applications resume the /sell wizard here (login is
    // locked until admin approval, so they can't use the normal auth flow).
    Route::post('onboarding/resume', [VendorOnboardingController::class, 'resume']);
    Route::post('auth/otp/send', [AuthController::class, 'otpSend']);
    Route::post('auth/otp/verify', [AuthController::class, 'otpVerify']);
    Route::get('locations/countries', [LocationController::class, 'countries']);
    Route::get('locations/states', [LocationController::class, 'states']);
    Route::get('locations/districts', [LocationController::class, 'districts']);
    Route::get('locations/areas', [LocationController::class, 'areas']);
    Route::get('locations/phonecodes', [LocationController::class, 'phonecodes']);
    Route::get('locations/schools', [LocationController::class, 'schools']);
    Route::get('settings/public', [SettingController::class, 'public']);
    Route::post('payments/webhook', [PaymentWebhookController::class, 'razorpay']);

    // Public storefront catalogue. The student shop paginates this while the
    // user scrolls and must work logged-out (anonymous visitors previously got
    // a 401 which tripped the shared interceptor's redirect-to-login). Only
    // is_active rows ever leave this endpoint.
    Route::get('products', [CommonController::class, 'products']);

    // Public institution directory (country / state / district / type filters).
    // Deliberately unauthenticated - students browse it logged-out, same as the
    // catalogue, so no 401 -> redirect-to-login interceptor trips.
    // Default (no filters): random 10 school + 10 institute + 10 tutor sample;
    // any filter: full newest-first list. `total` is always the full count.
    Route::get('directory', [DirectoryController::class, 'index']);
    // Labels BEFORE the {kind}/{id} detail route — otherwise `labels` is
    // captured as a kind and 404s on the kind constraint.
    Route::get('directory/labels', [DirectoryController::class, 'labels']);
    Route::get('directory/{kind}/{id}', [DirectoryController::class, 'show'])
        ->where(['kind' => 'school|coaching', 'id' => '[0-9]+']);
    // One-click local seed for the first private_tutor row
    // (institute_type=private_tutor -> tutor[] group, instant-approved).
    Route::post('directory/seed-tutor', [DirectoryController::class, 'seedTutor']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::get('categories', [CommonController::class, 'categories']);
        Route::get('categories/{id}/fields', [CommonController::class, 'fields']);
        Route::post('upload/image', [CommonController::class, 'upload']);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/test', [NotificationController::class, 'test']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);

        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard']);
            // Stats BEFORE apiResource — otherwise GET vendors/stats is captured
            // by the vendors/{id} show route and 404s on a non-numeric id.
            Route::get('vendors/stats', [AdminController::class, 'vendorStats']);
            Route::get('schools/stats', [AdminController::class, 'schoolStats']);
            Route::apiResource('vendors', AdminController::class);
            // Amazon-style review: approve / reject with notes -> notifies vendor.
            Route::post('vendors/{id}/review', [AdminController::class, 'review']);
            Route::post('schools/{id}/review', [AdminController::class, 'schoolReview']);
            Route::get('schools/{school}', [AdminController::class, 'schoolShow'])->where('school','[0-9]+');
            Route::get('schools', [AdminController::class, 'schoolIndex']);
            Route::post('schools', [AdminController::class, 'schoolStore']);
            Route::put('schools/{id}', [AdminController::class, 'schoolUpdate']);
            Route::delete('schools/{id}', [AdminController::class, 'schoolDestroy']);
            Route::post('school-vendor-assign', [AdminController::class, 'assign']);
            Route::get('categories', [AdminController::class, 'catIndex']);
            Route::post('categories', [AdminController::class, 'catStore']);
            Route::put('categories/{id}', [AdminController::class, 'catUpdate']);
            Route::delete('categories/{id}', [AdminController::class, 'catDestroy']);
            Route::post('category-fields', [AdminController::class, 'fieldStore']);
            Route::put('category-fields/{id}', [AdminController::class, 'fieldUpdate']);
            Route::delete('category-fields/{id}', [AdminController::class, 'fieldDestroy']);
            Route::get('products', [AdminController::class, 'productIndex']);
            Route::post('products', [AdminController::class, 'productStore']);
            Route::put('products/{id}', [AdminController::class, 'productUpdate']);
            Route::get('settings', [SettingController::class, 'index']);
            Route::put('settings', [SettingController::class, 'update']);
            Route::post('settings/test-mail', [SettingController::class, 'testMail']);
            Route::post('notify', [AdminController::class, 'notify']);
        });
        Route::prefix('vendor')->middleware('role:vendor')->group(function () {
            // Onboarding endpoints stay reachable pre-approval (the wizard and
            // resume flow need them); everything that sells gets 'approved'.
            Route::get('onboarding', [VendorOnboardingController::class, 'show']);
            Route::put('onboarding', [VendorOnboardingController::class, 'save']);
            Route::post('onboarding/submit', [VendorOnboardingController::class, 'submit']);
            Route::middleware('approved')->group(function () {
                Route::get('dashboard', [VendorController::class, 'dashboard']);
                Route::get('products', [VendorController::class, 'index']);
                Route::post('products', [VendorController::class, 'store']);
                Route::put('products/{id}', [VendorController::class, 'update']);
                Route::delete('products/{id}', [VendorController::class, 'destroy']);
                Route::get('schools', [VendorController::class, 'schools']);
                Route::get('royalties', [VendorController::class, 'royalties']);
            });
        });
        // Coaching institute panel (/coaching): instant activation, so the
        // profile endpoints only need the role + the (always-true) approval gate.
        Route::prefix('coaching')->middleware(['role:coaching', 'approved'])->group(function () {
            Route::get('dashboard-analytics', [CoachingController::class, 'dashboardAnalytics']);
            // Insights: full drill-down behind the dashboard's clickable panels.
            Route::get('insights/summary', [CoachingController::class, 'insightsSummary']);
            Route::get('insights/views', [CoachingController::class, 'insightsViews']);
            Route::get('enquiries', [CoachingController::class, 'enquiries']);
            Route::get('profile', [CoachingController::class, 'profile']);
            Route::put('profile', [CoachingController::class, 'update']);
            Route::get('details', [CoachingController::class, 'details']);
            Route::put('details', [CoachingController::class, 'updateDetails']);
            // Per-row add/update/delete (same tables the bulk PUT covers).
            Route::post('courses', [CoachingController::class, 'courseStore']);
            Route::put('courses/{id}', [CoachingController::class, 'courseUpdate'])->where('id','[0-9]+');
            Route::delete('courses/{id}', [CoachingController::class, 'courseDestroy'])->where('id','[0-9]+');
            Route::post('education', [CoachingController::class, 'educationStore']);
            Route::put('education/{id}', [CoachingController::class, 'educationUpdate'])->where('id','[0-9]+');
            Route::delete('education/{id}', [CoachingController::class, 'educationDestroy'])->where('id','[0-9]+');
            Route::post('portfolio', [CoachingController::class, 'portfolioStore']);
            Route::put('portfolio/{id}', [CoachingController::class, 'portfolioUpdate'])->where('id','[0-9]+');
            Route::delete('portfolio/{id}', [CoachingController::class, 'portfolioDestroy'])->where('id','[0-9]+');
            Route::post('portfolio/upload', [CoachingController::class, 'portfolioUpload']);
            Route::post('branding/upload', [CoachingController::class, 'brandingUpload']);
            Route::delete('branding/{type}', [CoachingController::class, 'brandingDestroy'])->where('type','logo|banner');
            // Keywords owned by this coaching institute — searchable on /directory.
            Route::get('keywords', [CoachingKeywordController::class, 'index']);
            Route::post('keywords', [CoachingKeywordController::class, 'store']);
            Route::delete('keywords/{id}', [CoachingKeywordController::class, 'destroy'])->where('id','[0-9]+');
        });
        Route::prefix('school')->middleware('role:school')->group(function () {
            // Onboarding endpoints stay reachable pre-approval; everything else gets 'approved'.
            Route::get('onboarding', [SchoolOnboardingController::class, 'show']);
            Route::put('onboarding', [SchoolOnboardingController::class, 'save']);
            Route::post('onboarding/submit', [SchoolOnboardingController::class, 'submit']);
            Route::middleware('approved')->group(function () {
                Route::get('dashboard', [SchoolController::class, 'dashboard']);
                Route::get('vendors', [SchoolController::class, 'vendors']);
                Route::get('catalog', [SchoolController::class, 'catalog']);
                Route::get('products', [SchoolController::class, 'index']);
                Route::post('products', [SchoolController::class, 'store']);
                Route::put('products/{id}', [SchoolController::class, 'update']);
                Route::delete('products/{id}', [SchoolController::class, 'destroy']);
                Route::get('details', [SchoolController::class, 'details']);
                Route::put('details', [SchoolController::class, 'updateDetails']);
                // Per-row add/update/delete (same tables the bulk PUT covers).
                Route::post('courses', [SchoolController::class, 'courseStore']);
                Route::put('courses/{id}', [SchoolController::class, 'courseUpdate'])->where('id','[0-9]+');
                Route::delete('courses/{id}', [SchoolController::class, 'courseDestroy'])->where('id','[0-9]+');
                Route::post('education', [SchoolController::class, 'educationStore']);
                Route::put('education/{id}', [SchoolController::class, 'educationUpdate'])->where('id','[0-9]+');
                Route::delete('education/{id}', [SchoolController::class, 'educationDestroy'])->where('id','[0-9]+');
                Route::post('portfolio', [SchoolController::class, 'portfolioStore']);
                Route::put('portfolio/{id}', [SchoolController::class, 'portfolioUpdate'])->where('id','[0-9]+');
                Route::delete('portfolio/{id}', [SchoolController::class, 'portfolioDestroy'])->where('id','[0-9]+');
                Route::post('portfolio/upload', [SchoolController::class, 'portfolioUpload']);
                Route::post('branding/upload', [SchoolController::class, 'brandingUpload']);
                Route::delete('branding/{type}', [SchoolController::class, 'brandingDestroy'])->where('type','logo|banner');
            });
        });
    });
});

