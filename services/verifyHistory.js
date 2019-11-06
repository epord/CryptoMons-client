import { getProofHistory } from "./plasmaServices";
import {
  checkEmptyBlock,
  checkBasicInclusion,
  checkTXValid,
  getBlock,
  getSecretBlock,
  getPlasmaCoinDepositOwner
} from "./ethService";
import {
  decodeSwapTransactionBytes,
  decodeTransactionBytes,
  generateSwapHash,
  generateTransactionHash,
  isSwapBytes,
  recover
} from "../utils/cryptoUtils";
import async from "async";
import { zip } from "../utils/utils";
const EthUtils	= require('ethereumjs-util');
const BN = require('bn.js');
const RLP = require('rlp');

export const HISTORY_VALIDITY = {
  CORRECT: "Correct",
  INVALID: "Invalid",
  WAITING_FOR_SWAP: "Waiting for swap"
};

export const verifyToken = (token, rootChainContract) => {
  return getProofHistory(token).then(h =>{
    return verifyTokenWithHistory(token, h, rootChainContract)
    }
  )
};

const getInclusionArray = (token, history, rootChainContract) => {
  return Promise.all(
    Object.keys(history).map(blockNumber => {
      let { transactionBytes, hash, proof } = history[blockNumber];
      if (!transactionBytes && proof == "0x0000000000000000") {
        return checkEmptyBlock(blockNumber, rootChainContract);
      } else {
        if(isSwapBytes(transactionBytes)) {
          proof = EthUtils.bufferToHex(RLP.decode(proof)[0]);
        }
        return checkBasicInclusion(hash, blockNumber, token, proof, rootChainContract);
      }
    })
  );
};

const getSwapsValidatedArray = (history, rootChainContract) => {
  return  Promise.all(
    Object.keys(history).map(async blockNumber => {
      const { transactionBytes } = history[blockNumber];
      if(transactionBytes && isSwapBytes(transactionBytes)) {
        return checkTXValid(blockNumber, history[blockNumber], rootChainContract).then(result => [blockNumber, result]);
      } else {
        return Promise.resolve([]);
      }
    })
  );
};

