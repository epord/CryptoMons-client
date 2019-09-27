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

export const decodeTransactionBytes = bytes => {
	const decoded = RLP.decode(bytes);
	const slot = web3.toBigNumber(EthUtils.bufferToHex(decoded[0])).toFixed();
	const blockSpent = web3.toBigNumber(EthUtils.bufferToHex(decoded[1])).toFixed();
	const recipient = EthUtils.bufferToHex(decoded[2]);
	return { slot, blockSpent, recipient }
}

export const generateSwapHash = (slot, blockSpent, hashSecret, recipient, swappingSlot) => {
	const slotBN = new BN(slot);
	const blockSpentBN = new BN(blockSpent);
	const swappingSlotBN = new BN(swappingSlot);

	if(blockSpentBN.isZero()) {
		return null; // cannot swap if deposit
	}

	return EthUtils.bufferToHex(EthUtils.keccak256(getSwapBytes(slotBN, blockSpentBN, hashSecret, recipient, swappingSlotBN)));
}

const getSwapBytes = (slot, blockSpent, hashSecret, recipient, swappingSlot) => {
	let params = [
		EthUtils.setLengthLeft(slot.toArrayLike(Buffer), 256/8),
		EthUtils.setLengthLeft(blockSpent.toArrayLike(Buffer), 256/8),
		EthUtils.toBuffer(hashSecret),
		EthUtils.toBuffer(recipient),
		EthUtils.setLengthLeft(swappingSlot.toArrayLike(Buffer), 256/8)
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

export const isSwapBytes = (txBytes) => {
	return RLP.decode(txBytes).length == 9;
}

export const recover = (hash, signature) => {
  const SignatureMode = [
    'EIP712',
    'GETH',
    'TREZOR'
  ];
  //TODO revise this
  const signatureMode = 'EIP712';
  let _hash = hash;
  if (signatureMode === 'GETH') {
    _hash = EthUtils.bufferToHex(EthUtils.keccak256("\x19Ethereum Signed Message:\n32", hash));
  } else if (signatureMode === 'TREZOR') {
    _hash = EthUtils.bufferToHex(EthUtils.keccak256("\x19Ethereum Signed Message:\n\x20", hash));
  }

  let res = EthUtils.fromRpcSig(signature)
  return EthUtils.bufferToHex(EthUtils.pubToAddress(EthUtils.ecrecover(EthUtils.toBuffer(_hash), res.v, res.r, res.s)));
};