<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\CategoryField;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductValue;
use App\Models\ProductVariant;
use App\Models\School;
use App\Models\SubCategory;
use App\Models\User;
use App\Models\Vendor;
use App\Traits\ManagesProductStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    use ManagesProductStock;

    // GET /admin/dashboard - panel counters. Was missing: the Admin UI already
    // called /admin/dashboard and always fell back to "API offline".
    public function dashboard()
    {
        return response()->json([
            'vendors_count' => User::where('role', 'vendor')->count(),
            'schools_count' => School::count(),
            'products_count' => Product::count(),
            'categories_count' => Category::count(),
            'assignments_count' => \DB::table('school_vendor')->count(),
        ]);
    }

    /**
     * Where-clause for ?country_id=&state_id=&district_id= against the
     * onboarding JSON both wizards write (vendors: business.*, schools:
     * institution.*). Values were saved as strings ('105') or ints (105)
     * depending on the wizard version, so both spellings are matched.
     *
     * NOTE: the JSON path must use nested arrows ("onboarding->business->
     * country_id"). A dotted path ("onboarding->business.country_id") is
     * quoted as a SINGLE key by the query grammar and compiles to
     * json_extract(onboarding, '$."business.country_id"'), which never
     * matches - the location filters silently returned zero rows.
     */
    private function locationFilter($q, string $relation, string $group, Request $r)
    {
        $params = [];
        foreach (['country_id', 'state_id', 'district_id'] as $p) {
            if ($r->filled($p)) {
                $params[$p] = $r->input($p);
            }
        }

        if (empty($params)) {
            return $q;
        }

        // Addresses are stored on the User (addresses.user_id), and the admin
        // list queries are rooted on User, so the relation is always 'addresses'.
        $addressRelation = 'addresses';

        $q->where(function ($outer) use ($relation, $group, $params, $addressRelation) {
            // Branch A: onboarding JSON (existing behaviour).
            $outer->whereHas($relation, function ($w) use ($group, $params) {
                foreach ($params as $param => $v) {
                    $path = "onboarding->{$group}->{$param}";
                    $w->where(function ($x) use ($path, $v) {
                        $x->where($path, (string) $v)
                            ->orWhere($path, (int) $v);
                    });
                }
            });

            // Branch B: a saved address row (single-address upsert flow).
            // Only apply when the addresses table exists (keeps unit tests
            // that don't create it passing).
            if (Schema::hasTable('addresses')) {
                $outer->orWhereHas($addressRelation, function ($w) use ($params) {
                    foreach ($params as $param => $v) {
                        $w->where(function ($x) use ($param, $v) {
                            $x->where($param, (string) $v)
                                ->orWhere($param, (int) $v);
                        });
                    }
                });
            }
        });

        return $q;
    }

    public function index(Request $r)
    {
        $q = User::where('role', 'vendor')->with('vendor')
            ->orderByDesc('users.created_at');
        if ($r->filled('status')) {
            $q->whereHas('vendor', fn ($w) => $w->where('onboarding_status', $r->string('status')));
        }
        // ?search= matches shop name, owner name, email or whatsapp.
        // ?country_id=&state_id=&district_id= match business.* inside onboarding JSON.
        $q = $this->locationFilter($q, 'vendor', 'business', $r);
        if ($r->filled('search')) {
            $s = $r->string('search');
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('whatsapp', 'like', "%{$s}%")
                    ->orWhereHas('vendor', fn ($x) => $x->where('shop_name', 'like', "%{$s}%"));
            });
        }

        $page = $q->paginate(20);
        // Products-per-vendor for the rows on this page (one grouped query -
        // nested withCount dot-notation is unreliable across versions).
        $vids = $page->getCollection()->pluck('vendor.id')->filter()->all();
        $counts = $vids
            ? Product::whereIn('vendor_id', $vids)->groupBy('vendor_id')->selectRaw('vendor_id, COUNT(*) c')->pluck('c', 'vendor_id')
            : [];
        foreach ($page->getCollection() as $u) {
            $u->products_count = (int) ($counts[$u->vendor->id] ?? 0);
        }

        return $page;
    }

    /** GET /admin/vendors/stats - per-status counts for the list tabs. */
    public function vendorStats()
    {
        $rows = Vendor::selectRaw('onboarding_status, COUNT(*) c')->groupBy('onboarding_status')->pluck('c', 'onboarding_status');

        return response()->json([
            'total' => (int) Vendor::count(),
            'draft' => (int) $rows->get('draft', 0),
            'submitted' => (int) $rows->get('submitted', 0),
            'approved' => (int) $rows->get('approved', 0),
            'rejected' => (int) $rows->get('rejected', 0),
        ]);
    }

    public function store(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'email' => 'nullable|email|unique:users', 'whatsapp' => 'nullable|unique:users', 'password' => 'required|min:6', 'shop_name' => 'required']);
        $u = User::create(['name' => $d['name'], 'email' => $d['email'] ?? null, 'whatsapp' => $d['whatsapp'] ?? null, 'password' => Hash::make($d['password']), 'role' => 'vendor']);
        $u->vendor()->create(['shop_name' => $d['shop_name']]);

        return response()->json($u->load('vendor'), 201);
    }

    /** Enriched profile for the admin Vendors screen: full onboarding JSON,
     *  listed products and linked schools (pivot royalty) in one call. */
    public function show($id)
    {
        return User::where('role', 'vendor')->with(['vendor.schools', 'vendor.products.category'])->findOrFail($id);
    }

    public function update(Request $r, $id)
    {
        $u = User::findOrFail($id);
        $u->update($r->only('name', 'is_active'));
        $u->vendor->update($r->only('shop_name', 'gst', 'address'));

        return response()->json($u->load('vendor'));
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * POST /admin/vendors/{id}/review - Amazon-style application review.
     * approve flips the vendor live (unlocks login + selling endpoints);
     * reject stores feedback the applicant sees when they reopen /sell.
     */
    public function review(Request $r, $id)
    {
        $d = $r->validate(['action' => 'required|in:approve,reject', 'notes' => 'nullable|string|max:2000']);
        $u = User::where('role', 'vendor')->with('vendor')->findOrFail($id);
        $v = $u->vendor;
        if (! $v) {
            return response()->json(['message' => 'No vendor profile'], 404);
        }
        $approved = $d['action'] === 'approve';
        $v->update([
            'onboarding_status' => $approved ? 'approved' : 'rejected',
            'reviewed_at' => now(),
            'review_notes' => $approved ? null : ($d['notes'] ?? 'Please correct your application details.'),
        ]);
        NotificationController::push($u->id,
            $approved ? 'Application approved' : 'Application needs changes',
            $approved ? 'Congratulations - you can now sign in and start listing products.'
                     : ($v->review_notes),
            'onboarding');

        return response()->json($v->fresh()->only(['id', 'shop_name', 'onboarding_status', 'reviewed_at', 'review_notes']));
    }

    /**
     * GET /admin/schools - school_new directory with status/search/location filters.
     *
     * Storage convention in school_new (verified against live data):
     *   - country  : stores the country ID directly        (e.g. 105)
     *   - state    : stores the state ID directly          (e.g. 14694)
     *   - district : stores the district NAME as text      (e.g. "Meerut")
     *   - school_status: Active / Inactive / Deleted
     *
     * The admin UI sends onboarding vocabulary for status
     * (submitted/approved/rejected/draft), so we map it back to the
     * directory vocabulary before filtering.
     */
    public function schoolIndex(Request $r)
    {
        $q = \DB::table('school_new')->select('school_new.*', 'school_name as name', 'school_email as email', 'school_mobile as whatsapp');

        // ---- status filter (with vocabulary mapping) ----
        if ($r->filled('status')) {
            $status = (string) $r->string('status');
            $statusMap = [
                'submitted' => 'Active',
                'approved' => 'Active',
                'active' => 'Active',
                'Active' => 'Active',
                'rejected' => 'Rejected',
                'Rejected' => 'Rejected',
                'draft' => 'Drafted',
                'drafted' => 'Drafted',
                'Drafted' => 'Drafted',
                'inactive' => 'Inactive',
                'Inactive' => 'Inactive',
                'deleted' => 'Deleted',
                'Deleted' => 'Deleted',
                'need_review' => 'Need Review',
                'Need Review' => 'Need Review',
            ];
            if (isset($statusMap[$status])) {
                $status = $statusMap[$status];
            }
            $q->where('school_status', $status);
        }

        // ---- free-text search ----
        if ($r->filled('search')) {
            $s = '%'.$r->string('search').'%';
            $q->where(function ($w) use ($s) {
                $w->where('school_name', 'like', $s)
                    ->orWhere('school_code', 'like', $s)
                    ->orWhere('city', 'like', $s)
                    ->orWhere('district', 'like', $s)
                    ->orWhere('school_email', 'like', $s);
            });
        }

        // ---- location filters ----
        // country & state are stored as IDs in school_new - compare directly.
        if ($r->filled('country_id')) {
            $q->where('country', $r->input('country_id'));
        }
        if ($r->filled('state_id')) {
            $q->where('state', $r->input('state_id'));
        }
        // district is stored as the NAME, so resolve district_id -> district_name.
        if ($r->filled('district_id')) {
            $districtName = \DB::table('districts')
                ->where('id', $r->input('district_id'))
                ->value('district_name');
            if ($districtName !== null) {
                $q->where('district', $districtName);
            } else {
                $q->whereRaw('1=0');
            }
        }

        // ---- sorting + pagination ----
        $perPage = (int) $r->input('per_page', 20);
        if (! in_array($perPage, [10, 20, 50], true)) {
            $perPage = 20;
        }
        $sortField = (string) $r->input('sort_by', 'id');
        $sortMap = ['school_name' => 'school_name', 'school_status' => 'school_status', 'id' => 'id'];
        $sortCol = $sortMap[$sortField] ?? 'id';
        $sortDir = strtolower((string) $r->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $q->orderBy($sortCol, $sortDir);

        $page = $q->paginate($perPage);

        // Attach the onboarding School record (if this directory entry has
        if (Schema::hasTable('schools')) {
            $codes = $page->getCollection()->pluck('school_code')->filter()->unique()->values()->all();
            $loads = (Schema::hasTable('vendors') && Schema::hasTable('school_vendor')) ? ['vendors'] : [];
            $onboardings = School::with($loads)->whereIn('school_code', $codes)->get()->keyBy('school_code');
            $page->getCollection()->transform(function ($row) use ($onboardings) {
                $onb = $onboardings->get($row->school_code ?? null);
                $row->school = $onb ? $onb->toArray() : null;

                return $row;
            });
        }

        return $page;
        $d = $r->validate(['name' => 'required', 'email' => 'nullable|email|unique:users', 'whatsapp' => 'nullable|unique:users', 'password' => 'required|min:6', 'school_name' => 'required', 'school_code' => 'required|unique:schools', 'is_independent' => 'boolean', 'class_list' => 'array']);
        $u = User::create(['name' => $d['name'], 'email' => $d['email'] ?? null, 'whatsapp' => $d['whatsapp'] ?? null, 'password' => Hash::make($d['password']), 'role' => 'school']);
        $s = $u->school()->create(['school_code' => $d['school_code'], 'name' => $d['school_name'], 'is_independent' => $d['is_independent'] ?? false, 'class_list' => $d['class_list'] ?? []]);

        return response()->json($s->load('user'), 201);
    }

    public function schoolUpdate(Request $r, $id)
    {
        $s = School::findOrFail($id);
        $s->update($r->only('name', 'address', 'is_independent', 'class_list'));

        return response()->json($s);
    }

    public function schoolDestroy($id)
    {
        $s = School::findOrFail($id);
        $s->user->delete();

        return response()->json(['deleted' => true]);
    }

    /** Enriched profile for the admin Schools screen: full onboarding JSON + linked vendors. */
    public function schoolShow($id)
    {
        $s = null;
        if (Schema::hasTable('schools')) {
            $q = School::query();
            $loads = [];
            if (Schema::hasTable('vendors') && Schema::hasTable('school_vendor')) {
                $loads[] = 'vendors';
            }
            if (Schema::hasTable('users')) {
                $loads[] = 'user';
            }
            if ($loads) {
                $q = $q->with($loads);
            }
            $s = $q->find($id);
        }
        if ($s) {
            return $s;
        }

        $row = null;
        if (Schema::hasTable('school_new')) {
            $row = \DB::table('school_new')->where('id', $id)->first();
        }
        if ($row) {
            $data = (array) $row;
            // Attach the onboarding record (if this directory entry has registered)
            // so the admin profile view can show onboarding JSON + linked vendors.
            $onboarding = null;
            if (Schema::hasTable('schools')) {
                $query = School::where('school_code', $row->school_code);
                if (Schema::hasTable('vendors') && Schema::hasTable('school_vendor')) {
                    $query = $query->with('vendors');
                }
                $onboarding = $query->first();
            }
            $data['school'] = $onboarding ? $onboarding->toArray() : null;

            return response()->json($data);
        }

        abort(404);
    }

    /**
     * POST /admin/schools/{id}/review - Amazon-style application review.
     * approve flips the school live (unlocks login + school panel endpoints);
     * reject stores feedback the applicant sees when they reopen the wizard.
     */
    public function schoolReview(Request $r, $id)
    {
        $d = $r->validate(['action' => 'required|in:approve,reject', 'notes' => 'nullable|string|max:2000']);
        $u = User::where('role', 'school')->with('school')->findOrFail($id);
        $s = $u->school;
        if (! $s) {
            return response()->json(['message' => 'No school profile'], 404);
        }
        $approved = $d['action'] === 'approve';
        $s->update([
            'onboarding_status' => $approved ? 'approved' : 'rejected',
            'reviewed_at' => now(),
            'review_notes' => $approved ? null : ($d['notes'] ?? 'Please correct your application details.'),
        ]);
        NotificationController::push($u->id,
            $approved ? 'Application approved' : 'Application needs changes',
            $approved ? 'Congratulations - you can now sign in and start using the school panel.'
                     : ($s->review_notes),
            'onboarding');

        return response()->json(array_merge(['success' => true], $s->fresh()->only(['id', 'name', 'onboarding_status', 'reviewed_at', 'review_notes'])));
    }

    public function assign(Request $r)
    {
        $d = $r->validate(['school_id' => 'required|exists:schools,id', 'vendor_id' => 'required|exists:vendors,id', 'royalty_percent' => 'required|numeric|min:0|max:100']);
        \DB::table('school_vendor')->updateOrInsert(['school_id' => $d['school_id'], 'vendor_id' => $d['vendor_id']], ['royalty_percent' => $d['royalty_percent'], 'is_active' => 1, 'updated_at' => now()]);
        $school = School::with('user')->find($d['school_id']);
        $vendor = Vendor::with('user')->find($d['vendor_id']);
        if ($school?->user) {
            NotificationController::push($school->user->id, 'Vendor assigned', 'Vendor '.$vendor->shop_name.' linked with '.$d['royalty_percent'].'% royalty', 'assign');
        }
        if ($vendor?->user) {
            NotificationController::push($vendor->user->id, 'School assigned', 'School '.$school->name.' linked with '.$d['royalty_percent'].'% royalty', 'assign');
        }

        return response()->json(['assigned' => true] + $d);
    }

    public function notify(Request $r)
    {
        $d = $r->validate(['title' => 'required', 'body' => 'nullable', 'user_id' => 'nullable|exists:users,id', 'role' => 'nullable|in:admin,vendor,school,student']);
        if (! empty($d['user_id'])) {
            return response()->json(NotificationController::push($d['user_id'], $d['title'], $d['body'] ?? '', 'admin'));
        }
        if (! empty($d['role'])) {
            return response()->json(NotificationController::pushRole($d['role'], $d['title'], $d['body'] ?? '', 'admin'));
        }

        return response()->json(['message' => 'Provide user_id or role'], 422);
    }

    public function catIndex()
    {
        return Category::with('fields', 'subCategories')->get();
    }

    public function catStore(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'slug' => 'required|unique:categories', 'description' => 'nullable', 'icon' => 'nullable', 'is_active' => 'boolean', 'is_size' => 'boolean', 'is_colour' => 'boolean']);
        $d['slug'] = Str::slug($d['slug']);

        return Category::create($d);
    }

    public function catUpdate(Request $r, $id)
    {
        $c = Category::findOrFail($id);
        $c->update($r->only('name', 'description', 'icon', 'is_active', 'is_size', 'is_colour'));
        if ($r->has('slug')) {
            $c->slug = Str::slug($r->input('slug'));
        }
        $c->save();

        return $c->load('fields', 'subCategories');
    }

    public function catDestroy($id)
    {
        Category::findOrFail($id)->delete();

        return response()->json(['deleted' => true]);
    }

    public function subCategoryIndex(Request $r)
    {
        $q = SubCategory::query();
        if ($r->category_id) {
            $q->where('category_id', $r->category_id);
        }

        return $q->orderBy('name')->get();
    }

    public function subCategoryStore(Request $r)
    {
        $r->merge(['slug' => Str::slug($r->input('slug') ?: $r->input('name', ''))]);
        $d = $r->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:120',
            'slug' => 'required|string|max:255|unique:sub_categories,slug',
            'description' => 'nullable|string',
            'icon' => 'nullable|string',
            'is_active' => 'boolean',
            'portal_charge_type' => 'sometimes|in:fixed,percentage',
            'portal_charge_value' => 'sometimes|numeric|min:0',
            'server_charge_type' => 'sometimes|in:fixed,percentage',
            'server_charge_value' => 'sometimes|numeric|min:0',
        ]);

        return SubCategory::create($d);
    }

    public function subCategoryUpdate(Request $r, $id)
    {
        $sc = SubCategory::findOrFail($id);
        if ($r->exists('slug')) {
            $r->merge(['slug' => Str::slug($r->input('slug') ?: $r->input('name', $sc->name))]);
        }
        $d = $r->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'name' => 'sometimes|required|string|max:120',
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('sub_categories', 'slug')->ignore($sc->id)],
            'description' => 'sometimes|nullable|string',
            'icon' => 'sometimes|nullable|string',
            'is_active' => 'sometimes|boolean',
            'portal_charge_type' => 'sometimes|in:fixed,percentage',
            'portal_charge_value' => 'sometimes|numeric|min:0',
            'server_charge_type' => 'sometimes|in:fixed,percentage',
            'server_charge_value' => 'sometimes|numeric|min:0',
        ]);
        $sc->fill($d);
        $sc->save();

        return $sc;
    }

    public function subCategoryDestroy($id)
    {
        SubCategory::findOrFail($id)->delete();

        return response()->json(['deleted' => true]);
    }

    public function fieldStore(Request $r)
    {
        $d = $r->validate(['category_id' => 'required|exists:categories,id', 'field_name' => 'required', 'field_label' => 'required', 'field_type' => 'required', 'is_required' => 'boolean']);

        return CategoryField::create($d);
    }

    public function fieldUpdate(Request $r, $id)
    {
        $f = CategoryField::findOrFail($id);
        $f->update($r->all());

        return $f;
    }

    public function fieldDestroy($id)
    {
        CategoryField::findOrFail($id)->delete();

        return response()->json(['deleted' => true]);
    }

    public function productIndex(Request $r)
    {
        $q = Product::with('category', 'subCategory', 'values', 'images', 'variants', 'productStocks', 'stockTrackings');
        // ?search= powers the Home-content boost picker.
        if ($r->search) {
            $q->where('name', 'like', '%'.$r->search.'%');
        }

        return $q->paginate($r->per_page ?? 20);
    }

    public function productShow($id)
    {
        $q = Product::with('category', 'subCategory', 'values', 'images', 'variants', 'productStocks', 'stockTrackings');
        $p = is_numeric($id) ? $q->findOrFail($id) : $q->where('product_code', $id)->firstOrFail();

        return response()->json($p);
    }

    public function productStore(Request $r)
    {
        return $this->saveProduct($r, 'admin', $r->user()->id);
    }

    public function productUpdate(Request $r, $id)
    {
        $q = Product::with('values', 'images');
        $p = is_numeric($id) ? $q->findOrFail($id) : $q->where('product_code', $id)->firstOrFail();
        $originalCategoryId = (int) $p->category_id;
        $categoryId = $r->input('category_id', $p->category_id);
        $r->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'sub_category_id' => [
                Rule::requiredIf($r->has('category_id') || $r->exists('sub_category_id')),
                'integer',
                Rule::exists('sub_categories', 'id')->where('category_id', $categoryId),
            ],
            'price' => 'sometimes|required|numeric|min:0',
            'product_stocks' => 'sometimes|array',
            'product_stocks.*.colour' => 'nullable|string|max:60',
            'product_stocks.*.color_code' => ['nullable', 'regex:/\A#[0-9A-Fa-f]{6}\z/'],
            'product_stocks.*.size' => 'nullable|string|max:60',
            'product_stocks.*.quantity' => 'nullable|integer|min:0',
        ]);

        $allowed = ['category_id', 'sub_category_id', 'name', 'sku', 'price', 'mrp', 'stock', 'is_variant', 'delivery_mode', 'delivery_charge', 'payment_split', 'is_active', 'is_boost', 'boost_until'];
        foreach ($allowed as $field) {
            if ($r->has($field)) {
                $p->{$field} = $r->input($field);
            }
        }
        if ($r->has('category_id') && ! $r->has('sub_category_id') && $originalCategoryId !== (int) $categoryId) {
            $p->sub_category_id = null;
        }
        if ($r->hasAny(['price', 'sub_category_id', 'category_id'])) {
            $subCategory = $p->sub_category_id
                ? SubCategory::where('category_id', $p->category_id)->find($p->sub_category_id)
                : null;
            $charges = $subCategory?->calculateChargesFor((float) $p->price) ?? ['portal_charge' => 0, 'server_charge' => 0];
            $p->portal_charge = $charges['portal_charge'];
            $p->server_charge = $charges['server_charge'];
        }
        if ($r->has('boost_until') && ($r->input('boost_until') === '' || $r->input('boost_until') === null)) {
            $p->boost_until = null;
        }
        if ($r->has('is_boost') && ! $r->boolean('is_boost')) {
            $p->boost_until = null;
        }
        $p->save();

        if ($r->has('fields') && is_array($r->input('fields'))) {
            ProductValue::where('product_id', $p->id)->delete();
            foreach ($r->input('fields') as $fid => $val) {
                ProductValue::create([
                    'product_id' => $p->id,
                    'field_id' => $fid,
                    'value_text' => ($val === '' ? null : $val),
                ]);
            }
        }

        if ($r->has('images') && is_array($r->input('images'))) {
            ProductImage::where('product_id', $p->id)->delete();
            foreach (array_values($r->input('images')) as $i => $url) {
                if (! empty($url)) {
                    ProductImage::create([
                        'product_id' => $p->id,
                        'url' => $url,
                        'is_primary' => $i === 0,
                    ]);
                }
            }
        }

        $hasVariants = $r->has('variants') && is_array($r->input('variants'))
            && (! $r->has('is_variant') || $r->boolean('is_variant'));
        $isVariant = $r->has('is_variant') ? $r->boolean('is_variant') : (bool) $p->is_variant;
        if ($r->has('is_variant') && ! $isVariant) {
            ProductVariant::where('product_id', $p->id)->delete();
        }
        if ($hasVariants && ! $r->has('is_variant')) {
            $isVariant = true;
            $p->is_variant = true;
            $p->save();
        }
        if ($hasVariants) {
            ProductVariant::where('product_id', $p->id)->delete();
            $stock = 0;
            foreach ($r->input('variants') as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $size = isset($v['size']) && $v['size'] !== '' ? (string) $v['size'] : null;
                $color = isset($v['color']) && $v['color'] !== '' ? (string) $v['color'] : null;
                $vstock = (int) ($v['stock'] ?? 0);
                ProductVariant::create([
                    'product_id' => $p->id,
                    'size' => $size,
                    'color' => $color,
                    'sku' => $v['sku'] ?? null,
                    'price' => isset($v['price']) && $v['price'] !== '' ? $v['price'] : null,
                    'stock' => $vstock,
                ]);
                $stock += $vstock;
            }
            if (count($r->input('variants')) > 0) {
                $p->stock = $stock;
                $p->save();
            }
        }

        $explicitStockRows = $this->extractStockRows($r);
        if (($isVariant || $hasVariants) && ! empty($explicitStockRows)) {
            $this->persistProductStockRows($p, $explicitStockRows, 'product_updated');
        } elseif ($isVariant && $hasVariants) {
            $this->persistProductStockRows($p, $this->stockRowsFromVariants($p), 'product_updated');
        } elseif (! $isVariant && $r->has('stock')) {
            $this->persistProductStockRows($p, [['quantity' => (int) $r->input('stock')]], 'product_updated');
        }

        return response()->json($p->fresh()->load('category', 'subCategory', 'values', 'images', 'variants', 'productStocks', 'stockTrackings'));
    }

    public function productDestroy($id)
    {
        $product = is_numeric($id) ? Product::findOrFail($id) : Product::where('product_code', $id)->firstOrFail();
        $product->delete();

        return response()->json(['deleted' => true]);
    }

    private function saveProduct(Request $r, $type, $id)
    {
        $d = $r->validate([
            'category_id' => 'required|exists:categories,id',
            'sub_category_id' => ['required', 'integer', Rule::exists('sub_categories', 'id')->where('category_id', $r->input('category_id'))],
            'name' => 'required',
            'sku' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'mrp' => 'nullable|numeric',
            'stock' => 'integer',
            'delivery_mode' => 'in:self,thirdparty,school_pickup',
            'delivery_charge' => 'nullable|numeric',
            'school_id' => 'nullable|exists:schools,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'fields' => 'array',
            'payment_split' => 'array',
            'is_active' => 'boolean',
            'is_boost' => 'boolean',
            'boost_until' => 'nullable|date',
            'is_variant' => 'boolean',
            'variants' => 'array',
            'product_stocks' => 'sometimes|array',
            'product_stocks.*.colour' => 'nullable|string|max:60',
            'product_stocks.*.color_code' => ['nullable', 'regex:/\A#[0-9A-Fa-f]{6}\z/'],
            'product_stocks.*.size' => 'nullable|string|max:60',
            'product_stocks.*.quantity' => 'nullable|integer|min:0',
        ]);
        unset($d['product_stocks']);
        $subCategory = ! empty($d['sub_category_id']) ? SubCategory::find($d['sub_category_id']) : null;
        $charges = $subCategory?->calculateChargesFor((float) $d['price']) ?? ['portal_charge' => 0, 'server_charge' => 0];
        $d['portal_charge'] = $charges['portal_charge'];
        $d['server_charge'] = $charges['server_charge'];
        $p = Product::create($d + ['created_by_type' => $type, 'created_by_id' => $id]);
        foreach (($d['fields'] ?? []) as $fid => $val) {
            ProductValue::create(['product_id' => $p->id, 'field_id' => $fid, 'value_text' => $val]);
        }
        foreach (($r->input('images') ?? []) as $i => $url) {
            if (! empty($url)) {
                ProductImage::create(['product_id' => $p->id, 'url' => $url, 'is_primary' => $i === 0]);
            }
        }
        $isVariant = (bool) ($d['is_variant'] ?? false);
        $vlist = $r->input('variants') ?? [];
        $hasVariants = is_array($vlist) && count($vlist) > 0;

        if ($isVariant) {
            $stock = 0;
            ProductVariant::where('product_id', $p->id)->delete();
            foreach ($vlist as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $size = isset($v['size']) && $v['size'] !== '' ? (string) $v['size'] : null;
                $color = isset($v['color']) && $v['color'] !== '' ? (string) $v['color'] : null;
                $vstock = (int) ($v['stock'] ?? 0);
                ProductVariant::create([
                    'product_id' => $p->id,
                    'size' => $size,
                    'color' => $color,
                    'sku' => $v['sku'] ?? null,
                    'price' => isset($v['price']) && $v['price'] !== '' ? $v['price'] : null,
                    'stock' => $vstock,
                ]);
                $stock += $vstock;
            }
            if (count($vlist) > 0) {
                $p->stock = $stock;
                $p->save();
            }
            $p->is_variant = true;
            $p->save();
        } elseif ($hasVariants) {
            // is_variant not set but variants were posted - treat as variant product
            $stock = 0;
            ProductVariant::where('product_id', $p->id)->delete();
            foreach ($vlist as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $size = isset($v['size']) && $v['size'] !== '' ? (string) $v['size'] : null;
                $color = isset($v['color']) && $v['color'] !== '' ? (string) $v['color'] : null;
                $vstock = (int) ($v['stock'] ?? 0);
                ProductVariant::create([
                    'product_id' => $p->id,
                    'size' => $size,
                    'color' => $color,
                    'sku' => $v['sku'] ?? null,
                    'price' => isset($v['price']) && $v['price'] !== '' ? $v['price'] : null,
                    'stock' => $vstock,
                ]);
                $stock += $vstock;
            }
            $p->stock = $stock;
            $p->save();
            $p->is_variant = true;
            $p->save();
        }

        // Clear stale variant flag if no variants are being set and is_variant is false
        if (! $isVariant && ! $hasVariants) {
            $p->is_variant = false;
            $p->save();
        }

        $explicitStockRows = $this->extractStockRows($r);
        if (($isVariant || $hasVariants) && ! empty($explicitStockRows)) {
            $this->persistProductStockRows($p, $explicitStockRows, 'product_created');
        } elseif ($hasVariants) {
            $this->persistProductStockRows($p, $this->stockRowsFromVariants($p), 'product_created');
        } elseif (! $isVariant && $r->has('stock')) {
            $this->persistProductStockRows($p, [['quantity' => (int) $r->input('stock')]], 'product_created');
        }

        return response()->json($p->fresh()->load('category', 'subCategory', 'values', 'images', 'variants', 'productStocks', 'stockTrackings'), 201);
    }

    /** GET /admin/schools/stats - per-status counts for the school_new directory. */
    public function schoolStats()
    {
        $rows = \DB::table('school_new')->selectRaw('school_status, COUNT(*) c')->groupBy('school_status')->pluck('c', 'school_status');

        return response()->json([
            'total' => array_sum($rows),
            'active' => $rows['Active'] ?? 0,
            'inactive' => $rows['Inactive'] ?? 0,
            'deleted' => $rows['Deleted'] ?? 0,
        ]);
    }

    public function orderLedger(Request $r)
    {
        return app(OrderLedgerController::class)->index($r);
    }

    public function orders(Request $r)
    {
        return $this->orderLedger($r);
    }

    public function studentIndex(Request $r)
    {
        $q = User::query()->where('role', 'student');
        if ($r->filled('search')) {
            $s = (string) $r->input('search');
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', '%'.$s.'%')
                    ->orWhere('email', 'like', '%'.$s.'%')
                    ->orWhere('whatsapp', 'like', '%'.$s.'%');
            });
        }
        $q->withCount('orders');
        // Location filter against the addresses table (students store location in
        // addresses rows, not in onboarding JSON).
        foreach (['country_id', 'state_id', 'district_id'] as $p) {
            if ($r->filled($p)) {
                $v = $r->input($p);
                $q->whereHas('addresses', function ($w) use ($p, $v) {
                    $w->where($p, (string) $v)->orWhere($p, (int) $v);
                });
            }
        }
        $perPage = (int) $r->input('per_page', 15);
        if (! in_array($perPage, [10, 15, 20, 50, 100], true)) {
            $perPage = 15;
        }

        return $q->orderBy('id', 'desc')->paginate($perPage);
    }

    public function studentShow($id)
    {
        $u = User::where('role', 'student')->with('orders')->findOrFail($id);

        return response()->json($u);
    }

    public function studentDestroy($id)
    {
        User::where('role', 'student')->findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    public function orderReviews(Request $r, $id)
    {
        $u = $r->user();
        $order = App\Models\Order::where('user_id', $u->id)->where(function ($w) use ($id) {
            $w->where('id', $id)->orWhere('order_code', $id);
        })->firstOrFail();

        return App\Models\ProductReview::where('order_id', $order->id)->latest()->get(['id', 'rating', 'title', 'comment', 'reviewer_name', 'created_at']);
    }

    public function storeReview(Request $r, $id)
    {
        $u = $r->user();
        $order = App\Models\Order::where('user_id', $u->id)->where(function ($w) use ($id) {
            $w->where('id', $id)->orWhere('order_code', $id);
        })->firstOrFail();

        $d = $r->validate(['rating' => 'required|integer|min:1|max:5', 'title' => 'nullable|string', 'comment' => 'nullable|string']);

        $rv = App\Models\ProductReview::updateOrCreate(
            ['user_id' => $u->id, 'product_id' => null, 'order_id' => $order->id],
            ['rating' => (int) $d['rating'], 'title' => $d['title'] ?? null, 'comment' => $d['comment'] ?? null, 'reviewer_name' => $u->name ?? null]
        );

        return response()->json($rv, 201);
    }

    public function updateReview(Request $r, $id, $reviewId)
    {
        $u = $r->user();
        $order = App\Models\Order::where('user_id', $u->id)->where(function ($w) use ($id) {
            $w->where('id', $id)->orWhere('order_code', $id);
        })->firstOrFail();

        $rv = App\Models\ProductReview::where('order_id', $order->id)->findOrFail($reviewId);

        $d = $r->validate(['rating' => 'sometimes|required|integer|min:1|max:5', 'title' => 'sometimes|nullable|string', 'comment' => 'sometimes|nullable|string']);

        $rv->rating = $d['rating'] ?? $rv->rating;
        $rv->title = $d['title'] ?? $rv->title;
        $rv->comment = $d['comment'] ?? $rv->comment;
        $rv->save();

        return response()->json($rv);
    }

    public function destroyReview($id, $reviewId)
    {
        $u = $r->user();
        $order = App\Models\Order::where('user_id', $u->id)->where(function ($w) use ($id) {
            $w->where('id', $id)->orWhere('order_code', $id);
        })->firstOrFail();

        App\Models\ProductReview::where('order_id', $order->id)->where('id', $reviewId)->delete();

        return response()->json(['success' => true]);
    }
}
