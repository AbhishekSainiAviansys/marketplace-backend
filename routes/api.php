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

Route::get('health', fn()=>response()->json(['ok'=>true,'service'=>'marketplace-api']));

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/otp/send', [AuthController::class, 'otpSend']);
    Route::post('auth/otp/verify', [AuthController::class, 'otpVerify']);
    Route::get('locations/countries', [LocationController::class, 'countries']);
    Route::get('locations/states', [LocationController::class, 'states']);
    Route::get('locations/districts', [LocationController::class, 'districts']);
    Route::get('locations/areas', [LocationController::class, 'areas']);
    Route::get('locations/phonecodes', [LocationController::class, 'phonecodes']);
    Route::get('settings/public', [SettingController::class, 'public']);
    Route::post('payments/webhook', [PaymentWebhookController::class, 'razorpay']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::get('categories', [CommonController::class, 'categories']);
        Route::get('categories/{id}/fields', [CommonController::class, 'fields']);
        Route::get('products', [CommonController::class, 'products']);
        Route::post('upload/image', [CommonController::class, 'upload']);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/test', [NotificationController::class, 'test']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);

        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard']);
            Route::apiResource('vendors', AdminController::class);
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
            Route::get('dashboard', [VendorController::class, 'dashboard']);
            Route::get('products', [VendorController::class, 'index']);
            Route::post('products', [VendorController::class, 'store']);
            Route::put('products/{id}', [VendorController::class, 'update']);
            Route::delete('products/{id}', [VendorController::class, 'destroy']);
            Route::get('schools', [VendorController::class, 'schools']);
            Route::get('royalties', [VendorController::class, 'royalties']);
        });
        Route::prefix('school')->middleware('role:school')->group(function () {
            Route::get('dashboard', [SchoolController::class, 'dashboard']);
            Route::get('vendors', [SchoolController::class, 'vendors']);
            Route::get('catalog', [SchoolController::class, 'catalog']);
            Route::get('products', [SchoolController::class, 'index']);
            Route::post('products', [SchoolController::class, 'store']);
            Route::put('products/{id}', [SchoolController::class, 'update']);
            Route::delete('products/{id}', [SchoolController::class, 'destroy']);
        });
    });
});
