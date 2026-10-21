<?php

namespace Tests\Feature;

use App\Models\{User, Vendor};
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

/**
 * Amazon-style vendor onboarding: draft -> submitted -> approved/rejected.
 *   1. Self-registration creates a DRAFT application; login answers 403 with an
 *      onboarding_* code instead of "invalid credentials".
 *   2. The wizard autosaves drafts and submits with strict validation.
 *   3. The 'approved' middleware keeps pending tokens away from selling APIs.
 *   4. Admin review (approve/reject + notes) unlocks or bounces the seller;
 *      pending applicants resume via the public onboarding/resume endpoint.
 *
 * Same no-RefreshDatabase approach as the other Feature tests: only the tables
 * these assertions touch are created (the location migration is MySQL-only).
 */
class VendorOnboardingTest extends TestCase {

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function ($t) {
            $t->id(); $t->string('name', 150);
            $t->string('email')->nullable()->unique();
            $t->string('whatsapp', 20)->nullable()->unique();
            $t->string('phone_country_code', 8)->nullable();
            $t->string('phone_e164', 25)->nullable();
            $t->string('password'); $t->string('role', 20)->default('vendor');
            $t->boolean('is_active')->default(true);
            $t->timestamp('email_verified_at')->nullable();
            $t->rememberToken(); $t->timestamps();
        });
        Schema::create('personal_access_tokens', function ($t) {
            $t->id(); $t->morphs('tokenable'); $t->string('name');
            $t->string('token', 64)->unique(); $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable(); $t->timestamp('expires_at')->nullable();
            $t->timestamps();
        });
        Schema::create('vendors', function ($t) {
            $t->id(); $t->unsignedBigInteger('user_id')->unique();
            $t->string('shop_name'); $t->string('gst', 30)->nullable();
            $t->text('address')->nullable();
            $t->decimal('commission_default', 5, 2)->default(0);
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
            $t->timestamps();
        });
        Schema::create('schools', function ($t) {
            $t->id(); $t->unsignedBigInteger('user_id')->unique();
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
        Schema::create('institute_profiles', function ($t) {
            $t->id();
            $t->string('institute_type', 20);
            $t->unsignedBigInteger('institute_id');
            $t->unique(['institute_type', 'institute_id']);
            $t->string('website')->nullable();
            $t->string('contact_person')->nullable();
            $t->string('contact_phone')->nullable();
            $t->string('contact_email')->nullable();
            $t->text('detailed_address')->nullable();
            $t->unsignedInteger('country_id')->nullable();
            $t->string('state_id', 32)->nullable();
            $t->unsignedInteger('district_id')->nullable();
            $t->string('established_year')->nullable();
            $t->string('registration_number')->nullable();
            $t->string('board_affiliation')->nullable();
            $t->string('recognition_status')->nullable();
            $t->string('medium_of_instruction')->nullable();
            $t->string('student_strength')->nullable();
            $t->json('streams')->nullable();
            $t->json('classes')->nullable();
            $t->timestamps();
        });
        Schema::create('notifications', function ($t) {
            $t->id(); $t->unsignedBigInteger('user_id');
            $t->string('title'); $t->text('body')->nullable();
            $t->string('type', 60)->nullable(); $t->boolean('is_read')->default(false);
            $t->timestamps();
        });
        // Selling endpoints behind 'approved' hit these (empty is fine).
        Schema::create('categories', function ($t) {
            $t->id(); $t->string('name', 120); $t->string('slug')->unique();
            $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('category_fields', function ($t) {
            $t->id(); $t->unsignedBigInteger('category_id');
            $t->string('field_name'); $t->string('field_label'); $t->string('field_type');
            $t->boolean('is_required')->default(false); $t->integer('sort_order')->default(0);
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id(); $t->unsignedBigInteger('category_id');
            $t->string('created_by_type', 20); $t->unsignedBigInteger('created_by_id');
            $t->unsignedBigInteger('school_id')->nullable(); $t->unsignedBigInteger('vendor_id')->nullable();
            $t->string('name'); $t->string('sku', 60)->nullable()->unique();
            $t->decimal('price', 10, 2); $t->decimal('mrp', 10, 2)->nullable();
            $t->integer('stock')->default(0); $t->string('delivery_mode', 20)->default('self');
            $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('product_values', function ($t) {
            $t->id(); $t->unsignedBigInteger('product_id'); $t->unsignedBigInteger('field_id');
            $t->text('value_text')->nullable();
        });
        Schema::create('product_images', function ($t) {
            $t->id(); $t->unsignedBigInteger('product_id');
            $t->string('url', 500); $t->boolean('is_primary')->default(false);
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    private function applicant(): array {
        $res = $this->postJson('/api/v1/auth/register', [
            'name' => 'Meera Shah', 'shop_name' => 'Shah Book Depot',
            'whatsapp' => '9876543210', 'password' => 'secret123', 'role' => 'vendor',
        ]);
        $res->assertStatus(201)->assertJsonPath('onboarding.status', 'draft');
        return ['token' => $res->json('token'), 'vendor' => Vendor::first()];
    }

    private function fullDraft(): array {
        return [
            'business' => ['legal_name' => 'Shah Traders', 'business_type' => 'Proprietorship',
                'address' => '12 MG Road, Indore', 'display_name' => 'Shah Book Depot'],
            'tax' => ['pan' => 'ABCDE1234F', 'gstin' => '23ABCDE1234F1Z5'],
            'bank' => ['account_number' => '123456789012', 'ifsc' => 'HDFC0001234', 'holder_name' => 'Meera Shah'],
            'kyc' => ['signatory_name' => 'Meera Shah', 'contact_phone' => '9876543210'],
            'categories' => [1],
            'agreement' => '1',
        ];
    }

    private function adminToken(): string {
        $u = User::create(['name' => 'Admin', 'email' => 'admin@test.local',
            'password' => bcrypt('secret'), 'role' => 'admin']);
        return $u->createToken('test')->plainTextToken;
    }

    /**
     * withToken + a guard reset. The auth manager caches the resolved user on
     * the guard for the app's lifetime; in production every HTTP request gets a
     * fresh app, but inside ONE test method the same app handles all requests —
     * without forgetting the guards, request #2 would reuse request #1's user.
     */
    private function asToken(string $token): static {
        $this->app->make('auth')->forgetGuards();
        return $this->withToken($token);
    }

    public function test_register_creates_draft_vendor_and_blocks_login(): void {
        $this->applicant();
        $login = $this->postJson('/api/v1/auth/login', ['login' => '9876543210', 'password' => 'secret123']);
        $login->assertStatus(403)
            ->assertJsonPath('code', 'onboarding_draft');
        $this->assertStringContainsString('Finish your seller application', $login->json('message'));
    }

    public function test_draft_endpoints_require_token(): void {
        $this->getJson('/api/v1/vendor/onboarding')->assertStatus(401);
        $this->putJson('/api/v1/vendor/onboarding', ['data' => []])->assertStatus(401);
        $this->postJson('/api/v1/vendor/onboarding/submit', ['data' => []])->assertStatus(401);
    }

    public function test_draft_saves_and_submits_with_strict_validation(): void {
        ['token' => $t] = $this->applicant();

        // Lenient draft save works with partial data.
        $this->asToken($t)->putJson('/api/v1/vendor/onboarding', ['data' => ['business' => ['legal_name' => 'Shah Traders']]])
            ->assertStatus(200)->assertJsonPath('status', 'draft');
        // Submit is strict: missing core fields -> 422, stays draft.
        $bad = $this->asToken($t)->postJson('/api/v1/vendor/onboarding/submit', ['data' => []]);
        $bad->assertStatus(422)->assertJsonValidationErrors(['data.business.legal_name', 'data.tax.pan']);
        $this->assertSame('draft', Vendor::first()->onboarding_status);

        // Full payload -> submitted + timestamped.
        $ok = $this->asToken($t)->postJson('/api/v1/vendor/onboarding/submit', ['data' => $this->fullDraft()]);
        $ok->assertStatus(200)->assertJsonPath('status', 'submitted');
        $this->assertNotNull(Vendor::first()->submitted_at);
    }

    public function test_login_blocked_while_submitted_and_unlocked_after_approval(): void {
        ['token' => $t] = $this->applicant();
        $this->asToken($t)->postJson('/api/v1/vendor/onboarding/submit', ['data' => $this->fullDraft()])->assertStatus(200);

        $pending = $this->postJson('/api/v1/auth/login', ['login' => '9876543210', 'password' => 'secret123']);
        $pending->assertStatus(403)->assertJsonPath('code', 'onboarding_submitted');

        // Pending token cannot hit selling endpoints (approved middleware)...
        $this->asToken($t)->getJson('/api/v1/vendor/products')->assertStatus(403)
            ->assertJsonPath('code', 'onboarding_submitted');
        // ...but can read its own application.
        $this->asToken($t)->getJson('/api/v1/vendor/onboarding')->assertStatus(200);

        // Admin approves -> login + selling both work.
        $v = Vendor::first();
        $this->asToken($this->adminToken())
            ->postJson("/api/v1/admin/vendors/{$v->user_id}/review", ['action' => 'approve'])
            ->assertStatus(200)->assertJsonPath('onboarding_status', 'approved');

        $this->postJson('/api/v1/auth/login', ['login' => '9876543210', 'password' => 'secret123'])
            ->assertStatus(200)->assertJsonStructure(['token']);
        $this->asToken($t)->getJson('/api/v1/vendor/products')->assertStatus(200);
    }

    public function test_reject_stores_notes_and_resume_continues_the_draft(): void {
        ['token' => $t] = $this->applicant();
        $this->asToken($t)->postJson('/api/v1/vendor/onboarding/submit', ['data' => $this->fullDraft()])->assertStatus(200);

        $v = Vendor::first();
        $this->asToken($this->adminToken())
            ->postJson("/api/v1/admin/vendors/{$v->user_id}/review",
                ['action' => 'reject', 'notes' => 'PAN does not match the bank account holder'])
            ->assertStatus(200)->assertJsonPath('onboarding_status', 'rejected');

        $login = $this->postJson('/api/v1/auth/login', ['login' => '9876543210', 'password' => 'secret123']);
        $login->assertStatus(403)->assertJsonPath('code', 'onboarding_rejected')
            ->assertJsonPath('notes', 'PAN does not match the bank account holder');

        // Resume (public): correct creds return a token + saved draft; wrong ones don't.
        $resume = $this->postJson('/api/v1/onboarding/resume', ['login' => '9876543210', 'password' => 'secret123']);
        $resume->assertStatus(200)
            ->assertJsonPath('onboarding.status', 'rejected')
            ->assertJsonPath('onboarding.data.business.legal_name', 'Shah Traders');
        $this->postJson('/api/v1/onboarding/resume', ['login' => '9876543210', 'password' => 'nope'])
            ->assertStatus(401);

        // Editing after rejection returns the application to draft.
        $edited = array_merge($this->fullDraft(),
            ['business' => ['legal_name' => 'Shah Traders LLP', 'business_type' => 'LLP', 'address' => '12 MG Road']]);
        $this->asToken($resume->json('token'))
            ->putJson('/api/v1/vendor/onboarding', ['data' => $edited])
            ->assertStatus(200)->assertJsonPath('status', 'draft');
    }

    public function test_resume_rejects_approved_applicants(): void {
        ['token' => $t] = $this->applicant();
        $this->asToken($t)->postJson('/api/v1/vendor/onboarding/submit', ['data' => $this->fullDraft()])->assertStatus(200);
        Vendor::first()->update(['onboarding_status' => 'approved']);
        $this->postJson('/api/v1/onboarding/resume', ['login' => '9876543210', 'password' => 'secret123'])
            ->assertStatus(403);
    }

    public function test_admin_vendor_list_filters_by_status(): void {
        $this->applicant(); // draft
        $t = $this->adminToken();
        $this->asToken($t)->getJson('/api/v1/admin/vendors?status=draft')
            ->assertStatus(200)->assertJsonPath('total', 1);
        $this->asToken($t)->getJson('/api/v1/admin/vendors?status=approved')
            ->assertStatus(200)->assertJsonPath('total', 0);
    }

    /**
     * REGRESSION: the coaching-only validation rules leaked into the vendor and
     * school signups. "address" was declared with a flat
     * "required_unless:institute_type,private_tutor", so a vendor/school (which
     * never send institute_type) always failed with 422 "The address field is
     * required..." and NOBODY could ever sign up as a seller.
     */
    public function test_vendor_and_school_signup_do_not_require_coaching_fields(): void {
        $vendor = $this->postJson('/api/v1/auth/register', [
            'name' => 'Asha Seller', 'shop_name' => 'Asha Store',
            'whatsapp' => '9000000011', 'password' => 'secret123', 'role' => 'vendor',
        ]);
        $vendor->assertStatus(201)->assertJsonPath('onboarding.status', 'draft');
        $this->assertSame('vendor', $vendor->json('user.role'));

        $school = $this->postJson('/api/v1/auth/register', [
            'name' => 'Asha Principal', 'school_name' => 'Asha Public School',
            'whatsapp' => '9000000012', 'password' => 'secret123', 'role' => 'school',
        ]);
        $school->assertStatus(201)->assertJsonPath('onboarding.status', 'draft');
        $this->assertSame('school', $school->json('user.role'));
    }

    /**
     * REGRESSION: the duplicate guard was "whatsapp = X OR email = Y". When the
     * signup carried NO email, that branch compiled to "email = NULL" (never
     * true in SQL) and the OR made the query match ANY user with a NULL email.
     * The first email-less signup therefore locked out every later signup
     * with 409 "account already exists".
     */
    public function test_email_less_signups_do_not_block_each_other(): void {
        $first = $this->postJson('/api/v1/auth/register', [
            'name' => 'No Mail One', 'shop_name' => 'Shop One',
            'whatsapp' => '9000000021', 'password' => 'secret123', 'role' => 'vendor',
        ]);
        $first->assertStatus(201);

        $second = $this->postJson('/api/v1/auth/register', [
            'name' => 'No Mail Two', 'shop_name' => 'Shop Two',
            'whatsapp' => '9000000022', 'password' => 'secret123', 'role' => 'vendor',
        ]);
        $second->assertStatus(201);

        // A genuine duplicate (same whatsapp) IS still rejected.
        $dupe = $this->postJson('/api/v1/auth/register', [
            'name' => 'No Mail Three', 'shop_name' => 'Shop Three',
            'whatsapp' => '9000000022', 'password' => 'secret123', 'role' => 'vendor',
        ]);
        $dupe->assertStatus(409)->assertJsonPath('code', 'account_exists');
    }
}
