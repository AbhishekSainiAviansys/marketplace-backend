<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

class InvoiceDownloadTest extends TestCase
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
        Schema::create('orders', function ($t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('order_code', 32)->unique();
            $t->json('items')->nullable();
            $t->decimal('total', 12, 2)->default(0);
            $t->string('pay_mode', 50)->nullable();
            $t->string('delivery', 100)->nullable();
            $t->text('address')->nullable();
            $t->string('status', 30)->default('Placed');
            $t->string('payment_status', 20)->default('unpaid');
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('placed_at')->nullable();
            $t->string('tracking_number', 120)->nullable();
            $t->string('courier', 120)->nullable();
            $t->string('tracking_url', 500)->nullable();
            $t->timestamp('shipped_at')->nullable();
            $t->timestamp('delivered_at')->nullable();
            $t->timestamp('cancelled_at')->nullable();
            $t->timestamp('refunded_at')->nullable();
            $t->string('refund_ref', 120)->nullable();
            $t->text('admin_note')->nullable();
            $t->timestamp('last_notified_at')->nullable();
            $t->timestamps();
        });
        Schema::create('products', function ($t) {
            $t->id();
            $t->string('name', 150);
            $t->integer('stock')->default(0);
            $t->boolean('is_active')->default(true);
            $t->string('created_by_type', 20)->nullable();
            $t->timestamps();
        });
        Schema::create('settings', function ($t) {
            $t->string('key', 120)->primary();
            $t->text('value')->nullable();
            $t->string('group', 60)->default('general');
            $t->boolean('is_secret')->default(false);
        });
    }

    public function test_student_can_download_invoice(): void
    {
        $student = User::create(['name' => 'Inv Student', 'email' => 'inv@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);

        \DB::table('orders')->insert([
            'user_id' => $student->id,
            'order_code' => 'ORDINV001',
            'items' => json_encode([['name' => 'Book', 'qty' => 2, 'price' => 50]]),
            'total' => 100,
            'pay_mode' => 'Online',
            'delivery' => 'Home delivery',
            'address' => 'Home',
            'status' => 'Placed',
            'payment_status' => 'paid',
            'placed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->actingAs($student, 'sanctum')
            ->get('/api/v1/student/orders/ORDINV001/invoice');

        $res->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $res->headers->get('Content-Type'));
        $this->assertNotEmpty($res->getContent());
    }

    public function test_student_cannot_download_other_invoice(): void
    {
        $student = User::create(['name' => 'A', 'email' => 'a2@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);
        $other = User::create(['name' => 'B', 'email' => 'b2@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);

        \DB::table('orders')->insert([
            'user_id' => $other->id,
            'order_code' => 'ORDOTHERINV',
            'items' => json_encode([]),
            'total' => 10,
            'status' => 'Placed',
            'payment_status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->get('/api/v1/student/orders/ORDOTHERINV/invoice')
            ->assertNotFound();
    }
    public function test_admin_can_download_invoice(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admininv@test.local', 'password' => bcrypt('secret'), 'role' => 'admin', 'is_active' => true]);
        $student = User::create(['name' => 'Student', 'email' => 'studentinv@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);

        $productId = \DB::table('products')->insertGetId([
            'name' => 'Admin Product',
            'stock' => 5,
            'is_active' => true,
            'created_by_type' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $orderId = \DB::table('orders')->insertGetId([
            'user_id' => $student->id,
            'order_code' => 'ORDADMININV',
            'items' => json_encode([['id' => $productId, 'name' => 'Admin Product', 'qty' => 1, 'price' => 75]]),
            'total' => 75,
            'status' => 'Placed',
            'payment_status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $res = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/admin/orders/' . $orderId . '/invoice');

        $res->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $res->headers->get('Content-Type'));
        $this->assertNotEmpty($res->getContent());
    }


}
