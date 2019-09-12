import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import async from 'async';

import { recover, decodeTransactionBytes, generateTransactionHash } from '../utils/cryptoUtils';

import Title from './Title.jsx';
import Hack from './Hack.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

import {
	subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset, subscribeToChallengeRespond,
	subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond, subscribeToSlashedBond,
	depositToPlasma, getCryptoMonsFrom, getExitingFrom, getExitedFrom, getChallengedFrom, buyCryptoMon,
	exitToken, finalizeExit, withdraw, getChallengeable, challengeAfter, challengeBefore,
	challengeBetween, getChallenge, respondChallenge, getBalance, withdrawBonds, exitDepositToken,
	checkEmptyBlock, checkInclusion } from '../services/ethService';

import { loadContracts, transferInPlasma, getOwnedTokens, getExitData, getProofHistory } from '../services/plasmaServices';
import { delay } from '../utils/utils';

class App extends React.Component {

	constructor(props) {
		super(props)
		this.state = {
			myCryptoMons: [],
			myPlasmaTokens: [],
			myExitingTokens: [],
			myExitedTokens: [],
			myChallengedTokens: [],
			challengeableTokens: [],
			withdrawableAmount: '0'
		}
	}

	componentDidMount = () => {
		if(!web3.eth.defaultAccount) {
			delay(500).then(this.componentDidMount);
		} else {
			this.ethAccount = web3.eth.defaultAccount;
			this.loadContracts().then(() => {
				this.subscribeToEvents(this.ethAccount);
				this.getCryptoMonsFrom(this.ethAccount);
				this.getPlasmaTokensFrom(this.ethAccount);
				this.getExitingFrom(this.ethAccount);
				this.getExitedFrom(this.ethAccount);
				this.getChallengeable(this.ethAccount);
				this.getChallengedFrom(this.ethAccount);
				this.getBalance();
			});
		}
	};


