<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Schema;

class StudentOrderTrackingTest extends TestCase
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
    }

    public function test_student_can_view_tracking_details(): void
    {
        $student = User::create(['name' => 'Track Student', 'email' => 'track@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);

        \DB::table('orders')->insert([
            'user_id' => $student->id,
            'order_code' => 'ORDTRACK001',
            'items' => json_encode([['name' => 'Book', 'qty' => 1, 'price' => 100, 'courier' => 'BlueDart', 'tracking_number' => 'BD123456789IN', 'tracking_url' => 'https://example.com/track/BD123456789IN']]),
            'total' => 100,
            'pay_mode' => 'Online',
            'delivery' => 'Home delivery',
            'address' => 'Home',
            'status' => 'Shipped',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'placed_at' => now(),
            'courier' => 'BlueDart',
            'tracking_number' => 'BD123456789IN',
            'tracking_url' => 'https://example.com/track/BD123456789IN',
            'shipped_at' => now(),
            'admin_note' => 'Handle with care',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/orders/ORDTRACK001');
        $res->assertOk()
            ->assertJsonFragment(['order_code' => 'ORDTRACK001'])
            ->assertJsonFragment(['status' => 'Shipped'])
            ->assertJsonFragment(['payment_status' => 'paid'])
            ->assertJsonFragment(['courier' => 'BlueDart'])
            ->assertJsonFragment(['tracking_number' => 'BD123456789IN'])
            ->assertJsonFragment(['tracking_url' => 'https://example.com/track/BD123456789IN']);

        $list = $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/orders');
        $list->assertOk();
        $this->assertSame('BD123456789IN', $list->json('0.tracking_number'));
        $this->assertSame('BD123456789IN', $res->json('items.0.tracking_number'));
        $this->assertSame('BlueDart', $res->json('items.0.courier'));
    }

    public function test_student_cannot_view_other_students_order(): void
    {
        $student = User::create(['name' => 'A', 'email' => 'a@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);
        $other = User::create(['name' => 'B', 'email' => 'b@test.local', 'password' => bcrypt('secret'), 'role' => 'student', 'is_active' => true]);

        \DB::table('orders')->insert([
            'user_id' => $other->id,
            'order_code' => 'ORDOTHER001',
            'items' => json_encode([]),
            'total' => 10,
            'status' => 'Placed',
            'payment_status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/student/orders/ORDOTHER001')
            ->assertNotFound();
    }
}
