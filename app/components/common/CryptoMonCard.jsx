import React from 'react';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

class CryptoMonCard extends React.Component {

	render = () => {
		const { cryptoMon } = this.props;

		return (
			<Card>
				<CardActionArea>
					<CardMedia
						image="/static/images/cards/contemplative-reptile.jpg"
					/>
					<CardContent>
						<Typography variant="subtitle1">ID: {cryptoMon}</Typography>
					</CardContent>
				</CardActionArea>
				<CardActions>
					<Button size="small" color="primary">
						Share
					</Button>
					<Button size="small" color="primary">
						Learn More
					</Button>
				</CardActions>
			</Card>
		)

	}
}

export default CryptoMonCard;