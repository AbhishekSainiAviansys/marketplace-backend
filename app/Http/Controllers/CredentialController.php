<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use Illuminate\Http\Request;

class CredentialController extends Controller
{
    public function index(Request $r)
    {
        $rows = Credential::query()->orderBy('id')->get();
        if (!$r->boolean('show')) {
            $rows = $rows->map(function ($c) {
                foreach (['private', 'api'] as $field) {
                    if ($c->{$field}) {
                        $c->{$field} = '****' . substr((string) $c->{$field}, -4);
                    }
                }
                return $c;
            });
        }
        return response()->json($rows);
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'title' => 'required|string|max:120',
            'public' => 'nullable|string',
            'private' => 'nullable|string',
            'api' => 'nullable|string',
            'desc' => 'nullable|string',
            'status' => 'nullable|string|max:30',
        ]);

        $row = Credential::create([
            'title' => $d['title'],
            'public' => $d['public'] ?? null,
            'private' => $d['private'] ?? null,
            'api' => $d['api'] ?? null,
            'desc' => $d['desc'] ?? null,
            'status' => $d['status'] ?? 'Active',
        ]);

        return response()->json($row, 201);
    }

    public function update(Request $r, $id)
    {
        $row = Credential::findOrFail($id);

        $d = $r->validate([
            'title' => 'nullable|string|max:120',
            'public' => 'nullable|string',
            'private' => 'nullable|string',
            'api' => 'nullable|string',
            'desc' => 'nullable|string',
            'status' => 'nullable|string|max:30',
        ]);

        if (array_key_exists('title', $d) && $d['title'] !== null) {
            $row->title = $d['title'];
        }
        if (array_key_exists('public', $d)) {
            $row->public = $d['public'] === '' ? $row->public : ($d['public'] ?? $row->public);
        }
        foreach (['private', 'api'] as $field) {
            if (array_key_exists($field, $d)) {
                // Blank means "keep existing secret".
                if ($d[$field] !== '' && $d[$field] !== null) {
                    $row->{$field} = $d[$field];
                }
            }
        }
        if (array_key_exists('desc', $d)) {
            $row->desc = $d['desc'] === '' ? $row->desc : ($d['desc'] ?? $row->desc);
        }
        if (array_key_exists('status', $d) && $d['status'] !== null) {
            $row->status = $d['status'];
        }
        $row->save();

        return response()->json($row);
    }

    // Convenience upsert for the single Razorpay credential row used by payments.
    public function upsertRazorpay(Request $r)
    {
        $d = $r->validate([
            'public' => 'nullable|string',
            'private' => 'nullable|string',
            'api' => 'nullable|string',
            'status' => 'nullable|string|max:30',
        ]);

        $row = Credential::query()->razorpay()->first();
        if (!$row) {
            $row = new Credential();
            $row->title = 'Razorpay';
        }
        if (array_key_exists('public', $d)) {
            $row->public = $d['public'] === '' ? $row->public : ($d['public'] ?? $row->public);
        }
        foreach (['private', 'api'] as $field) {
            if (array_key_exists($field, $d) && $d[$field] !== '' && $d[$field] !== null) {
                $row->{$field} = $d[$field];
            }
        }
        $row->status = $d['status'] ?? ($row->status ?: 'Active');
        $row->save();

        return response()->json($row);
    }
}