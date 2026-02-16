
import { Address } from '@ton/ton';

const addressStr = 'EQBnQN__FEBuzErCOhpsDCxrqBwJoWPRe0lc1Y9bbFOg0cZM';
const address = Address.parse(addressStr);

console.log('--- ADDRESS FORMATS ---');
console.log('Raw:', address.toRawString());
console.log('EQ (Bounceable, Universal):', address.toString({ bounceable: true, testOnly: false }));
console.log('UQ (Non-Bounceable, Universal):', address.toString({ bounceable: false, testOnly: false }));
console.log('kQ (Bounceable, Testnet):', address.toString({ bounceable: true, testOnly: true }));
console.log('0Q (Non-Bounceable, Testnet):', address.toString({ bounceable: false, testOnly: true }));
