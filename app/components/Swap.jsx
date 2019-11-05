import React from 'react';

import InitComponent from './common/InitComponent.jsx';
import withInitComponent from './common/withInitComponent.js';

import { connect } from "react-redux";
import { withStyles } from '@material-ui/core/styles';

import Typography from '@material-ui/core/Typography';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import DoubleCryptoMonCard from './common/DoubleCryptoMonCard.jsx';

import { toAddressColor, toReadableAddress } from '../../utils/utils';
import { createAtomicSwap, getSwapData } from '../../services/plasmaServices'
import { getSwappingRequests, getSwappingTokens, revealSecret } from '../redux/actions';
import ValidateHistoryModal from "./common/ValidateHistoryModal.jsx";

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class Swap extends InitComponent {

  state = {
    secretModalOpen: false
  }

	init = () => {
    const { getSwappingTokens, getSwappingRequests, rootChainContract } = this.props;
		getSwappingTokens(web3.eth.defaultAccount)
		getSwappingRequests(web3.eth.defaultAccount)
	}

	revealSecret = async () => {
		const { tokenToReveal, secretToReveal } = this.state;
		const { revealSecret } = this.props;

		this.setState({ revealingSecret: true });
		revealSecret(tokenToReveal, secretToReveal)
			.then(() => {
				this.setState({ revealingSecret: false })
				this.closeRevealSecretModal();
			})
	}

	swapInPlasma = async (tokenToSwap, swapToken) => {

		console.log(`Swapping ${tokenToSwap} with ${swapToken}`);

		this.setState({ swapping: true });
		createAtomicSwap(tokenToSwap, swapToken).then(secret => {
			this.setState({ secret, swapping: false })
		}).catch(err => {
			this.setState({ swapping: false })
		})
	}

	openRevealSecretModal = token => () => {
		this.setState({ secretModalOpen: true, tokenToReveal: token, loadingSwapData: true });
		getSwapData(token).then(swapData => {
			const swappingTokenReveal = swapData.counterpart.data.slot;
			const savedSecret = localStorage.getItem(`swap_${token}_${swappingTokenReveal}`);
			this.setState({ swappingTokenReveal, secretToReveal: savedSecret, loadingSwapData: false })
		})
	}

	closeRevealSecretModal= () => this.setState({ secretModalOpen: false });

	openAcceptSwapModal= transaction => () => {
		this.setState({ acceptSwapModalOpen: true, transactionToAccept: transaction, swapToken: transaction.swappingSlot })
	};

	closeAcceptSwapModal= () => this.setState({ acceptSwapModalOpen: false });

	openValidateHistoryModal = (token) => () => this.setState({
		validateHistoryOpen: true,
		validatingToken: token,
	});

	closeValidateHistoryModal = () => this.setState({ validateHistoryOpen: false, validatingToken: undefined });


	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	renderRevealSecretDialog = () => {
		const { secretModalOpen, tokenToReveal, revealingSecret, swappingTokenReveal, loadingSwapData, secretToReveal } = this.state;
		const { classes } = this.props;

		if (loadingSwapData) return <div>Loading...</div>

		return (
			<Dialog onClose={this.closeRevealSecretModal} open={Boolean(secretModalOpen)} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Reveal secret</DialogTitle>
				<Grid container style={{ padding: '1em' }}>
					<Grid item xs={12}>
						<Typography variant="body1"><u>Swapping token:</u> {swappingTokenReveal}</Typography>
					</Grid>
					<Grid item xs={12}>
						<TextField
							label="Secret"
							fullWidth
							onChange={this.handleChange('secretToReveal')}
							value={secretToReveal || ''} />
					</Grid>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<Button disabled={revealingSecret} color="primary" fullWidth onClick={() => this.revealSecret(tokenToReveal)} variant="outlined" size="small">Reveal</Button>
					</Grid>
				</Grid>
			</Dialog>
		)
	}

	renderAcceptSwapDialog = () => {
		const { acceptSwapModalOpen, transactionToAccept, swapping, secret } = this.state;
		const { classes } = this.props;

		if (!transactionToAccept) return null;

		return (
			<Dialog onClose={this.closeAcceptSwapModal} open={Boolean(acceptSwapModalOpen)} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Do you want to accept this swap request?</DialogTitle>
				<Grid container style={{ padding: '1em' }}>
					<Grid item xs={12}>
						<DoubleCryptoMonCard
							token1={transactionToAccept.slot}
							token2={transactionToAccept.swappingSlot}
						/>
					</Grid>
				</Grid>
				{secret && (
					<React.Fragment>
						<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}><b>IMPORTANT!</b></Typography>
						<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}>This is the random generated secret you will need to reveal in order to validate the transaction later:</Typography>
						<Typography variant="body1" style={{ display: 'block', margin: 'auto' }}><b>{secret}</b></Typography>
					</React.Fragment>
				)}
				<Button
					variant="contained"
					color="primary"
					fullWidth
					onClick={() => this.swapInPlasma(transactionToAccept.swappingSlot, transactionToAccept.slot)}
					disabled={swapping || secret}
				>
					Accept
				</Button>
			</Dialog>
		)
	}

  renderSwappingTokensSection = () => {
		const { swappingTokens, ethAccount } = this.props;
		const { secretModalOpen, validateHistoryOpen } = this.state;

    if (swappingTokens.length == 0){
      return <Typography style={{ margin: 'auto' }}  variant="body1">There are no swaps to confirm</Typography>
		}

		console.log('swappingTokens', swappingTokens)

    return(
      <React.Fragment>
        {swappingTokens.map(transaction => (
					<Paper>
						<DoubleCryptoMonCard
							token1={transaction.swappingSlot}
							owner1={ethAccount}
							actions1={[{
								title: "Validate History",
								disabled: validateHistoryOpen,
								func: this.openValidateHistoryModal(transaction.swappingSlot)
							}]}
							token2={transaction.slot}
							owner2={transaction.owner}
							actions2={[{
								title: "Validate History",
								disabled: validateHistoryOpen,
								func: this.openValidateHistoryModal(transaction.slot)
							}]}
						/>
						<Button fullWidth variant="outlined" color="primary" onClick={this.openRevealSecretModal(transaction.swappingSlot)}>Reveal Secret</Button>
					</Paper>
        ))}
      </React.Fragment>
    )
	}

	renderValidateHistoryDialog = () => {
		const { validateHistoryOpen, validatingToken } = this.state;
		return (
			(validateHistoryOpen &&
				<ValidateHistoryModal
					open={validateHistoryOpen}
					handleClose={this.closeValidateHistoryModal}
					token={validatingToken}
				/>)
		)
	};

  renderSwappingRequestsSection = () => {
		const { swappingRequests, ethAccount } = this.props;

    if (swappingRequests.length == 0){
      return <Typography style={{ margin: 'auto' }}  variant="body1">There are no swapping requests for now</Typography>
    }

    return(
      <React.Fragment>
				<Grid container direction="row" alignItems="center" spacing={2}>
					{swappingRequests.map(transaction => (
						<Grid item key={transaction.hash} xs={12} md={6}>
							<Paper style={{ padding: '1em' }}>
								<Grid container spacing={3} direction="column" alignItems="center">
									<Grid item xs={12}>
										<Typography variant="body1" style={{ maxWidth: '25em', textAlign: 'center' }}>
											<span style={{ color: toAddressColor(transaction.owner)}}>{toReadableAddress(transaction.owner)}</span> wants to swap with you!
										</Typography>
									</Grid>
									<Grid item xs={12} style={{ display: 'flex', alignItems: 'center',  }}>
										<DoubleCryptoMonCard
											token1={transaction.swappingSlot}
											owner1={ethAccount}
											token2={transaction.slot}
											owner2={transaction.owner}
										/>
									</Grid>
									<Grid item xs={8}>
										<Button variant="contained" size="large" color="primary" fullWidth onClick={this.openAcceptSwapModal(transaction)}>View</Button>
									</Grid>
								</Grid>
							</Paper>
						</Grid>
					))}
				</Grid>
      </React.Fragment>
    )
  }

  render = () => {
		const { rootChainContract } = this.props;

		if (!rootChainContract) return <div>Loading...</div>

    return (
			<div style={{ padding: '1em' }}>
				{this.renderRevealSecretDialog()}
				{this.renderAcceptSwapDialog()}
				{this.renderValidateHistoryDialog()}
				<Typography variant="h5" gutterBottom>Swaps</Typography>
				<ExpansionPanel defaultExpanded style={{ marginTop: '1em' }}>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Swapping tokens</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails>
            {this.renderSwappingTokensSection()}
					</ExpansionPanelDetails>
				</ExpansionPanel>
				<ExpansionPanel defaultExpanded>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Swapping requests</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails>
            {this.renderSwappingRequestsSection()}
					</ExpansionPanelDetails>
				</ExpansionPanel>
      </div>
    )
  }

}

const mapStateToProps = state => ({
  ethAccount: state.ethAccount,
  swappingTokens: state.swappingTokens,
  swappingRequests: state.swappingRequests,
  rootChainContract: state.rootChainContract,
})

const mapDispatchToProps = dispatch => ({
  getSwappingTokens: address => dispatch(getSwappingTokens(address)),
  getSwappingRequests: address => dispatch(getSwappingRequests(address)),
	revealSecret: (token, secret) => dispatch(revealSecret(token, secret)),
})

const withInitSwap = withInitComponent(Swap);
const connectedSwap = connect(mapStateToProps, mapDispatchToProps)(withInitSwap);
const styledSwap = withStyles(styles)(connectedSwap);
export default styledSwap;