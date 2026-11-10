powershell -Command $c=Get-Content 'resources\js\student\store\shop.tsx'; $c=$c -replace 'coupon_code: o.couponCode ?? couponCode ?? null', 'coupon_code: o.couponCode ?? couponCode ?? null'; Set-Content 'resources\js\student\store\shop.tsx' $c
if(-not $?){exit 1}
