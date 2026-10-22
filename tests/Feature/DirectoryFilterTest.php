<?php

namespace Tests\Feature;

use App\Models\{User, School, Vendor};
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

class DirectoryFilterTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function ($t) {
            $t->id(); $t->string('name', 150);
            $t->string('email')->nullable()->unique();
            $t->string('whatsapp', 20)->nullable()->unique();
            $t->string('password'); $t->string('role', 20)->default('vendor');
            $t->boolean('is_active')->default(true);
            $t->rememberToken(); $t->timestamps();
        });
        Schema::create('personal_access_tokens', function ($t) {
            $t->id(); $t->morphs('tokenable'); $t->string('name');
            $t->string('token', 64)->unique(); $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable(); $t->timestamp('expires_at')->nullable();
            $t->timestamps();
        });
         Schema::create('schools', function ($t) {
            $t->id(); $t->unsignedBigInteger('user_id')->nullable()->unique();
            $t->string('school_code', 20)->unique(); $t->string('name');
            $t->text('address')->nullable(); $t->boolean('is_independent')->default(false);
            $t->json('class_list')->nullable();
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
            $t->timestamps();
        });
        Schema::create('school_new', function ($t) {
            $t->id();
            $t->string('school_name', 150);
            $t->string('school_code', 20)->nullable();
            $t->string('school_email')->nullable();
            $t->string('school_phone', 20)->nullable();
            $t->string('school_mobile', 20)->nullable();
            $t->string('city')->nullable();
            $t->string('district')->nullable();
            $t->string('state')->nullable();
            $t->string('country')->nullable();
            $t->string('country_name')->nullable();
            $t->string('state_name')->nullable();
            $t->string('district_name')->nullable();
            $t->string('school_status', 30)->default('Active');
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
            $t->timestamps();
        });
        Schema::create('vendors', function ($t) {
            $t->id(); $t->unsignedBigInteger('user_id')->nullable()->unique();
            $t->string('shop_name'); $t->string('gst', 30)->nullable();
            $t->text('address')->nullable();
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
            $t->timestamps();
        });
        Schema::create('institute_profiles', function ($t) {
            $t->id();
            $t->string('institute_type', 20);
            $t->unsignedBigInteger('institute_id');
            $t->unique(['institute_type', 'institute_id']);
            $t->string('website')->nullable();
            $t->string('contact_person')->nullable();
            $t->string('contact_phone')->nullable();
            $t->string('contact_email')->nullable();
            $t->string('detailed_address')->nullable();
            $t->integer('country_id')->nullable();
            $t->string('state_id')->nullable();
            $t->integer('district_id')->nullable();
            $t->timestamps();
        });
        Schema::create('countries', function ($t) {
            $t->integer('country_id')->primary(); $t->string('country_name', 120);
            $t->string('country_code_char2', 2)->nullable();
            $t->timestamps();
        });
        Schema::create('states', function ($t) {
            $t->string('state_subdivision_id')->primary();
            $t->string('state_subdivision_name', 120); $t->string('state_subdivision_code', 10)->nullable();
            $t->integer('country_id'); $t->timestamps();
        });
        Schema::create('districts', function ($t) {
            $t->integer('id')->primary();
            $t->string('district_name', 120); $t->string('state_id'); $t->integer('country_id');
            $t->timestamps();
        });
        Schema::create('coaching_institutes', function ($t) {
            $t->id();
            $t->unsignedBigInteger('user_id')->nullable()->unique();
            $t->string('institute_code', 20)->unique();
            $t->string('name'); $t->string('institute_type', 20);
            $t->text('address')->nullable();
            $t->integer('country_id')->nullable(); $t->string('state_id')->nullable();
            $t->integer('district_id')->nullable();
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id();
            $t->unsignedBigInteger('vendor_id');
            $t->string('name'); $t->string('sku', 60)->nullable();
            $t->decimal('price', 10, 2); $t->integer('stock')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    private function makeSchool(string $name, string $code, string $countryId, string $stateId, int $districtId): School
    {
        $user = User::create([
            'name' => $name.' Admin',
            'email' => strtolower(str_replace(' ', '', $name)).'@test.local',
            'password' => bcrypt('secret'),
            'role' => 'school',
            'is_active' => true,
        ]);
        $school = School::create([
            'user_id' => $user->id,
            'school_code' => $code,
            'name' => $name,
            'onboarding_status' => 'approved',
            'onboarding' => [
                'institution' => [
                    'name' => $name,
                    'country_id' => $countryId,
                    'state_id' => $stateId,
                    'district_id' => $districtId,
                ],
            ],
        ]);
        // Also create in school_new for admin API directory filter (country/state/district columns)
        \DB::table('school_new')->insertGetId([
            'school_name' => $name,
            'school_code' => $code,
            'school_email' => strtolower(str_replace(' ', '', $name)).'@test.local',
            'school_mobile' => '',
            'city' => '',
            'district' => '',
            'state' => '',
            'country' => $countryId,
            'country_name' => 'India',
            'state_name' => 'Uttar Pradesh',
            'district_name' => 'Lucknow',
            'school_status' => 'Active',
        ]);
        return $school;
    }

    private function makeVendor(string $shopName, string $countryId, string $stateId, int $districtId): Vendor
    {
        $user = User::create([
            'name' => $shopName.' Owner',
            'email' => strtolower(str_replace(' ', '', $shopName)).'@test.local',
            'password' => bcrypt('secret'),
            'role' => 'vendor',
            'is_active' => true,
        ]);
        return Vendor::create([
            'user_id' => $user->id,
            'shop_name' => $shopName,
            'onboarding_status' => 'approved',
            'onboarding' => [
                'business' => [
                    'name' => $shopName,
                    'country_id' => $countryId,
                    'state_id' => $stateId,
                    'district_id' => $districtId,
                ],
            ],
        ]);
    }

    private function seedLocations(): void
    {
        \DB::table('countries')->insert([
            ['country_id' => 105, 'country_name' => 'India', 'country_code_char2' => 'IN'],
            ['country_id' => 120, 'country_name' => 'Nepal', 'country_code_char2' => 'NP'],
        ]);
        \DB::table('states')->insert([
            ['state_subdivision_id' => '14694', 'state_subdivision_name' => 'Uttar Pradesh', 'state_subdivision_code' => 'UP', 'country_id' => 105],
            ['state_subdivision_id' => '14695', 'state_subdivision_name' => 'Bihar', 'state_subdivision_code' => 'BR', 'country_id' => 105],
            ['state_subdivision_id' => '20001', 'state_subdivision_name' => 'Bagmati', 'state_subdivision_code' => 'BA', 'country_id' => 120],
        ]);
        \DB::table('districts')->insert([
            ['id' => 678, 'district_name' => 'Lucknow', 'state_id' => '14694', 'country_id' => 105],
            ['id' => 679, 'district_name' => 'West Lucknow', 'state_id' => '14694', 'country_id' => 105],
            ['id' => 680, 'district_name' => 'Lucknow', 'state_id' => '14695', 'country_id' => 105],
            ['id' => 681, 'district_name' => 'Kathmandu', 'state_id' => '20001', 'country_id' => 120],
        ]);
    }
    /** Country filter returns only schools whose onboarding.institution.country_id matches. */
    public function test_country_filter_returns_only_matching_schools(): void
    {
        $this->seedLocations();
        $this->makeSchool('India School', 'IN-001', '105', '14694', 678);
        $this->makeSchool('Nepal School', 'NP-001', '120', '20001', 681);

        $res = $this->getJson('/api/v1/directory?country_id=105&type=school');
        $res->assertOk();
        $this->assertSame(1, $res->json('total.school'));
        $this->assertSame('India School', $res->json('result.school.0.name'));
    }

    /** State filter returns only schools whose onboarding.institution.state_id matches. */
    public function test_state_filter_returns_only_matching_schools(): void
    {
        $this->seedLocations();
        $this->makeSchool('UP School', 'UP-001', '105', '14694', 678);
        $this->makeSchool('Bihar School', 'BR-001', '105', '14695', 680);

        $res = $this->getJson('/api/v1/directory?state_id=14694&type=school');
        $res->assertOk();
        $this->assertSame(1, $res->json('total.school'));
        $this->assertSame('UP School', $res->json('result.school.0.name'));
    }

    /** District filter is exact by id — no partial-name false positives. */
    public function test_district_filter_exact_no_false_positives(): void
    {
        $this->seedLocations();
        $this->makeSchool('Lucknow A', 'LA-001', '105', '14694', 678);
        $this->makeSchool('Lucknow B', 'LB-001', '105', '14695', 680);

        $res = $this->getJson('/api/v1/directory?district_id=678&type=school');
        $res->assertOk();
        $this->assertSame(1, $res->json('total.school'));
        $this->assertSame('Lucknow A', $res->json('result.school.0.name'));

        $this->makeSchool('West Lucknow', 'WL-001', '105', '14694', 679);
        $res = $this->getJson('/api/v1/directory?district_id=678&type=school');
        $res->assertOk();
        $this->assertSame(1, $res->json('total.school'));
    }

    /** Combined country+state+district returns the intersection. */
    public function test_combined_filters_return_intersection(): void
    {
        $this->seedLocations();
        $this->makeSchool('Target', 'TG-001', '105', '14694', 678);
        $this->makeSchool('Wrong country', 'WC-001', '120', '14694', 678);
        $this->makeSchool('Wrong state', 'WS-001', '105', '14695', 678);
        $this->makeSchool('Wrong district', 'WD-001', '105', '14694', 680);

        $res = $this->getJson('/api/v1/directory?country_id=105&state_id=14694&district_id=678&type=school');
        $res->assertOk();
        $this->assertSame(1, $res->json('total.school'));
        $this->assertSame('Target', $res->json('result.school.0.name'));
    }

    /** Empty filter returns up to 10 random rows with full total and valid ids. */
    public function test_empty_filter_returns_sample_and_full_total(): void
    {
        $this->seedLocations();
        for ($i = 0; $i < 25; $i++) {
            $this->makeSchool('School '.$i, 'SC-'.str_pad($i, 2, '0', STR_PAD_LEFT), '105', '14694', 678);
        }

        $res = $this->getJson('/api/v1/directory');
        $res->assertOk();
        $this->assertSame(25, $res->json('total.school'));
        $this->assertLessThanOrEqual(10, count($res->json('result.school')));
        foreach ($res->json('result.school') as $row) {
            $this->assertIsInt($row['id']);
            $detail = $this->getJson('/api/v1/directory/school/'.$row['id']);
            $detail->assertOk();
            $this->assertSame($row['id'], $detail->json('id'));
            $this->assertSame($row['name'], $detail->json('name'));
        }
    }

    /** Listing id resolves to the correct school detail record (not 404, not another school). */
    public function test_listing_id_resolves_to_correct_detail_record(): void
    {
        $this->seedLocations();
        $s = $this->makeSchool('Detail School', 'DS-001', '105', '14694', 678);

        $list = $this->getJson('/api/v1/directory?type=school');
        $list->assertOk();
        $found = collect($list->json('result.school'))->firstWhere('id', $s->id);
        $this->assertNotNull($found, 'School must appear in listing');

        $detail = $this->getJson('/api/v1/directory/school/'.$s->id);
        $detail->assertOk();
        $this->assertSame($s->id, $detail->json('id'));
        $this->assertSame('Detail School', $detail->json('name'));
        $this->assertSame('DS-001', $detail->json('code'));
        $this->assertSame(678, $detail->json('district_id'));
        $this->assertSame(105, $detail->json('country_id'));
        $this->assertSame('14694', $detail->json('state_id'));
        $this->assertSame('India', $detail->json('country_name'));
        $this->assertSame('Uttar Pradesh', $detail->json('state_name'));
        $this->assertSame('Lucknow', $detail->json('district_name'));
    }

    /** Admin vendor list filters by canonical onboarding.business.* JSON id. */
    public function test_admin_vendor_list_filters_by_canonical_json_country_id(): void
    {
        $this->seedLocations();
        $this->makeVendor('Vendor India', '105', '14694', 678);
        $this->makeVendor('Vendor Nepal', '120', '20001', 681);

        $token = $this->adminToken();
        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/vendors?country_id=105');
        $res->assertOk();
        $this->assertSame(1, $res->json('total'));
        $this->assertSame('Vendor India', $res->json('data.0.vendor.shop_name'));

        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/vendors?country_id=999');
        $res->assertOk();
        $this->assertSame(0, $res->json('total'));

        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/vendors');
        $res->assertOk();
        $this->assertSame(2, $res->json('total'));
    }

    /** Admin school list filters by canonical onboarding.institution.* JSON id. */
    public function test_admin_school_list_filters_by_canonical_json_country_id(): void
    {
        $this->seedLocations();
        $this->makeSchool('School India', 'SI-001', '105', '14694', 678);
        $this->makeSchool('School Nepal', 'SN-001', '120', '20001', 681);

        $token = $this->adminToken();
        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/schools?country_id=105');
        $res->assertOk();
        $this->assertSame(1, $res->json('total'));
        $this->assertSame('School India', $res->json('data.0.school.name'));

        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/schools');
        $res->assertOk();
        $this->assertSame(2, $res->json('total'));
    }

    private function adminToken(): string
    {
        $u = User::create([
            'name' => 'Admin', 'email' => 'admin@test.local',
            'password' => bcrypt('secret'), 'role' => 'admin', 'is_active' => true,
        ]);
        return $u->createToken('test')->plainTextToken;
    }
}

