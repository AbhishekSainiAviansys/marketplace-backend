<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            if (!Schema::hasColumn('products', 'portal_charge')) {
                $t->decimal('portal_charge', 10, 2)->nullable()->after('delivery_charge');
            }
            if (!Schema::hasColumn('products', 'server_charge')) {
                $t->decimal('server_charge', 10, 2)->nullable()->after('portal_charge');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $t) {
            if (Schema::hasColumn('products', 'portal_charge')) $t->dropColumn('portal_charge');
            if (Schema::hasColumn('products', 'server_charge')) $t->dropColumn('server_charge');
        });
    }
};
