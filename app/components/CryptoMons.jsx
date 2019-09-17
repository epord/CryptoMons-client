import React from 'react';
import Button from '@material-ui/core/Button';

import { depositToPlasma, buyCryptoMon, getCryptoMonsFrom } from '../../services/ethService';

class CryptoMons extends React.Component {

	state = { cryptoMons: [] }

	componentDidMount = () => {
		if(!web3.eth.defaultAccount) {
			delay(500).then(this.componentDidMount);
		} else {
			this.ethAccount = web3.eth.defaultAccount;
			this.getCryptoMonsFrom();
		}
	}

	getCryptoMonsFrom = async () => {
		const { cryptoMonsContract } = this.props;
		const cryptoMons = await getCryptoMonsFrom(this.ethAccount, cryptoMonsContract);
		this.setState({ cryptoMons: cryptoMons })
	};

	buyCryptoMon = async () => {
		const { cryptoMonsContract } = this.props;
		await buyCryptoMon(cryptoMonsContract);
		this.getCryptoMonsFrom()
	};

	depositToPlasma = async token => {
		const { rootChainContract, cryptoMonsContract } = this.props;
		await depositToPlasma(token, cryptoMonsContract, rootChainContract)
	};

	render = () => {
		const { cryptoMons } = this.state;

		return (
			<React.Fragment>
				<Button onClick={this.buyCryptoMon} variant="outlined" size="small">Buy CryptoMon</Button>
				<p>My CryptoMons:</p>
				{cryptoMons.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<Button onClick={() => this.depositToPlasma(token)} variant="outlined" size="small">Deposit to Plasma</Button>
					</div>
				))}
			</React.Fragment>
		);
	}

}

export default CryptoMons;