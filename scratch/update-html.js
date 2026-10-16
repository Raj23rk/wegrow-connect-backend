const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'ai-explorer-prebooking.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace amounts
content = content.split('1,000').join('2');
content = content.replace('const total = count * 1000;', 'const total = count * 2;');
content = content.split('studentsList.length * 1000').join('studentsList.length * 2');
content = content.split('amountPerStudent: 1000').join('amountPerStudent: 2');
content = content.split('amountPerStudent || 1000').join('amountPerStudent || 2');

// Select Razorpay by default
content = content.replace("let selectedMethod = 'UPI';", "let selectedMethod = 'Razorpay';");
content = content.replace(
  '<div class="pay-option selected" data-method="UPI" tabindex="0">',
  '<div class="pay-option" data-method="UPI" tabindex="0">'
);
content = content.replace(
  '<div class="pay-option" data-method="Razorpay" tabindex="0">',
  '<div class="pay-option selected" data-method="Razorpay" tabindex="0">'
);

// Fallback key
content = content.split('rzp_test_TmuypQyjFrQM5V').join('rzp_live_TnMVbzGus2s2u0');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated public/ai-explorer-prebooking.html!');
