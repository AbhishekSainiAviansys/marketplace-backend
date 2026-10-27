<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class PaymentApiTest extends TestCase
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
        Schema::create('products', function ($t) {
            $t->id(); $t->string('product_code',32)->nullable()->unique();
            $t->string('name', 150);
            $t->integer('stock')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->foreignId('user_id');
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
            $t->string('title', 120);
            $t->text('public')->nullable();
            $t->text('private')->nullable();
            $t->text('api')->nullable();
            $t->text('desc')->nullable();
            $t->string('status', 30)->default('Active');
        });
        Schema::create('carts', function ($t) {
            $t->id();
            $t->foreignId('user_id');
            $t->timestamps();
            $t->unique('user_id');
        });
        Schema::create('cart_items', function ($t) {
            $t->id();
            $t->foreignId('cart_id');
            $t->foreignId('product_id');
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
        });
        Schema::create('settings', function ($t) {
            $t->string('key', 120)->primary();
            $t->text('value')->nullable();
            $t->string('group', 60)->default('general');
            $t->boolean('is_secret')->default(false);
        });
        Schema::create('payment_logs', function ($t) {
            $t->id();
            $t->string('event', 60)->nullable();
            $t->text('payload')->nullable();
            $t->timestamp('created_at')->nullable();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    private function student(): User
    {
        return User::create([
            'name' => 'Student',
            'email' => 'student@test.local',
            'password' => bcrypt('secret'),
            'role' => 'student',
            'is_active' => true,
        ]);
    }

    private function seedCredentials(string $secret = 'testsecret', ?string $webhookSecret = null): void
    {
        \DB::table('credentials')->insert([
            'title' => 'razorpay api test mode',
            'public' => 'rzp_test_key',
            'private' => $secret,
            'api' => $webhookSecret ?? '',
            'desc' => '',
            'status' => 'Active',
        ]);
    }
    public function test_create_order_returns_razorpay_payload(): void
    {
        $this->seedCredentials();
        $student = $this->student();

        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => 'order_test_123',
                'amount' => 20000,
                'currency' => 'INR',
            ], 200),
        ]);

        $res = $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/payments/razorpay/order', [
                'amount' => 200,
                'currency' => 'INR',
                'receipt' => 'rcpt_1',
            ]);

        $res->assertOk();
        $res->assertJson([
            'key_id' => 'rzp_test_key',
            'razorpay_order_id' => 'order_test_123',
            'amount' => 20000,
            'currency' => 'INR',
        ]);
    }

    public function test_verify_creates_paid_order_and_decrements_stock(): void
    {
        $secret = 'testsecret';
        $this->seedCredentials($secret);
        $student = $this->student();
        $product = Product::create(['name' => 'Book', 'stock' => 5, 'is_active' => true]);

        $orderId = 'order_verify_1';
        $paymentId = 'pay_verify_1';
        $signature = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);

        $res = $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/payments/razorpay/verify', [
                'razorpay_order_id' => $orderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $signature,
                'items' => [['id' => $product->id, 'qty' => 2, 'price' => 100]],
                'total' => 200,
                'pay_mode' => 'Online',
            ]);

        $res->assertCreated();
        $this->assertSame('paid', $res->json('payment_status'));
        $this->assertSame('razorpay', $res->json('payment_provider'));
        $this->assertSame($orderId, $res->json('provider_order_id'));
        $this->assertSame($paymentId, $res->json('payment_ref'));
        $this->assertSame(3, Product::find($product->id)->stock);
    }

    public function test_verify_rejects_invalid_signature_without_side_effects(): void
    {
        $this->seedCredentials('testsecret');
        $student = $this->student();
        $product = Product::create(['name' => 'Book', 'stock' => 5, 'is_active' => true]);

        $res = $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/student/payments/razorpay/verify', [
                'razorpay_order_id' => 'order_bad',
                'razorpay_payment_id' => 'pay_bad',
                'razorpay_signature' => 'definitely-wrong',
                'items' => [['id' => $product->id, 'qty' => 2, 'price' => 100]],
                'total' => 200,
            ]);

        $res->assertStatus(422);
        $this->assertSame(5, Product::find($product->id)->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_verify_is_idempotent_for_same_razorpay_order(): void
    {
        $secret = 'testsecret';
        $this->seedCredentials($secret);
        $student = $this->student();
        $product = Product::create(['name' => 'Book', 'stock' => 5, 'is_active' => true]);

        $orderId = 'order_idem';
        $paymentId = 'pay_idem';
        $signature = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);

        $payload = [
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $signature,
            'items' => [['id' => $product->id, 'qty' => 1, 'price' => 100]],
            'total' => 100,
        ];

        $first = $this->actingAs($student, 'sanctum')->postJson('/api/v1/student/payments/razorpay/verify', $payload);
        $first->assertCreated();

        $stockAfterFirst = Product::find($product->id)->stock;
        $second = $this->actingAs($student, 'sanctum')->postJson('/api/v1/student/payments/razorpay/verify', $payload);
        $second->assertOk();
        $this->assertSame($stockAfterFirst, Product::find($product->id)->stock);
        $this->assertSame(1, Order::count());
    }

    public function test_webhook_updates_order_payment_status(): void
    {
        $secret = 'whsec_test';
        $this->seedCredentials('testsecret', $secret);

        $student = $this->student();
        Order::create([
            'user_id' => $student->id,
            'order_code' => 'ORDWEBHOOK',
            'items' => [],
            'total' => 100,
            'status' => 'Placed',
            'payment_status' => 'unpaid',
            'provider_order_id' => 'order_webhook_1',
            'placed_at' => now(),
        ]);

        $payload = json_encode([
            'event' => 'payment.captured',
            'payload' => ['payment' => ['entity' => ['id' => 'pay_webhook_1', 'order_id' => 'order_webhook_1']]],
        ]);
        $signature = hash_hmac('sha256', $payload, $secret);

        $res = $this->call('POST', '/api/v1/payments/webhook', [], [], [], [
            'HTTP_X_RAZORPAY_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $payload);

        $res->assertOk();
        $order = Order::where('provider_order_id', 'order_webhook_1')->first();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('pay_webhook_1', $order->payment_ref);
    }

    public function test_webhook_rejects_bad_signature(): void
    {
        $this->seedCredentials('testsecret', 'whsec_test');

        $payload = json_encode(['event' => 'payment.captured', 'payload' => []]);
        $res = $this->call('POST', '/api/v1/payments/webhook', [], [], [], [
            'HTTP_X_RAZORPAY_SIGNATURE' => 'bad',
            'CONTENT_TYPE' => 'application/json',
        ], $payload);

        $res->assertStatus(400);
    }
}

