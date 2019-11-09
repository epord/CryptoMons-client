import React from 'react';
import {connect} from "react-redux";

import InitComponent from './InitComponent.jsx';
import withInitComponent from './withInitComponent.js';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Dialog from '@material-ui/core/Dialog';

import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';

import {getPlasmaCoinId} from '../../../services/ethService';
import {toAddressColor, toReadableAddress} from '../../../utils/utils';
import {getCryptoMonFromId} from '../../../services/pokemonService.js';
import { pokedex } from '../../../utils/pokedex.js';
import { renderGenderIcon } from '../../../utils/pokeUtils.js';

class CryptoMonCard extends InitComponent {

	state = { }

	init = async () => {
		const { rootChainContract, plasmaToken, cryptoMonsContract } = this.props;
		const token = this.props.token || await getPlasmaCoinId(plasmaToken, rootChainContract);

		const { cryptoMonData, cryptoMonInstance } = await getCryptoMonFromId(token, cryptoMonsContract)
		this.setState({ cryptoMonData, cryptoMonInstance

		})
	}

	openDialog = () => this.setState({ dialogOpen: true });

	closeDialog = () => this.setState({ dialogOpen: false });

	renderStatsBar = (value, maxValue) => {
		return (
			<React.Fragment>
				<div
					style={{
						display: 'inline-flex',
						marginLeft: '1em',
						backgroundColor: 'lightblue',
						height: '1em',
						width: `${(value)/maxValue * 60}%` }}
					/>
				<div
					style={{
						display: 'inline-flex',
						backgroundColor: 'aliceblue',
						marginRight: '1em',
						height: '1em',
						width: `${60 - (value)/maxValue * 60}%` }}
					/>
			</React.Fragment>
		)
	}

	renderStatsDialog = () => {
		const { cryptoMonData, cryptoMonInstance, dialogOpen } = this.state;
		if (!cryptoMonData || !cryptoMonInstance) return;
	
		const { stats, IVs } = cryptoMonInstance;
		const referenceValue = Math.max(400, stats.atk, stats.def, stats.hp, stats.spAtk, stats.spDef, stats.speed);
		return (
      <Dialog open={Boolean(dialogOpen)} onClose={this.closeDialog}>
				<div style={{ padding: '1em' }}>
					<Typography variant="h6">Stats</Typography>
					<Grid container>
						<Grid item xs={12}>
							<Typography style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>Attack:</b>{stats.atk} </Typography>
							{this.renderStatsBar(stats.atk, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.atk/31 * 100)}%</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography  style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>Defense:</b>{stats.def}</Typography>
							{this.renderStatsBar(stats.def, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.def/31 * 100)}%</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography  style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>HP:</b>{stats.hp}</Typography>
							{this.renderStatsBar(stats.hp, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.hp/31 * 100)}%</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography  style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>Sp. Attack:</b>{stats.spAtk}</Typography>
							{this.renderStatsBar(stats.spAtk, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.spAtk/31 * 100)}%</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography  style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>Sp. Defense:</b>{stats.spDef}</Typography>
							{this.renderStatsBar(stats.spDef, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.spDef/31 * 100)}%</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography  style={{ display: 'inline-block', width: '25%' }} variant="body1"><b>Speed:</b>{stats.speed}</Typography>
							{this.renderStatsBar(stats.speed, referenceValue)}
							<Typography style={{ display: 'inline' }} variant="body1">{Math.round(IVs.speed/31 * 100)}%</Typography>
						</Grid>
					</Grid>
				</div>
      </Dialog>
		)

	}

	render = () => {
		const { token, plasmaToken, exiting, exited, swapping, challengeable, challenged, owner,
			actions } = this.props;
		const { cryptoMonData, cryptoMonInstance } = this.state;
		const { imageUrl, type1, type2, name } = cryptoMonData || {};
		const { isShiny, gender } = cryptoMonInstance || {};

		return (
			<React.Fragment>
				{this.renderStatsDialog()}
				<Card style={{ maxWidth: '12em', boxShadow: isShiny ? '0 0 10px gold' : null}}>
					<CardActionArea onClick={this.openDialog}>
						<img
							src={imageUrl || null}
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
						<Grid item xs={12}>
							{name && (
								<Typography variant="caption" style={{ marginTop: "0.5em", textAlign: 'center', width: "100%", display: "block" }} gutterBottom>
									{name}{renderGenderIcon(gender)}
								</Typography>
							)}
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
			</React.Fragment>
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