<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
        .logo { height: 50px; }
        .title { font-size: 20px; font-weight: bold; }
        .muted { color: #666; }
        .row { width: 100%; }
        .col { display: inline-block; vertical-align: top; }
        .meta { margin: 10px 0; }
        .meta td { padding: 2px 6px 2px 0; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th, table.items td { border: 1px solid #ddd; padding: 6px; }
        table.items th { background: #f2f2f2; text-align: left; }
        .right { text-align: right; }
        .totals { margin-top: 8px; width: 40%; float: right; }
        .totals td { padding: 3px 0; }
        .section { margin-top: 14px; }
        .footer { margin-top: 30px; font-size: 9px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <table style="width:100%;">
            <tr>
                <td style="width:70px;">
                    @if($logo)
                        <img src="{{ $logo }}" class="logo" alt="logo">
                    @else
                        <div style="font-size:14px;font-weight:bold;">{{ $appName }}</div>
                    @endif
                </td>
                <td>
                    <div class="title">{{ $appName }}</div>
                    <div class="muted">
                        @if(!empty($contact['email'])) Email: {{ $contact['email'] }} @endif
                        @if(!empty($contact['phone'])) | Phone: {{ $contact['phone'] }} @endif
                    </div>
                    @if(!empty($contact['address']))
                        <div class="muted">{{ $contact['address'] }}</div>
                    @endif
                </td>
                <td style="text-align:right;">
                    <div class="title">INVOICE</div>
                    <div>#{{ $order->order_code }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="meta">
        <tr>
            <td><strong>Invoice date:</strong></td>
            <td>{{ optional($order->placed_at)->format('d M Y') ?: $order->created_at->format('d M Y') }}</td>
            <td><strong>Payment status:</strong></td>
            <td>{{ $order->payment_status ?: 'unpaid' }}</td>
        </tr>
        <tr>
            <td><strong>Order status:</strong></td>
            <td>{{ $order->status ?: 'Placed' }}</td>
            <td><strong>Payment mode:</strong></td>
            <td>{{ $order->pay_mode ?: '—' }}</td>
        </tr>
        @if($couponCode)
        <tr>
            <td><strong>Coupon code:</strong></td>
            <td>{{ $couponCode }}</td>
            <td><strong>Coupon discount:</strong></td>
            <td>-{{ number_format($couponDiscount, 2) }}</td>
        </tr>
        @endif
        <tr>
            <td><strong>Paid at:</strong></td>
            <td>{{ $order->paid_at ? $order->paid_at->format('d M Y H:i') : '—' }}</td>
            <td><strong>Delivery:</strong></td>
            <td>{{ $order->delivery ?: '—' }}</td>
        </tr>
    </table>

    <div class="section">
        <strong>Bill to:</strong><br>
        {{ $user?->name ?: 'Customer' }}<br>
        @if($user?->email) {{ $user->email }}<br> @endif
        @if($user?->whatsapp) {{ $user->whatsapp }}<br> @endif
        @if($order->address)
            <strong>Delivery address:</strong><br>
            {{ $order->address }}
        @endif
    </div>

    <table class="items">
        <thead>
            <tr>
                <th>#</th>
                <th>Product</th>
                <th class="right">Qty</th>
                <th class="right">Unit price</th>
                <th class="right">Line total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $it)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $it['name'] }}</td>
                    <td class="right">{{ $it['qty'] }}</td>
                    <td class="right">{{ number_format($it['price'], 2) }}</td>
                    <td class="right">{{ number_format($it['line_total'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Subtotal</td>
            <td class="right">{{ number_format($subtotal, 2) }}</td>
        </tr>
        <tr>
            <td>Delivery charges</td>
            <td class="right">{{ number_format($delivery, 2) }}</td>
        </tr>
        <tr>
            <td>GST ({{ number_format($gstRate, 0) }}%)</td>
            <td class="right">{{ number_format($gst, 2) }}</td>
        </tr>
        @if($couponCode && $couponDiscount > 0)
        <tr>
            <td>Coupon discount</td>
            <td class="right">-{{ number_format($couponDiscount, 2) }}</td>
        </tr>
        @endif
        <tr>
            <td><strong>Grand total</strong></td>
            <td class="right"><strong>{{ number_format($grandTotal, 2) }}</strong></td>
        </tr>
    </table>

    <div style="clear:both;"></div>

    @if($order->courier || $order->tracking_number || $order->tracking_url || $order->admin_note)
        <div class="section">
            <strong>Tracking &amp; delivery</strong><br>
            @if($order->courier) Courier: {{ $order->courier }}<br> @endif
            @if($order->tracking_number) Tracking number: {{ $order->tracking_number }}<br> @endif
            @if($order->tracking_url) Tracking link: {{ $order->tracking_url }}<br> @endif
            @if($order->shipped_at) Shipped at: {{ $order->shipped_at->format('d M Y H:i') }}<br> @endif
            @if($order->delivered_at) Delivered at: {{ $order->delivered_at->format('d M Y H:i') }}<br> @endif
            @if($order->admin_note) Admin note: {{ $order->admin_note }} @endif
        </div>
    @endif

    <div class="footer">
        Thank you for your purchase. This is a computer-generated invoice.
    </div>
</body>
</html>
