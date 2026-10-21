<?php
namespace App\Http\Controllers;

use App\Models\InstituteView;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Search-appearance analytics for school / coaching owners:
 *   - GET /insights/summary?month=YYYY-MM  (per-day counts + admin messages)
 *   - GET /insights/views?date=YYYY-MM-DD (viewer rows for the day)
 *   - GET /enquiries (popup enquiries, newest first)
 *
 * Logged-out viewers render as "Unknown" (student_user_id null).
 */
trait InsightsTrait {

    /** Shared summary: per-day view counts + latest admin messages + totals. */
    private function buildInsightsSummary(Request $r, string $type, int $id): array {
        $month = $r->query('month');
        if(!preg_match('/^\d{4}-\d{2}$/', (string)$month)) $month = now()->format('Y-m');
        $start = $month.'-01';
        $end = date('Y-m-t', strtotime($start));

        $days = InstituteView::where('institute_type',$type)->where('institute_id',$id)
            ->whereBetween('created_at', [$start.' 00:00:00', $end.' 23:59:59'])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')->pluck('count','day')->all();

        $enquiriesCount = \App\Models\InstituteEnquiry::where('institute_type',$type)
            ->where('institute_id',$id)->count();

        $messages = \App\Models\Notification::where('user_id',$r->user()->id)
            ->latest()->limit(5)->get(['id','title','body','type','is_read','created_at']);

        return [
            'month'=>$month, 'days'=>$days,
            'enquiries_count'=>$enquiriesCount,
            'admin_messages'=>$messages,
        ];
    }

    /** Viewer rows for one calendar day (name or Unknown + location + time). */
    private function fetchInsightsViews(Request $r, string $type, int $id){
        $d = $r->validate(['date'=>'required|date_format:Y-m-d']);
        $rows = InstituteView::where('institute_type',$type)->where('institute_id',$id)
            ->whereDate('institute_views.created_at',$d['date'])
            ->leftJoin('users','users.id','=','institute_views.student_user_id')
            ->orderBy('institute_views.created_at','desc')->limit(200)
            ->get([
                'institute_views.id','institute_views.event','institute_views.source',
                'institute_views.country_name','institute_views.state_name','institute_views.district_name',
                'institute_views.filter_q','institute_views.created_at',
                'users.name as student_name',
            ]);
        return response()->json($rows->map(fn($v)=>[
            'id'=>$v->id,
            'name'=>$v->student_name ?: 'Unknown',
            'event'=>$v->event,
            'location'=>collect([$v->district_name,$v->state_name,$v->country_name])->filter()->join(', ') ?: null,
            'filter_q'=>$v->filter_q,
            'source'=>$v->source,
            'time'=>$v->created_at,
        ]));
    }

    /** Popup enquiries for this institute, newest first. */
    private function fetchInsightsEnquiries(Request $r, string $type, int $id){
        $rows = \App\Models\InstituteEnquiry::where('institute_type',$type)
            ->where('institute_id',$id)
            ->leftJoin('users','users.id','=','institute_enquiries.student_user_id')
            ->orderBy('institute_enquiries.created_at','desc')->paginate(20);
        $rows->getCollection()->transform(fn($e)=>[
            'id'=>$e->id,
            'name'=>$e->student_user_id ? ($e->name ?? 'Unknown') : ($e->name ?: 'Unknown'),
            'contact'=>$e->contact,
            'enquiry_for'=>$e->enquiry_for,
            'location'=>collect([$e->district_name,$e->state_name,$e->country_name])->filter()->join(', ') ?: null,
            'source'=>$e->source,
            'time'=>$e->created_at,
        ]);
        return response()->json($rows);
    }
}
