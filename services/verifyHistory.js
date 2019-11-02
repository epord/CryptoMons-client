import {getProofHistory} from "./plasmaServices";
import {checkEmptyBlock, checkInclusion, checkSecretsIncluded, getBlock, getSecretBlock} from "./ethService";
import {
  decodeSwapTransactionBytes,
  decodeTransactionBytes,
  generateSwapHash,
  generateTransactionHash,
  isSwapBytes,
  recover
} from "../utils/cryptoUtils";
import async from "async";
import {zip} from "../utils/utils";

export const HISTORY_VALIDITY = {
  CORRECT: "Correct",
  INVALID: "Invalid",
  WAITING_FOR_SWAP: "Waiting for swap"
};

export const verifyToken = (token, rootChainContract) => {
  return getProofHistory(token).then(h =>{
    return verifyTokenWithHistory(token, rootChainContract, h)
    }
  )
};

export const verifyTokenWithHistory = (token, rootChainContract, history) => {
  return new Promise(async (resolve, reject) => {
    console.log(`validating ${Object.keys(history).length} blocks`);

    //Validate is included and not included on all blocks
    let includedP = Promise.all(
      Object.keys(history).map(blockNumber => {
        const { transactionBytes, hash, proof } = history[blockNumber];
        if (!transactionBytes && proof == "0x0000000000000000") {
          return checkEmptyBlock(blockNumber, rootChainContract);
        } else {
          return checkInclusion(transactionBytes, hash, blockNumber, token, proof, rootChainContract)
        }
      })
    );

    //Validate secrets are revealed
    let swappedP = Promise.all(
      Object.keys(history).map(async blockNumber => {
        const { transactionBytes } = history[blockNumber];
        if(transactionBytes && isSwapBytes(transactionBytes)) {
          const result = await checkSecretsIncluded(blockNumber, history[blockNumber], rootChainContract);
          return {blockNumber, result}
        } else {
          return {}
        }
      })
    );

    let [included, swapped] = await Promise.all([includedP, swappedP]);
    swapped = swapped.reduce(function(result, item) {
      if(item.blockNumber) result[item.blockNumber] = item.result;
      return result;
    }, {});

    let yesterday = new Date(new Date().setDate(new Date().getDate()-1));
    let isDue = Object.keys(swapped).filter(k => swapped[k] === false);
    let swapBlocksP = Promise.all(isDue.map(k => getBlock(k, rootChainContract)));
    let secretBlocksP = Promise.all(isDue.map(k => getSecretBlock(k, rootChainContract)));
    let [swapBlocks, secretBlocks] = await Promise.all([swapBlocksP, secretBlocksP]);

    swapBlocks = zip(isDue,swapBlocks).reduce(function(result, item) {
      result[item[0]] = item[1];
      return result;
    }, {});

    secretBlocks = zip(isDue,secretBlocks).reduce(function(result, item) {
      result[item[0]] = item[1];
      return result;
    }, {});



    let failBlockNumber = undefined;
    let fail = included.indexOf(false);
    //TODO API returns block before they are propagated
    if(fail !== -1 && fail !== included.length - 1) {
      failBlockNumber = Object.keys(history)[fail];
      console.log(`Error in history! Fail validation in block ${failBlockNumber}`);
    }

    let transactions = Object.keys(history).filter(blockNumber => history[blockNumber].transactionBytes);
    let transactionsHistory = [];

    async.waterfall([
      async cb => {
        // Deposit
        const depositBlock = Object.keys(history)[0];
        const { transactionBytes, proof } = history[depositBlock];
        const { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
        const hash = generateTransactionHash(slot, blockSpent, recipient);

        if (await checkInclusion(transactionBytes, hash, depositBlock, token, proof, rootChainContract)) {
          transactionsHistory.push({ depositBlock, to: recipient });
          return cb(null, recipient);
        } else {
          return cb({error: "Deposit Validation failed", blockNumber: blockSpent })
        }
      },
      // Other blocks
      ...transactions.slice(1).map(blockNumber => (owner, cb) => {

        if(failBlockNumber && new BN(blockNumber).gte(new BN(failBlockNumber))) {
          return cb({error: "Inclusion failed", blockNumber: failBlockNumber, lastOwner: owner})
        }

        const { transactionBytes, signature, hash, hashSecretA, hashSecretB } = history[blockNumber];

        if (transactionBytes) {
          if(isSwapBytes(transactionBytes)) {
            const { slotA, blockSpentA, B, slotB, blockSpentB, A, signatureB } =
              decodeSwapTransactionBytes(transactionBytes);

            const generatedHashA = generateSwapHash(slotA, blockSpentA, hashSecretA, B, slotB);
            const generatedHashB = generateSwapHash(slotB, blockSpentB, hashSecretB, A, slotA);

            let error = undefined;
            if(A.toLowerCase() != owner.toLowerCase()) {
              error = "Owner does not match owner of Swap";
            }

            if (!error && generatedHashA.toLowerCase() != hash.toLowerCase()) {
              error = "Hash does not match";
            }

            if (!error && recover(hash, signature) != owner.toLowerCase()) {
              error = "Not signed correctly";
            }

            if (!error && recover(generatedHashB, signatureB) != B.toLowerCase()) {
              error = "Not signed by counterpart correctly";
            }

            transactionsHistory.push({
              isSwap: true,
              successful: !!swapped[blockNumber] && !error,
              error: !!swapped[blockNumber] ? "Secret hash not included": error,
              from: A,
              to:  B,
              blockNumber
            });

            if(!swapped[blockNumber]) {
              if(parseInt(swapBlocks[blockNumber].createdAt) < yesterday.getTime()/1000 || secretBlocks[blockNumber].createdAt !== "0") {
                return cb(null, A);
              } else {
                return cb({inSwap: true, blockNumber: blockNumber, lastOwner: owner, swappingOwner: B.toLowerCase()})
              }
            }

            if(error) {
              return cb(null, A)
            } else {
              return cb(null, B);
            }

          } else {

            const {slot, blockSpent, recipient} = decodeTransactionBytes(transactionBytes);
            const generatedHash = generateTransactionHash(slot, blockSpent, recipient);

            let error = undefined;
            if (generatedHash.toLowerCase() != hash.toLowerCase()) {
              error = "Hash does not match";
            }

            if (recover(hash, signature) != owner.toLowerCase()) {
              error = "Not signed correctly";
            }

            transactionsHistory.push({
              isSwap: false,
              successful: !error,
              from: owner.toLowerCase(),
              to:  recipient.toLowerCase(),
              blockNumber
            });

            if(error) {
              return cb(null, owner.toLowerCase())
            } else {
              return cb(null, recipient.toLowerCase());
            }
          }
        }
      })
    ], (err, lastOwner) => {
      if(err && err.inSwap) return resolve({
        validity: HISTORY_VALIDITY.WAITING_FOR_SWAP, blockNumber: err.blockNumber,
        lastOwner: err.lastOwner, transactionsHistory, swappingOwner: err.swappingOwner})
      if (err) return reject(err);
      if(failBlockNumber) return  reject({error: "Inclusion failed", blockNumber: failBlockNumber, lastOwner: lastOwner});
      resolve({validity: HISTORY_VALIDITY.CORRECT, lastOwner, transactionsHistory});
    });
  });
};