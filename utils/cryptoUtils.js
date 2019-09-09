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
		return EthUtils.bufferToHex(EthUtils.keccak256(getTransactionBytes(slotBN, blockSpentBN, recipient)))
	}
};

const getTransactionBytes = (slot, blockSpent, recipient) => {
	const params = [
			EthUtils.setLengthLeft(slot.toArrayLike(Buffer), 256/8), 			// uint256 little endian
			EthUtils.setLengthLeft(blockSpent.toArrayLike(Buffer), 256/8),	// uint256 little endian
			EthUtils.toBuffer(recipient),																						// must start with 0x
	];

	return EthUtils.bufferToHex(RLP.encode(params));
}

export const sign = (message) => {
	return new Promise((resolve, reject) => {
		web3.eth.sign(web3.eth.defaultAccount, message, (err, signature) => {
			if(err) return reject(err)
			resolve(signature)
		});
	});
}
