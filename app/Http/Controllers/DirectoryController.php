<?php
namespace App\Http\Controllers;
use App\Models\CoachingInstitute;
use App\Models\School;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Public student-facing institution directory (works logged-out, like GET /products).
 *
 * Federates two sources into one listing:
 *   - schools             -> kind 'school'  (approved rows; location lives in
 *     the onboarding JSON the school wizard writes:
 *     institution.country_id / state_id / district_id)
 *   - coaching_institutes -> kind 'coaching' (dedicated location columns,
 *     institute_type = private_coaching | private_institute | private_tutor)
 *
 *   GET /api/v1/directory?country_id=&state_id=&district_id=&type=&q=
 *   GET /api/v1/directory/{kind}/{id}   registration + basic details payload
 *   POST /api/v1/directory/seed-tutor    insert the first private_tutor row
 *
 * Response is grouped with per-group totals:
 *   { result: { school: [...], institute: [...], tutor: [...] },
 *     total:  { school: N, institute: N, tutor: N } }
 * `type` narrows which groups appear:
 *   school -> school; private_coaching -> institute;
 *   private_institute / private_tutor -> tutor
 * Default (no filters): random 10 per group. Any filter: full list,
 * newest-first (ORDER BY id DESC); total = full filtered count.
 */
class DirectoryController extends Controller {

    private const TYPES = ['school','private_coaching','private_institute','private_tutor'];
    private const TYPE_LABELS = [
        'school'=>'School',
        'private_coaching'=>'Private coaching',
        'private_institute'=>'Private institute',
        'private_tutor'=>'Private tutor',
    ];

    /** GET /directory - grouped listing with per-group totals.
     *  Default (no country/state/district/type/q): random sample, 10 per group
     *  (10 school + 10 institute + 10 tutor). Any filter present: full list,
     *  newest-first. `total` is always the full filtered count. */
    public function index(Request $r){
        $d = $r->validate([
            'q'=>'nullable|string|max:100',
            'type'=>'nullable|in:school,private_coaching,private_institute,private_tutor',
            'country_id'=>'nullable|integer',
            'state_id'=>'nullable|string|max:32',
            'district_id'=>'nullable|integer',
        ]);

        $type = $d['type'] ?? null;
        $isDefault = empty($d['country_id']) && empty($d['state_id'])
            && empty($d['district_id']) && empty($type) && empty($d['q']);
        $result = [];
        $total = [];

        if(!$type || $type==='school'){
            $g = $this->schoolRows($d, $isDefault ? 10 : 0, $isDefault);
            $result['school'] = $g['rows'];
            $total['school'] = $g['count'];
        }
        if(!$type || $type==='private_coaching'){
            $g = $this->coachingGroup($d, ['private_coaching'], $isDefault ? 10 : 0, $isDefault);
            $result['institute'] = $g['rows'];
            $total['institute'] = $g['count'];
        }
        if(!$type || $type==='private_institute' || $type==='private_tutor'){
            $g = $this->coachingGroup($d, ['private_institute','private_tutor'], $isDefault ? 10 : 0, $isDefault);
            $result['tutor'] = $g['rows'];
            $total['tutor'] = $g['count'];
        }

        $flat = [];
        foreach($result as $group) $flat = array_merge($flat, $group);
        $this->logImpressions($r, $flat, $d);

        return response()->json(['result'=>$result,'total'=>$total]);
    }

    /** GET /directory/labels — display names for stored location ids.
     *  Used by the admin profile modals (onboarding JSON holds ids only). */
    public function labels(Request $r){
        $d = $r->validate([
            'country_id'=>'nullable|integer',
            'state_id'=>'nullable|string|max:32',
            'district_id'=>'nullable|integer',
        ]);
        return response()->json($this->locationLabels(
            $d['country_id'] ?? null, $d['state_id'] ?? null, $d['district_id'] ?? null));
    }

    /** GET /directory/{kind}/{id} - the public detail-page payload. */
    public function show(Request $r, string $kind, int $id){
        if($kind==='school'){ $this->logDetail($r,'school',$id); return $this->schoolDetail($id); }
        if($kind==='coaching'){ $this->logDetail($r,'coaching',$id); return $this->coachingDetail($id); }
        return response()->json(['message'=>'Unknown institute type'],404);
    }

