import { generateTransactionHash, generateSwapHash, sign } from "../utils/cryptoUtils";
import { randomHex256, keccak256 } from "../utils/utils";
const BN = require('bn.js');

export const transferInPlasma = (token, receiverAddress) => {

  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/tokens/${token}/last-transaction`).then(response => {
      response.json().then(lastTransaction => {

        const hash = generateTransactionHash(token, lastTransaction.minedBlock, receiverAddress)

        sign(hash).then(signature => {
          const body = {
            "slot": token,
            "owner": web3.eth.defaultAccount,
            "recipient": receiverAddress,
            "hash": hash,
            "blockSpent": lastTransaction.minedBlock,
            "signature": signature
          };

          fetch(`${process.env.API_URL}/api/transactions/create`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(resolve);

        });
      });
    });
  })
};


export const createAtomicSwap = (slot, swappingSlot) => {
  return new Promise((resolve, reject) => {
    Promise.all([
      fetch(`${process.env.API_URL}/api/tokens/${swappingSlot}/last-owner`).then(res => res.json()),
      fetch(`${process.env.API_URL}/api/tokens/${slot}/last-transaction`).then(res => res.json())
    ]).then(response => {
      const [{ lastOwner: recipient }, lastTransaction] = response;
      const owner = web3.eth.defaultAccount;
      const blockSpent = lastTransaction.minedBlock;
      const secret = randomHex256();
      const hashSecret = keccak256(secret);

      if (new BN(blockSpent).isZero()) return reject('Deposits cannot be an atomic swap');

      const hash = generateSwapHash(slot, blockSpent, hashSecret, recipient, swappingSlot);

      sign(hash).then(signature => {
        const body = {
          slot,
          blockSpent,
          owner,
          recipient,
          swappingSlot,
          hashSecret,
          hash,
          signature
        };

        fetch(`${process.env.API_URL}/api/transactions/create-atomic-swap`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(() => {
          localStorage.setItem(`swap_${slot}_${swappingSlot}`, secret);
          resolve(secret);
        });

      });

    });

  })
}

const basicGet = (url) => {
  return new  Promise(async (resolve, reject) => {
    const response = await fetch(url);
    const json = await response.json();
    resolve(json);
  });
};

export const loadContracts = () => {
  return basicGet(`${process.env.API_URL}/api/contracts`)
};


export const getOwnedTokens = (address, exiting) => {
  return basicGet(`${process.env.API_URL}/api/tokens/owned-by/${address}?exiting=${exiting}`);
};

export const getExitData = token => {
  return basicGet(`${process.env.API_URL}/api/exits/data/${token}`);
};

export const getProofHistory = (token) => {
  return basicGet(`${process.env.API_URL}/api/tokens/${token}/history-proof`);
}
