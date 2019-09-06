import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import Title from './Title.jsx';
import Hack from './Hack.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

import { subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset,
	subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond,subscribeToSlashedBond,
	depositToPlasma, getCryptoMonsFrom, getExitingFrom, getExitedFrom, getChallengedFrom, buyCryptoMon,
	exitToken, finalizeExit, withdraw, getChallengeable, challengeAfter, challengeBefore,
challengeBetween, getChallenge, respondChallenge, getBalance, withdrawBonds } from '../services/ethService';
import { loadContracts, transferInPlasma, getOwnedTokens, getExitData } from '../services/plasmaServices';
import { sign } from '../utils/cryptoUtils';

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
		//TODO sometimes this is undefined
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
			console.log("Withdrawal - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToFreeBond(rootChain, address, (r => {
			console.log('Free Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawable > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
		}))

		subscribeToSlashedBond(rootChain, address, (r => {
			console.log('Slashed Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawable > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
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
			//TODO popup explicando que se esta firmando
			exitData.signature = await sign(exitData.lastTransactionHash);
		}

		await exitToken(rootChain, exitData)
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

	onTransferAddressChanged = token => event => {
		const fieldKey = `transferAddress${token}`;
		this.setState({ [fieldKey]: event.target.value });
	};

	render() {
		const { rootChain, cryptoMons, vmc, myCryptoMons, myPlasmaTokens, myExitingTokens, myExitedTokens,
			myChallengedTokens, challengeableTokens, withdrawableAmount } = this.state;

		return (
			<React.Fragment>
				<Title text="Hello World!" />
				<p>Calling with address: {this.ethAccount}</p>
				<button onClick={this.loadContracts}>Load contracts</button>
				{withdrawableAmount != '0' && <button onClick={this.withdrawBonds}>Withdraw all bonds (total: {withdrawableAmount}) </button>}
				<p>RootChain address: {rootChain && rootChain.address}</p>
				<p>CryptoMon address: {cryptoMons && cryptoMons.address}</p>
				<p>VMC address: {vmc && vmc.address}</p>
				<button onClick={this.buyCryptoMon}>Buy CryptoMon</button>

				<button onClick={() => this.getCryptoMonsFrom(this.ethAccount)}>Get my CryptoMons</button>
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
							<button key={hash} onClick={() => this.respondChallenge(challenge.slot, hash)}>Respond</button>
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
