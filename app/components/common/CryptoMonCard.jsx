import React from 'react';
import {connect} from "react-redux";

import InitComponent from './InitComponent.jsx';
import withInitComponent from './withInitComponent.js';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';

import {getPlasmaCoinId} from '../../../services/ethService';
import {toAddressColor, toReadableAddress} from '../../../utils/utils';
import {getCryptoMonFromId} from '../../../services/pokemonService.js';

class CryptoMonCard extends InitComponent {

	state = { }

	init = async () => {
		const { rootChainContract, plasmaToken, cryptoMonsContract } = this.props;
		const token = this.props.token || await getPlasmaCoinId(plasmaToken, rootChainContract);

		const { cryptoMonData, cryptoMonInstance } = await getCryptoMonFromId(token, cryptoMonsContract)

		this.setState({
			img: cryptoMonData.imageUrl,
			isShiny: cryptoMonInstance.isShiny,
			type1: cryptoMonData.type1,
			type2: cryptoMonData.type2,
		})
	}

	render = () => {
		const { token, plasmaToken, exiting, exited, swapping, challengeable, challenged, owner,
			actions } = this.props;
		const { img, type1, type2, isShiny } = this.state
		return (
			<Card style={{ maxWidth: '12em', boxShadow: isShiny ? '0 0 10px gold' : null}}>
				<CardActionArea>
					<img
						src={img || null}
						style={{ width: '100%', filter: isShiny ? 'contrast(160%) hue-rotate(90deg)' : null }} />
				</CardActionArea>
				<Grid container>
					<Grid container style={{ flexGrow: '1', justifyContent: "space-around"}}>
						<Grid item>
							{type1 && <img src={type1.image || null} style={{ display: 'block', margin: 'auto' }} />}
						</Grid>
						{type2 && type2.name !== 'Unknown' &&
						<Grid item>
							<img src={type2.image || null} style={{ display: 'block', margin: 'auto' }} />
						</Grid>
						}
					</Grid>
					{token && (
						<Grid item xs={12}>
							<Typography variant="caption" style={{ marginTop: "0.5em", textAlign: 'center', width: "100%", display: "block" }} gutterBottom>
								Coin: {token}
							</Typography>
						</Grid>
					)}
					{plasmaToken && (
						<React.Fragment>
							<Grid item xs={12}>
								<Typography variant="caption" style={{ marginTop: "0.5em", textAlign: 'center', width: "100%", display: "block" }} gutterBottom>
									ID: {plasmaToken}
								</Typography>
							</Grid>
							{owner && (
								<Grid item xs={12}>
									<Typography variant="caption" style={{ textAlign: 'center', width: "100%", display: "block" }} gutterBottom>
										Owner: <span style={{ color: toAddressColor(owner)}}>{toReadableAddress(owner)}</span>
									</Typography>
								</Grid>
							)}
						</React.Fragment>
					)}
					{exiting && (
						<Grid style={{display: "flex", justifyContent: "center", alignItems: "center", margin: "0.3em", marginTop: "0",}} item xs={12}>
							<ExitToAppIcon fontSize="small" style={{ margin: "0.2em", color: 'rgb(245, 155, 66)' }} />
							<Typography variant="subtitle1" style={{ color: 'rgb(245, 155, 66)', display: 'inline' }}>
								Exiting
							</Typography>
						</Grid>
					)}
					{challengeable && (
						<Grid style={{display: "flex", justifyContent: "center", alignItems: "center", margin: "0.3em", marginTop: "0",}} item xs={12}>
							<WarningIcon fontSize="small" style={{ margin: "0.2em", color: 'red' }} />
							<Typography variant="subtitle1" style={{ color: 'red', display: 'inline' }}>
								Challengeable
							</Typography>
						</Grid>
					)}
					{challenged && (
						<Grid style={{display: "flex", justifyContent: "center", alignItems: "center", margin: "0.3em", marginTop: "0",}} item xs={12}>
							<WarningIcon fontSize="small" style={{ margin: "0.2em", color: 'red' }} />
							<Typography variant="subtitle1" style={{ color: 'red', display: 'inline' }}>
								Challenged
							</Typography>
						</Grid>
					)}
					{exited && (
						<Grid style={{display: "flex", justifyContent: "center", alignItems: "center", margin: "0.3em", marginTop: "0",}} item xs={12}>
						<CheckCircleIcon fontSize="small" style={{ margin: "0.2em", color: 'green' }} />
						<Typography variant="subtitle1" style={{ color: 'green', display: 'inline' }}>
							Exit Successful
						</Typography>
						</Grid>
					)}
					{swapping && (
						<Grid style={{display: "flex", justifyContent: "center", alignItems: "center", margin: "0.3em", marginTop: "0",}} item xs={12}>
							<CompareArrowsIcon fontSize="small" style={{ margin: "0.2em", color: 'orange' }} />
							<Typography variant="subtitle1" style={{ color: 'orange', display: 'inline' }}>
								Swapping
							</Typography>
						</Grid>
					)}
				</Grid>
				{actions && actions.map(action =>
					<Button key={action.title} disabled={action.disabled} fullWidth onClick={action.func} variant="outlined" size="small">{action.title}</Button>)}
			</Card>
		)
	}
}



const mapStateToProps = state => ({
  cryptoMonsContract: state.cryptoMonsContract,
	rootChainContract: state.rootChainContract,
	ethAccount: state.ethAccount,
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withInitComponent(CryptoMonCard));