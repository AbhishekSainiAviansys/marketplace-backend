<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class OrderLedgerController extends Controller
{
    protected function adminProductIds(): array
    {
        $ids = [];
        if (Schema::hasTable('products')) {
            $hasCreatedBy = Schema::hasColumn('products', 'created_by_type');
            $hasAddedBy = Schema::hasColumn('products', 'added_by_role');
            if (!$hasCreatedBy && !$hasAddedBy) {
                $ids = Product::pluck('id')->all();
            } else {
                $ids = Product::query()
                    ->where(function ($w) use ($hasCreatedBy, $hasAddedBy) {
                        if ($hasCreatedBy) $w->orWhere('created_by_type', 'admin');
                        if ($hasAddedBy) $w->orWhere('added_by_role', 'admin');
                    })
                    ->pluck('id')
                    ->all();
            }
        }
        return array_map('intval', $ids);
    }

    protected function ownsOrder(Order $order): bool
    {
        $adminIds = $this->adminProductIds();
        $items = $order->items;
        if (is_string($items)) $items = json_decode($items, true);
        if (!is_array($items)) return false;
        if (empty($adminIds)) return false;
        foreach ($items as $it) {
            $pid = $it['id'] ?? $it['product_id'] ?? null;
            if ($pid !== null && in_array((int) $pid, $adminIds, true)) {
                return true;
            }
        }
        return false;
    }

    protected function findAdminOrder($id): Order
    {
        $order = Order::with('user')->find($id);
        if (!$order || !$this->ownsOrder($order)) {
            abort(404, 'Order not found.');
        }
        return $order;
    }

    public function findAdminOrderPublic($id): Order
    {
        return $this->findAdminOrder($id);
    }

    protected function allowedStatuses(): array
    {
        return ['Placed', 'Processing', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Refunded', 'Returned'];
    }

    protected function setIfColumn(Order $order, array $values): void
    {
        if (!Schema::hasTable('orders')) return;
        foreach ($values as $key => $value) {
            if (Schema::hasColumn('orders', $key)) {
                $order->{$key} = $value;
            }
        }
    }

    protected function razorpayCredentials(): array
    {
        if (Schema::hasTable('credentials')) {
            $row = \App\Models\Credential::query()->active()->razorpay()->first();
            if ($row && !empty($row->public) && !empty($row->private)) {
                return ['key_id' => $row->public, 'key_secret' => $row->private];
            }
        }
        return ['key_id' => null, 'key_secret' => null];
    }

    protected function notifyStudent(Order $order, string $title, string $body, string $type = 'order'): void
    {
        if (!Schema::hasTable('notifications')) return;
        $user = $order->user;
        if (!$user) return;
        try {
            \App\Http\Controllers\NotificationController::push($user->id, $title, $body, $type);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Order notification failed: ' . $e->getMessage());
        }
        try {
            app(FcmService::class)->sendToUser($user, $title, $body, [
                'order_id' => $order->id,
                'order_code' => $order->order_code,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Order FCM failed: ' . $e->getMessage());
        }
        $this->setIfColumn($order, ['last_notified_at' => now()]);
        try {
            if (Schema::hasColumn('orders', 'last_notified_at')) $order->save();
        } catch (\Throwable $e) {
        }
    }

    public function index(Request $r)
    {
        $adminProductIds = $this->adminProductIds();

        $query = Order::query();
        if (Schema::hasTable('users')) {
            $query->with('user');
        }
        $filtered = $query->get()->filter(function ($order) use ($adminProductIds) {
            $items = $order->items;
            if (is_string($items)) $items = json_decode($items, true);
            if (!is_array($items)) return false;
            foreach ($items as $it) {
                $pid = $it['id'] ?? $it['product_id'] ?? null;
                if ($pid !== null && in_array((int) $pid, $adminProductIds, true)) {
                    return true;
                }
            }
            return false;
        });

        if ($r->filled('search')) {
            $s = (string) $r->input('search');
            $filtered = $filtered->filter(function ($order) use ($s) {
                if (stripos((string) $order->order_code, $s) !== false) return true;
                if ($order->user) {
                    if (stripos((string) $order->user->name, $s) !== false) return true;
                    if (stripos((string) $order->user->email, $s) !== false) return true;
                }
                return false;
            });
        }
        if ($r->filled('status')) {
            $filtered = $filtered->where('status', (string) $r->input('status'));
        }
        if ($r->filled('payment_status')) {
            $filtered = $filtered->where('payment_status', (string) $r->input('payment_status'));
        }

        $sortField = (string) $r->input('sort_by', 'placed_at');
        $allowedSort = ['id', 'order_code', 'total', 'status', 'payment_status', 'placed_at', 'paid_at', 'created_at', 'tracking_number'];
        if (!in_array($sortField, $allowedSort, true)) $sortField = 'placed_at';
        $sortDir = strtolower((string) $r->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $filtered = $filtered->values();
        $filtered = $sortDir === 'asc'
            ? $filtered->sortBy($sortField)->values()
            : $filtered->sortByDesc($sortField)->values();

        $perPage = (int) $r->input('per_page', 20);
        if (!in_array($perPage, [10, 20, 50, 100], true)) $perPage = 20;
        $page = max(1, (int) $r->input('page', 1));
        $total = $filtered->count();
        $items = $filtered->slice(($page - 1) * $perPage, $perPage)->values();

        $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => $r->url(), 'query' => $r->query()]
        );

        return response()->json($paginator);
    }

    public function show($id)
    {
        return response()->json($this->findAdminOrder($id));
    }

    public function update(Request $r, $id)
    {
        $order = $this->findAdminOrder($id);
        $d = $r->validate([
            'status' => 'nullable|string|max:50',
            'payment_status' => 'nullable|string|in:paid,unpaid,failed,refunded',
            'courier' => 'nullable|string|max:120',
            'tracking_number' => 'nullable|string|max:120',
            'tracking_url' => 'nullable|string|max:500',
            'admin_note' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*' => 'nullable|array',
            'items.*.id' => 'nullable',
            'items.*.product_id' => 'nullable',
            'items.*.courier' => 'nullable|string|max:120',
            'items.*.tracking_number' => 'nullable|string|max:120',
            'items.*.tracking_url' => 'nullable|string|max:500',
            'items.*.shipped_at' => 'nullable|date',
            'items.*.delivered_at' => 'nullable|date',
            'notify' => 'nullable',
            'send_notification' => 'nullable',
        ]);

        if (!empty($d['status']) && !in_array($d['status'], $this->allowedStatuses(), true)) {
            abort(422, 'Invalid order status.');
        }

        $oldStatus = $order->status;
        $notify = true;
        if (array_key_exists('notify', $d)) $notify = filter_var($d['notify'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
        if (array_key_exists('send_notification', $d)) $notify = filter_var($d['send_notification'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $notify;

        $changes = [];
        if (!empty($d['status'])) $changes['status'] = $d['status'];
        if (!empty($d['payment_status'])) $changes['payment_status'] = $d['payment_status'];
        if (array_key_exists('courier', $d)) $changes['courier'] = $d['courier'];
        if (array_key_exists('tracking_number', $d)) $changes['tracking_number'] = $d['tracking_number'];
        if (array_key_exists('tracking_url', $d)) $changes['tracking_url'] = $d['tracking_url'];
        if (array_key_exists('admin_note', $d)) $changes['admin_note'] = $d['admin_note'];

        $itemsSubmitted = array_key_exists('items', $d) && is_array($d['items']);
        $itemsHaveTracking = false;
        if ($itemsSubmitted) {
            $existingItems = $order->items;
            if (is_string($existingItems)) $existingItems = json_decode($existingItems, true);
            if (!is_array($existingItems)) $existingItems = [];

            $indexByKey = [];
            foreach ($existingItems as $idx => $it) {
                if (!is_array($it)) continue;
                $key = (string) ($it['id'] ?? $it['product_id'] ?? $idx);
                if ($key === '' || $key === 'null') $key = (string) $idx;
                if (!array_key_exists($key, $indexByKey)) $indexByKey[$key] = $idx;
            }

            $normalizedSubmitted = array_values($d['items']);
            foreach ($normalizedSubmitted as $pos => $submittedItem) {
                if (!is_array($submittedItem)) continue;
                $key = (string) ($submittedItem['id'] ?? $submittedItem['product_id'] ?? '');
                if ($key === '' || $key === 'null') $key = (string) $pos;
                $idx = $indexByKey[$key] ?? null;
                if ($idx === null && isset($existingItems[$pos])) $idx = $pos;
                if ($idx === null || !isset($existingItems[$idx]) || !is_array($existingItems[$idx])) continue;

                foreach (['courier', 'tracking_number', 'tracking_url'] as $field) {
                    if (array_key_exists($field, $submittedItem)) {
                        $value = $submittedItem[$field];
                        $existingItems[$idx][$field] = ($value === '' || $value === null) ? null : (string) $value;
                    }
                }
                foreach (['shipped_at', 'delivered_at'] as $field) {
                    if (array_key_exists($field, $submittedItem)) {
                        $value = $submittedItem[$field];
                        $existingItems[$idx][$field] = ($value === '' || $value === null) ? null : $value;
                    }
                }

                $tracked = !empty($existingItems[$idx]['courier'])
                    || !empty($existingItems[$idx]['tracking_number'])
                    || !empty($existingItems[$idx]['tracking_url']);
                if ($tracked) $itemsHaveTracking = true;
            }

            // Propagate per-item shipped/delivered timestamps when the whole order moves.
            if (!empty($d['status']) && in_array($d['status'], ['Shipped', 'Out for delivery', 'Delivered'], true)) {
                foreach ($existingItems as $idx => $it) {
                    if (!is_array($it)) continue;
                    $tracked = !empty($it['courier']) || !empty($it['tracking_number']) || !empty($it['tracking_url']);
                    if (!$tracked) continue;
                    if (in_array($d['status'], ['Shipped', 'Out for delivery'], true) && empty($it['shipped_at'])) {
                        $existingItems[$idx]['shipped_at'] = now()->toDateTimeString();
                    }
                    if ($d['status'] === 'Delivered' && empty($it['delivered_at'])) {
                        $existingItems[$idx]['delivered_at'] = now()->toDateTimeString();
                    }
                }
            }

            $changes['items'] = array_values($existingItems);

            // Keep the legacy order-level tracking fields in sync unless explicitly provided.
            $explicitOrderTracking = array_key_exists('courier', $d)
                || array_key_exists('tracking_number', $d)
                || array_key_exists('tracking_url', $d);
            if (!$explicitOrderTracking) {
                $firstTracked = null;
                foreach ($existingItems as $it) {
                    if (!is_array($it)) continue;
                    if (!empty($it['courier']) || !empty($it['tracking_number']) || !empty($it['tracking_url'])) {
                        $firstTracked = $it;
                        break;
                    }
                }
                if ($firstTracked) {
                    $changes['courier'] = $firstTracked['courier'] ?? null;
                    $changes['tracking_number'] = $firstTracked['tracking_number'] ?? null;
                    $changes['tracking_url'] = $firstTracked['tracking_url'] ?? null;
                } else {
                    $changes['courier'] = null;
                    $changes['tracking_number'] = null;
                    $changes['tracking_url'] = null;
                }
            }
        }

        $hasTrackingChange = array_key_exists('courier', $d)
            || array_key_exists('tracking_number', $d)
            || array_key_exists('tracking_url', $d)
            || $itemsHaveTracking;

        if (empty($changes['status']) && $hasTrackingChange) {
            $changes['status'] = 'Shipped';
        }

        if (!empty($changes['status'])) {
            if ($changes['status'] === 'Shipped') $changes['shipped_at'] = now();
            if ($changes['status'] === 'Delivered') $changes['delivered_at'] = now();
            if ($changes['status'] === 'Cancelled') $changes['cancelled_at'] = now();
            if ($changes['status'] === 'Refunded') $changes['refunded_at'] = now();
        }

        $this->setIfColumn($order, $changes);
        $order->save();

        if ($notify) {
            $title = 'Order ' . $order->order_code . ' updated';
            $body = 'Your order status is now ' . $order->status . '.';
            if (!empty($order->tracking_number)) {
                $body .= ' Tracking: ' . $order->tracking_number . ($order->courier ? ' (' . $order->courier . ')' : '') . '.';
            }
            $this->notifyStudent($order, $title, $body, 'order_status');
        }

        return response()->json($order->fresh());
    }

    public function updateStatus(Request $r, $id)
    {
        $r->merge(['status' => $r->input('status')]);
        return $this->update($r, $id);
    }

    public function updateTracking(Request $r, $id)
    {
        return $this->update($r, $id);
    }

    public function cancel(Request $r, $id)
    {
        $order = $this->findAdminOrder($id);
        if (in_array($order->status, ['Cancelled', 'Refunded'], true)) {
            abort(422, 'Order is already cancelled or refunded.');
        }

        $d = $r->validate([
            'reason' => 'nullable|string',
            'admin_note' => 'nullable|string',
            'notify' => 'nullable',
        ]);
        $notify = true;
        if (array_key_exists('notify', $d)) $notify = filter_var($d['notify'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;

        DB::transaction(function () use ($order, $d) {
            if (Schema::hasTable('products') && Schema::hasColumn('products', 'stock')) {
                $items = $order->items;
                if (is_string($items)) $items = json_decode($items, true);
                if (is_array($items)) {
                    foreach ($items as $it) {
                        $pid = $it['id'] ?? $it['product_id'] ?? null;
                        $qty = (int) ($it['qty'] ?? 1);
                        if ($pid && $qty > 0) {
                            $product = Product::find($pid);
                            if ($product) $product->increment('stock', $qty);
                        }
                    }
                }
            }
            $changes = ['status' => 'Cancelled', 'cancelled_at' => now()];
            if (!empty($d['reason'])) $changes['admin_note'] = $d['reason'];
            if (!empty($d['admin_note'])) $changes['admin_note'] = $d['admin_note'];
            $this->setIfColumn($order, $changes);
            $order->save();
        });

        if ($notify) {
            $this->notifyStudent($order, 'Order ' . $order->order_code . ' cancelled', 'Your order has been cancelled.' . (!empty($d['reason']) ? ' Reason: ' . $d['reason'] : ''), 'order_cancelled');
        }

        return response()->json($order->fresh());
    }

    public function refund(Request $r, $id)
    {
        $order = $this->findAdminOrder($id);
        if ($order->payment_status !== 'paid') {
            abort(422, 'Order is not paid.');
        }
        if (Schema::hasColumn('orders', 'refund_ref') && !empty($order->refund_ref)) {
            abort(422, 'Order has already been refunded.');
        }

        $d = $r->validate([
            'notify' => 'nullable',
        ]);
        $notify = true;
        if (array_key_exists('notify', $d)) $notify = filter_var($d['notify'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;

        $creds = $this->razorpayCredentials();
        if (empty($creds['key_id']) || empty($creds['key_secret'])) {
            abort(503, 'Razorpay is not configured.');
        }
        if (empty($order->payment_ref)) {
            abort(422, 'Missing payment reference.');
        }

        $amountPaise = (int) round(((float) $order->total) * 100);
        $res = Http::withBasicAuth($creds['key_id'], $creds['key_secret'])
            ->post('https://api.razorpay.com/v1/payments/' . $order->payment_ref . '/refund', [
                'amount' => $amountPaise,
            ]);

        if (!$res->successful()) {
            abort(502, 'Unable to process Razorpay refund.');
        }

        $refundId = $res->json('id');
        $this->setIfColumn($order, [
            'payment_status' => 'refunded',
            'refunded_at' => now(),
            'refund_ref' => $refundId,
        ]);
        $order->save();

        if ($notify) {
            $this->notifyStudent($order, 'Order ' . $order->order_code . ' refunded', 'Your payment has been refunded.', 'order_refunded');
        }

        return response()->json($order->fresh());
    }

    public function markPaid(Request $r, $id)
    {
        $order = $this->findAdminOrder($id);
        $this->setIfColumn($order, [
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);
        $order->save();

        $notify = $r->boolean('notify', true);
        if ($notify) {
            $this->notifyStudent($order, 'Order ' . $order->order_code . ' payment received', 'Your payment has been marked as received.', 'order_payment');
        }

        return response()->json($order->fresh());
    }

    public function sendNotification(Request $r, $id)
    {
        $order = $this->findAdminOrder($id);
        $d = $r->validate([
            'title' => 'nullable|string|max:150',
            'body' => 'nullable|string',
            'type' => 'nullable|string|max:50',
        ]);
        $title = $d['title'] ?? ('Order ' . $order->order_code . ' update');
        $body = $d['body'] ?? ('Your order status is ' . $order->status . '.');
        if (!empty($order->tracking_number)) {
            $body .= ' Tracking: ' . $order->tracking_number;
        }
        $this->notifyStudent($order, $title, $body, $d['type'] ?? 'order_update');
        return response()->json(['ok' => true]);
    }
}
