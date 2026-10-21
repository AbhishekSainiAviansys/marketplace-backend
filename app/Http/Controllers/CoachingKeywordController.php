<?php

namespace App\Http\Controllers;

use App\Models\CoachingKeyword;
use Illuminate\Http\Request;

/**
 * Coaching institute keywords — each institute owns its own keywords.
 * Keywords are searchable by students on the public /directory page via ?q=.
 */
class CoachingKeywordController extends Controller
{
    /** GET /coaching/keywords — this institute's keywords. */
    public function index(Request $r)
    {
        $institute = $r->user()->coachingInstitute;
        if (!$institute) {
            return response()->json(['message' => 'No coaching institute profile'], 404);
        }
        return response()->json($institute->keywords);
    }

    /** POST /coaching/keywords — add one keyword. */
    public function store(Request $r)
    {
        $institute = $r->user()->coachingInstitute;
        if (!$institute) {
            return response()->json(['message' => 'No coaching institute profile'], 404);
        }
        $d = $r->validate([
            'keyword' => 'required|string|max:100',
        ]);
        $keyword = mb_strtolower(trim($d['keyword']));
        if ($keyword === '') {
            return response()->json(['message' => 'Keyword cannot be empty'], 422);
        }
        $existing = CoachingKeyword::where('coaching_institute_id', $institute->id)
            ->whereRaw('LOWER(keyword) = ?', [$keyword])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Keyword already exists', 'keyword' => $existing], 409);
        }
        $row = CoachingKeyword::create([
            'coaching_institute_id' => $institute->id,
            'keyword' => $keyword,
        ]);
        return response()->json($row, 201);
    }

    /** DELETE /coaching/keywords/{id} — remove one of this institute's keywords. */
    public function destroy(Request $r, int $id)
    {
        $institute = $r->user()->coachingInstitute;
        if (!$institute) {
            return response()->json(['message' => 'No coaching institute profile'], 404);
        }
        $row = CoachingKeyword::where('id', $id)
            ->where('coaching_institute_id', $institute->id)
            ->first();
        if (!$row) {
            return response()->json(['message' => 'Keyword not found'], 404);
        }
        $row->delete();
        return response()->json(['deleted' => true, 'id' => $id]);
    }
}