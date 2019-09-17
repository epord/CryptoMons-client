import React from 'react';
import { connect } from "react-redux";

import Button from '@material-ui/core/Button';

import { depositToPlasma, buyCryptoMon, getCryptoMonsFrom } from '../../services/ethService';

import { gotEthAccount, gotCryptoMons } from '../redux/actions'

class CryptoMons extends React.Component {

	buyCryptoMon = async () => {
		const { cryptoMonsContract, ethAccount, gotCryptoMons } = this.props;
		buyCryptoMon(cryptoMonsContract)
			.then(() => getCryptoMonsFrom(ethAccount, cryptoMonsContract))
			.then(cryptoMons => gotCryptoMons(cryptoMons));
	};

	depositToPlasma = async token => {
		const { rootChainContract, cryptoMonsContract } = this.props;
		await depositToPlasma(token, cryptoMonsContract, rootChainContract)
	};

	render = () => {
		const { myCryptoMons } = this.props;

		return (
			<React.Fragment>
				<Button onClick={this.buyCryptoMon} variant="outlined" size="small">Buy CryptoMon</Button>
				<p>My CryptoMons:</p>
				{myCryptoMons.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<Button onClick={() => this.depositToPlasma(token)} variant="outlined" size="small">Deposit to Plasma</Button>
					</div>
				))}
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		ethAccount: state.ethAccount,
		myCryptoMons: state.myCryptoMons
	};
}

const mapDispatchToProps = dispatch => {
  return {
		gotCryptoMons: cryptoMons => dispatch(gotCryptoMons(cryptoMons))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(CryptoMons);