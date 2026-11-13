<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    // 'razorpay' => [
    //     'ssl_verify' => env('RAZORPAY_SSL_VERIFY', true),
    //     'ca_bundle' => env('RAZORPAY_CA_BUNDLE', null),
    // ],
    'razorpay' => [
        'platform_account_id' => env('RZP_PLATFORM_ACCOUNT'),
        'key_id' => env('RZP_KEY_ID'),
        'key_secret' => env('RZP_KEY_SECRET'),
        'webhook_secret' => env('RZP_WEBHOOK_SECRET'),
    ],

];
