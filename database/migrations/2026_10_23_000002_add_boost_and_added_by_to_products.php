<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'added_by_role')) {
            Schema::table('products', function (Blueprint $t) {
                $t->string('added_by_role', 20)->nullable()->after('created_by_id');
            });
        }
        if (!Schema::hasColumn('products', 'added_by_id')) {
            Schema::table('products', function (Blueprint $t) {
                $t->unsignedBigInteger('added_by_id')->nullable()->after('added_by_role');
            });
        }
        if (!Schema::hasColumn('products', 'is_boost')) {
            Schema::table('products', function (Blueprint $t) {
                $t->boolean('is_boost')->default(false)->after('is_active');
            });
        }
        if (!Schema::hasColumn('products', 'boost_until')) {
            Schema::table('products', function (Blueprint $t) {
                $t->timestamp('boost_until')->nullable()->after('is_boost');
            });
        }
    }

    public function down(): void
    {
        $cols = [];
        foreach (['added_by_role', 'added_by_id', 'is_boost', 'boost_until'] as $c) {
            if (Schema::hasColumn('products', $c)) $cols[] = $c;
        }
        if ($cols) {
            Schema::table('products', function (Blueprint $t) use ($cols) {
                $t->dropColumn($cols);
            });
        }
    }
};
