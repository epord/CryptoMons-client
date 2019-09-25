import React from 'react';
import { connect } from "react-redux";
import { withStyles } from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';

import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import { exitDepositToken, exitToken, finalizeExit, challengeBefore, challengeBetween, challengeAfter, withdraw } from '../../services/ethService';
import { transferInPlasma, getExitData } from '../../services/plasmaServices';
import { getChallengeableTokens, getExitingTokens, getExitedTokens } from '../redux/actions';

const styles = theme => ({
	dialogPaper: {
		minWidth: '20em',
	},
});

class PlasmaTokens extends React.Component {

	state = {
		modalOpen: false
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
			this.handleClose();
		})
	};

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


	openTransferModal = token => this.setState({ modalOpen: true, tokenToTransact: token });

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}


  handleClose = () => this.setState({ modalOpen: false });

	renderTransferDialog = () => {
		const { modalOpen, tokenToTransact } = this.state;
		const { classes } = this.props;
		return (
			<Dialog onClose={this.handleClose} open={modalOpen} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Transfer token</DialogTitle>
				<Grid container>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<TextField
							label="Transfer to"
							fullWidth
							onChange={this.handleChange('transferAddress')}
							value={this.state.transferAddress}
							placeholder="Address" />
					</Grid>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<Button color="primary" fullWidth onClick={() => this.transferInPlasma(tokenToTransact)} variant="outlined" size="small">Transfer</Button>
					</Grid>
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
				<Grid container spacing={3} alignContent="center" alignItems="center">
					{plasmaTokens.map(token => (
						<Grid key={token}>
							<CryptoMonCard
								token={token}
								onTransferClicked={() => this.openTransferModal(token)}
								onExitClicked={() => this.exitToken(token)} />
						</Grid>
					))}
					{exitingTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								token={token}
								exiting
								onFinalizeExitClick={() => this.finalizeExit(token)} />
						</Grid>
					))}
					{challengeableTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								token={token}
								challengeable
								onChallengeBeforeClick={() => this.challengeBefore(token)}
								onChallengeBetweenClick={() => this.challengeBetween(token)}
								onChallengeAfterClick={() => this.challengeAfter(token)} />
						</Grid>
					))}
					{exitedTokens.map(token => (
						<Grid item key={token}>
							<CryptoMonCard
								token={token}
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