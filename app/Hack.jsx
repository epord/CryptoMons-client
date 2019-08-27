import React from 'react';

import { exitToken } from '../services/ethService';
import {sign} from "../utils/cryptoUtils";

class Hack extends React.Component {
	constructor(props) {
		super(props)
		this.state = { history: [] }
	}

	onSlotChanged = event => {
		let hackSlot = event.target.value;
		this.setState({ hackSlot: hackSlot });

		fetch(`${process.env.API_URL}/api/tokens/${hackSlot}/history`).then(response => {
			response.json().then(res => {
				this.setState({ history: res.history })
			})
		})
	};

	maliciousExit = exitData => () => {
		const { rootChain } = this.props;
		const cb = (data) => {
			exitToken(rootChain, data).then(response => {
				console.log("Exit successful: ", response);
			}).catch(console.error);
		}

		if (!exitData.signature) {
			//TODO popup explicando que se esta firmando
			console.log("signing");
			sign(exitData.lastTransactionHash).then(signature => {
				console.log("signed")
				exitData.signature = signature;
				cb(exitData);
			})
		} else {
			cb(exitData);
		}
	};

	render = () => {
		return(
			<div>
				<input
					style={{ marginLeft: '1em', minWidth: '25em' }}
					onChange={this.onSlotChanged}
					value={this.state.hackSlot || ''}
					placeholder="Slot To Hack" />

				<p>History:</p>
				{this.state.history.map(event => (
					<div key={event.transaction.minedBlock}>
						<p >
							Block: {event.transaction.minedBlock } -
							from: {event.transaction.owner} -
							to: {event.transaction.recipient}</p>
						{event.transaction.recipient.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
							<button onClick={this.maliciousExit(event.exitData)}>HACK!</button>
						}
					</div>
				))}

			</div>
		)
	}
}

export default Hack;