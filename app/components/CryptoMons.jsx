import React from 'react';
import { connect } from "react-redux";

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import { depositToPlasma, buyCryptoMon, getCryptoMonsFrom } from '../../services/ethService';
import { gotCryptoMons } from '../redux/actions'


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
				<Grid container spacing={3}>
					{myCryptoMons.map(token => (
						<Grid item xs={3} key={token}>
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
									<Button
										fullWidth
										size="small"
										color="primary"
										onClick={() => this.depositToPlasma(token)}>
										Deposit to Plasma
									</Button>
								</CardActions>
							</Card>
						</Grid>
					))}
				</Grid>
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