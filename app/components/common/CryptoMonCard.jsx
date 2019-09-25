import React from 'react';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';

class CryptoMonCard extends React.Component {

	render = () => {
		const { token, exiting, exited, challengeable, onDepositClicked, onTransferClicked,
			onExitClicked, onFinalizeExitClick, onChallengeBeforeClick, onChallengeBetweenClick,
			onChallengeAfterClick, onWithdrawClick } = this.props;

		return (
			<Card style={{ maxWidth: '12em', minHeight: '19em' }}>
				<CardActionArea>
					<img
						src="http://www.gifs-animados.es/clip-art/caricaturas/pokemon/gifs-animados-pokemon-8118017.jpg"
						style={{ width: '100%' }} />
				</CardActionArea>
				<Grid container>
					<Grid item xs={12}>
						<Typography variant="caption" gutterBottom>ID: {token}</Typography>
					</Grid>
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
				{onExitClicked && <Button fullWidth onClick={onExitClicked} variant="outlined" size="small">Exit</Button>}
				{onFinalizeExitClick && <Button fullWidth onClick={onFinalizeExitClick} variant="outlined" size="small">Finalize Exit</Button>}
				{onChallengeBeforeClick && <Button fullWidth onClick={onChallengeBeforeClick} variant="outlined" size="small">Challenge Before</Button>}
				{onChallengeBetweenClick && <Button fullWidth onClick={onChallengeBetweenClick} variant="outlined" size="small">Challenge Between</Button>}
				{onChallengeAfterClick && <Button fullWidth onClick={onChallengeAfterClick} variant="outlined" size="small">Challenge After</Button>}
				{onWithdrawClick && <Button fullWidth onClick={onWithdrawClick} variant="outlined" size="small">Withdraw</Button>}

			</Card>
		)
	}
}

export default CryptoMonCard;