    /** POST /directory/seed-tutor - insert one approved private_tutor row so
     *  tutor[] is non-empty (idempotent: returns existing if already seeded). */
    public function seedTutor(Request $r){
        $existing = CoachingInstitute::where('institute_type','private_tutor')
            ->where('onboarding_status','approved')->first();
        if($existing){
            return response()->json(['message'=>'Tutor already exists','id'=>$existing->id,'code'=>$existing->institute_code]);
        }
        $user = \App\Models\User::firstOrCreate(
            ['email'=>'tutor1@market.local'],
            ['name'=>'Demo Private Tutor','whatsapp'=>'9000000004',
             'password'=>bcrypt('Tutor@123'),'role'=>'coaching']
        );
        $code = 'COA-'.strtoupper(\Illuminate\Support\Str::random(6));
        $tutor = CoachingInstitute::firstOrCreate(['user_id'=>$user->id],[
            'institute_code'=>$code,'name'=>'Demo Private Tutor','institute_type'=>'private_tutor',
            'address'=>'Demo tuition address','country_id'=>105,'state_id'=>'14694','district_id'=>678,
            'onboarding_status'=>'approved','submitted_at'=>now(),
            'onboarding'=>['institute'=>['name'=>'Demo Private Tutor','type'=>'private_tutor'],
                'contact'=>['person_name'=>'Demo Private Tutor','email'=>'tutor1@market.local','phone'=>'+919000000004']],
        ]);
        $tutor->profile()->updateOrCreate(
            ['institute_type'=>'coaching','institute_id'=>$tutor->id],
            ['contact_person'=>'Demo Private Tutor','contact_email'=>'tutor1@market.local',
             'country_id'=>105,'state_id'=>'14694','district_id'=>678]
        );
        return response()->json(['message'=>'Private tutor inserted','id'=>$tutor->id,'code'=>$tutor->institute_code],201);
    }

    /* -------------------------------------------------- appearance logging */

    /** One impression row per listing shown (capped) — never fails the search. */
    private function logImpressions(Request $r, array $rows, array $filters): void {
        try {
            $viewerId = $this->optionalViewerId($r);
            $now = now();
            $batch = [];
            foreach(array_slice($rows, 0, 100) as $row){
                $batch[] = [
                    'institute_type'=>$row['kind'], 'institute_id'=>$row['id'],
                    'student_user_id'=>$viewerId, 'event'=>'impression',
                    'country_name'=>$row['country_name'] ?? null,
                    'state_name'=>$row['state_name'] ?? null,
                    'district_name'=>$row['district_name'] ?? null,
                    'filter_q'=>$filters['q'] ?? null,
                    'filter_type'=>$filters['type'] ?? null,
                    'source'=>'directory',
                    'created_at'=>$now, 'updated_at'=>$now,
                ];
            }
            if($batch) DB::table('institute_views')->insert($batch);
        } catch (\Throwable $e) { /* logging must never break the listing */ }
    }

    /** One detail row per detail-page open — never fails the page. */
    private function logDetail(Request $r, string $type, int $id): void {
        try {
            DB::table('institute_views')->insert([
                'institute_type'=>$type, 'institute_id'=>$id,
                'student_user_id'=>$this->optionalViewerId($r), 'event'=>'detail',
                'source'=>'detail', 'created_at'=>now(), 'updated_at'=>now(),
            ]);
        } catch (\Throwable $e) { /* logging must never break the page */ }
    }

    /** Bearer token when the viewer is logged in, else null (Unknown). */
    private function optionalViewerId(Request $r): ?int {
        try {
            $u = $r->user();
            return $u?->id;
        } catch (\Throwable $e) { return null; }
    }

    /** Merge rich profile fields from `institute_profiles` into a detail row.
     *  Columns not present on the source model (website, contact_person,
     *  contact_phone, detailed_address, established_year, registration_number,
     *  board_affiliation, recognition_status, medium_of_instruction, streams,
     *  classes, student_strength) are used to override / supplement the payload.
     *  Accepts Eloquent models (coachingDetail) as well as stdClass rows. */
    private function attachProfile(object $row, array $profile): object {
        $row->website            = $profile['website']             ?? $row->website;
        $row->detailed_address   = $profile['detailed_address']    ?? $row->detailed_address;
        $row->country_id         = $profile['country_id']          ?? $row->country_id;
        $row->state_id           = $profile['state_id']            ?? $row->state_id;
        $row->district_id        = $profile['district_id']         ?? $row->district_id;
        $row->established_year   = $profile['established_year']    ?? $row->established_year;
        $row->registration_number= $profile['registration_number'] ?? $row->registration_number;
        $row->board_affiliation  = $profile['board_affiliation']   ?? $row->board_affiliation;
        $row->recognition_status = $profile['recognition_status']  ?? $row->recognition_status;
        $row->medium_of_instruction = $profile['medium_of_instruction'] ?? $row->medium_of_instruction;
        $row->streams            = $profile['streams']             ?? $row->streams;
        $row->classes            = $profile['classes']             ?? $row->classes;
        $row->student_strength   = $profile['student_strength']    ?? $row->student_strength;
        $row->contact_person     = $profile['contact_person']      ?? $row->contact_person;
        $row->contact_phone      = $profile['contact_phone']       ?? $row->contact_phone;
        $row->contact_email      = $profile['contact_email']       ?? $row->contact_email;
        return $row;
    }

