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

import CryptoMons from '../components/CryptoMons.jsx';
import PlasmaTokens from '../components/PlasmaTokens.jsx';

import {
	subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset,
	subscribeToChallengeRespond, subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond,
	subscribeToSlashedBond, getChallengedFrom, finalizeExit, getChallengeable, getChallenge,
	respondChallenge, getBalance, withdrawBonds, checkEmptyBlock, checkInclusion, subscribeToCryptoMonTransfer
} from '../../services/ethService';

import { getCryptoMonsFrom, getOwnedTokens, getExitingTokens, getExitedTokens, buyCryptoMon, loadContracts, getSwappingTokens } from '../redux/actions'

class App extends React.Component {

	constructor(props) {
		super(props)
		this.state = {
			loading: true,
			myChallengedTokens: [],
			withdrawableAmount: '0'
		}
	}

	componentDidUpdate = (prevProps) => {
		if ((!prevProps.rootChain && this.props.rootChain) || (!prevProps.cryptoMons && this.props.cryptoMons)
			|| (!prevProps.vmc && this.props.vmc) || (!prevProps.ethAccount && this.props.ethAccount)) {
				console.log('fetch all')
				this.getChallengedFrom(this.props.ethAccount);
				this.getBalance();
				this.setState({ loading: false })
			}
	}

	getBalance = () => {
		const { rootChain } = this.props;
		return getBalance(rootChain).then(async withdrawable => {
			await this.setState({ withdrawableAmount: withdrawable });
			return withdrawable;
		})
	}

	withdrawBonds = () => {
		const { rootChain } = this.props;
		const { withdrawableAmount } = this.state;
		withdrawBonds(rootChain).then(() => {
			console.log(`You have withdrew ${withdrawableAmount} wei.`);
			this.setState({ withdrawableAmount: 0 });
		})
	}

	/// TODO: Remove to a component
	getChallengedFrom = async address => {
		const { rootChain } = this.props;
		const challenges = await getChallengedFrom(address, rootChain);
		this.setState({ myChallengedTokens: challenges });
	};

	finalizeExit = async token => {
		const { rootChain } = this.props;
		await finalizeExit(rootChain, token);
		console.log("Finalized Exit successful");
	};

	respondChallenge = async (token, hash) => {
		const { rootChain } = this.props;
		const challenge = await getChallenge(token, hash, rootChain);
		const challengingBlock = challenge[3];
		respondChallenge(token, challengingBlock, hash, rootChain);
	};

	buyCryptoMon = async () => {
		const { buyCryptoMon, cryptoMons, ethAccount } = this.props;
		buyCryptoMon(ethAccount, cryptoMons)
	};

	render() {
		const { cryptoMons, rootChain, vmc, ethAccount } = this.props;
		const { loading, myChallengedTokens, withdrawableAmount } = this.state;

		if (loading) return (<div>Loading...</div>)

		return (
			<div style={{ padding: '1em' }}>
			<Typography variant="h5" gutterBottom>Hi {ethAccount}!</Typography>
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
					</Grid>
					<Grid item>
						{withdrawableAmount != '0' && (
							<React.Fragment>
								<Typography style={{ display: 'inline-block', marginRight: '0.5em' }}>You have {withdrawableAmount / 1000000000000000000} ETH to withdraw</Typography>
								<Button color="primary" variant="contained" size="small" onClick={this.withdrawBonds}>Withdraw all bonds</Button>
							</React.Fragment>
						)}
					</Grid>
					<Grid item>
						<Button onClick={this.buyCryptoMon} variant="contained" color="primary">Buy CryptoMon</Button>
					</Grid>
				</Grid>
				<ExpansionPanel defaultExpanded style={{ marginTop: '1em' }}>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>My CryptoMons</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
						<CryptoMons cryptoMonsContract={cryptoMons} rootChainContract={rootChain} ethAccount={ethAccount} />
					</ExpansionPanelDetails>
				</ExpansionPanel>
				<ExpansionPanel defaultExpanded>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>My Plasma Tokens</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
						<PlasmaTokens cryptoMonsContract={cryptoMons} rootChainContract={rootChain} ethAccount={ethAccount} />
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
	loadContracts: () => dispatch(loadContracts()),
	buyCryptoMon: (address, cryptoMonsContract) => dispatch(buyCryptoMon(address, cryptoMonsContract)),
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
	getSwappingTokens: (address) => dispatch(getSwappingTokens(address)),
	getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);