import React from 'react';
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

import CryptoMonCard from './common/CryptoMonCard.jsx';

import { getSwappingTokens, revealSecret } from '../redux/actions';

const styles = theme => ({
	dialogPaper: {
		width: '25em',
	},
});

class Swap extends React.Component {

  state = {
    secretModalOpen: false
  }

  componentDidMount() {
    const { getSwappingTokens } = this.props;
		const interval = setInterval(() => {
			if (web3.eth.defaultAccount) {
				this.ethAccount = web3.eth.defaultAccount;
        getSwappingTokens(web3.eth.defaultAccount).then(console.log)
				clearInterval(interval);
			}
		}, 100);
  }


	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
	}

	handleTokenChangeInReveal = event => {
		const { tokenToReveal } = this.state;
		const swappingTokenReveal = event.target.value;
		const savedSecret = localStorage.getItem(`swap_${tokenToReveal}_${swappingTokenReveal}`);
		this.setState({ swappingTokenReveal, secretToReveal: savedSecret });
	}
	renderRevealSecretDialog = () => {
		const { secretModalOpen, tokenToReveal, revealingSecret, swappingTokenReveal } = this.state;
		const { classes } = this.props;
		return (
			<Dialog onClose={this.closeRevealSecretModal} open={secretModalOpen} classes={{ paper: classes.dialogPaper }}>
				<DialogTitle>Reveal secret</DialogTitle>
				<Grid container style={{ padding: '1em' }}>
					<Grid item xs={12}>
						<TextField
							label="Swapping token"
							fullWidth
							onChange={this.handleTokenChangeInReveal}
							value={swappingTokenReveal || ''}
							placeholder="Token" />
					</Grid>
					<Grid item xs={12}>
						<TextField
							label="Secret"
							fullWidth
							onChange={this.handleChange('secretToReveal')}
							value={this.state.secretToReveal || ''} />
					</Grid>
					<Grid item xs={12} style={{ padding: '1em' }}>
						<Button disabled={revealingSecret} color="primary" fullWidth onClick={() => this.revealSecret(tokenToReveal)} variant="outlined" size="small">Reveal</Button>
					</Grid>
				</Grid>
			</Dialog>
		)
	}

  revealSecret = () => {
    console.log('reveal')
  }

  renderSwappingTokensSection = () => {
    const { swappingTokens } = this.props;

    if (swappingTokens.length == 0){
      return <Typography style={{ margin: 'auto' }}  variant="body1">You do not have any Plasma token. Deposit one of your CryptoMons once you have one!</Typography>
    }

    return(
      <React.Fragment>
        {swappingTokens.map(token => (
          <CryptoMonCard token={token} onRevealSecretClicked={() => this.openRevealSecretModal(token)}/>
        ))}
      </React.Fragment>
    )
  }

	revealSecret = async () => {
		const { tokenToReveal, secretToReveal } = this.state;
		const { revealSecret } = this.props;

		this.setState({ revealingSecret: true });
		revealSecret(tokenToReveal, secretToReveal)
			.then(() => this.setState({ revealingSecret: false }))
  }

	openRevealSecretModal = token => this.setState({ secretModalOpen: true, tokenToReveal: token });

	closeRevealSecretModal= () => this.setState({ secretModalOpen: false });

  render = () => {
    return (
			<div style={{ padding: '1em' }}>
      {this.renderRevealSecretDialog()}
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
            <Typography style={{ margin: 'auto' }}  variant="body1">You do not have any Plasma token. Deposit one of your CryptoMons once you have one!</Typography>
					</ExpansionPanelDetails>
				</ExpansionPanel>
      </div>
    )
  }

}

const mapStateToProps = state => ({
  swappingTokens: state.swappingTokens,
})

const mapDispatchToProps = dispatch => ({
  getSwappingTokens: address => dispatch(getSwappingTokens(address)),
	revealSecret: (token, secret) => dispatch(revealSecret(token, secret)),
})

const connectedSwap = connect(mapStateToProps, mapDispatchToProps)(Swap);
const styledSwap = withStyles(styles)(connectedSwap);
export default styledSwap;