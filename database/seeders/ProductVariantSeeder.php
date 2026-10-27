<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductVariant;

// Seeds colour + size variants for PRD000003 (Milton Water Bottle, product_id=3)
// so the storefront Details page renders the colour/size picker.
// Idempotent: safe to re-run (updateOrInsert on unique [product_id, size, color]).
class ProductVariantSeeder extends Seeder
{
    public function run(): void
    {
        $product = Product::where('product_code', 'PRD000003')->first();
        if (! $product) {
            $this->command->warn('PRD000003 not found; skipping ProductVariantSeeder.');
            return;
        }

        $variants = [
            ['color' => 'Red',    'size' => '500ml', 'price' => 800.00, 'stock' => 10, 'sku' => 'PRD000003-RED-500ML'],
            ['color' => 'Blue',   'size' => '500ml', 'price' => 800.00, 'stock' => 8,  'sku' => 'PRD000003-BLU-500ML'],
            ['color' => 'Red',    'size' => '1L',    'price' => 850.00, 'stock' => 5,  'sku' => 'PRD000003-RED-1L'],
            ['color' => 'Blue',   'size' => '1L',    'price' => 850.00, 'stock' => 3,  'sku' => 'PRD000003-BLU-1L'],
        ];

        foreach ($variants as $v) {
            ProductVariant::updateOrInsert(
                ['product_id' => $product->id, 'size' => $v['size'], 'color' => $v['color']],
                ['sku' => $v['sku'], 'price' => $v['price'], 'stock' => $v['stock']],
            );
        }

        $this->command->info('ProductVariantSeeder: seeded '.count($variants).' variant(s) for PRD000003 (product_id='.$product->id.').');
    }
}
