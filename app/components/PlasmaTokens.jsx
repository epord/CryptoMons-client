import React from 'react';
import InitComponent from './common/InitComponent.jsx';

import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import _ from 'lodash';
import async from 'async';

import {
  challengeAfter,
  challengeBefore,
  challengeBetween,
  exitTokenWithData,
  finalizeExit,
  getChallenge,
  respondChallenge,
  withdraw
} from '../../services/ethService';
import {createAtomicSwap, getExitData, transferInPlasma} from '../../services/plasmaServices';
import {
  getChallengeableTokens,
  getChallengedFrom,
  getExitedTokens,
  getExitingTokens,
  getOwnedTokens
} from '../redux/actions';

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class PlasmaTokens extends InitComponent {

	constructor(props) {
		super(props);
		this.state = {
			transferModalOpen: false,
			swapModalOpen: false,
			onSwapClicked: false,
		}
	}

	init = () => {
		const {
			ethAccount,
			getChallengeableTokens,
			rootChainContract,
			getExitingTokens,
			getExitedTokens,
			getOwnedTokens,
			getChallengedFrom
		} = this.props;

		getOwnedTokens(ethAccount, 'deposited');
		getChallengeableTokens(ethAccount, rootChainContract);
		getExitingTokens(ethAccount, rootChainContract);
		getExitedTokens(ethAccount, rootChainContract);
		getChallengedFrom(ethAccount, rootChainContract);
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

	exitToken = token => async () => {
		const { rootChainContract } = this.props;
		const exitData = await getExitData(token);

		exitTokenWithData(rootChainContract, exitData).then(
			() => console.log("Exit successful")
		);
	};

	finalizeExit = token => async () => {
		const { rootChainContract } = this.props;
		await finalizeExit(rootChainContract, token);
		console.log("Finalized Exit successful");
	};

	challengeBefore = token => () => {
		const { rootChainContract } = this.props;
		console.log(`Challenging Before: ${token}`);
		challengeBefore(token, rootChainContract);
	};

	challengeBetween = token => () => {
		const { rootChainContract } = this.props;
		console.log(`Challenging Between: ${token}`);
		challengeBetween(token, rootChainContract);
	};

	challengeAfter = token => () => {
		const { rootChainContract } = this.props;
		console.log(`Challenging After: ${token}`);
		challengeAfter(token, rootChainContract);
	};

	withdraw = token => async () => {
		const { rootChainContract } = this.props;
		await withdraw(rootChainContract, token);
		console.log("Withdrawn successful");
	};

	respondChallenge = async (token, hash) => {
		const { rootChainContract } = this.props;
		const challenge = await getChallenge(token, hash, rootChainContract);
		const challengingBlock = challenge[3];
		respondChallenge(token, challengingBlock, hash, rootChainContract);
	};


	openTransferModal = token => () => this.setState({ transferModalOpen: true, tokenToTransact: token });

	closeTransferModal= () => this.setState({ transferModalOpen: false });

	openSwapModal = token => () => this.setState({ swapModalOpen: true, tokenToSwap: token });

	closeSwapModal= () => this.setState({ swapModalOpen: false, secret: undefined });

	openRespondChallengeModal = (challengedSlot, challengeHashes) => () => {
		const { rootChainContract } = this.props;
		const getChallenges = challengeHashes.map(hash => async cb => {
			const ans = await getChallenge(challengedSlot, hash, rootChainContract)
			const challenge = {
				owner: ans[0],
				challenger: ans[1],
				txHash: ans[2],
				blockNumber: ans[3],
			}
			cb(null, challenge);
		});
		async.parallel(getChallenges, (err, challenges) => {
			if (err) {
				console.error(err);
				this.closeRespondChallengeModal();
			}
			this.setState({
				respondModalOpen: true,
				challengedSlot,
				challengesToRespond: challenges
			});
		});
	}

	closeRespondChallengeModal = () => this.setState({ respondModalOpen: false });

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	renderRespondChallengeDialog = () => {
		const { respondModalOpen, challengedSlot, challengesToRespond } = this.state;
		const { classes } = this.props;
		const challengesCount = challengesToRespond ? challengesToRespond.length : 0;

		return (
			<Dialog onClose={this.closeRespondChallengeModal} open={respondModalOpen} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Respond to challenges</DialogTitle>
				<Typography gutterBottom style={{ textAlign: 'center' }} variant="body1">There {challengesCount > 1 ? 'are' : 'is'} active {challengesCount} challenge{challengesCount > 1 ? 's' : ''}</Typography>
				{(challengesToRespond || []).map(challenge => (
					<React.Fragment>
						<Typography>{challenge.owner} challenged you in block number ${challenge.blockNumber}</Typography>
						<Button variant="contained" color="primary" onClick={() => this.respondChallenge(challengedSlot, challenge.txHash)}>Respond Challenge</Button>
					</React.Fragment>
				))}
			</Dialog>
		)
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
		const { plasmaTokens, exitingTokens, challengeableTokens, exitedTokens, challengedTokens } = this.props;

		if (plasmaTokens.length + exitingTokens.length + challengeableTokens.length + exitedTokens.length === 0) {
			return (
				<Typography style={{ margin: 'auto' }}  variant="body1">You do not have any Plasma token. Deposit one of your CryptoMons once you have one!</Typography>
			)
		}

		return (
			<React.Fragment>
				{this.renderTransferDialog()}
				{this.renderSwapDialog()}
				{this.renderRespondChallengeDialog()}
				<Grid container spacing={3} alignContent="center" alignItems="start">
					{plasmaTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								actions={[
									{
										title: "Transfer",
										func: this.openTransferModal(token)
									},{
										title: "Swap",
										func: this.openSwapModal(token)
									},{
										title: "Exit",
										func: this.exitToken(token)
									}
								]}
							/>
						</Grid>
					))}
					{challengeableTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								challengeable
								actions={[
									{
										title: "Challenge After",
										func: this.challengeAfter(token)
									},{
										title: "Challenge Between",
										func: this.challengeBetween(token)
									},{
										title: "Challenge Before",
										func: this.challengeBefore(token)
									},
								]}
							/>
						</Grid>
					))}
					{_.difference(exitingTokens, challengedTokens.map(t=>t.slot)).map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								exiting
								actions={[
									{
										title: "Finalize Exit",
										disabled: false, //TODO have 2 arrays, one for exiting, another for readyToExit
										func: this.finalizeExit(token)
									}
								]} />
						</Grid>
					))}
					{challengedTokens.map(({ slot, txHash }) => (
						<Grid item key={slot}>
							<CryptoMonCard
								plasmaToken={slot}
								challenged
								actions={[
									{
										title: "Respond Challenge",
										func: this.openRespondChallengeModal(slot, txHash)
									}
								]}
							/>
						</Grid>
					))}
					{exitedTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								plasmaToken={token}
								exited
								actions={[
									{
										title: "Withdraw",
										func: this.withdraw(token)
									}
								]}
							/>
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
	challengedTokens: state.challengedTokens,
	rootChainContract: state.rootChainContract,
	ethAccount: state.ethAccount
});

const mapDispatchToProps = dispatch => ({
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
	getChallengeableTokens: (address, rootChainContract) => dispatch(getChallengeableTokens(address, rootChainContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
	getChallengedFrom: (address, rootChainContract) => dispatch(getChallengedFrom(address, rootChainContract)),
});

const connectedPlasmaTokens = connect(mapStateToProps, mapDispatchToProps)(PlasmaTokens);
const styledPlasmaTokens = withStyles(styles)(connectedPlasmaTokens);
export default styledPlasmaTokens;