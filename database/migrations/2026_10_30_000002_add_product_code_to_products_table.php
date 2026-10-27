<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->string('product_code', 32)->nullable()->unique()->after('id');
        });

        // Backfill existing rows with a stable, unique code.
        foreach (DB::table('products')->orderBy('id')->get() as $p) {
            DB::table('products')
                ->where('id', $p->id)
                ->update(['product_code' => 'PRD'.str_pad((string) $p->id, 6, '0', STR_PAD_LEFT)]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->dropUnique(['product_code']);
            $t->dropColumn('product_code');
        });
    }
};
