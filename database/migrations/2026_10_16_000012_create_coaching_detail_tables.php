<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Detailed profile tables for coaching institutes and tutors:
 *   - coaching_institute_courses: subjects / batches / fee ranges
 *   - tutor_education: degrees, certifications, experience
 *   - institute_portfolio: website links, PDF uploads, gallery images
 */
return new class extends Migration {
    public function up(): void {
        // Courses offered by a coaching institute or school.
        Schema::create('institute_courses', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);   // 'school' | 'coaching'
            $t->unsignedBigInteger('institute_id');
            $t->string('name');                    // "Class 10 Maths"
            $t->string('subject')->nullable();     // "Mathematics"
            $t->string('level')->nullable();       // "Class 10", "Intermediate"
            $t->string('batch')->nullable();       // "2025-26 Morning"
            $t->string('duration')->nullable();    // "6 months"
            $t->string('fee_range')->nullable();   // "₹2000-3000/month"
            $t->text('description')->nullable();
            $t->timestamps();
            $t->index(['institute_type', 'institute_id']);
        });

        // Education / qualifications for individual tutors or institute heads.
        Schema::create('tutor_education', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);
            $t->unsignedBigInteger('institute_id');
            $t->string('degree');                  // "B.Ed", "M.Sc Mathematics"
            $t->string('university')->nullable();
            $t->string('year')->nullable();
            $t->string('specialization')->nullable();
            $t->text('description')->nullable();
            $t->timestamps();
            $t->index(['institute_type', 'institute_id']);
        });

        // Portfolio items: website URL, uploaded PDF, or gallery image.
        Schema::create('institute_portfolio', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);
            $t->unsignedBigInteger('institute_id');
            $t->string('kind');                    // 'website' | 'pdf' | 'image'
            $t->string('label')->nullable();       // "Prospectus 2025"
            $t->string('url')->nullable();         // website URL or storage path
            $t->timestamps();
            $t->index(['institute_type', 'institute_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('institute_courses');
        Schema::dropIfExists('tutor_education');
        Schema::dropIfExists('institute_portfolio');
    }
};
