import React from 'react';
import { connect } from "react-redux";

import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import { depositToPlasma, buyCryptoMon } from '../../services/ethService';
import { getCryptoMonsFrom } from '../redux/actions';


class CryptoMons extends React.Component {

	componentDidMount() {
		const { cryptoMonsContract, ethAccount, getCryptoMonsFrom } = this.props;
		getCryptoMonsFrom(ethAccount, cryptoMonsContract);
	}

	buyCryptoMon = async () => {
		const { cryptoMonsContract, ethAccount, getCryptoMonsFrom } = this.props;
		buyCryptoMon(cryptoMonsContract)
			.then(() => getCryptoMonsFrom(ethAccount, cryptoMonsContract));
	};

	depositToPlasma = async token => {
		const { rootChainContract, cryptoMonsContract } = this.props;
		await depositToPlasma(token, cryptoMonsContract, rootChainContract)
	};

	render = () => {
		const { myCryptoMons } = this.props;

		if (myCryptoMons.length === 0) {
			return (
				<React.Fragment>
					<Grid container direction="column" style={{ margin: 'auto' }} alignItems="center">
						<Grid item>
							<Typography variant="body1">You do not have any CryptoMon. Click the button below to buy one!</Typography>
						</Grid>
						<Grid item>
							<Button onClick={this.buyCryptoMon} style={{ marginBottom: '1em' }} variant="outlined" size="small">Buy CryptoMon</Button>
						</Grid>
					</Grid>
				</React.Fragment>
			)
		}

		return (
			<React.Fragment>
				<Grid container spacing={3}>
					{myCryptoMons.map(token => (
						<Grid item key={token}>
							<CryptoMonCard token={token} onDepositClicked={() => this.depositToPlasma(token)} />
						</Grid>
					))}
				</Grid>
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		myCryptoMons: state.myCryptoMons
	};
}

const mapDispatchToProps = dispatch => {
  return {
		getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(CryptoMons);