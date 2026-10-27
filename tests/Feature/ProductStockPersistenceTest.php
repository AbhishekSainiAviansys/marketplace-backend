<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

class ProductStockPersistenceTest extends TestCase
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

        Schema::create('categories', function ($t) {
            $t->id();
            $t->string('name', 120);
            $t->string('slug')->unique();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('sub_categories', function ($t) { $t->id(); $t->unsignedBigInteger('category_id'); $t->string('name', 120); $t->boolean('is_active')->default(true); $t->timestamps(); });
        Schema::create('product_values', function ($t) { $t->id(); $t->unsignedBigInteger('product_id'); $t->unsignedBigInteger('field_id'); $t->text('value_text')->nullable(); });
        Schema::create('product_variants', function ($t) { $t->id(); $t->unsignedBigInteger('product_id'); $t->string('size', 60)->nullable(); $t->string('color', 60)->nullable(); $t->string('sku', 60)->nullable(); $t->decimal('price', 10, 2)->nullable(); $t->integer('stock')->default(0); });
        Schema::create('products', function ($t) {
            $t->id();
            $t->string('product_code', 32)->nullable()->unique();
            $t->unsignedBigInteger('category_id');
            $t->unsignedBigInteger('sub_category_id')->nullable();
            $t->string('created_by_type', 20);
            $t->unsignedBigInteger('created_by_id');
            $t->unsignedBigInteger('school_id')->nullable();
            $t->unsignedBigInteger('vendor_id')->nullable();
            $t->string('name');
            $t->string('sku', 60)->nullable()->unique();
            $t->decimal('price', 10, 2);
            $t->decimal('mrp', 10, 2)->nullable();
            $t->integer('stock')->default(0);
            $t->string('delivery_mode', 20)->default('self');
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('product_images', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->string('url', 500);
            $t->boolean('is_primary')->default(false);
        });

        Schema::create('stock_tracking', function ($t) { $t->id(); $t->unsignedBigInteger('product_id'); $t->unsignedBigInteger('variant_id')->nullable(); $t->string('colour', 60)->nullable(); $t->string('color', 60)->nullable(); $t->string('size', 60)->nullable(); $t->integer('delta')->default(0); $t->integer('quantity')->default(0); $t->integer('change')->default(0); $t->integer('qty')->default(0); $t->string('reason', 120)->nullable(); $t->timestamp('created_at')->nullable(); });
        Schema::create('product_stock', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->unsignedBigInteger('variant_id')->nullable();
            $t->string('colour', 60)->nullable();
            $t->string('color', 60)->nullable();
            $t->string('size', 60)->nullable();
            $t->integer('quantity')->default(0);
            $t->integer('stock')->default(0);
            $t->integer('qty')->default(0);
            $t->timestamps();
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
            'name' => 'Admin',
            'email' => 'admin'.uniqid().'@test.local',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        return $u->createToken('test')->plainTextToken;
    }

    public function test_admin_product_store_persists_variant_stock_and_tracking(): void
    {
        $cat = \App\Models\Category::create(['name' => 'Books', 'slug' => 'books', 'is_active' => true]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/admin/products', [
                'category_id' => $cat->id,
                'name' => 'Test Product',
                'price' => 100,
                'product_stock' => [
                    ['colour' => 'Red', 'size' => 'M', 'quantity' => 5],
                ],
            ]);

        $res->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product);

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'colour' => 'Red',
            'size' => 'M',
            'quantity' => 5,
        ]);

        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'colour' => 'Red',
            'size' => 'M',
            'delta' => 5,
            'reason' => 'product_created',
        ]);
    }

    public function test_admin_product_update_persists_stock_and_tracking(): void
    {
        $cat = \App\Models\Category::create(['name' => 'Books', 'slug' => 'books', 'is_active' => true]);
        $product = Product::create([
            'category_id' => $cat->id,
            'created_by_type' => 'admin',
            'created_by_id' => 1,
            'name' => 'Test Product',
            'price' => 100,
        ]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->putJson('/api/v1/admin/products/'.$product->id, [
                'stock' => 3,
                'product_stock' => [
                    ['colour' => 'Blue', 'size' => 'L', 'quantity' => 3],
                ],
            ]);

        $res->assertOk();

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'colour' => 'Blue',
            'size' => 'L',
            'quantity' => 3,
        ]);

        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'colour' => 'Blue',
            'size' => 'L',
            'delta' => 3,
            'reason' => 'product_updated',
        ]);
    }

    public function test_admin_product_with_colour_size_stock_and_subcategory_renders_in_list(): void
    {
        $cat = \App\Models\Category::create(['name' => 'Clothing', 'slug' => 'clothing', 'is_active' => true]);
        $sub = \App\Models\SubCategory::create(['category_id' => $cat->id, 'name' => 'Shirts', 'is_active' => true]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/admin/products', [
                'category_id' => $cat->id,
                'sub_category_id' => $sub->id,
                'name' => 'Cotton Shirt',
                'price' => 250,
                'product_stock' => [
                    ['colour' => 'Red', 'size' => 'M', 'quantity' => 4],
                    ['colour' => 'Blue', 'size' => 'L', 'quantity' => 2],
                ],
            ]);

        $res->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product);
        $this->assertEquals($sub->id, $product->sub_category_id);

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id, 'colour' => 'Red', 'size' => 'M', 'quantity' => 4,
        ]);
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id, 'colour' => 'Blue', 'size' => 'L', 'quantity' => 2,
        ]);
        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id, 'colour' => 'Red', 'size' => 'M', 'delta' => 4, 'reason' => 'product_created',
        ]);

        $list = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->getJson('/api/v1/admin/products');

        $list->assertOk();
        $found = collect($list->json('data'))->firstWhere('name', $product->name);
        $this->assertNotNull($found, 'product rendered in admin products list');
        $this->assertEquals($sub->id, $found['sub_category_id']);

        $stocks = $found['product_stocks'] ?? [];
        $this->assertCount(2, $stocks);
        $this->assertNotEmpty(collect($stocks)->firstWhere('colour', 'Red'));
        $this->assertNotEmpty(collect($stocks)->firstWhere('colour', 'Blue'));
    }
}