    /* ------------------------------------------------------------------ listing */

    /** school group: approved rows for country/state/district/q.
     *  Location is read from onboarding->institution.* (canonical stored IDs),
     *  never from school_new free text. Returns schools.id so each listing
     *  resolves to the same record schoolDetail() loads.
     *  $limit caps rows (default-page random sample), $count stays full.
     *  $random -> ORDER BY RAND(), else newest id first. */
    private function schoolRows(array $d, int $limit = 0, bool $random = false): array {
        $q = School::where('onboarding_status','approved')
            ->select('id','name','school_code','onboarding');

        if(!empty($d['q'])){
            $term = trim($d['q']);
            $q->where(function($x) use ($term){
                $x->where('name','like','%'.$term.'%')
                  ->orWhere('school_code','like','%'.$term.'%');
            });
        }
        // Canonical location filter against onboarding->institution.* JSON.
        // Values were saved as strings ('105') or ints (105) depending on the
        // wizard version, so both spellings are matched. Nested arrows (not
        // dotted paths) are required — a dotted path is quoted as a single key.
        $jsonFilter = function(string $field, $v) use (&$q){
            $q->where(function($x) use ($field,$v){
                $x->where('onboarding->institution->'.$field, (string)$v)
                  ->orWhere('onboarding->institution->'.$field, (int)$v);
            });
        };
        if(!empty($d['country_id'])) $jsonFilter('country_id', $d['country_id']);
        if(!empty($d['state_id']))   $jsonFilter('state_id',   $d['state_id']);
        if(!empty($d['district_id'])) $jsonFilter('district_id', $d['district_id']);

        $count = $q->count();
        if($random) $q->inRandomOrder(); else $q->orderByDesc('id');
        if($limit > 0) $q->limit($limit);
        $rows = $q->get();

        // Resolve display names from the real location reference tables by id.
        // Ids are ASCII numeric, so latin1 <-> utf8mb4 whereIn is safe.
        $pluckId = function(string $field) use ($rows){
            return $rows->map(fn($r)=> (is_array($r->onboarding) ? (($r->onboarding['institution'][$field] ?? null)) : null))
                ->filter()->unique()->values()->all();
        };
        $countryIds = $pluckId('country_id');
        $stateIds   = $pluckId('state_id');
        $districtIds= $pluckId('district_id');

        [$countries,$states,$districts] = $this->labelMaps($countryIds,$stateIds,$districtIds);

        return ['count'=>$count, 'rows'=>$rows->map(function($row) use($countries,$states,$districts){
            $onboarding = is_array($row->onboarding) ? $row->onboarding : [];
            $inst = $onboarding['institution'] ?? [];
            $cid = $inst['country_id'] ?? null;
            $sid = $inst['state_id'] ?? null;
            $did = $inst['district_id'] ?? null;
            return [
                'kind'=>'school',
                'id'=>$row->id,
                'name'=>$row->name,
                'code'=>$row->school_code,
                'type'=>'school',
                'type_label'=>self::TYPE_LABELS['school'],
                'address'=>null,
                'country_id'=>$this->toIntOrNull($cid),
                'state_id'=>$sid,
                'district_id'=>$this->toIntOrNull($did),
                'country_name'=>!empty($cid) ? ($countries[$cid] ?? null) : null,
                'state_name'=>!empty($sid) ? ($states[$sid] ?? null) : null,
                'district_name'=>!empty($did) ? ($districts[$did] ?? null) : null,
            ];
        })->all(),
        ];
    }

