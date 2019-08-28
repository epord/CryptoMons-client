import React from 'react';

import { exitToken } from '../services/ethService';
import {generateTransactionHash, sign} from "../utils/cryptoUtils";

class Hack extends React.Component {
  constructor(props) {
    super(props)
    this.state = { history: [] }
  }

  onSlotChanged = event => {
    let hackSlot = event.target.value;
    console.log(hackSlot)
    this.setState({ hackSlot: hackSlot });

    fetch(`${process.env.API_URL}/api/tokens/${hackSlot}/history`).then(response => {
      response.json().then(res => {
        this.setState({ history: res.history })
      })
    })
  };

  maliciousExit = exitData => () => {
    const { rootChain } = this.props;
    const cb = (data) => {
      exitToken(rootChain, data).then(response => {
        console.log("Exit successful: ", response);
      }).catch(console.error);
    }

    if (!exitData.signature) {
      //TODO popup explicando que se esta firmando
      console.log("signing");
      sign(exitData.lastTransactionHash).then(signature => {
        console.log("signed")
        exitData.signature = signature;
        cb(exitData);
      })
    } else {
      cb(exitData);
    }
  };

  maliciousTransaction = token => async () => {

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
    console.log(data1);

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

    const exitData = {
      slot: web3.toBigNumber(token),
      prevTxBytes: data1.exitData.bytes,
      prevTxInclusionProof: data1.exitData.proof,
      exitingTxBytes: data2.exitData.bytes,
      exitingTxInclusionProof: data2.exitData.proof,
      signature: data2.exitData.signature,
      prevTransactionHash: data1.exitData.hash,
      lastTransactionHash: data2.exitData.hash,
      blocks: [
        web3.toBigNumber(data1.exitData.block),
        web3.toBigNumber(data2.exitData.block)
      ]
    };

    console.log(exitData);

    exitToken(this.props.rootChain, exitData).then(response => {
      console.log("Exit successful: ", response);
    }).catch(console.error);


  }


  doubleSpend = (token, transactionHash) => async() => {

    const hacker = web3.eth.defaultAccount;
    const ltResponse = await fetch(`${process.env.API_URL}/api/transactions/${transactionHash}`);
    const lastTransaction = await ltResponse.json();

    console.log("generating overriding fake transaction");
    console.log(lastTransaction)
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

    const data1Res = await fetch(`${process.env.API_URL}/api/exit/singleData/${transactionHash}`);
    const data1 = await data1Res.json();

    const data2Res = await fetch(`${process.env.API_URL}/api/hacks/transactions/create`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data2 = await data2Res.json();

    const exitData = {
      slot: web3.toBigNumber(token),
      prevTxBytes: data1.bytes,
      prevTxInclusionProof: data1.proof,
      exitingTxBytes: data2.exitData.bytes,
      exitingTxInclusionProof: data2.exitData.proof,
      signature: data2.exitData.signature,
      prevTransactionHash: data1.hash,
      lastTransactionHash: data2.exitData.hash,
      blocks: [
        web3.toBigNumber(data1.block),
        web3.toBigNumber(data2.exitData.block)
      ]
    };

    console.log(exitData);

    exitToken(this.props.rootChain, exitData).then(response => {
      console.log("Exit successful: ", response);
    }).catch(console.error);

  };

  render = () => {
    return(
      <div>
        <h2>HACKS!</h2>
        <input
          style={{ marginLeft: '1em', minWidth: '25em' }}
          onChange={this.onSlotChanged}
          value={this.state.hackSlot || ''}
          placeholder="Slot To Hack" />
        {this.state.hackSlot &&
        (<div>
            <h4>Fraudulent Non-Existant Transactions</h4>
            <button onClick={this.maliciousTransaction(this.state.hackSlot)}>HACK!</button>


            <h4>History Hack</h4>
            <p>History:</p>
            {this.state.history.map(event => (
                <div key={event.transaction.minedBlock}>

                  <p >
                    Block: {event.transaction.minedBlock } -
                    from: {event.transaction.owner} -
                    to: {event.transaction.recipient}</p>
                  {event.transaction.recipient.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
                  <button onClick={this.maliciousExit(event.exitData)}>Force Old Exit</button>
                  }

                  {event.transaction.owner.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
                  <button onClick={this.doubleSpend(this.state.hackSlot, event.transaction.hash)}>Create Double Spend Exit</button>
                  }
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  }
}

export default Hack;