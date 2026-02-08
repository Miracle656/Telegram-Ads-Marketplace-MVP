// Ad Escrow Smart Contract for Telegram Ads Marketplace
// Holds advertiser funds until ad post is verified

// ===== STORAGE =====
struct Storage {
    owner: address;           // Contract deployer (backend arbiter)
    dealId: uint64;           // Unique deal identifier
    advertiser: address;      // Who deposited funds
    beneficiary: address;     // Channel owner who receives payment
    amount: coins;            // Amount in escrow (in nanoTON)
    status: uint8;            // 0=EMPTY, 1=FUNDED, 2=RELEASED, 3=REFUNDED
}

fun Storage.load() {
    return Storage.fromCell(contract.getData());
}

fun Storage.save(self) {
    contract.setData(self.toCell());
}

// ===== STATUS CONSTANTS =====
const STATUS_EMPTY: int = 0;
const STATUS_FUNDED: int = 1;
const STATUS_RELEASED: int = 2;
const STATUS_REFUNDED: int = 3;

// ===== ERROR CODES =====
const ERROR_NOT_OWNER: int = 100;
const ERROR_NOT_ADVERTISER: int = 101;
const ERROR_ALREADY_FUNDED: int = 102;
const ERROR_NOT_FUNDED: int = 103;
const ERROR_ALREADY_COMPLETED: int = 104;
const ERROR_INSUFFICIENT_AMOUNT: int = 105;

// ===== MESSAGES =====

// Initialize the escrow with deal details (sent by backend)
struct(0x00000001) InitEscrow {
    dealId: uint64;
    advertiser: address;
    beneficiary: address;
    amount: coins;
}

// Deposit funds (sent by advertiser with TON attached)
struct(0x00000002) Deposit {}

// Release funds to beneficiary (sent by owner/arbiter)
struct(0x00000003) Release {}

// Refund to advertiser (sent by owner/arbiter)
struct(0x00000004) Refund {}

type AllowedMessage = InitEscrow | Deposit | Release | Refund;

// ===== MESSAGE HANDLER =====
fun onInternalMessage(in: InMessage) {
    var storage = lazy Storage.load();
    val sender = in.senderAddress;
    val msgValue = in.valueCoins;

    val msg = lazy AllowedMessage.fromSlice(in.body);

    match (msg) {
        InitEscrow => {
            // Only owner can initialize
            assert(sender == storage.owner) throw ERROR_NOT_OWNER;
            // Can only init if empty
            assert(storage.status == STATUS_EMPTY) throw ERROR_ALREADY_FUNDED;

            storage.dealId = msg.dealId;
            storage.advertiser = msg.advertiser;
            storage.beneficiary = msg.beneficiary;
            storage.amount = msg.amount;
            storage.save();
        }

        Deposit => {
            // Only advertiser can deposit
            assert(sender == storage.advertiser) throw ERROR_NOT_ADVERTISER;
            // Check if already funded or completed
            assert(storage.status == STATUS_EMPTY) throw ERROR_ALREADY_FUNDED;
            // Check sufficient amount
            assert(msgValue >= storage.amount) throw ERROR_INSUFFICIENT_AMOUNT;

            storage.status = STATUS_FUNDED;
            storage.save();
        }

        Release => {
            // Only owner (arbiter) can release
            assert(sender == storage.owner) throw ERROR_NOT_OWNER;
            // Must be funded
            assert(storage.status == STATUS_FUNDED) throw ERROR_NOT_FUNDED;

            storage.status = STATUS_RELEASED;
            storage.save();

            // Send funds to beneficiary (channel owner)
            val releaseMsg = createMessage({
                bounce: BounceMode.NoBounce,
                value: storage.amount,
                dest: storage.beneficiary
            });
            releaseMsg.send(SEND_MODE_REGULAR);
        }

        Refund => {
            // Only owner (arbiter) can refund
            assert(sender == storage.owner) throw ERROR_NOT_OWNER;
            // Must be funded
            assert(storage.status == STATUS_FUNDED) throw ERROR_NOT_FUNDED;

            storage.status = STATUS_REFUNDED;
            storage.save();

            // Return funds to advertiser
            val refundMsg = createMessage({
                bounce: BounceMode.NoBounce,
                value: storage.amount,
                dest: storage.advertiser
            });
            refundMsg.send(SEND_MODE_REGULAR);
        }

        else => {
            // Reject unknown messages (but allow empty balance top-ups)
            assert(in.body.isEmpty()) throw 0xFFFF;
        }
    }
}

// ===== GETTERS =====

get fun getStatus(): int {
    val storage = lazy Storage.load();
    return storage.status;
}

get fun getDealId(): int {
    val storage = lazy Storage.load();
    return storage.dealId;
}

get fun getAmount(): int {
    val storage = lazy Storage.load();
    return storage.amount;
}

get fun getAdvertiser(): address {
    val storage = lazy Storage.load();
    return storage.advertiser;
}

get fun getBeneficiary(): address {
    val storage = lazy Storage.load();
    return storage.beneficiary;
}

get fun getOwner(): address {
    val storage = lazy Storage.load();
    return storage.owner;
}
