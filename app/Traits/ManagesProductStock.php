<?php

namespace App\Traits;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

trait ManagesProductStock
{
    protected function extractStockRows(Request $r): array
    {
        foreach (['product_stock', 'product_stocks', 'stocks', 'stock_entries', 'stock_variants', 'stock_list'] as $key) {
            if ($r->has($key) && is_array($r->input($key))) {
                return array_values($r->input($key));
            }
        }
        return [];
    }

    protected function normalizeStockColour(array $row): ?string
    {
        foreach (['colour', 'color', 'colour_name', 'color_name'] as $key) {
            if (isset($row[$key]) && $row[$key] !== '') {
                return (string) $row[$key];
            }
        }
        return null;
    }

    protected function normalizeStockSize(array $row): ?string
    {
        if (isset($row['size']) && $row['size'] !== '') {
            return (string) $row['size'];
        }
        return null;
    }

    protected function normalizeStockQuantity(array $row): int
    {
        foreach (['quantity', 'stock', 'qty', 'amount'] as $key) {
            if (isset($row[$key]) && $row[$key] !== '') {
                return (int) $row[$key];
            }
        }
        return 0;
    }

    protected function persistProductStockRows(Product $product, array $rows, string $reason): void
    {
        if (!Schema::hasTable('product_stock')) {
            return;
        }

        ProductStock::where('product_id', $product->id)->delete();

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $colour = $this->normalizeStockColour($row);
            $size = $this->normalizeStockSize($row);
            $quantity = $this->normalizeStockQuantity($row);
            $variantId = isset($row['variant_id']) && $row['variant_id'] !== '' ? (int) $row['variant_id'] : null;

            $data = [
                'product_id' => $product->id,
                'variant_id' => $variantId,
                'size' => $size,
            ];

            if (Schema::hasColumn('product_stock', 'colour')) {
                $data['colour'] = $colour;
            }
            if (Schema::hasColumn('product_stock', 'color')) {
                $data['color'] = $colour;
            }
            if (Schema::hasColumn('product_stock', 'quantity')) {
                $data['quantity'] = $quantity;
            }
            if (Schema::hasColumn('product_stock', 'stock')) {
                $data['stock'] = $quantity;
            }
            if (Schema::hasColumn('product_stock', 'qty')) {
                $data['qty'] = $quantity;
            }

            ProductStock::create($data);

            if (Schema::hasTable('stock_tracking')) {
                $tracking = [
                    'product_id' => $product->id,
                    'variant_id' => $variantId,
                    'size' => $size,
                    'reason' => $reason,
                    'created_at' => now(),
                ];

                if (Schema::hasColumn('stock_tracking', 'colour')) {
                    $tracking['colour'] = $colour;
                }
                if (Schema::hasColumn('stock_tracking', 'color')) {
                    $tracking['color'] = $colour;
                }
                if (Schema::hasColumn('stock_tracking', 'delta')) {
                    $tracking['delta'] = $quantity;
                }
                if (Schema::hasColumn('stock_tracking', 'quantity')) {
                    $tracking['quantity'] = $quantity;
                }
                if (Schema::hasColumn('stock_tracking', 'change')) {
                    $tracking['change'] = $quantity;
                }
                if (Schema::hasColumn('stock_tracking', 'qty')) {
                    $tracking['qty'] = $quantity;
                }

                StockTracking::create($tracking);
            }
        }
    }

    protected function stockRowsFromVariants(Product $product): array
    {
        return $product->variants()->get()->map(function ($variant) {
            return [
                'variant_id' => $variant->id,
                'colour' => $variant->color,
                'size' => $variant->size,
                'quantity' => $variant->stock,
            ];
        })->all();
    }
}
