<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\ProductVariant;
use App\Models\StockTracking;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ProductStockService
{
    public function hasVariants(Product $product): bool
    {
        if (Schema::hasColumn('products', 'is_variant')) {
            return (bool) $product->getAttribute('is_variant');
        }
        if ((bool) $product->getAttribute('is_variant')) {
            return true;
        }

        if (Schema::hasTable('product_stock')) {
            $hasOptionRows = ProductStock::where('product_id', $product->id)
                ->where(function ($query) {
                    foreach (['colour', 'color', 'size'] as $column) {
                        if (Schema::hasColumn('product_stock', $column)) {
                            $query->orWhere(function ($option) use ($column) {
                                $option->whereNotNull($column)->where($column, '<>', '');
                            });
                        }
                    }
                })
                ->exists();
            if ($hasOptionRows) {
                return true;
            }
        }

        return Schema::hasTable('product_variants')
            && ProductVariant::where('product_id', $product->id)->exists();
    }

    public function findStockRecord(Product $product, ?string $color, ?string $size, bool $lock = false): ?Model
    {
        if (Schema::hasTable('product_stock')) {
            $query = ProductStock::where('product_id', $product->id);
            if ($lock) {
                $query->lockForUpdate();
            }
            $this->applyOption($query, 'product_stock', ['colour', 'color'], $color);
            $this->applyOption($query, 'product_stock', ['size'], $size);
            $record = $query->first();
            if ($record) {
                return $record;
            }
        }

        if (Schema::hasTable('product_variants')) {
            $query = ProductVariant::where('product_id', $product->id)
                ->where('color', $color)
                ->where('size', $size);
            if ($lock) {
                $query->lockForUpdate();
            }

            return $query->first();
        }

        return null;
    }

    public function available(Product $product, ?Model $record, bool $hasVariants): int
    {
        if ($record) {
            return (int) ($record->quantity ?? $record->stock ?? $record->qty ?? 0);
        }
        if ($hasVariants) {
            return 0;
        }

        return (int) $product->stock;
    }

    public function decrementForOrder(
        Product $product,
        ?Model $record,
        int $quantity,
        ?string $color,
        ?string $size,
        bool $hasVariants,
    ): void {
        $available = $this->available($product, $record, $hasVariants);
        if ($available < $quantity) {
            abort(422, 'Insufficient stock for '.$product->name.'. Only '.$available.' left.');
        }

        $variantId = null;
        if ($record instanceof ProductStock) {
            $variantId = $record->variant_id;
            foreach (['quantity', 'stock', 'qty'] as $column) {
                if (Schema::hasColumn('product_stock', $column)) {
                    $record->{$column} = max(0, (int) $record->{$column} - $quantity);
                }
            }
            $record->save();
            if ($variantId && Schema::hasTable('product_variants')) {
                ProductVariant::whereKey($variantId)->lockForUpdate()->decrement('stock', $quantity);
            }
        } elseif ($record instanceof ProductVariant) {
            $variantId = $record->id;
            $record->decrement('stock', $quantity);
        }

        if (Schema::hasColumn('products', 'stock')) {
            if ($record instanceof ProductStock && $hasVariants && Schema::hasColumn('product_stock', 'quantity')) {
                $total = ProductStock::where('product_id', $product->id)->sum('quantity');
                Product::whereKey($product->id)->update(['stock' => $total]);
            } elseif ($record instanceof ProductVariant && $hasVariants) {
                $total = ProductVariant::where('product_id', $product->id)->sum('stock');
                Product::whereKey($product->id)->update(['stock' => $total]);
            } else {
                Product::whereKey($product->id)->decrement('stock', $quantity);
            }
        }

        if (Schema::hasTable('stock_tracking')) {
            $tracking = [
                'product_id' => $product->id,
                'variant_id' => $variantId,
                'reason' => 'ordered',
                'created_at' => now(),
            ];
            foreach (['colour', 'color'] as $column) {
                if (Schema::hasColumn('stock_tracking', $column)) {
                    $tracking[$column] = $color;
                }
            }
            if (Schema::hasColumn('stock_tracking', 'color_code')) {
                $tracking['color_code'] = $record instanceof ProductStock ? $record->color_code : null;
            }
            if (Schema::hasColumn('stock_tracking', 'size')) {
                $tracking['size'] = $size;
            }
            foreach (['delta', 'quantity', 'change', 'qty'] as $column) {
                if (Schema::hasColumn('stock_tracking', $column)) {
                    $tracking[$column] = -$quantity;
                }
            }
            StockTracking::create($tracking);
        }
    }

    private function applyOption($query, string $table, array $columns, ?string $value): void
    {
        $columns = array_values(array_filter($columns, fn ($column) => Schema::hasColumn($table, $column)));
        if (! $columns) {
            return;
        }

        $query->where(function ($options) use ($columns, $value) {
            foreach ($columns as $column) {
                if ($value === null || $value === '') {
                    $options->orWhereNull($column)->orWhere($column, '');
                } else {
                    $options->orWhere($column, $value);
                }
            }
        });
    }
}
