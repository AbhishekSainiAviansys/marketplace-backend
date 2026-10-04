<?php
namespace App\Http\Controllers;
use App\Models\{User, Notification};
use Illuminate\Http\Request;

class NotificationController extends Controller {
    // GET /notifications – own list (proves "proper notification works")
    public function index(Request $r){
        return Notification::where('user_id',$r->user()->id)->latest()->paginate(20);
    }
    // POST /notifications/test – send self test notification
    public function test(Request $r){
        $d=$r->validate(['title'=>'required','body'=>'nullable']);
        $n=Notification::create(['user_id'=>$r->user()->id,'title'=>$d['title'],'body'=>$d['body']??'','type'=>'test']);
        return response()->json($n,201);
    }
    // POST /notifications/{id}/read
    public function read(Request $r,$id){
        $n=Notification::where('user_id',$r->user()->id)->findOrFail($id);
        $n->update(['is_read'=>true]);
        return response()->json($n);
    }
    // Admin broadcast helper (used by AdminController too)
    public static function push($userId,$title,$body,$type='info'){
        return Notification::create(['user_id'=>$userId,'title'=>$title,'body'=>$body,'type'=>$type]);
    }
    public static function pushRole($role,$title,$body,$type='info'){
        $ids=User::where('role',$role)->pluck('id');
        foreach($ids as $id) self::push($id,$title,$body,$type);
        return ['sent_to'=>count($ids)];
    }
}