    /** coaching_institutes group: approved rows of the given institute types.
     *  $limit caps rows (default-page random sample), $count stays full.
     *  $random -> ORDER BY RAND(), else newest id first. */
    private function coachingGroup(array $d, array $types, int $limit = 0, bool $random = false): array {
        $q = CoachingInstitute::query();
        if(!empty($d['q'])){
            $term = trim($d['q']);
            $q->where(function($x) use ($term){
                $x->where('name','like',"%$term%")
                  ->orWhere('institute_code','like',"%$term%")
                  // Also match institutes that own a keyword containing the term.
                  ->orWhereExists(fn($k)=>$k->selectRaw('1')
                      ->from('coaching_keywords')
                      ->whereColumn('coaching_keywords.coaching_institute_id','coaching_institutes.id')
                      ->where('coaching_keywords.keyword','like',"%$term%"));
            });
        }
        if(!empty($d['country_id'])) $q->where('coaching_institutes.country_id',(int)$d['country_id']);
        if(!empty($d['state_id'])) $q->where('coaching_institutes.state_id',(string)$d['state_id']);
        if(!empty($d['district_id'])) $q->where('coaching_institutes.district_id',(int)$d['district_id']);
        $q->where('onboarding_status','approved')->whereIn('institute_type',$types);
        $count = $q->count();
        if($random) $q->inRandomOrder(); else $q->orderByDesc('coaching_institutes.id');
        if($limit > 0) $q->limit($limit);
        $rows = $q->get();
        [$countries,$states,$districts] = $this->labelMaps(
            $rows->pluck('country_id')->filter()->unique()->values()->all(),
            $rows->pluck('state_id')->filter()->unique()->values()->all(),
            $rows->pluck('district_id')->filter()->unique()->values()->all()
        );

        return ['count'=>$count, 'rows'=>$rows->map(function($row) use($countries,$states,$districts){
            $label = self::TYPE_LABELS[$row->institute_type] ?? 'Coaching institute';
            return [
                'kind'=>'coaching',
                'id'=>$row->id,
                'name'=>$row->name,
                'code'=>$row->institute_code,
                'type'=>$row->institute_type,
                'type_label'=>$label,
                'address'=>$row->address,
                'country_id'=>$row->country_id,
                'state_id'=>$row->state_id,
                'district_id'=>$row->district_id,
                'country_name'=>$row->country_id ? ($countries[$row->country_id] ?? null) : null,
                'state_name'=>$row->state_id ? ($states[$row->state_id] ?? null) : null,
                'district_name'=>$row->district_id ? ($districts[$row->district_id] ?? null) : null,
            ];
        })->all(),
        ];
    }

    /* ------------------------------------------------------------------ details */

    private function schoolDetail(int $id){
        $s = School::where('onboarding_status','approved')->find($id);
        if(!$s) return response()->json(['message'=>'Institute not found'],404);
        $profile = $s->profile()->first();
        if($profile) $this->attachProfile($s, $profile->toArray());

        $on = $s->onboarding ?? [];
        $inst = $on['institution'] ?? [];
        $contact = $on['contact'] ?? [];
        unset($inst['gstin']); // business tax id is not directory material
        $labels = $this->locationLabels($inst['country_id'] ?? null, $inst['state_id'] ?? null, $inst['district_id'] ?? null);

        return response()->json([
            'kind'=>'school',
            'id'=>$s->id,
            'name'=>$s->name,
            'code'=>$s->school_code,
            'type'=>'school',
            'type_label'=>self::TYPE_LABELS['school'],
            'address'=>$inst['address'] ?? $s->address,
            'website'=>$s->website,
            'detailed_address'=>$s->detailed_address,
            'country_id'=>$this->toIntOrNull($inst['country_id'] ?? null),
            'state_id'=>$inst['state_id'] ?? null,
            'district_id'=>$this->toIntOrNull($inst['district_id'] ?? null),
            'country_name'=>$labels['country_name'],
            'state_name'=>$labels['state_name'],
            'district_name'=>$labels['district_name'],
            'registration'=>[
                'registration_number'=>$s->registration_number ?? ($inst['registration_number'] ?? null),
                'board'=>$s->board_affiliation ?? ($inst['board'] ?? null),
                'established_year'=>$s->established_year ?? ($inst['established_year'] ?? null),
                'recognition_status'=>$s->recognition_status ?? ($inst['recognition_status'] ?? null),
                'status'=>$s->onboarding_status,
                'submitted_at'=>$s->submitted_at,
            ],
            'profile'=>[
                'contact_person'=>$s->contact_person ?? ($contact['person_name'] ?? null),
                'designation'=>$s->designation ?? ($contact['designation'] ?? null),
                'phone'=>trim(($s->contact_phone ?? '') ?: trim(($contact['contact_country_code'] ?? '').($contact['contact_phone'] ?? ''))) ?: null,
                'email'=>$s->contact_email ?? ($contact['contact_email'] ?? null),
                'website'=>$s->website,
                'medium_of_instruction'=>$s->medium_of_instruction ?? ($inst['medium_of_instruction'] ?? null),
                'classes'=>is_array($s->classes ?? ($on['classes'] ?? null)) ? $s->classes : ($on['classes'] ?? []),
                'streams'=>$s->streams ?? ($on['streams'] ?? null),
                'student_strength'=>$s->student_strength ?? ($on['student_strength'] ?? null),
            ],
        ]);
    }

