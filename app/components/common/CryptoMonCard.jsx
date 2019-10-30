import React from 'react';
import InitComponent from './InitComponent.jsx';

import {connect} from "react-redux";

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';

import {getCryptomon, getPlasmaCoinId, getPokemonData} from '../../../services/ethService';

import {getTypeData} from '../../../utils/pokeUtils';
import { toReadableAddress, toAddressColor } from '../../../utils/utils';

class CryptoMonCard extends InitComponent {

	state = { }

	init = async () => {
		const { rootChainContract, plasmaToken, cryptoMonsContract } = this.props;
		const token = this.props.token || await getPlasmaCoinId(plasmaToken, rootChainContract);

		getCryptomon(token, cryptoMonsContract).then(ans => {
			var pad = "000";
			var id = (pad + ans.id).slice(-pad.length);
			const imageUrl = `https://raw.githubusercontent.com/fanzeyi/pokemon.json/master/images/${id}.png`;
			this.setState({ img: imageUrl, isShiny: ans.isShiny });

			getPokemonData(ans.id, cryptoMonsContract).then(data => {
				const type1 = getTypeData(data.type1);
				const type2 = getTypeData(data.type2);
				this.setState({ type1, type2 })
			})

		})
	}

	render = () => {
		const { token, plasmaToken, exiting, exited, challengeable, challenged, owner,
			// TODO: migrate all these clicks to actions
			onDepositClicked, onTransferClicked,
			onExitClicked, onFinalizeExitClick, onChallengeBeforeClick, onChallengeBetweenClick,
			onChallengeAfterClick, onWithdrawClick, onSwapClicked, onRevealSecretClicked, onChallengeBeforeResponded,
			onStartBattleClicked,
			// END TODO
			actions
		} = this.props;
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
							<Typography variant="caption" style={{ textAlign: 'center' }} gutterBottom>Coin: {token}</Typography>
						</Grid>
					)}
					{plasmaToken && (
						<React.Fragment>
							<Grid item xs={12}>
								<Typography variant="caption" style={{ textAlign: 'center' }} gutterBottom>ID: {plasmaToken}</Typography>
							</Grid>
							{owner && (
								<Grid item xs={12}>
									<Typography variant="caption" style={{ textAlign: 'center' }} gutterBottom>Owner: <span style={{ color: toAddressColor(owner)}}>{toReadableAddress(owner)}</span></Typography>
								</Grid>
							)}
						</React.Fragment>
					)}
					{exiting && (
						<Grid item xs={12}>
							<ExitToAppIcon fontSize="small" style={{ color: 'rgb(245, 155, 66)' }} />
							<Typography variant="subtitle1" style={{ color: 'rgb(245, 155, 66)', display: 'inline' }}>
								Exiting
							</Typography>
						</Grid>
					)}
					{challengeable && (
						<Grid item xs={12}>
							<WarningIcon fontSize="small" style={{ color: 'red' }} />
							<Typography variant="subtitle1" style={{ color: 'red', display: 'inline' }}>
								Challengeable
							</Typography>
						</Grid>
					)}
					{challenged && (
						<Grid item xs={12}>
							<WarningIcon fontSize="small" style={{ color: 'red' }} />
							<Typography variant="subtitle1" style={{ color: 'red', display: 'inline' }}>
								Challenged
							</Typography>
						</Grid>
					)}
					{exited && (
						<Grid item xs={12}>
						<CheckCircleIcon fontSize="small" style={{ color: 'green' }} />
						<Typography variant="subtitle1" style={{ color: 'green', display: 'inline' }}>
							Exit Successful
						</Typography>
						</Grid>
					)}
				</Grid>
				{onDepositClicked && <Button fullWidth size="small" variant="outlined" onClick={onDepositClicked}>Deposit to Plasma</Button>}
				{onTransferClicked && <Button fullWidth onClick={onTransferClicked} variant="outlined" size="small">Transfer</Button>}
				{onSwapClicked && <Button fullWidth onClick={onSwapClicked} variant="outlined" size="small">Swap</Button>}
				{onExitClicked && <Button fullWidth onClick={onExitClicked} variant="outlined" size="small">Exit</Button>}
				{onFinalizeExitClick && <Button fullWidth onClick={onFinalizeExitClick} variant="outlined" size="small">Finalize Exit</Button>}
				{onChallengeBeforeClick && <Button fullWidth onClick={onChallengeBeforeClick} variant="outlined" size="small">Challenge Before</Button>}
				{onChallengeBetweenClick && <Button fullWidth onClick={onChallengeBetweenClick} variant="outlined" size="small">Challenge Between</Button>}
				{onChallengeAfterClick && <Button fullWidth onClick={onChallengeAfterClick} variant="outlined" size="small">Challenge After</Button>}
				{onWithdrawClick && <Button fullWidth onClick={onWithdrawClick} variant="outlined" size="small">Withdraw</Button>}
				{onRevealSecretClicked && <Button fullWidth onClick={onRevealSecretClicked} variant="outlined" size="small">Reveal Secret</Button>}
				{onChallengeBeforeResponded && <Button fullWidth onClick={onChallengeBeforeResponded} variant="outlined" size="small">Respond Challenge</Button>}
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

export default connect(mapStateToProps, mapDispatchToProps)(CryptoMonCard);