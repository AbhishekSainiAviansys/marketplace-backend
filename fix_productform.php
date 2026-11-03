<?php

$p = 'C:/Users/AbhishekSaini/Desktop/shopping site/backend/resources/js/admin/pages/ProductForm.tsx';
$f = file_get_contents($p);

// Fix: close the {form.is_variant ? ( ... ) ternary properly
$old1 = "            )}\n          }\n\n           {fields.map";
$new1 = "            )}\n          ) : null}\n\n          <div className=\"grid gap-4 sm:grid-cols-2\">\n            <label className=\"flex items-center gap-2 pt-7\">\n              <input\n                type=\"checkbox\"\n                checked={form.is_boost}\n                onChange={(e) => setForm({ ...form, is_boost: e.target.checked })}\n                className=\"rounded border-slate-300 text-accent\"\n              />\n              <span className=\"text-sm font-medium text-slate-700\">Boost this product</span>\n            </label>\n            <label className=\"block\">\n              <span className=\"mb-1.5 block text-sm font-medium text-slate-700\">Boost until (optional)</span>\n              <input\n                type=\"date\"\n                value={form.boost_until}\n                onChange={(e) => setForm({ ...form, boost_until: e.target.value })}\n                className=\"field focus:field-focus outline-none\"\n              />\n            </label>\n          </div>\n\n           {fields.map";

if (strpos($f, $old1) === false) {
    echo "Pattern 1 not found\n";
} else {
    $f = str_replace($old1, $new1, $f);
    echo "Pattern 1 replaced\n";
}

// Fix: make stock input visible when not is_variant
$old2 = '<label className="block hidden">';
$new2 = '<label className={form.is_variant ? "block hidden" : "block"}>';
if (strpos($f, $old2) === false) {
    echo "Pattern 2 not found\n";
} else {
    $f = str_replace($old2, $new2, $f);
    echo "Pattern 2 replaced\n";
}

file_put_contents($p, $f);
echo "Done.\n";
