import React from 'react';
import { connect } from "react-redux";

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import CryptoMons from './components/CryptoMons.jsx';
import PlasmaTokens from './components/PlasmaTokens.jsx';

import async from 'async';

import {
	subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset,
	subscribeToChallengeRespond, subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond,
	subscribeToSlashedBond, getChallengedFrom, finalizeExit, getChallengeable, getChallenge,
	respondChallenge, getBalance, withdrawBonds, checkEmptyBlock, checkInclusion
} from '../services/ethService';

import { loadContracts, getProofHistory } from '../services/plasmaServices';
import { recover, decodeTransactionBytes, generateTransactionHash } from '../utils/cryptoUtils';

import { getCryptoMonsFrom, getOwnedTokens, getExitingTokens, getExitedTokens } from './redux/actions'

class App extends React.Component {

	constructor(props) {
		super(props)
		this.state = {
			loading: true,
			myChallengedTokens: [],
			withdrawableAmount: '0'
		}
	}

	componentDidMount = () => {
		const interval = setInterval(() => {
			if (web3.eth.defaultAccount) {
				this.ethAccount = web3.eth.defaultAccount;
				this.init();
				clearInterval(interval);
			}
		}, 100);
	};

	init = () => {
		this.loadContracts().then(() => {
			this.subscribeToEvents(this.ethAccount);
			this.getChallengedFrom(this.ethAccount);
			this.getBalance();
			this.setState({ loading: false })
		});
	}

	loadContracts = async () => {
		const res = await loadContracts();
		return this.setState({
			rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
			cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
			vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address }
		});
	};

	subscribeToEvents = address => {
		const { rootChain, cryptoMons } = this.state;

		subscribeToDeposits(rootChain, address,(r => {
			console.log("DEPOSIT - Slot: " + r.args.slot.toFixed())
			const { getCryptoMonsFrom, getOwnedTokens } = this.props;
			getCryptoMonsFrom(address, cryptoMons);
			getOwnedTokens(address, false);
		}));

		subscribeToCoinReset(rootChain, address,(r => {
			console.log("Coin Reset - Slot: " + r.args.slot.toFixed())
			const { getOwnedTokens, getExitingTokens } = this.props;
			getOwnedTokens(address, false);
			getExitingTokens(address, rootChain);
			getChallengeable(this.ethAccount, rootChain);
			this.getChallengedFrom(this.ethAccount);
		}));

		subscribeToFinalizedExit(rootChain, address,(r => {
			console.log("Finalized Exit - Slot: " + r.args.slot.toFixed())
			const { getExitingTokens } = this.props;
			getExitingTokens(address, rootChain);
			getExitedTokens(address, rootChain);
		}));

		subscribeToStartedExit(rootChain, address,(r => {
			console.log("Started Exit - Slot: " + r.args.slot.toFixed())
			const { getOwnedTokens, getExitingTokens } = this.props;
			getOwnedTokens(address, false);
			getExitingTokens(address, rootChain);
		}));

		subscribeToSubmittedBlocks(rootChain,(r => {
			console.log("Block Submitted - BlockNumber: " + r.args.blockNumber.toFixed())
			const { getOwnedTokens } = this.props;
			getOwnedTokens(address, false);
		}));

		subscribeToWithdrew(rootChain, address,(r => {
			console.log("Withdrawal - Slot: " + r.args.slot.toFixed())
			const { getCryptoMonsFrom, getExitedTokens } = this.props;
			getCryptoMonsFrom(address, cryptoMons);
			getExitedTokens(address, rootChain);
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
			getChallengeable(this.ethAccount, rootChain);
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

	/// TODO: Remove to a component
	getChallengedFrom = async address => {
		const { rootChain } = this.state;
		const challenges = await getChallengedFrom(address, rootChain);
		this.setState({ myChallengedTokens: challenges });
	};

	finalizeExit = async token => {
		const { rootChain } = this.state;
		await finalizeExit(rootChain, token);
		console.log("Finalized Exit successful");
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
		console.log(history)

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
		console.log(included)
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

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	render() {
		const { loading, rootChain, cryptoMons, vmc,
			myChallengedTokens, withdrawableAmount, tokenToVerify, historyValid, lastValidOwner, lastValidBlock } = this.state;

		if (loading) return (<div>Loading...</div>)

		return (
			<div style={{ padding: '1em' }}>
			<Typography variant="h5" gutterBottom>Hi {this.ethAccount}!</Typography>
				<Grid container direction="column">
					<Grid item style={{ alignSelf: 'center' }}>
						<Paper style={{ padding: '1em', display: 'inline-block' }}>
							<Typography variant="h5" component="h3">Contracts</Typography>
							<Typography variant="body2"><b>RootChain address:</b> {rootChain && rootChain.address}</Typography>
							<Typography variant="body2"><b>CryptoMon address:</b> {cryptoMons && cryptoMons.address}</Typography>
							<Typography variant="body2"><b>VMC address:</b> {vmc && vmc.address}</Typography>
						</Paper>
					</Grid>
					<Grid item>
						{/* TODO: take this out */}
						<div>
							<Typography style={{ display: "inline-block" }}>Verify token history:</Typography>
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
					</Grid>
					<Grid item>
						{withdrawableAmount != '0' && (
							<React.Fragment>
								<Typography style={{ display: 'inline-block', marginRight: '0.5em' }}>You have {withdrawableAmount / 1000000000000000000} ETH to withdraw</Typography>
								<Button color="primary" variant="contained" size="small" onClick={this.withdrawBonds}>Withdraw all bonds</Button>
							</React.Fragment>
						)}
					</Grid>
				</Grid>
				<ExpansionPanel defaultExpanded>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>My CryptoMons</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ flexWrap: 'wrap' }}>
						<CryptoMons cryptoMonsContract={cryptoMons} rootChainContract={rootChain} ethAccount={this.ethAccount} />
					</ExpansionPanelDetails>
				</ExpansionPanel>
				<ExpansionPanel defaultExpanded>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>My Plasma Tokens</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails>
						<PlasmaTokens cryptoMonsContract={cryptoMons} rootChainContract={rootChain} ethAccount={this.ethAccount} />
					</ExpansionPanelDetails>
				</ExpansionPanel>

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
			</div>
		)
	}
}


const mapStateToProps = state => ({ });

const mapDispatchToProps = dispatch => ({
	getOwnedTokens: (address, exiting) => dispatch(getOwnedTokens(address, exiting)),
	getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);