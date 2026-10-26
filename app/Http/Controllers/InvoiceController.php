<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function student(Request $r, $order, InvoiceService $invoices)
    {
        $u = $r->user();
        $o = Order::where('user_id', $u->id)
            ->where(function ($w) use ($order) {
                $w->where('id', $order)->orWhere('order_code', $order);
            })
            ->firstOrFail();

        return $invoices->download($o);
    }

    public function admin(Request $r, $id, InvoiceService $invoices)
    {
        $order = app(\App\Http\Controllers\OrderLedgerController::class)->findAdminOrderPublic($id);

        return $invoices->download($order);
    }
}
