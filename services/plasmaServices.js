import {generateTransactionHash, sign} from "../utils/cryptoUtils";

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
  return basicGet(`${process.env.API_URL}/api/exit/data/${token}`)
};
