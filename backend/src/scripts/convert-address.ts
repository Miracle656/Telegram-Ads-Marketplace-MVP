
import { Address } from '@ton/ton';

const addressStr = 'EQBnQN__FEBuzErCOhpsDCxrqBwJoWPRe0lc1Y9bbFOg0cZM';
console.log(`Original (EQ): ${addressStr}`);

try {
    const address = Address.parse(addressStr);

    // Convert to non-bounceable (testOnly=true for testnet usually, but let's see both)
    const nonBounceable = address.toString({ bounceable: false, testOnly: true });
    const nonBounceableMain = address.toString({ bounceable: false });

    console.log(`\n✅ TRY THIS (Non-Bounceable):`);
    console.log(nonBounceable);

    console.log(`\n(Or this if the above is for testnet):`);
    console.log(nonBounceableMain);

} catch (e) {
    console.error('Error parsing address:', e);
}
