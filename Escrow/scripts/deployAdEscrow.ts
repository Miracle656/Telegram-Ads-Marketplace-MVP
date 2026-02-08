import { toNano } from '@ton/core';
import { AdEscrow } from '../wrappers/AdEscrow';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // The deployer wallet will be the owner/arbiter of the escrow
    const ownerAddress = provider.sender().address!;

    const adEscrow = provider.open(
        AdEscrow.createFromConfig({ owner: ownerAddress }, await compile('AdEscrow'))
    );

    await adEscrow.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(adEscrow.address);

    console.log('Escrow contract deployed at:', adEscrow.address.toString());
    console.log('Owner/Arbiter:', ownerAddress.toString());
}
