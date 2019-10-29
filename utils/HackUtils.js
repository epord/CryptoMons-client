import {generateTransactionHash, sign} from "./cryptoUtils";
import {exitDepositToken, exitToken} from "../services/ethService";

export const nonExistentTransactions = (token) => {
  return new Promise(async (resolve, reject) => {
    const hacker = web3.eth.defaultAccount;
    const ltResponse = await fetch(`${process.env.API_URL}/api/tokens/${token}/last-transaction`);
    const lastTransaction = await ltResponse.json();

    console.log("generating first fake transaction");

    const hash1 = generateTransactionHash(token, lastTransaction.minedBlock, hacker);
    const sign1 = await sign(hash1);

    const body1 = {
      "slot": token,
      "owner": hacker,
      "recipient": hacker,
      "hash": hash1,
      "blockSpent": lastTransaction.minedBlock,
      "signature": sign1
    };

    const data1Res = await fetch(`${process.env.API_URL}/api/hacks/transactions/create`, {
      method: 'POST',
      body: JSON.stringify(body1),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data1 = await data1Res.json();

    const hash2 = generateTransactionHash(token, data1.block.blockNumber, hacker);
    const sign2 = await sign(hash2);
    const body2 = {
      "slot": token,
      "owner": hacker,
      "recipient": hacker,
      "hash": hash2,
      "blockSpent": data1.block.blockNumber,
      "signature": sign2
    };

    const data2Res = await fetch(`${process.env.API_URL}/api/hacks/transactions/create`, {
      method: 'POST',
      body: JSON.stringify(body2),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data2 = await data2Res.json();

    resolve({
      slot: (token),
      prevTxBytes: data1.exitData.bytes,
      prevTxInclusionProof: data1.exitData.proof,
      exitingTxBytes: data2.exitData.bytes,
      exitingTxInclusionProof: data2.exitData.proof,
      signature: data2.exitData.signature,
      prevTransactionHash: data1.exitData.hash,
      lastTransactionHash: data2.exitData.hash,
      prevBlock: data1.exitData.block,
      exitingBlock: data2.exitData.block
    });
  });
};

export const doubleSpendTransactions = (token, hacker, transactionHash) => {
  return new Promise(async (resolve, reject) => {

    const ltResponse = await fetch(`${process.env.API_URL}/api/transactions/${transactionHash}`);
    const lastTransaction = await ltResponse.json();

    const data1Res = await fetch(`${process.env.API_URL}/api/exits/singleData/${transactionHash}`);
    const data1 = await data1Res.json();

    const hash = generateTransactionHash(token, lastTransaction.minedBlock, hacker);
    const signature = await sign(hash);

    const body = {
      "slot": token,
      "owner": hacker,
      "recipient": hacker,
      "hash": hash,
      "blockSpent": lastTransaction.minedBlock,
      "signature": signature
    };

    const data2Res = await fetch(`${process.env.API_URL}/api/hacks/transactions/create`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data2 = await data2Res.json();

    resolve({
      slot: (token),
      prevTxBytes: data1.bytes,
      exitingTxBytes: data2.exitData.bytes,
      prevTxInclusionProof: data1.proof,
      exitingTxInclusionProof: data2.exitData.proof,
      signature: data2.exitData.signature,
      prevBlock: data1.block,
      exitingBlock: data2.exitData.block
    });
  });
};