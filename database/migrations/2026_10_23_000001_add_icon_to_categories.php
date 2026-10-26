<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('categories', 'icon')) {
            Schema::table('categories', function (Blueprint $t) {
                $t->string('icon')->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('categories', 'icon')) {
            Schema::table('categories', function (Blueprint $t) {
                $t->dropColumn('icon');
            });
        }
    }
};
