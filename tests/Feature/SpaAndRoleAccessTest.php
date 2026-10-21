<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

/**
 * End-to-end checks for the consolidated SPA + role-based access.
 *
 * These assert the two things that must never regress:
 *   1. The SPA shell (Blade) is served for panel deep links, while `/api/*`
 *      always answers as JSON — an unknown API path must NOT fall through to
 *      the Blade page.
 *   2. Role enforcement happens on the SERVER (Sanctum + role middleware).
 *      The React <Guard>s are UX only; the API is the security boundary.
 *
 * We deliberately do NOT use RefreshDatabase: the project ships a location
 * migration (2026_10_04_000004) that runs MySQL-only DDL (`CREATE OR REPLACE
 * VIEW`, a `country_code_char2` column) which the in-memory SQLite test DB
 * cannot execute. So we create only the handful of tables these assertions
 * touch, keeping the suite green without pulling in the whole schema.
 */
class SpaAndRoleAccessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name', 150);
            $t->string('email')->nullable()->unique();
            $t->string('whatsapp', 20)->nullable()->unique();
            $t->string('password');
            $t->string('role', 20)->default('vendor');
            $t->boolean('is_active')->default(true);
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('personal_access_tokens', function ($t) {
            $t->id();
            $t->morphs('tokenable');
            $t->string('name');
            $t->string('token', 64)->unique();
            $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
        });

        // Tables the admin dashboard endpoint counts against.
        Schema::create('categories', function ($t) {
            $t->id();
            $t->string('name', 120);
            $t->string('slug')->unique();
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id();
            $t->string('name');
            $t->decimal('price', 10, 2);
            $t->timestamps();
        });
        Schema::create('schools', function ($t) {
            $t->id();
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('school_code', 20)->nullable();
            $t->string('name');
            $t->timestamps();
        });
        Schema::create('school_vendor', function ($t) {
            $t->id();
            $t->unsignedBigInteger('school_id');
            $t->unsignedBigInteger('vendor_id');
            $t->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    private function tokenFor(string $role): string
    {
        $u = User::create([
            'name' => ucfirst($role).' User',
            'email' => $role.'@test.local',
            'password' => bcrypt('secret'),
            'role' => $role,
            'is_active' => true,
        ]);
        return $u->createToken('test')->plainTextToken;
    }

    /** Every panel deep link returns the Blade SPA shell (HTML), not JSON. */
    public function test_panel_deep_links_are_served_by_the_blade_shell(): void
    {
        foreach (['/', '/student/cart', '/admin', '/admin/products', '/vendor/schools', '/school/catalogue'] as $path) {
            $res = $this->get($path);
            $res->assertOk();
            $res->assertHeader('content-type', 'text/html; charset=UTF-8');
            $res->assertSee('<div id="root">', false);
        }
    }

    /** Unknown /api/* paths must return an API response, never the Blade shell. */
    public function test_unknown_api_paths_return_json_not_the_spa_shell(): void
    {
        $res = $this->get('/api/v1/does-not-exist');
        $res->assertNotFound();
        $this->assertStringNotContainsString('<div id="root">', $res->getContent());
        $this->assertStringContainsString('application/json', $res->headers->get('content-type'));
    }

    /** Public health endpoint still answers JSON. */
    public function test_health_endpoint_is_json(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['ok' => true, 'service' => 'marketplace-api']);
    }

    /** Unauthenticated call to a guarded API route is a 401 JSON, not HTML. */
    public function test_guarded_api_requires_authentication(): void
    {
        $res = $this->getJson('/api/v1/admin/dashboard');
        $res->assertUnauthorized();
        $this->assertStringContainsString('application/json', $res->headers->get('content-type'));
    }

    /** The server (not React) enforces the role: admin can reach /admin. */
    public function test_admin_role_can_access_admin_api(): void
    {
        $res = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor('admin'))
            ->getJson('/api/v1/admin/dashboard');
        $res->assertOk();
        $res->assertJsonStructure(['vendors_count', 'schools_count', 'products_count', 'categories_count', 'assignments_count']);
    }

    /** Cross-role access is blocked server-side with 403 JSON. */
    public function test_wrong_role_is_forbidden_by_the_server(): void
    {
        $res = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor('vendor'))
            ->getJson('/api/v1/admin/dashboard');
        $res->assertForbidden();
        $res->assertJson(['message' => 'Forbidden: requires role admin']);
    }
}
