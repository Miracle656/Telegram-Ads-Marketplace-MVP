import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { AdEscrow } from '../wrappers/AdEscrow';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('AdEscrow', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AdEscrow');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let adEscrow: SandboxContract<AdEscrow>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        adEscrow = blockchain.openContract(AdEscrow.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await adEscrow.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: adEscrow.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and adEscrow are ready to use
    });
});
