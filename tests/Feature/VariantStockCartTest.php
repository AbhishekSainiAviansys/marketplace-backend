<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class VariantStockCartTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Self-contained schema so the test doesn't depend on the parent DB
        // being fully migrated. We create exactly the tables this test needs.
        if (! Schema::hasTable('users')) {
            Schema::create('users', function ($t) {
                $t->id();
                $t->string('name', 150);
                $t->string('email')->nullable()->unique();
                $t->string('password');
                $t->string('role', 20)->default('student');
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function ($t) {
                $t->id();
                $t->morphs('tokenable');
                $t->string('name');
                $t->string('token', 64)->unique();
                $t->text('abilities')->nullable();
                $t->timestamp('expires_at')->nullable();
                $t->timestamp('last_used_at')->nullable();
                $t->timestamps();
            });
        }

        if (! Schema::hasTable('products')) {
            Schema::create('products', function ($t) {
                $t->id();
                $t->string('product_code', 32)->nullable()->unique();
                $t->string('name');
                $t->integer('stock')->default(0);
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        if (! Schema::hasTable('carts')) {
            Schema::create('carts', function ($t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->timestamps();
                $t->unique('user_id');
            });
        }

        if (! Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function ($t) {
                $t->id();
                $t->foreignId('cart_id')->constrained()->cascadeOnDelete();
                $t->foreignId('product_id')->constrained()->cascadeOnDelete();
                $t->string('color', 60)->nullable();
                $t->string('size', 60)->nullable();
                $t->string('option_key', 64)->default('default');
                $t->unsignedInteger('qty')->default(1);
                $t->timestamps();
                $t->unique(['cart_id', 'product_id', 'option_key']);
            });
        }

        if (! Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function ($t) {
                $t->id();
                $t->unsignedBigInteger('product_id');
                $t->string('size', 60)->nullable();
                $t->string('color', 60)->nullable();
                $t->string('sku', 60)->nullable();
                $t->decimal('price', 10, 2)->nullable();
                $t->integer('stock')->default(0);
                $t->timestamps();
            });
        }
    }

    public function test_cart_add_uses_variant_stock_when_color_and_size_are_sent(): void
    {
        $this->addToCartWithVariantStock(
            productStock: 99,
            variantStock: null,
            color: null,
            size: null,
            addQty: 1,
            expectedQty: 1,
            expectCreated: true,
            expectMessage: null,
        );

        $this->addToCartWithVariantStock(
            productStock: 99,
            variantStock: 10,
            color: 'Red',
            size: '500ml',
            addQty: 5,
            expectedQty: 5,
            expectCreated: true,
            expectMessage: null,
        );

        $this->addToCartWithVariantStock(
            productStock: 99,
            variantStock: 10,
            color: 'Red',
            size: '500ml',
            addQty: 1,
            expectedQty: 1,
            expectCreated: true,
            expectMessage: null,
        );

        $this->addToCartWithVariantStock(
            productStock: 99,
            variantStock: 10,
            color: 'Red',
            size: '500ml',
            addQty: 11,
            expectedQty: null,
            expectCreated: false,
            expectMessage: '10',
        );
    }

    public function test_cart_variant_migration_allows_distinct_option_lines(): void
    {
        Schema::drop('cart_items');
        Schema::create('cart_items', function ($t) {
            $t->id();
            $t->unsignedBigInteger('cart_id');
            $t->unsignedBigInteger('product_id');
            $t->string('color', 60)->nullable();
            $t->string('size', 60)->nullable();
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
            $t->unique(['cart_id', 'product_id']);
            $t->unique(['cart_id', 'product_id', 'color', 'size'], 'cart_items_unique_line');
        });

        $migration = require database_path('migrations/2026_11_02_000004_add_option_key_to_cart_items.php');
        $migration->up();
        $indexNames = collect(Schema::getIndexes('cart_items'))->pluck('name');

        $this->assertTrue(Schema::hasColumn('cart_items', 'color'));
        $this->assertTrue(Schema::hasColumn('cart_items', 'size'));
        $this->assertTrue(Schema::hasColumn('cart_items', 'option_key'));
        $this->assertFalse($indexNames->contains('cart_items_cart_id_product_id_unique'));
        $this->assertTrue($indexNames->contains('cart_items_option_key_unique'));

        \DB::table('cart_items')->insert([
            ['cart_id' => 1, 'product_id' => 1, 'color' => 'Red', 'size' => 'M', 'option_key' => 'red-m', 'qty' => 1],
            ['cart_id' => 1, 'product_id' => 1, 'color' => 'Blue', 'size' => 'L', 'option_key' => 'blue-l', 'qty' => 1],
        ]);
        $this->assertSame(2, \DB::table('cart_items')->where('cart_id', 1)->where('product_id', 1)->count());
    }

    public function test_cart_keeps_different_variant_choices_as_separate_lines(): void
    {
        $student = User::create([
            'name' => 'Variant Student',
            'email' => 'variant.lines.'.$this->getUniqueSuffix().'@test.local',
            'password' => bcrypt('secret'),
            'role' => 'student',
            'is_active' => true,
        ]);
        $product = Product::create([
            'product_code' => 'PRD-LINES-'.$this->getUniqueSuffix(),
            'name' => 'Cotton Shirt',
            'stock' => 15,
            'is_active' => true,
        ]);
        $product->variants()->create(['color' => 'Red', 'size' => 'M', 'stock' => 5]);
        $product->variants()->create(['color' => 'Blue', 'size' => 'L', 'stock' => 10]);
        $token = $student->createToken('test')->plainTextToken;

        foreach ([['Red', 'M'], ['Blue', 'L']] as [$color, $size]) {
            $this->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/student/cart/items', [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'color' => $color,
                    'size' => $size,
                ])
                ->assertCreated();
        }

        $cart = Cart::where('user_id', $student->id)->firstOrFail();
        $this->assertSame(2, CartItem::where('cart_id', $cart->id)->count());
        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'color' => 'Red',
            'size' => 'M',
        ]);
        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'color' => 'Blue',
            'size' => 'L',
        ]);
    }

    private function addToCartWithVariantStock(
        int $productStock,
        ?int $variantStock,
        ?string $color,
        ?string $size,
        int $addQty,
        ?int $expectedQty,
        bool $expectCreated,
        ?string $expectMessage,
    ): void {
        $student = User::create([
            'name' => 'Variant Student',
            'email' => 'variant.student'.$this->getUniqueSuffix().'@test.local',
            'password' => bcrypt('secret'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $product = Product::create([
            'product_code' => 'PRD000099-'.$this->getUniqueSuffix(),
            'name' => 'Milton Water Bottle',
            'stock' => $productStock,
            'is_active' => true,
        ]);

        if ($variantStock !== null) {
            $product->variants()->create([
                'size' => $size,
                'color' => $color,
                'sku' => 'BOTTLE-R-500',
                'price' => 120.00,
                'stock' => $variantStock,
            ]);
        }

        $token = $student->createToken('test')->plainTextToken;

        $payload = [
            'product_id' => $product->id,
            'qty' => $addQty,
        ];
        if ($color !== null && $size !== null) {
            $payload['color'] = $color;
            $payload['size'] = $size;
        }

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/student/cart/items', $payload);

        if ($expectCreated) {
            $response->assertCreated();
            if ($expectedQty !== null) {
                $this->assertEquals($expectedQty, $response->json('qty'));
            }
        } else {
            $response->assertStatus(422);
            if ($expectMessage !== null) {
                $this->assertStringContainsString($expectMessage, $response->json('message'));
            }
        }
    }

    private function getUniqueSuffix(): string
    {
        return (string) Str::random(6);
    }
}
