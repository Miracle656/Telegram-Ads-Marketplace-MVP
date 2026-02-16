
import { Address } from '@ton/ton';

const addrStr = '0QA5JWGaa6-oOYEGejzgt8KAPUDW-n-ae-GEwNSpCxVEM9m2';

try {
    const addr = Address.parse(addrStr);
    console.log('--- Address Analysis ---');
    console.log(`Original: ${addrStr}`);
    console.log(`Workchain: ${addr.workChain}`);
    console.log(`Bounceable (User Friendly): ${addr.toString({ bounceable: true, testOnly: true })}`);
    console.log(`Non-Bounceable (User Friendly): ${addr.toString({ bounceable: false, testOnly: true })}`);

    // Check if the original string matches the non-bounceable format
    const nonBounceable = addr.toString({ bounceable: false, testOnly: true });
    if (addrStr === nonBounceable) {
        console.log('Original is Non-Bounceable Testnet');
    } else {
        console.log('Original is NOT matching generated Non-Bounceable');
    }

} catch (e) {
    console.error('Invalid address:', e);
}
