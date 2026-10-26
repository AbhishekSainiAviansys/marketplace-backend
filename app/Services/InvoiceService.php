<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Mpdf\Mpdf;

class InvoiceService
{
    public function download(Order $order): Response
    {
        $order->loadMissing('user');

        $appName = (string) Setting::getVal('app_name', config('app.name'));
        $logo = $this->logoDataUri(Setting::getVal('branding_logo'));
        $contact = $this->contactInfo();

        $items = collect($order->items ?: [])->map(function ($it) {
            $product = null;
            if (!empty($it['id'])) {
                $product = Product::find($it['id']);
            }
            $qty = max(1, (int) ($it['qty'] ?? 1));
            $price = (float) ($it['price'] ?? ($product?->price ?? 0));

            return [
                'name' => (string) ($it['name'] ?? ($product?->name ?? ('#' . ($it['id'] ?? '?')))),
                'qty' => $qty,
                'price' => $price,
                'line_total' => $qty * $price,
            ];
        })->all();

        $subtotal = (float) collect($items)->sum('line_total');
        if ($order->subtotal !== null) $subtotal = (float) $order->subtotal;

        $deliveryMode = $order->delivery ?: '';
        $isPickup = stripos($deliveryMode, 'pickup') !== false;

        $delivery = 0.0;
        if (!$isPickup) {
            $productDelivery = 0.0;
            $hasExplicitDelivery = false;
            foreach ($items as $it) {
                if (!empty($it['id'] ?? null)) {
                    $product = Product::find($it['id']);
                    if ($product && $product->delivery_charge !== null) {
                        $hasExplicitDelivery = true;
                        $productDelivery += (float) $product->delivery_charge * (int) ($it['qty'] ?? 1);
                    }
                }
            }
            if ($hasExplicitDelivery) {
                $delivery = $productDelivery;
            } else {
                $delivery = $subtotal >= 999 ? 0.0 : 49.0;
            }
        }
        if ($order->delivery_charge !== null) $delivery = (float) $order->delivery_charge;

        $gstRate = $order->gst_rate !== null ? (float) $order->gst_rate : 18.0;
        $gst = $order->gst_amount !== null ? (float) $order->gst_amount : round(($subtotal + $delivery) * ($gstRate / 100), 2);
        $couponDiscount = (float) ($order->coupon_discount ?? 0);
        $grandTotal = (float) ($order->total !== null ? $order->total : round($subtotal + $delivery + $gst - $couponDiscount, 2));
        if ($order->total !== null) $grandTotal = (float) $order->total;

        $html = view('invoices.order', [
            'order' => $order,
            'user' => $order->user,
            'appName' => $appName,
            'logo' => $logo,
            'contact' => $contact,
            'items' => $items,
            'subtotal' => $subtotal,
            'delivery' => $delivery,
            'gstRate' => $gstRate,
            'gst' => $gst,
            'couponDiscount' => $couponDiscount,
            'couponCode' => $order->coupon_code,
            'grandTotal' => $grandTotal,
        ])->render();

        $tmpDir = storage_path('app/mpdf');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'tempDir' => $tmpDir,
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_top' => 12,
            'margin_bottom' => 12,
        ]);

        $mpdf->SetTitle('Invoice ' . $order->order_code);
        $mpdf->WriteHTML($html);

        $filename = 'invoice-' . $order->order_code . '.pdf';

        return response($mpdf->Output('', 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    protected function contactInfo(): array
    {
        $raw = Setting::getVal('contact_info', '');
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

        return is_array($decoded) ? $decoded : [];
    }

    protected function logoDataUri($logo): ?string
    {
        $logo = is_string($logo) ? trim($logo) : null;
        if (!$logo) {
            return null;
        }

        $content = null;
        $mime = null;

        if (preg_match('#^https?://#i', $logo)) {
            try {
                $response = Http::timeout(5)->get($logo);
                if ($response->successful()) {
                    $content = $response->body();
                    $mime = $response->header('Content-Type');
                }
            } catch (\Throwable $e) {
                $content = null;
            }
        } else {
            $path = null;
            if (str_starts_with($logo, '/storage/')) {
                $path = storage_path('app/public/' . ltrim(substr($logo, strlen('/storage/')), '/'));
            } elseif (str_starts_with($logo, 'storage/')) {
                $path = storage_path('app/public/' . ltrim(substr($logo, strlen('storage/')), '/'));
            } elseif (is_file($logo)) {
                $path = $logo;
            }

            if ($path && is_file($path)) {
                $content = file_get_contents($path) ?: null;
                $mime = mime_content_type($path) ?: null;
            }
        }

        if (!$content) {
            return null;
        }

        $mime = $mime ?: 'image/png';
        if (str_contains((string) $mime, ';')) {
            $mime = trim(explode(';', (string) $mime)[0]);
        }

        return 'data:' . $mime . ';base64,' . base64_encode($content);
    }
}
