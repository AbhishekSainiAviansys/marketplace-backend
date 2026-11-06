'use strict';

import fs from 'fs';

const path = 'app/Http/Controllers/AuthController.php';
let lines = fs.readFileSync(path, 'utf8').split('\n');

let insertAt = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === ' = User::create([' && lines[i+1] && lines[i+1].trim() === "'name' => ['name'], 'email' => , 'whatsapp' =>") {
    insertAt = i + 1;
    break;
  }
}

if (insertAt === -1) {
  console.log('NOT FOUND');
  process.exit(1);
}

const add = [
  "        // Create a blank back_accounts row for this user so every user",
  "        // (student or seller) can later link a back account / Razorpay",
  "        // business account. Starts empty; sellers populate it via the",
  "        // account-link flow.",
  '        BackAccount::create([',
  "            'user_id' => \->id,",
  '        ]);',
];

const out = [];
for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  if (i === insertAt) {
    for (let j = 0; j < add.length; j++) out.push(add[j]);
  }
}

fs.writeFileSync(path, out.join('\r\n'), 'utf8');
console.log('DONE at line ' + (insertAt + 1));
