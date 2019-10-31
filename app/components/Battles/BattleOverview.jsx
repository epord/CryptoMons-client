import React from 'react';
import {connect} from "react-redux";

import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";

import DoubleCryptoMonCard from '../common/DoubleCryptoMonCard.jsx';

import {getBattleTokens} from '../../../services/ethService';
import {toAddressColor, toReadableAddress} from '../../../utils/utils';

class BattleOverview extends React.Component {

  state = {}

  componentDidMount = async () => {
    const { plasmaTurnGameContract, channel } = this.props;
    const participantsTokens = await getBattleTokens(channel.channelId, plasmaTurnGameContract);

    this.setState({ participantsTokens });
  }

  render = () => {
    const { channel, actions } = this.props;
    const { participantsTokens } = this.state;

    if (!participantsTokens) {
      return (
      <div>
        Loading battle between <span style={{ color: toAddressColor(channel.players[0])}}>{toReadableAddress(channel.players[0])}</span> and <span style={{ color: toAddressColor(channel.players[1])}}>{toReadableAddress(channel.players[1])}</span>
      </div>
      )
    }

    const participants = Object.keys(participantsTokens);
    const tokens = Object.values(participantsTokens);

    return (
      <Paper style={{ display: 'table-caption', padding: '1em' }}>
        <DoubleCryptoMonCard token1={tokens[0]} owner1={participants[0]} token2={tokens[1]} owner2={participants[1]} />
        {actions && actions.map(action =>
          <Button
            style={{ marginTop: '0.5em' }}
            key={action.title}
            disabled={action.disabled}
            fullWidth
            onClick={action.func}
            variant="outlined"
            size="small"
          >
            {action.title}
          </Button>
        )}
      </Paper>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount,
	plasmaCMContract: state.plasmaCMContract,
	plasmaTurnGameContract: state.plasmaTurnGameContract,
	rootChainContract: state.rootChainContract,
	cryptoMonsContract: state.cryptoMonsContract,
 });

const mapDispatchToProps = dispatch => ({ });

export default connect(mapStateToProps, mapDispatchToProps)(BattleOverview);