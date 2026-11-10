<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add bank account columns to back_accounts table.
     *
     * bank_name    VARCHAR(50)  NULL AFTER user_id
     * ifsc_code    VARCHAR(20)  NULL AFTER bank_name
     * account_number INT(20)    NULL AFTER ifsc_code
     *
     * Idempotent: columns are only added when missing, so the migration is
     * safe to re-run if the ALTER TABLE was already applied manually.
     */
    public function up(): void
    {
        Schema::table('back_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('back_accounts', 'bank_name')) {
                $table->string('bank_name', 50)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('back_accounts', 'ifsc_code')) {
                $table->string('ifsc_code', 20)->nullable()->after('bank_name');
            }
            if (! Schema::hasColumn('back_accounts', 'account_number')) {
                $table->integer('account_number')->unsigned()->nullable()->after('ifsc_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('back_accounts', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'ifsc_code', 'account_number']);
        });
    }
};