//ValidationData
const depositValidation = (validationData) => async (cb) => {
  const {history, failBlockNumber, transactionsHistory, rootChainContract} = validationData;
  const depositBlock = Object.keys(history)[0];

  if(failBlockNumber && new BN(depositBlock).gte(new BN(failBlockNumber))) {
    return cb({error: "Deposit Inclusion failed", blockNumber: failBlockNumber, lastOwner: "0x0000000000000000000000000000"})
  }

  // Deposit
  const { transactionBytes, hash } = history[depositBlock];
  let { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
  recipient = recipient.toLowerCase();

  const calculatedHash = generateTransactionHash(slot, blockSpent, recipient);

  if(calculatedHash !== hash) {
    return cb({error: "Deposit Validation failed, invalid hash", blockNumber: depositBlock, lastOwner: "0x0000000000000000000000000000" })
  }

  let depositOwner = await getPlasmaCoinDepositOwner(slot, rootChainContract);
  if(depositOwner.toLowerCase() !== recipient) {
    return cb({error: "Deposit Validation failed, not deposit owner", blockNumber: depositBlock, lastOwner: "0x0000000000000000000000000000" })
  }

  transactionsHistory.push({ depositBlock, to: recipient});

  return cb(null, {owner: recipient, prevBlock: depositBlock});
};

const swapValidation = (owner, prevBlock, blockNumber, validationData, cb) => {
  const {history, swapsValidated, swapInvalidBlocks, swapInvalidSecretBlocks, transactionsHistory} = validationData;
  const { transactionBytes, signature, hash, hashSecretA, hashSecretB } = history[blockNumber];

  const { slotA, blockSpentA, B, slotB, blockSpentB, A, signatureB } = decodeSwapTransactionBytes(transactionBytes);

  const generatedHashA = generateSwapHash(slotA, blockSpentA, hashSecretA, B, slotB);
  const generatedHashB = generateSwapHash(slotB, blockSpentB, hashSecretB, A, slotA);

  let error = undefined;
  if(A.toLowerCase() !== owner.toLowerCase())                             error = "Owner does not match owner of Swap";
  if(!error && blockSpentA !== prevBlock)                                 error = "BlockSpent is incorrect";
  if (!error && generatedHashA.toLowerCase() !== hash.toLowerCase())      error = "Hash does not match";
  if (!error && recover(hash, signature) !== owner.toLowerCase())         error = "Not signed correctly";
  if (!error && recover(generatedHashB, signatureB) !== B.toLowerCase())  error = "Not signed by counterpart correctly";

  let event = {
    isSwap: true,
    successful: !!swapsValidated[blockNumber] && !error,
    error: error,
    from: A,
    to:  B,
    blockNumber
  };

  if(!swapsValidated[blockNumber]) {
    if(!error) event.error = "Secret inclusion proof failed";
    transactionsHistory.push(event);
    let yesterday = new Date(new Date().setDate(new Date().getDate()-1));

    if( parseInt(swapInvalidBlocks[blockNumber].createdAt) < yesterday.getTime()/1000
        || swapInvalidSecretBlocks[blockNumber].createdAt !== "0") {
      return cb(null, {prevBlock: blockNumber, owner: A});
    } else {
      return cb({inSwap: true, blockNumber: blockNumber, lastOwner: owner, swappingOwner: B.toLowerCase()})
    }
  }

  transactionsHistory.push(event);

  if(error) {
    return cb(null, {prevBlock: blockNumber, owner: A.toLowerCase()})
  } else {
    return cb(null, {prevBlock: blockNumber, owner: B.toLowerCase()});
  }
};

const basicValidation = (owner, prevBlock, blockNumber, validationData, cb) => {
  const {history, transactionsHistory} = validationData;
  const { transactionBytes, signature, hash } = history[blockNumber];
  let {slot, blockSpent, recipient} = decodeTransactionBytes(transactionBytes);
  recipient = recipient.toLowerCase();

  const generatedHash = generateTransactionHash(slot, blockSpent, recipient);

  let error = undefined;
  if (generatedHash.toLowerCase() !== hash.toLowerCase())  error = "Hash does not match";
  if (prevBlock !== blockSpent)                            error = "BlockSpent is incorrect";
  if (recover(hash, signature).toLowerCase() !== owner)    error = "Not signed correctly";

  transactionsHistory.push({
    isSwap: false,
    successful: !error,
    error: error,
    from: owner,
    to:  recipient,
    blockNumber
  });

  if(error) {
    return cb(null, {prevBlock: blockNumber, owner: owner})
  } else {
    return cb(null,  {prevBlock: blockNumber, owner: recipient});
  }
};

const blockValidation = (validationData) => {
  return (blockNumber) => ({owner, prevBlock}, cb) => {
    const {failBlockNumber, history} = validationData;

    if (failBlockNumber && new BN(blockNumber).gte(new BN(failBlockNumber))) {
      return cb({error: "Inclusion failed", blockNumber: failBlockNumber, lastOwner: owner})
    }

    const {transactionBytes} = history[blockNumber];
    if (isSwapBytes(transactionBytes)) {
      swapValidation(owner, prevBlock, blockNumber, validationData, cb);
    } else {
      basicValidation(owner, prevBlock, blockNumber, validationData, cb);
    }
  }
};

export const verifyTokenWithHistory = (token, history, rootChainContract) => {
  return new Promise(async (resolve, reject) => {
    console.log(`validating ${Object.keys(history).length} blocks`);

    //Validate all hashes are included and proofs are valid
    let includedP = getInclusionArray(token, history, rootChainContract);

    //Validate secrets are revealed
    let swapsValidatedP = getSwapsValidatedArray(history, rootChainContract);

    let [included, swapsValidatedArr] = await Promise.all([includedP, swapsValidatedP]);
    let swapsValidated = Object.fromEntries(swapsValidatedArr) || {};

    //Get all blockNumbers whose secret was not revealed
    let swapsInvalidBlNumber = Object.keys(swapsValidated).filter(k => swapsValidated[k] === false);

    let swapInvalidBlocksP = Promise.all(swapsInvalidBlNumber.map(k => getBlock(k, rootChainContract)));
    let swapInvalidSecretBlocksP = Promise.all(swapsInvalidBlNumber.map(k => getSecretBlock(k, rootChainContract)));

    let [swapInvalidBlocks, swapInvalidSecretBlocks] = await Promise.all([swapInvalidBlocksP, swapInvalidSecretBlocksP]);
    swapInvalidBlocks = Object.fromEntries(zip(swapsInvalidBlNumber, swapInvalidBlocks));
    swapInvalidSecretBlocks = Object.fromEntries(zip(swapsInvalidBlNumber, swapInvalidSecretBlocks));

    let failBlockNumber = undefined;
    let fail = included.indexOf(false);
    //TODO API returns block before they are propagated
    if(fail !== -1 && fail !== included.length - 1) {
      failBlockNumber = Object.keys(history)[fail];
      console.log(`Error in history! Fail validation in block ${failBlockNumber}`);
    }

    let transactions = Object.keys(history).filter(blockNumber => history[blockNumber].transactionBytes);
    let transactionsHistory = [];

    const validationData = {history, failBlockNumber, transactionsHistory, rootChainContract, swapsValidated, swapInvalidBlocks, swapInvalidSecretBlocks};

    await async.waterfall([
      depositValidation(validationData),
      // Other blocks
      ...transactions.slice(1).map(blockValidation(validationData))
    ], (err, res) => {

      if (err && err.inSwap) return resolve({
        validity: HISTORY_VALIDITY.WAITING_FOR_SWAP,
        blockNumber: err.blockNumber,
        lastOwner: err.lastOwner,
        transactionsHistory: validationData.transactionsHistory,
        swappingOwner: err.swappingOwner
      });

      if (err) return reject(err);
      if (failBlockNumber) return reject({
        error: "Inclusion failed",
        blockNumber: failBlockNumber,
        lastOwner: res.owner
      });

      resolve({validity: HISTORY_VALIDITY.CORRECT, lastOwner: res.owner, transactionsHistory: validationData.transactionsHistory});
    });
  });
};