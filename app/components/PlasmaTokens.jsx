import React from 'react';
import { connect } from "react-redux";
import { withStyles } from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import { exitDepositToken, exitToken, finalizeExit, challengeBefore, challengeBetween, challengeAfter, withdraw } from '../../services/ethService';
import { transferInPlasma, getExitData, createAtomicSwap } from '../../services/plasmaServices';
import { getChallengeableTokens, getExitingTokens, getExitedTokens } from '../redux/actions';

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class PlasmaTokens extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			transferModalOpen: false,
			swapModalOpen: false,
			onSwapClicked: false,
		}
	}

	componentDidMount() {
		const { ethAccount, getChallengeableTokens, rootChainContract, getExitingTokens, getExitedTokens } = this.props;
		getChallengeableTokens(ethAccount, rootChainContract);
		getExitingTokens(ethAccount, rootChainContract);
		getExitedTokens(ethAccount, rootChainContract);
	}

	transferInPlasma = async token => {
		const { transferAddress } = this.state;
		console.log(`Transfering ${token} to ${transferAddress}`);

    transferInPlasma(token, transferAddress).then(() =>{
			console.log("Successful Submission, wait for mining");
			this.closeTransferModal();
		})
	};

	swapInPlasma = async token => {
		const { swapToken } = this.state;

		console.log(`Swapping ${token} with ${swapToken}`);

		this.setState({ swapping: true });
		createAtomicSwap(token, swapToken).then(secret => {
			this.setState({ secret, swapping: false })
		}).catch(err => {
			this.setState({ swapping: false })
		})
	}

	exitToken = async token => {
		const { rootChainContract } = this.props;
		const exitData = await getExitData(token);

		if (!exitData.signature) {
			await exitDepositToken(rootChainContract, token);
		} else {
			await exitToken(rootChainContract, exitData)
		}

		console.log("Exit successful");
	};

	finalizeExit = async token => {
		const { rootChainContract } = this.props;
		await finalizeExit(rootChainContract, token);
		console.log("Finalized Exit successful");
	};

	challengeBefore = token => {
		const { rootChainContract } = this.props;
		console.log(`Challenging Before: ${token}`);
		challengeBefore(token, rootChainContract);
	};

	challengeBetween = token => {
		const { rootChainContract } = this.props;
		console.log(`Challenging Between: ${token}`);
		challengeBetween(token, rootChainContract);
	};

	challengeAfter = token => {
		const { rootChainContract } = this.props;
		console.log(`Challenging After: ${token}`);
		challengeAfter(token, rootChainContract);
	};

	withdraw = async token => {
		const { rootChainContract } = this.props;
		await withdraw(rootChainContract, token);
		console.log("Withdrawn successful");
	};


	openTransferModal = token => this.setState({ transferModalOpen: true, tokenToTransact: token });

	openSwapModal = token => this.setState({ swapModalOpen: true, tokenToSwap: token });

	closeTransferModal= () => this.setState({ transferModalOpen: false });

	closeSwapModal= () => this.setState({ swapModalOpen: false, secret: undefined });

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	renderTransferDialog = () => {
		const { transferModalOpen, tokenToTransact } = this.state;
		const { classes } = this.props;
		return (
			<Dialog onClose={this.closeTransferModal} open={transferModalOpen} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Transfer token</DialogTitle>
				<Grid container style={{ padding: '1em' }}>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<TextField
							label="Transfer to"
							fullWidth
							onChange={this.handleChange('transferAddress')}
							value={this.state.transferAddress || ''}
							placeholder="Address" />
					</Grid>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<Button color="primary" fullWidth onClick={() => this.transferInPlasma(tokenToTransact)} variant="outlined" size="small">Transfer</Button>
					</Grid>
				</Grid>
			</Dialog>
		)
	}

	renderSwapDialog = () => {
		const { swapModalOpen, tokenToSwap, swapping, secret } = this.state;
		const { classes } = this.props;

		return (
			<Dialog onClose={this.closeSwapModal} open={swapModalOpen} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Swap token</DialogTitle>
				<Grid container style={{ padding: '1em' }}>
					<Grid item xs={12}>
						<TextField
							label="Swap with"
							fullWidth
							onChange={this.handleChange('swapToken')}
							value={this.state.swapToken || ''}
							placeholder="Token" />
					</Grid>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<Button disabled={swapping || Boolean(secret)} color="primary" fullWidth onClick={() => this.swapInPlasma(tokenToSwap)} variant="outlined" size="small">Swap</Button>
					</Grid>
					{secret && (
						<React.Fragment>
							<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}><b>IMPORTANT!</b></Typography>
							<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}>This is the random generated secret you will need to reveal in order to validate the transaction later:</Typography>
							<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}><b>{secret}</b></Typography>
						</React.Fragment>
					)}
				</Grid>
			</Dialog>
		)
	}

	render = () => {
		const { plasmaTokens, exitingTokens, challengeableTokens, exitedTokens } = this.props;

		if (plasmaTokens.length + exitingTokens.length + challengeableTokens.length + exitedTokens.length === 0) {
			return (
				<Typography style={{ margin: 'auto' }}  variant="body1">You do not have any Plasma token. Deposit one of your CryptoMons once you have one!</Typography>
			)
		}

		return (
			<React.Fragment>
				{this.renderTransferDialog()}
				{this.renderSwapDialog()}
				<Grid container spacing={3} alignContent="center" alignItems="start">
					{plasmaTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								onTransferClicked={() => this.openTransferModal(token)}
								onSwapClicked={() => this.openSwapModal(token)}
								onExitClicked={() => this.exitToken(token)} />
						</Grid>
					))}
					{exitingTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								exiting
								onFinalizeExitClick={() => this.finalizeExit(token)} />
						</Grid>
					))}
					{challengeableTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								challengeable
								onChallengeBeforeClick={() => this.challengeBefore(token)}
								onChallengeBetweenClick={() => this.challengeBetween(token)}
								onChallengeAfterClick={() => this.challengeAfter(token)} />
						</Grid>
					))}
					{exitedTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								exited
								onWithdrawClick={() => this.withdraw(token)} />
						</Grid>
					))}
				</Grid>
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	plasmaTokens: state.plasmaTokens,
	exitingTokens: state.exitingTokens,
	challengeableTokens: state.challengeableTokens,
	exitedTokens: state.exitedTokens,
});

const mapDispatchToProps = dispatch => ({
	getChallengeableTokens: (address, rootChainContract) => dispatch(getChallengeableTokens(address, rootChainContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
});

const connectedPlasmaTokens = connect(mapStateToProps, mapDispatchToProps)(PlasmaTokens);
const styledPlasmaTokens = withStyles(styles)(connectedPlasmaTokens);
export default styledPlasmaTokens;