    private function coachingDetail(int $id){
        $c = CoachingInstitute::where('onboarding_status','approved')->find($id);
        if(!$c) return response()->json(['message'=>'Institute not found'],404);
        $profile = $c->profile()->first();
        if($profile) $this->attachProfile($c, $profile->toArray());

        $on = $c->onboarding ?? [];
        $contact = $on['contact'] ?? [];
        // Per-type detail bag written at registration (onboarding.institute.details).
        $typeDetails = $on['institute']['details'] ?? [];
        $labels = $this->locationLabels($c->country_id, $c->state_id, $c->district_id);

        return response()->json([
            'kind'=>'coaching',
            'id'=>$c->id,
            'name'=>$c->name,
            'code'=>$c->institute_code,
            'type'=>$c->institute_type,
            'type_label'=>self::TYPE_LABELS[$c->institute_type] ?? 'Coaching institute',
            'type_details'=>$typeDetails,
            'address'=>$c->address,
            'website'=>$c->website,
            'detailed_address'=>$c->detailed_address,
            'country_id'=>$c->country_id,
            'state_id'=>$c->state_id,
            'district_id'=>$c->district_id,
            'country_name'=>$labels['country_name'],
            'state_name'=>$labels['state_name'],
            'district_name'=>$labels['district_name'],
            'registration'=>[
                'registration_number'=>$c->registration_number ?? ($on['registration_number'] ?? null),
                'board'=>$c->board_affiliation ?? ($on['board'] ?? null),
                'established_year'=>$c->established_year ?? ($on['established_year'] ?? null),
                'recognition_status'=>$c->recognition_status ?? ($on['recognition_status'] ?? null),
                'status'=>$c->onboarding_status,
                'submitted_at'=>$c->submitted_at,
            ],
            'profile'=>[
                'contact_person'=>$c->contact_person ?? ($contact['person_name'] ?? ($c->user?->name ?? null)),
                'designation'=>$c->designation ?? ($contact['designation'] ?? null),
                'phone'=>trim(($c->contact_phone ?? '') ?: trim(($contact['phone'] ?? $c->user?->whatsapp ?? ''))) ?: null,
                'email'=>$c->contact_email ?? ($contact['email'] ?? ($c->user?->email ?? null)),
                'website'=>$c->website,
                'medium_of_instruction'=>$c->medium_of_instruction ?? ($on['medium_of_instruction'] ?? null),
                'classes'=>is_array($c->classes ?? ($on['classes'] ?? null)) ? $c->classes : ($on['classes'] ?? []),
                'streams'=>$c->streams ?? ($on['streams'] ?? null),
                'student_strength'=>$c->student_strength ?? ($on['student_strength'] ?? null),
            ],
        ]);
    }

    /* ------------------------------------------------------------------ helpers */

    /** Batch display names from the real location reference tables. */
    private function labelMaps(array $countryIds, array $stateIds, array $districtIds): array {
        $countries = $countryIds
            ? DB::table('countries')->whereIn('country_id', array_unique($countryIds))->pluck('country_name','country_id')->all()
            : [];
        $states = $stateIds
            ? DB::table('states')->whereIn('state_subdivision_id', array_unique($stateIds))->pluck('state_subdivision_name','state_subdivision_id')->all()
            : [];
        $districts = $districtIds
            ? DB::table('districts')->whereIn('id', array_unique($districtIds))->pluck('district_name','id')->all()
            : [];
        return [$countries,$states,$districts];
    }

    private function locationLabels($countryId, $stateId, $districtId): array {
        return [
            'country_name'=>!empty($countryId) ? DB::table('countries')->where('country_id',(int)$countryId)->value('country_name') : null,
            'state_name'=>!empty($stateId) ? DB::table('states')->where('state_subdivision_id',(string)$stateId)->value('state_subdivision_name') : null,
            'district_name'=>!empty($districtId) ? DB::table('districts')->where('id',(int)$districtId)->value('district_name') : null,
        ];
    }

    private function toIntOrNull($value): ?int {
        if($value===null || $value==='') return null;
        return (int)$value;
    }
}
