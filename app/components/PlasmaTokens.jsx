import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';

import { exitDepositToken, exitToken } from '../../services/ethService';
import { getOwnedTokens, transferInPlasma, getExitData } from '../../services/plasmaServices';

class PlasmaTokens extends React.Component {

	state = { plasmaTokens: [] }

	componentDidMount = () => {
		if(!web3.eth.defaultAccount) {
			delay(500).then(this.componentDidMount);
		} else {
			this.ethAccount = web3.eth.defaultAccount;
			this.getPlasmaTokensFrom()
		}
	}

	getPlasmaTokensFrom = async () => {
		const tokens = await getOwnedTokens(this.ethAccount, false);
		this.setState({ plasmaTokens: tokens });
	};

	transferInPlasma = async token => {
		const fieldKey = `transferAddress${token}`;
		const receiverAddress = this.state[fieldKey];
		console.log(`Transfering ${token} to ${receiverAddress}`);

    await transferInPlasma(token, receiverAddress);
		console.log("Successful Submission, wait for mining");
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

	onTransferAddressChanged = token => event => {
		const fieldKey = `transferAddress${token}`;
		this.setState({ [fieldKey]: event.target.value });
	};

	render = () => {
		const { plasmaTokens } = this.state;
		return (
			<React.Fragment>
				<p>My Plasma Tokens:</p>
				<Grid container spacing={3} alignContent="center" alignItems="center">
					{plasmaTokens.map(token => (
						<React.Fragment key={token}>
							<Grid item xs={2}>
								<p style={{ display: "inline" }}>{token}</p>
							</Grid>
							<Grid item xs={3}>
								<TextField
									label="Transfer to"
									fullWidth
									onChange={this.onTransferAddressChanged(token)}
									value={this.state[`transferAddress${token}`] || ''}
									placeholder="Address" />
								</Grid>
							<Grid item xs={7}>
								<Button onClick={() => this.transferInPlasma(token)} variant="outlined" size="small">Transfer</Button>
								<Button onClick={() => this.exitToken(token)} variant="outlined" size="small">Exit</Button>
							</Grid>
						</React.Fragment>
					))}
				</Grid>
			</React.Fragment>
		);
	}

}

export default PlasmaTokens;