
import { Address } from '@ton/ton';

const errorAddr = 'EQA5JWGaa6-oOYEGejzgt8KAPUDW-n-ae-GEwNSpCxVEMz_5';

try {
    const addr = Address.parse(errorAddr);
    console.log('--- Error Address Analysis ---');
    console.log(`Input (Error Log): ${errorAddr}`);
    console.log(`Non-Bounceable (Testnet): ${addr.toString({ bounceable: false, testOnly: true })}`);
    console.log(`Bounceable (Testnet): ${addr.toString({ bounceable: true, testOnly: true })}`);
} catch (e) {
    console.error('Invalid address:', e);
}
