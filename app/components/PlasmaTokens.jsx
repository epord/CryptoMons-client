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

import { exitDepositToken, exitToken } from '../../services/ethService';
import { transferInPlasma, getExitData } from '../../services/plasmaServices';

const styles = theme => ({
	dialogPaper: {
		minWidth: '20em',
	},
});

class PlasmaTokens extends React.Component {

	state = {
		modalOpen: false
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
		const { plasmaTokens, exitingTokens } = this.props;
		console.log(exitingTokens)
		return (
			<React.Fragment>
				{this.renderTransferDialog()}
				<p>My Plasma Tokens:</p>
				<Grid container spacing={3} alignContent="center" alignItems="center">
					{plasmaTokens.map(token => (
						<React.Fragment key={token}>
							<Grid item xs={2} key={token}>
								<Card>
									<CardActionArea>
										<img
											src="http://www.gifs-animados.es/clip-art/caricaturas/pokemon/gifs-animados-pokemon-8118017.jpg"
											style={{ width: '100%' }} />
										<CardContent>
											<Typography variant="subtitle1">ID: {token}</Typography>
										</CardContent>
									</CardActionArea>
									<CardActions>
										<Button fullWidth onClick={() => this.openTransferModal(token)} variant="outlined" size="small">Transfer</Button>
										<Button fullWidth onClick={() => this.exitToken(token)} variant="outlined" size="small">Exit</Button>
									</CardActions>
								</Card>
							</Grid>
						</React.Fragment>
					))}
					{exitingTokens.map(token => (
						<React.Fragment key={token}>
							<Grid item xs={2} key={token}>
								<Card>
									<CardActionArea>
										<img
											src="http://www.gifs-animados.es/clip-art/caricaturas/pokemon/gifs-animados-pokemon-8118017.jpg"
											style={{ width: '100%' }} />
										<CardContent>
											<Grid conainer>
												<Grid item xs={12}>
													<Typography variant="subtitle1">ID: {token}</Typography>
												</Grid>
												<Grid item xs={12}>
													<ExitToAppIcon ftonSize="small" style={{ color: 'rgb(245, 155, 66)' }} />
													<Typography variant="subtitle1" style={{ color: 'rgb(245, 155, 66)', display: 'inline' }}>
														Exiting
													</Typography>
												</Grid>
											</Grid>
										</CardContent>
									</CardActionArea>
									<CardActions>
										<Button fullWidth onClick={() => this.openTransferModal(token)} variant="outlined" size="small">Transfer</Button>
										<Button fullWidth onClick={() => this.exitToken(token)} variant="outlined" size="small">Exit</Button>
									</CardActions>
								</Card>
							</Grid>
						</React.Fragment>
					))}
				</Grid>
			</React.Fragment>
		);
	}

}

const mapStateToProps = state => {
	return {
		plasmaTokens: state.plasmaTokens,
		exitingTokens: state.exitingTokens,
	};
}

const mapDispatchToProps = dispatch => {
  return { };
}

const connectedPlasmaTokens = connect(mapStateToProps, mapDispatchToProps)(PlasmaTokens);
const styledPlasmaTokens = withStyles(styles)(connectedPlasmaTokens);
export default styledPlasmaTokens;