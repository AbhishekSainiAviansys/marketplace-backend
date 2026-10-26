<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

class StudentFlowTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();
        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name', 150);
            $t->string('email')->nullable()->unique();
            $t->string('whatsapp', 20)->nullable()->unique();
            $t->string('phone_country_code', 8)->nullable();
            $t->string('phone_e164', 32)->nullable();
            $t->string('password');
            $t->string('role', 20)->default('student');
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
        Schema::create('addresses', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('label', 60)->default('home');
            $t->string('line1', 255)->nullable();
            $t->string('line2', 255)->nullable();
            $t->string('city', 120)->nullable();
            $t->string('state', 120)->nullable();
            $t->string('country', 120)->nullable();
            $t->string('pincode', 10)->nullable();
            $t->string('phone', 20)->nullable();
            $t->timestamps();
        });
        Schema::create('notifications', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->text('body')->nullable();
            $t->string('type', 60)->nullable();
            $t->boolean('is_read')->default(false);
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
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
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('placed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id();
            $t->string('name', 150);
            $t->integer('stock')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('carts', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique('user_id');
        });
        Schema::create('cart_items', function ($t) {
            $t->id();
            $t->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
            $t->unique(['cart_id', 'product_id']);
        });
        Schema::create('wishlist_items', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['user_id', 'product_id']);
        });

    }
    protected function tearDown(): void {
        Schema::dropAllTables();
        parent::tearDown();
    }

    public function test_student_registration_order_and_admin_visibility(): void {
        $reg = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test Student',
            'email' => 'student@test.local',
            'whatsapp' => '9999999999',
            'password' => 'secret123',
            'role' => 'student',
        ]);
        $reg->assertCreated();
        $token = $reg->json('token');
        $this->assertNotEmpty($token);

        $studentUser = User::where('email', 'student@test.local')->firstOrFail();

        $orderRes = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/student/orders', [
                'items' => [['name'=>'Book','qty'=>2,'price'=>100]],
                'total' => 200,
                'pay_mode' => 'COD',
                'delivery' => 'pickup',
                'address' => 'Home',
            ]);
        $orderRes->assertCreated();
        $this->assertSame('Placed', $orderRes->json('status'));

        $adminUser = User::create(['name'=>'Admin','email'=>'admin@test.local','password'=>bcrypt('secret'),'role'=>'admin','is_active'=>true]);

        $list = $this->actingAs($adminUser, 'sanctum')
            ->getJson('/api/v1/admin/students?search=Test Student');
        $list->assertOk();
        $this->assertSame(1, $list->json('total'));
        $this->assertSame(1, $list->json('data.0.orders_count'));

        $studentId = $list->json('data.0.id');
        $show = $this->actingAs($adminUser, 'sanctum')
            ->getJson('/api/v1/admin/students/'.$studentId);
        $show->assertOk();
        $this->assertSame('Test Student', $show->json('name'));
        $this->assertCount(1, $show->json('orders'));

        $this->actingAs($studentUser, 'sanctum')
            ->getJson('/api/v1/admin/students')
            ->assertForbidden();

        $this->actingAs($adminUser, 'sanctum')
            ->postJson('/api/v1/student/orders', ['items'=>[['name'=>'x','qty'=>1,'price'=>1]],'total'=>1])
            ->assertForbidden();
    }

    public function test_cart_wishlist_and_stock_validation(): void {
        $student = User::create(['name'=>'Stu','email'=>'stu@test.local','password'=>bcrypt('secret'),'role'=>'student','is_active'=>true]);
        $product = \App\Models\Product::create(['name'=>'Book','stock'=>5,'is_active'=>true]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/cart/items', ['product_id'=>$product->id, 'qty'=>2])
            ->assertCreated();
        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/cart')
            ->assertOk()
            ->assertJsonFragment(['product_id'=>(string)$product->id, 'qty'=>2]);

        $this->actingAs($student, 'sanctum')
            ->patchJson('/api/v1/student/cart/items/'.$product->id, ['qty'=>10])
            ->assertStatus(422);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/wishlist/'.$product->id)
            ->assertCreated();
        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/wishlist')
            ->assertOk()
            ->assertJsonFragment([(string)$product->id]);

        // checkout validates stock and decrements
        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/orders', [
                'items' => [['id'=>$product->id, 'name'=>'Book', 'qty'=>2, 'price'=>100]],
                'total' => 200,
            ])
            ->assertCreated();

        $this->assertSame(3, \App\Models\Product::find($product->id)->stock);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/cart')
            ->assertOk()
            ->assertJsonCount(0);
    }
}

