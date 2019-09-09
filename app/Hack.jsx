import React from 'react';

import {exitToken, challengeBeforeWithExitData, getCoinState, exitDepositToken} from '../services/ethService';
import {generateTransactionHash, sign} from "../utils/cryptoUtils";

class Hack extends React.Component {
  constructor(props) {
    super(props)
    this.state = { history: [] }
  }

  onSlotChanged = event => {
    let hackSlot = event.target.value;
    this.setState({ hackSlot: hackSlot });

    fetch(`${process.env.API_URL}/api/tokens/${hackSlot}/history`).then(response => {
      response.json().then(res => {
        this.setState({ history: res.history })
      })
    });

    getCoinState(hackSlot, this.props.rootChain).then(response => {
      this.setState({ isHackSlotExiting: response == "EXITING" });
    })
  };

  maliciousExit = exitData => async () => {
    const { rootChain } = this.props;
    let res;
    if (!exitData.signature) {
      res = await exitDepositToken(rootChain, exitData.slot);
    } else {
      res = await exitToken(rootChain, data)
    }
    console.log("Exit successful: ", res);
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
      prevBlock: data1.exitData.block,
      exitingBlock: data2.exitData.block
    };

    exitToken(this.props.rootChain, exitData).then(response => {
      console.log("Exit successful: ", response);
    }).catch(console.error);


  }

	challengeBefore = (token, exitData) => () => {
		const { rootChain } = this.props;
    console.log(`Challenging Before: ${token}`)

    const newExitData = {
      slot: exitData.slot,
      challengingTransaction: exitData.exitingTxBytes,
      proof: exitData.exitingTxInclusionProof,
      challengingBlockNumber: exitData.exitingBlock,
      signature: exitData.signature
    };

		challengeBeforeWithExitData(newExitData, rootChain);
  }


  doubleSpend = (token, transactionHash) => async() => {

    const hacker = web3.eth.defaultAccount;
    const ltResponse = await fetch(`${process.env.API_URL}/api/transactions/${transactionHash}`);
    const lastTransaction = await ltResponse.json();

    const data1Res = await fetch(`${process.env.API_URL}/api/exit/singleData/${transactionHash}`);
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

    const exitData = {
      slot: web3.toBigNumber(token),
      prevTxBytes: data1.bytes,
      exitingTxBytes: data2.exitData.bytes,
      prevTxInclusionProof: data1.proof,
      exitingTxInclusionProof: data2.exitData.proof,
      signature: data2.exitData.signature,
      prevBlock: data1.block,
      exitingBlock: data2.exitData.block
    };

    exitToken(this.props.rootChain, exitData).then(response => {
      console.log("Exit successful: ", response);
    }).catch(console.error);

  };

  render = () => {
    const { hackSlot, history , isHackSlotExiting} = this.state;
    return(
      <div>
        <h2>HACKS!</h2>
        <input
          style={{ marginLeft: '1em', minWidth: '25em' }}
          onChange={this.onSlotChanged}
          value={hackSlot || ''}
          placeholder="Slot To Hack" />
        {hackSlot &&
        (<div>
            <h4>Fraudulent Non-Existant Transactions</h4>
            <button onClick={this.maliciousTransaction(hackSlot)}>HACK!</button>

            <h4>History Hack</h4>
            <p>History:</p>
            {history.map(event => (
                <div key={event.transaction.minedBlock}>
                  <p>
                    Block: {event.transaction.minedBlock } -
                    from: {event.transaction.owner} -
                    to: {event.transaction.recipient}
                  </p>
                  {event.transaction.recipient.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
                    <React.Fragment>
                      <button onClick={this.maliciousExit(event.exitData)}>Force Old Exit</button>
                      <button onClick={this.doubleSpend(hackSlot, event.transaction.hash)}>Create Double Spend Exit</button>
                    </React.Fragment>
                  }
                  {isHackSlotExiting && <button onClick={this.challengeBefore(hackSlot, event.exitData)}>Challenge Before</button>}
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