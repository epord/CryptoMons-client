const EthUtils	= require('ethereumjs-util');
const BN = require('bn.js');
const RLP = require('rlp');
const Buffer = require('buffer').Buffer;

export const generateTransactionHash = (slot, blockSpent, recipient) => {
	const slotBN = new BN(slot);
	const blockSpentBN = new BN(blockSpent);

	if(blockSpentBN.isZero()) {
		return EthUtils.bufferToHex(EthUtils.keccak256(EthUtils.setLengthLeft(slotBN.toArrayLike(Buffer), 64/8))) //uint64 little endian
	} else {
		return EthUtils.bufferToHex(EthUtils.keccak256(getTransactionBytes(slotBN, blockSpentBN, new BN(1), recipient)))
	}
};

const getTransactionBytes = (slot, blockSpent, denomination, recipient) => {
	// console.log(typeof slot)
	// console.log((new BN(1)).toArrayLike(Buffer))
	const a = new BN(1)
	console.log(a.toArrayLike(Buffer))
	const params = [
			EthUtils.setLengthLeft(slot.toArrayLike(Buffer), 256/8), 			// uint256 little endian
			EthUtils.setLengthLeft(blockSpent.toArrayLike(Buffer), 256/8),	// uint256 little endian
			EthUtils.setLengthLeft(denomination.toArrayLike(Buffer), 256/8),	// uint256 little endian
			EthUtils.toBuffer(recipient),																						// must start with 0x
	];

	return EthUtils.bufferToHex(RLP.encode(params));
}
