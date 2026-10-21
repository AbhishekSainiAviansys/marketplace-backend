import re
import sys

path = 'C:\\Users\\AbhishekSaini\\Desktop\\shopping site\\backend\\app\\Http\\Controllers\\AuthController.php'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print('File loaded, length: ' + str(len(content)))
print('First 200 chars: ' + content[:200])
print('---')
print('Last 200 chars: ' + content[-200:])
print('---')
print('Curly braces count: ' + str(content.count(chr(123))) + ' ' + str(content.count(chr(125))))
print('Semicolons: ' + str(content.count(chr(59))))
# Check for key strings
if 'CoachingInstitute::create' in content:
    print('FOUND: CoachingInstitute::create')
else:
    print('NOT FOUND: CoachingInstitute::create')
if 'Public details' in content:
    print('FOUND: Public details')
else:
    print('NOT FOUND: Public details')
if 'updateOrCreate' in content:
    print('FOUND: updateOrCreate')
else:
    print('NOT FOUND: updateOrCreate')
if 'INSTRUCTIONS_NOT_FOUND' in content:
    print('FOUND: INSTRUCTIONS_NOT_FOUND')
else:
    print('NOT FOUND: INSTRUCTIONS_NOT_FOUND')
print('Script analysis complete')
