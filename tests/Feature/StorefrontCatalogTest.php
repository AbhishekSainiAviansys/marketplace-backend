<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

/**
 * Storefront catalogue + admin-managed home content.
 *
 * Guards the three things the home redesign depends on:
 *   1. GET /products is PUBLIC (the student shop paginates it while scrolling
 *      and must work logged-out — previously it sat behind auth:sanctum and
 *      anonymous visitors were bounced to /login by the axios interceptor).
 *   2. The ?ids= (boost row) / ?random= (surprise picks) / category-by-name
 *      query params work.
 *   3. /settings/public ships the admin-edited home_content + home_boost_ids.
 *
 * Same no-RefreshDatabase approach as SpaAndRoleAccessTest: only the tables
 * these assertions touch are created (the location migration is MySQL-only).
 */
class StorefrontCatalogTest extends TestCase
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
        Schema::create('categories', function ($t) {
            $t->id(); $t->string('name', 120); $t->string('slug')->unique();
            $t->text('description')->nullable(); $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id(); $t->unsignedBigInteger('category_id');
            $t->string('created_by_type', 20); $t->unsignedBigInteger('created_by_id');
            $t->unsignedBigInteger('school_id')->nullable(); $t->unsignedBigInteger('vendor_id')->nullable();
            $t->string('name'); $t->string('sku', 60)->nullable()->unique();
            $t->decimal('price', 10, 2); $t->decimal('mrp', 10, 2)->nullable();
            $t->integer('stock')->default(0);
            $t->string('delivery_mode', 20)->default('self');
            $t->text('payment_split')->nullable(); $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('product_images', function ($t) {
            $t->id(); $t->unsignedBigInteger('product_id');
            $t->string('url', 500); $t->boolean('is_primary')->default(false);
        });
        Schema::create('settings', function ($t) {
            $t->string('key', 120)->primary(); $t->text('value')->nullable();
            $t->string('group', 60)->default('general'); $t->boolean('is_secret')->default(false);
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    private function adminToken(): string
    {
        $u = User::create([
            'name' => 'Admin', 'email' => 'admin@test.local',
            'password' => bcrypt('secret'), 'role' => 'admin', 'is_active' => true,
        ]);
        return $u->createToken('test')->plainTextToken;
    }

    private function makeCategory(string $name, string $slug): int
    {
        return \App\Models\Category::create(['name' => $name, 'slug' => $slug])->id;
    }

    private function makeProduct(int $catId, string $name): int
    {
        return \App\Models\Product::create([
            'category_id' => $catId, 'created_by_type' => 'admin', 'created_by_id' => 1,
            'name' => $name, 'price' => 100, 'mrp' => 150, 'stock' => 5, 'is_active' => true,
        ])->id;
    }

    /** Anonymous visitors can page through the storefront catalogue. */
    public function test_products_endpoint_is_public(): void
    {
        $cat = $this->makeCategory('Book', 'book');
        $this->makeProduct($cat, 'Class 5 Maths Workbook');

        $res = $this->getJson('/api/v1/products?per_page=5');
        $res->assertOk();
        $res->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
        $this->assertSame(1, $res->json('total'));
    }

    /** ?ids= returns exactly the requested rows (boost/featured row). */
    public function test_products_ids_filter_returns_only_requested_products(): void
    {
        $cat = $this->makeCategory('Book', 'book');
        $a = $this->makeProduct($cat, 'Boosted Item');
        $this->makeProduct($cat, 'Other Item');

        $res = $this->getJson('/api/v1/products?ids='.$a);
        $res->assertOk();
        // Bare array on purpose — the shared rowsOf() helper accepts it.
        $this->assertCount(1, $res->json());
        $this->assertSame($a, $res->json('0.id'));
    }

    /** Category filter accepts the display name (student ?cat=Book Bundle). */
    public function test_products_filters_by_category_name(): void
    {
        $book = $this->makeCategory('Book', 'book');
        $bottle = $this->makeCategory('Water Bottle', 'water-bottle');
        $this->makeProduct($book, 'Maths Workbook');
        $this->makeProduct($bottle, 'Steel Bottle');

        $res = $this->getJson('/api/v1/products?category=Book');
        $res->assertOk();
        $this->assertSame(1, $res->json('total'));
    }

    /** ?random=1 (surprise picks row) answers 200 with rows. */
    public function test_products_random_param_works(): void
    {
        $cat = $this->makeCategory('Book', 'book');
        $this->makeProduct($cat, 'Item One');
        $this->makeProduct($cat, 'Item Two');

        $res = $this->getJson('/api/v1/products?random=1&per_page=1');
        $res->assertOk();
        $this->assertCount(1, $res->json('data'));
    }

    /** /settings/public ships admin-edited home content (no auth). */
    public function test_settings_public_exposes_home_content(): void
    {
        \App\Models\Setting::create([
            'key' => 'home_content',
            'value' => json_encode(['hero' => ['badge' => 'Sale week'], 'ticker' => ['Flat 20% off']]),
            'group' => 'home',
        ]);
        \App\Models\Setting::create([
            'key' => 'home_boost_ids', 'value' => json_encode([7, 8]), 'group' => 'home',
        ]);

        $res = $this->getJson('/api/v1/settings/public');
        $res->assertOk();
        $this->assertSame('Sale week', $res->json('home_content.hero.badge'));
        $this->assertSame([7, 8], $res->json('home_boost_ids'));
    }

    /** Admin can bulk-save home content through the existing settings endpoint. */
    public function test_admin_can_save_home_content(): void
    {
        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    'home_content' => ['sections' => ['banners' => false], 'random_count' => 4],
                    'home_boost_ids' => [3, 1],
                ],
            ]);
        $res->assertOk();
        $res->assertJson(['saved' => true]);

        // Round-trips through the public endpoint as decoded JSON.
        $pub = $this->getJson('/api/v1/settings/public');
        $this->assertFalse($pub->json('home_content.sections.banners'));
        $this->assertSame(4, $pub->json('home_content.random_count'));
        $this->assertSame([3, 1], $pub->json('home_boost_ids'));
    }

    /** /settings/public ships admin-managed pages, contact + socials (no auth). */
    public function test_settings_public_exposes_site_pages_contact_socials(): void
    {
        \App\Models\Setting::create([
            'key' => 'site_pages',
            'value' => json_encode(['privacy' => ['title' => 'Privacy Policy', 'body' => 'We respect you.']]),
            'group' => 'site',
        ]);
        \App\Models\Setting::create([
            'key' => 'contact_info',
            'value' => json_encode(['phone' => '+91 111', 'email' => 'a@b.c', 'address' => 'Road', 'hours' => '9-5']),
            'group' => 'site',
        ]);
        \App\Models\Setting::create([
            'key' => 'social_links',
            'value' => json_encode([['network' => 'Instagram', 'url' => 'https://instagram.com/x']]),
            'group' => 'site',
        ]);

        $res = $this->getJson('/api/v1/settings/public');
        $res->assertOk();
        $this->assertSame('We respect you.', $res->json('site_pages.privacy.body'));
        $this->assertSame('+91 111', $res->json('contact_info.phone'));
        $this->assertSame('Instagram', $res->json('social_links.0.network'));
    }

    /** Admin can bulk-save pages + footer through the existing settings endpoint. */
    public function test_admin_can_save_site_pages(): void
    {
        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    'site_pages' => ['terms' => ['title' => 'Terms', 'body' => 'Be nice.']],
                    'contact_info' => ['phone' => '+91 222'],
                    'social_links' => [['network' => 'X', 'url' => 'https://x.com/y']],
                ],
            ]);
        $res->assertOk();
        $res->assertJson(['saved' => true]);

        $pub = $this->getJson('/api/v1/settings/public');
        $this->assertSame('Be nice.', $pub->json('site_pages.terms.body'));
        $this->assertSame('+91 222', $pub->json('contact_info.phone'));
        $this->assertSame('https://x.com/y', $pub->json('social_links.0.url'));
    }
}
