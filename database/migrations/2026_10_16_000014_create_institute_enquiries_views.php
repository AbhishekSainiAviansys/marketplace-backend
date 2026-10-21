<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enquiries from students/visitors on a directory listing + appearance
 * tracking (who searched / opened a school or coaching institute).
 *
 * Privacy: logged-in viewers store student_user_id; logged-out rows keep it
 * null and render as "Unknown". Raw IPs are never stored — only a hash.
 */
return new class extends Migration {
    public function up(): void {
        // Popup form: name, contact, enquiry-for message on a listing.
        Schema::create('institute_enquiries', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);          // 'school' | 'coaching'
            $t->unsignedBigInteger('institute_id');
            $t->unsignedBigInteger('student_user_id')->nullable();
            $t->string('name', 200);
            $t->string('contact', 50);                 // phone or email
            $t->string('enquiry_for', 500);            // what the enquiry is about
            $t->unsignedInteger('country_id')->nullable();
            $t->string('state_id', 32)->nullable();
            $t->unsignedInteger('district_id')->nullable();
            $t->string('country_name', 150)->nullable();
            $t->string('state_name', 150)->nullable();
            $t->string('district_name', 150)->nullable();
            $t->string('source', 30)->default('directory'); // directory | detail | home
            $t->timestamps();
            $t->index(['institute_type', 'institute_id']);
            $t->index('student_user_id');
        });

        // One row per appearance event: impression (in a search list),
        // detail (opened the detail page), enquiry (submitted the popup).
        Schema::create('institute_views', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);
            $t->unsignedBigInteger('institute_id');
            $t->unsignedBigInteger('student_user_id')->nullable();
            $t->string('event', 20);                   // impression | detail | enquiry
            $t->string('country_name', 150)->nullable();
            $t->string('state_name', 150)->nullable();
            $t->string('district_name', 150)->nullable();
            $t->string('filter_q', 100)->nullable();
            $t->string('filter_type', 30)->nullable();
            $t->string('source', 30)->default('directory');
            $t->timestamps();
            $t->index(['institute_type', 'institute_id']);
            $t->index(['institute_type', 'institute_id', 'created_at']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('institute_views');
        Schema::dropIfExists('institute_enquiries');
    }
};
