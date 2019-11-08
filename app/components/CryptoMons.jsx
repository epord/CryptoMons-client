import React from 'react';
import {connect} from "react-redux";

import {withSnackbar} from 'notistack';

import InitComponent from "./common/InitComponent.jsx"
import withInitComponent from "./common/withInitComponent.js"

import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import {depositToPlasma} from '../../services/ethService';
import {buyCryptoMon, getCryptoMonsFrom} from '../redux/actions';


class CryptoMons extends InitComponent {

	state = {}

	init = () => {
		const { cryptoMonsContract, ethAccount, getCryptoMonsFrom } = this.props;
		getCryptoMonsFrom(ethAccount, cryptoMonsContract);
	}

	buyCryptoMon = () => {
		const { cryptoMonsContract, ethAccount, buyCryptoMon, enqueueSnackbar } = this.props;
		buyCryptoMon(ethAccount, cryptoMonsContract).then(() => {
			enqueueSnackbar('Cryptomon successfully bought!', { variant: 'success' })
		})
	};

	depositToPlasma = token => () => {
		const { rootChainContract, cryptoMonsContract, enqueueSnackbar } = this.props;
		depositToPlasma(token, cryptoMonsContract, rootChainContract).then(() => {
			enqueueSnackbar('Deposit successful', { variant: 'success' })
		})
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
							<CryptoMonCard
								token={token}
								 actions={[
									 {
									 	  title: "Deposit",
										 	func: this.depositToPlasma(token)
									 }
								 ]} />
						</Grid>
					))}
				</Grid>
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		myCryptoMons: state.myCryptoMons,
		rootChainContract: state.rootChainContract,
		ethAccount: state.ethAccount,
		cryptoMonsContract: state.cryptoMonsContract
	};
}

const mapDispatchToProps = dispatch => {
  return {
		buyCryptoMon: (address, cryptoMonsContract) => dispatch(buyCryptoMon(address, cryptoMonsContract)),
		getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(withSnackbar(withInitComponent(CryptoMons)));