	loadContracts = async () => {
		const res = await loadContracts();
		return this.setState({
			rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
			cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
			vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address }
		});
	};

	subscribeToEvents = address => {
		const { rootChain } = this.state;

		subscribeToDeposits(rootChain, address,(r => {
			this.getCryptoMonsFrom(this.ethAccount);
			this.getPlasmaTokensFrom(this.ethAccount);
			console.log("DEPOSIT - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToCoinReset(rootChain, address,(r => {
			this.getPlasmaTokensFrom(this.ethAccount);
			this.getExitingFrom(this.ethAccount);
			this.getChallengedFrom(this.ethAccount);
			this.getChallengeable(this.ethAccount);
			console.log("Coin Reset - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToFinalizedExit(rootChain, address,(r => {
			this.getExitingFrom(this.ethAccount);
			this.getExitedFrom(this.ethAccount);
			console.log("Finalized Exit - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToStartedExit(rootChain, address,(r => {
			this.getPlasmaTokensFrom(this.ethAccount);
			this.getExitingFrom(this.ethAccount);
			console.log("Started Exit - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToSubmittedBlocks(rootChain,(r => {
			this.getPlasmaTokensFrom(this.ethAccount);
			console.log("Block Submitted - BlockNumber: " + r.args.blockNumber.toFixed())
		}));

		subscribeToWithdrew(rootChain, address,(r => {
			this.getExitedFrom(this.ethAccount);
			this.getCryptoMonsFrom(this.ethAccount);
			console.log("Withdrawal - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToFreeBond(rootChain, address, (r => {
			console.log('Free Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawableAmount > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
		}))

		subscribeToSlashedBond(rootChain, address, (r => {
			console.log('Slashed Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawableAmount > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
		}))

		subscribeToChallengeRespond(rootChain, address, (r => {
			this.getChallengeable(this.ethAccount);
			this.getChallengedFrom(this.ethAccount);
			this.getBalance();
			console.log('RespondedExitChallenge event');
		}))
	};

	getBalance = () => {
		const { rootChain } = this.state;
		return getBalance(rootChain).then(async withdrawable => {
			await this.setState({ withdrawableAmount: withdrawable.toFixed() });
			return withdrawable;
		})
	}

	withdrawBonds = () => {
		const { rootChain, withdrawableAmount } = this.state;
		withdrawBonds(rootChain).then(() => {
			console.log(`You have withdrew ${withdrawableAmount} wei.`);
			this.setState({ withdrawableAmount: 0 });
		})
	}

	buyCryptoMon = async () => {
		const { cryptoMons } = this.state;
		await buyCryptoMon(cryptoMons);
		this.getCryptoMonsFrom(this.ethAccount);
	};

	depositToPlasma = async token => {
		const { cryptoMons, rootChain } = this.state;
		await depositToPlasma(token, cryptoMons, rootChain)
	};

	getCryptoMonsFrom = async address => {
		const { cryptoMons } = this.state;
		const myCryptoMons = await getCryptoMonsFrom(address, cryptoMons);
		this.setState({ myCryptoMons: myCryptoMons })
	};

	getPlasmaTokensFrom = async address => {
		const tokens = await getOwnedTokens(address, false);
		this.setState({ myPlasmaTokens: tokens });
	};

  getExitingFrom = async address => {
		const { rootChain } = this.state;
		const tokens = await getExitingFrom(address, rootChain);
		this.setState({ myExitingTokens: tokens })
	};

  getExitedFrom = async address => {
    const { rootChain } = this.state;
    const tokens = await getExitedFrom(address, rootChain);
		this.setState({ myExitedTokens: tokens });
	};

	getChallengedFrom = async address => {
		const { rootChain } = this.state;
		const challenges = await getChallengedFrom(address, rootChain);
		this.setState({ myChallengedTokens: challenges });
	};

	getChallengeable = async address => {
		const { rootChain } = this.state;
		const tokens = await getChallengeable(address, rootChain);
		this.setState({ challengeableTokens: tokens });
	};

	finalizeExit = async token => {
		const { rootChain } = this.state;
		await finalizeExit(rootChain, token);
		console.log("Finalized Exit successful");
	};

	withdraw = async token => {
		const { rootChain } = this.state;
		await withdraw(rootChain, token);
		console.log("Withdrawn successful");
	};

	exitToken = async token => {
		const { rootChain } = this.state;
		const exitData = await getExitData(token);

		if (!exitData.signature) {
			await exitDepositToken(rootChain, token);
		} else {
			await exitToken(rootChain, exitData)
		}

		console.log("Exit successful");
	};

	transferInPlasma = async token => {
		const fieldKey = `transferAddress${token}`;
		const receiverAddress = this.state[fieldKey];
		console.log(`transfering ${token} to ${receiverAddress}`);

    await transferInPlasma(token, receiverAddress);
		console.log("Successful Submission, wait for mining");
	};

	challengeBefore = token => {
		const { rootChain } = this.state;
		console.log(`Challenging Before: ${token}`);
		challengeBefore(token, rootChain);
	};

	challengeBetween = token => {
		const { rootChain } = this.state;
		console.log(`Challenging Between: ${token}`);
		challengeBetween(token, rootChain);
	};

	challengeAfter = token => {
		const { rootChain } = this.state;
		console.log(`Challenging After: ${token}`);
		challengeAfter(token, rootChain);
	};

	respondChallenge = async (token, hash) => {
		const { rootChain } = this.state;
		const challenge = await getChallenge(token, hash, rootChain);
		const challengingBlock = challenge[3];
		respondChallenge(token, challengingBlock, hash, rootChain);
	};

	verifyToken = async () => {
		const { tokenToVerify: token, rootChain } = this.state;
		const { history } = await getProofHistory(token);

		console.log(`validating ${Object.keys(history).length} blocks`)

		let included = await Promise.all(
		  Object.keys(history).map(blockNumber => {
        const { transactionBytes, hash, proof } = history[blockNumber];
        if (!transactionBytes && proof == "0x0000000000000000") {
          return checkEmptyBlock(blockNumber, rootChain);
        } else {
          return checkInclusion(hash, blockNumber, token, proof, rootChain)
        }
      })
		);

		let fail = included.indexOf(false);
		//TODO API returns block before they are propagated
    if(fail != -1 && fail != included.length - 1) {
      let blockNumber = Object.keys(history)[fail];
      console.log(`Error in history! Fail validation in block ${blockNumber}`);
      return this.setState({ historyValid: false, lastValidOwner: "unknown", lastValidBlock: blockNumber });
    }

    let transactions = Object.keys(history).filter(blockNumber => history[blockNumber].transactionBytes);

		async.waterfall([
			async cb => {
				// Deposit
				const depositBlock = Object.keys(history)[0];
				const { transactionBytes, proof } = history[depositBlock];
				const { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
				const hash = generateTransactionHash(slot, blockSpent, recipient);

				if (await checkInclusion(hash, depositBlock, token, proof, rootChain)) {
					return cb(null, recipient);
				} else {
					return cb({error: "Validation failed", blockNumber: blockSpent, lastOwner: owner})
				}

			},
			// Other blocks
			...transactions.slice(1).map(blockNumber => async (owner, cb) => {
				const { transactionBytes, signature, hash } = history[blockNumber];

				if (transactionBytes) {
					const { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
					const generatedHash = generateTransactionHash(slot, blockSpent, recipient);

					if(generatedHash.toLowerCase() != hash.toLowerCase()) {
            return cb({error: "Hash does not match", blockNumber: blockSpent, lastOwner: owner})
          }

					if(recover(hash, signature) != owner.toLowerCase()) {
						return cb({error: "Not signed correctly", blockNumber: blockSpent, lastOwner: owner})
					}

          return cb(null, recipient);
				}
			})
		], (err, lastOwner) => {
				if (err) {
					console.log(`Error in history! Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
					this.setState({ historyValid: false, lastValidOwner: err.lastOwner, lastValidBlock: err.blockNumber })
				} else {
          console.log(`Correct history! Last true owner: ${lastOwner}`);
          this.setState({historyValid: true, lastValidOwner: lastOwner});
        }

			});
	}

	onTransferAddressChanged = token => event => {
		const fieldKey = `transferAddress${token}`;
		this.setState({ [fieldKey]: event.target.value });
	};

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	render() {
		const { rootChain, cryptoMons, vmc, myCryptoMons, myPlasmaTokens, myExitingTokens, myExitedTokens,
			myChallengedTokens, challengeableTokens, withdrawableAmount, tokenToVerify, historyValid, lastValidOwner, lastValidBlock } = this.state;

		return (
			<React.Fragment>
				<Title text="Hello World!" />
				<p>Calling with address: {this.ethAccount}</p>
				<button onClick={this.loadContracts}>Load contracts</button>
				{withdrawableAmount != '0' && <button onClick={this.withdrawBonds}>Withdraw all bonds (total: {withdrawableAmount}) </button>}
				<p>RootChain address: {rootChain && rootChain.address}</p>
				<p>CryptoMon address: {cryptoMons && cryptoMons.address}</p>
				<p>VMC address: {vmc && vmc.address}</p>

				<div>
					<p style={{ display: "inline-block" }}>Verify token history:</p>
					<input
						value={tokenToVerify || ''}
						onChange={event => {
							this.handleChange("tokenToVerify")(event);
							this.setState({ historyValid: undefined });
						}}
						placeholder="Token" />
						<button onClick={this.verifyToken}>Verify</button>
						{tokenToVerify && historyValid === true && <p style={{ display: 'inline', color: 'green' }}>Valid history! Last owner: {lastValidOwner}</p>}
						{tokenToVerify && historyValid === false && <p style={{ display: 'inline', color: 'red' }}>Invalid history! Last owner: {lastValidOwner} in block {lastValidBlock}</p>}
				</div>

				<button onClick={this.buyCryptoMon}>Buy CryptoMon</button>
				<p>My CryptoMons:</p>
				{myCryptoMons.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<button onClick={() => this.depositToPlasma(token)}>Deposit to Plasma</button>
					</div>
				))}
				<p>My Plasma Tokens:</p>
				{myPlasmaTokens.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<input
							style={{ marginLeft: '1em', minWidth: '25em' }}
							onChange={this.onTransferAddressChanged(token)}
							value={this.state[`transferAddress${token}`] || ''}
							placeholder="Address" />
						<button onClick={() => this.transferInPlasma(token)}>Transfer</button>
						<button onClick={() => this.exitToken(token)}>Exit</button>
					</div>
				))}
        <p>My Exiting Tokens:</p>
        {myExitingTokens.map(token => (
          <div key={token}>
            <p style={{ display: "inline" }}>{token}</p>
            <button onClick={() => this.finalizeExit(token)}>Finalize Exit</button>
          </div>
        ))}

				<p>My Challenged Tokens:</p>
				{myChallengedTokens.map(challenge => (
					<div key={challenge.slot}>
						<p style={{ display: "inline" }}>{challenge.slot}</p>
						{challenge.txHash.map(hash =>
							<div>
								<button key={hash} onClick={() => this.respondChallenge(challenge.slot, hash)}>Respond</button>
								<button key={hash + "exit"} onClick={() => this.finalizeExit(challenge.slot)}>Finalize Exit</button>
							</div>
						)}
					</div>
				))}

        <p>My Exited Tokens:</p>
        {myExitedTokens.map(token => (
          <div key={token}>
            <p style={{ display: "inline" }}>{token}</p>
            <button onClick={() => this.withdraw(token)}>Withdraw</button>
          </div>
				))}

        <p>Challengeable tokens:</p>
        {challengeableTokens.map(token => (
          <div key={token}>
            <p style={{ display: "inline" }}>{token}</p>
            <button onClick={() => this.challengeBefore(token)}>Challenge Before</button>
            <button onClick={() => this.challengeBetween(token)}>Challenge Between</button>
            <button onClick={() => this.challengeAfter(token)}>Challenge After</button>
          </div>
				))}



				<Hack rootChain={rootChain}/>

			</React.Fragment>
		)
	}
}

ReactDOM.render(<App />, document.getElementById('app'))
