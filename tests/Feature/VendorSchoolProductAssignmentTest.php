<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\School;
use App\Models\SubCategory;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VendorSchoolProductAssignmentTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('password');
            $table->string('role', 20);
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('personal_access_tokens', function ($table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
        Schema::create('vendors', function ($table) {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->string('shop_name');
            $table->decimal('commission_default', 5, 2)->default(0);
            $table->string('onboarding_status')->default('approved');
            $table->timestamps();
        });
        Schema::create('schools', function ($table) {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->string('school_code')->unique();
            $table->string('name');
            $table->boolean('is_independent')->default(true);
            $table->string('onboarding_status')->default('approved');
            $table->timestamps();
        });
        Schema::create('school_vendor', function ($table) {
            $table->id();
            $table->foreignId('school_id');
            $table->foreignId('vendor_id');
            $table->decimal('royalty_percent', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['school_id', 'vendor_id']);
        });
        Schema::create('categories', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('sub_categories', function ($table) {
            $table->id();
            $table->unsignedBigInteger('category_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('portal_charge_type', 16)->default('fixed');
            $table->decimal('portal_charge_value', 10, 2)->default(0);
            $table->string('server_charge_type', 16)->default('fixed');
            $table->decimal('server_charge_value', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('products', function ($table) {
            $table->id();
            $table->string('product_code', 32)->nullable()->unique();
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('sub_category_id')->nullable();
            $table->string('created_by_type', 20);
            $table->unsignedBigInteger('created_by_id');
            $table->unsignedBigInteger('school_id')->nullable();
            $table->unsignedBigInteger('vendor_id')->nullable();
            $table->string('name');
            $table->string('sku', 60)->nullable()->unique();
            $table->decimal('price', 10, 2);
            $table->decimal('mrp', 10, 2)->nullable();
            $table->decimal('delivery_charge', 10, 2)->nullable();
            $table->decimal('portal_charge', 10, 2)->nullable();
            $table->decimal('server_charge', 10, 2)->nullable();
            $table->decimal('assignment_charge', 10, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->boolean('is_variant')->default(false);
            $table->string('delivery_mode')->default('self');
            $table->text('payment_split')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_boost')->default(false);
            $table->timestamp('boost_until')->nullable();
            $table->timestamps();
        });
        Schema::create('product_images', function ($table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('url');
            $table->boolean('is_primary')->default(false);
        });
        Schema::create('product_values', function ($table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('field_id');
            $table->text('value_text')->nullable();
        });
        Schema::create('product_variants', function ($table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('size')->nullable();
            $table->string('color')->nullable();
            $table->string('sku')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('stock')->default(0);
        });
        Schema::create('product_stock', function ($table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->string('colour')->nullable();
            $table->string('color')->nullable();
            $table->string('color_code', 7)->nullable();
            $table->string('size')->nullable();
            $table->integer('quantity')->default(0);
            $table->integer('stock')->default(0);
            $table->integer('qty')->default(0);
            $table->timestamps();
        });
        Schema::create('stock_tracking', function ($table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->string('colour')->nullable();
            $table->string('color')->nullable();
            $table->string('color_code', 7)->nullable();
            $table->string('size')->nullable();
            $table->integer('delta')->default(0);
            $table->integer('quantity')->default(0);
            $table->string('reason')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropAllTables();
        parent::tearDown();
    }

    public function test_vendor_can_assign_product_to_active_linked_school(): void
    {
        [$vendor, $token] = $this->makeVendor();
        $school = $this->makeSchool();
        $this->link($school, $vendor);
        $subCategory = $this->makeSubCategory('vendor-assignment');

        $response = $this->withToken($token)->postJson('/api/v1/vendor/products', [
            'category_id' => $subCategory->category_id,
            'sub_category_id' => $subCategory->id,
            'name' => 'Vendor workbook',
            'price' => 100,
            'assign_to_school' => true,
            'school_id' => $school->id,
            'assignment_charge' => 4.5,
            'images' => ['/products/vendor-workbook.jpg'],
        ]);

        $response->assertCreated();
        $product = Product::query()->firstOrFail();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'vendor_id' => $vendor->id,
            'school_id' => $school->id,
            'price' => '100.00',
            'portal_charge' => '5.00',
            'server_charge' => '3.00',
            'assignment_charge' => '4.50',
        ]);

        $this->withToken($token)->getJson('/api/v1/vendor/products')
            ->assertOk()
            ->assertJsonPath('data.0.school.name', $school->name)
            ->assertJsonPath('data.0.assignment_charge', '4.50');

        $this->withToken($token)->getJson('/api/v1/vendor/products/'.$product->product_code)
            ->assertOk()
            ->assertJsonPath('school_id', $school->id)
            ->assertJsonPath('sub_category_id', $subCategory->id);
    }

    public function test_school_can_assign_product_to_active_linked_vendor(): void
    {
        $school = $this->makeSchool();
        $vendor = $this->makeVendorProfile();
        $this->link($school, $vendor);
        $subCategory = $this->makeSubCategory('school-assignment');
        $token = $school->user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/v1/school/products', [
            'category_id' => $subCategory->category_id,
            'sub_category_id' => $subCategory->id,
            'name' => 'School workbook',
            'price' => 100,
            'assign_to_vendor' => true,
            'vendor_id' => $vendor->id,
            'assignment_charge' => 6,
            'images' => ['/products/school-workbook.jpg'],
        ]);

        $response->assertCreated();
        $product = Product::query()->firstOrFail();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'school_id' => $school->id,
            'vendor_id' => $vendor->id,
            'assignment_charge' => '6.00',
        ]);

        $this->withToken($token)->getJson('/api/v1/school/products')
            ->assertOk()
            ->assertJsonPath('data.0.vendor.shop_name', $vendor->shop_name)
            ->assertJsonPath('data.0.assignment_charge', '6.00');

        $this->withToken($token)->getJson('/api/v1/school/products/'.$product->product_code)
            ->assertOk()
            ->assertJsonPath('vendor_id', $vendor->id);
    }

    public function test_role_product_assignment_rejects_unlinked_counterpart(): void
    {
        [$vendor, $token] = $this->makeVendor();
        $school = $this->makeSchool();
        $subCategory = $this->makeSubCategory('unlinked-assignment');

        $this->withToken($token)->postJson('/api/v1/vendor/products', [
            'category_id' => $subCategory->category_id,
            'sub_category_id' => $subCategory->id,
            'name' => 'Unlinked workbook',
            'price' => 100,
            'assign_to_school' => true,
            'school_id' => $school->id,
            'assignment_charge' => 4,
            'images' => ['/products/unlinked-workbook.jpg'],
        ])->assertInvalid(['school_id']);

        $this->assertDatabaseCount('products', 0);
    }

    /** @return array{Vendor, string} */
    private function makeVendor(): array
    {
        $vendor = $this->makeVendorProfile();

        return [$vendor, $vendor->user->createToken('test')->plainTextToken];
    }

    private function makeVendorProfile(): Vendor
    {
        $user = User::create([
            'name' => 'Vendor',
            'email' => 'vendor'.uniqid().'@example.test',
            'password' => bcrypt('secret'),
            'role' => 'vendor',
            'is_active' => true,
        ]);

        return Vendor::create([
            'user_id' => $user->id,
            'shop_name' => 'Vendor Store',
            'onboarding_status' => 'approved',
        ]);
    }

    private function makeSchool(): School
    {
        $user = User::create([
            'name' => 'School',
            'email' => 'school'.uniqid().'@example.test',
            'password' => bcrypt('secret'),
            'role' => 'school',
            'is_active' => true,
        ]);

        return School::create([
            'user_id' => $user->id,
            'school_code' => 'S'.uniqid(),
            'name' => 'School One',
            'is_independent' => true,
            'onboarding_status' => 'approved',
        ]);
    }

    private function link(School $school, Vendor $vendor, bool $isActive = true): void
    {
        \DB::table('school_vendor')->insert([
            'school_id' => $school->id,
            'vendor_id' => $vendor->id,
            'royalty_percent' => 0,
            'is_active' => $isActive,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function makeSubCategory(string $suffix): SubCategory
    {
        $category = Category::create([
            'name' => 'Books '.$suffix,
            'slug' => 'books-'.$suffix,
            'is_active' => true,
        ]);

        return SubCategory::create([
            'category_id' => $category->id,
            'name' => 'Workbooks '.$suffix,
            'slug' => 'workbooks-'.$suffix,
            'portal_charge_type' => 'percentage',
            'portal_charge_value' => 5,
            'server_charge_type' => 'fixed',
            'server_charge_value' => 3,
            'is_active' => true,
        ]);
    }
}
