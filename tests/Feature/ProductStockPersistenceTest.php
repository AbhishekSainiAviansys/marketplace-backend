<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\SubCategory;
use App\Models\User;
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

        Schema::create('sub_categories', function ($t) {
            $t->id();
            $t->unsignedBigInteger('category_id');
            $t->string('name', 120);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('product_values', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->unsignedBigInteger('field_id');
            $t->text('value_text')->nullable();
        });
        Schema::create('product_variants', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->string('size', 60)->nullable();
            $t->string('color', 60)->nullable();
            $t->string('sku', 60)->nullable();
            $t->decimal('price', 10, 2)->nullable();
            $t->integer('stock')->default(0);
        });
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
            $t->boolean('is_variant')->default(false);
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

        Schema::create('stock_tracking', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->unsignedBigInteger('variant_id')->nullable();
            $t->string('colour', 60)->nullable();
            $t->string('color', 60)->nullable();
            $t->string('color_code', 7)->nullable();
            $t->string('size', 60)->nullable();
            $t->integer('delta')->default(0);
            $t->integer('quantity')->default(0);
            $t->integer('change')->default(0);
            $t->integer('qty')->default(0);
            $t->string('reason', 120)->nullable();
            $t->timestamp('created_at')->nullable();
        });
        Schema::create('product_stock', function ($t) {
            $t->id();
            $t->unsignedBigInteger('product_id');
            $t->unsignedBigInteger('variant_id')->nullable();
            $t->string('colour', 60)->nullable();
            $t->string('color', 60)->nullable();
            $t->string('color_code', 7)->nullable();
            $t->string('size', 60)->nullable();
            $t->string('option_key', 64)->default('default');
            $t->integer('quantity')->default(0);
            $t->integer('stock')->default(0);
            $t->integer('qty')->default(0);
            $t->timestamps();
        });
        Schema::create('carts', function ($t) {
            $t->id();
            $t->unsignedBigInteger('user_id');
            $t->timestamps();
        });
        Schema::create('cart_items', function ($t) {
            $t->id();
            $t->unsignedBigInteger('cart_id');
            $t->unsignedBigInteger('product_id');
            $t->string('color', 60)->nullable();
            $t->string('size', 60)->nullable();
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->unsignedBigInteger('user_id');
            $t->string('order_code', 32)->unique();
            $t->json('items');
            $t->decimal('total', 12, 2)->default(0);
            $t->string('pay_mode', 50)->nullable();
            $t->string('delivery', 100)->nullable();
            $t->text('address')->nullable();
            $t->string('status', 30)->default('Placed');
            $t->string('payment_status', 20)->default('unpaid');
            $t->string('payment_provider', 30)->nullable();
            $t->string('provider_order_id', 64)->nullable();
            $t->string('payment_ref', 64)->nullable();
            $t->timestamp('placed_at')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
        });
        Schema::create('credentials', function ($t) {
            $t->id();
            $t->string('title');
            $t->string('public')->nullable();
            $t->string('private')->nullable();
            $t->string('api')->nullable();
            $t->text('desc')->nullable();
            $t->string('status')->default('Active');
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
        $cat = Category::create(['name' => 'Books', 'slug' => 'books', 'is_active' => true]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/admin/products', [
                'category_id' => $cat->id,
                'name' => 'Test Product',
                'price' => 100,
                'is_variant' => true,
                'product_stock' => [
                    ['colour' => 'Red', 'color_code' => '#ef4444', 'size' => 'M', 'quantity' => 5],
                ],
            ]);

        $res->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product);

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'colour' => 'Red',
            'color_code' => '#EF4444',
            'size' => 'M',
            'quantity' => 5,
        ]);

        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'colour' => 'Red',
            'color_code' => '#EF4444',
            'size' => 'M',
            'delta' => 5,
            'reason' => 'product_created',
        ]);
    }

    public function test_admin_product_update_persists_stock_and_tracking(): void
    {
        $cat = Category::create(['name' => 'Books', 'slug' => 'books', 'is_active' => true]);
        $product = Product::create([
            'category_id' => $cat->id,
            'created_by_type' => 'admin',
            'created_by_id' => 1,
            'name' => 'Test Product',
            'price' => 100,
        ]);
        $product->is_variant = true;
        $product->save();

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->putJson('/api/v1/admin/products/'.$product->id, [
                'is_variant' => true,
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

    public function test_admin_simple_product_creates_one_stock_row_without_variant_options(): void
    {
        $cat = Category::create(['name' => 'Accessories', 'slug' => 'accessories', 'is_active' => true]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/admin/products', [
                'category_id' => $cat->id,
                'name' => 'Plain Notebook',
                'price' => 80,
                'is_variant' => false,
                'stock' => 7,
                'product_stocks' => [],
            ]);

        $response->assertCreated();
        $product = Product::firstOrFail();
        $this->assertSame(7, (int) $product->stock);
        $this->assertSame(1, \DB::table('product_stock')->where('product_id', $product->id)->count());
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'colour' => null,
            'size' => null,
            'quantity' => 7,
        ]);
        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'delta' => 7,
            'reason' => 'product_created',
        ]);
    }

    public function test_student_order_decrements_the_selected_variant_and_tracks_ordered_stock(): void
    {
        $student = User::create([
            'name' => 'Order Student',
            'email' => 'order.student@test.local',
            'password' => bcrypt('secret'),
            'role' => 'student',
            'is_active' => true,
        ]);
        $category = Category::create(['name' => 'Bottles', 'slug' => 'bottles', 'is_active' => true]);
        $product = Product::create([
            'category_id' => $category->id,
            'created_by_type' => 'vendor',
            'created_by_id' => 1,
            'name' => 'Blue Bottle',
            'price' => 100,
            'stock' => 5,
            'is_active' => true,
        ]);
        $product->is_variant = true;
        $product->save();
        ProductStock::create([
            'product_id' => $product->id,
            'colour' => 'Blue',
            'color' => 'Blue',
            'color_code' => '#3B82F6',
            'size' => '500ml',
            'quantity' => 5,
            'stock' => 5,
            'qty' => 5,
        ]);
        $cart = Cart::create(['user_id' => $student->id]);
        CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'color' => 'Blue',
            'size' => '500ml',
            'qty' => 2,
        ]);
        $token = $student->createToken('test')->plainTextToken;
        $secret = 'local-test-secret';
        \DB::table('credentials')->insert([
            'title' => 'Razorpay',
            'public' => 'test-key',
            'private' => $secret,
            'status' => 'Active',
        ]);
        $providerOrderId = 'order_local_test_1';
        $paymentId = 'pay_local_test_1';

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/student/payments/razorpay/verify', [
                'razorpay_order_id' => $providerOrderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => hash_hmac('sha256', $providerOrderId.'|'.$paymentId, $secret),
                'items' => [[
                    'id' => $product->id,
                    'qty' => 2,
                    'price' => 100,
                    'color' => 'Blue',
                    'size' => '500ml',
                ]],
                'total' => 200,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'colour' => 'Blue',
            'color_code' => '#3B82F6',
            'size' => '500ml',
            'quantity' => 3,
            'stock' => 3,
            'qty' => 3,
        ]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'colour' => 'Blue',
            'color_code' => '#3B82F6',
            'size' => '500ml',
            'delta' => -2,
            'reason' => 'ordered',
        ]);
        $this->assertDatabaseMissing('cart_items', ['cart_id' => $cart->id]);
    }

    public function test_student_order_decrements_simple_product_stock_without_options(): void
    {
        $student = User::create([
            'name' => 'Simple Order Student',
            'email' => 'simple.order.student@test.local',
            'password' => bcrypt('secret'),
            'role' => 'student',
            'is_active' => true,
        ]);
        $category = Category::create(['name' => 'Notebooks', 'slug' => 'notebooks', 'is_active' => true]);
        $product = Product::create([
            'category_id' => $category->id,
            'created_by_type' => 'vendor',
            'created_by_id' => 1,
            'name' => 'Plain Notebook',
            'price' => 80,
            'stock' => 4,
            'is_active' => true,
        ]);
        ProductStock::create([
            'product_id' => $product->id,
            'quantity' => 4,
            'stock' => 4,
            'qty' => 4,
        ]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/student/orders', [
                'items' => [['id' => $product->id, 'qty' => 3, 'price' => 80]],
                'total' => 240,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'quantity' => 1,
            'stock' => 1,
            'qty' => 1,
        ]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
        $this->assertDatabaseHas('stock_tracking', [
            'product_id' => $product->id,
            'delta' => -3,
            'reason' => 'ordered',
        ]);
    }

    public function test_admin_product_with_colour_size_stock_and_subcategory_renders_in_list(): void
    {
        $cat = Category::create(['name' => 'Clothing', 'slug' => 'clothing', 'is_active' => true]);
        $sub = SubCategory::create(['category_id' => $cat->id, 'name' => 'Shirts', 'is_active' => true]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/admin/products', [
                'category_id' => $cat->id,
                'sub_category_id' => $sub->id,
                'name' => 'Cotton Shirt',
                'price' => 250,
                'is_variant' => true,
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
