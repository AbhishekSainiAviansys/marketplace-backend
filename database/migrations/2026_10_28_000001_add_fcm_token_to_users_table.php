<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }
        if (!Schema::hasColumn('users', 'fcm_token')) {
            Schema::table('users', function (Blueprint $t) {
                $t->text('fcm_token')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'fcm_token')) {
            Schema::table('users', function (Blueprint $t) {
                $t->dropColumn('fcm_token');
            });
        }
    }
};