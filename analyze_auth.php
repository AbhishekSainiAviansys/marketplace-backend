<?php
$path = 'C:\\Users\\AbhishekSaini\\Desktop\\shopping site\\backend\\app\\Http\\Controllers\\AuthController.php';
$content = file_get_contents($path);
echo 'File loaded, length: ' . strlen($content) . chr(10);
echo 'CoachingInstitute::create found: ' . (strpos($content, 'CoachingInstitute::create') !== false ? 'yes' : 'no') . chr(13);
echo 'Public details found: ' . (strpos($content, 'Public details') !== false ? 'yes' : 'no') . chr(13);
echo 'updateOrCreate found: ' . (strpos($content, 'updateOrCreate') !== false ? 'yes' : 'no') . chr(13);
echo 'INSTRUCTIONS_NOT_FOUND found: ' . (strpos($content, 'INSTRUCTIONS_NOT_FOUND') !== false ? 'yes' : 'no') . chr(13);
?>
