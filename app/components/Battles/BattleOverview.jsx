import React from 'react';
import {connect} from "react-redux";

import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";

import DoubleCryptoMonCard from '../common/DoubleCryptoMonCard.jsx';

import {getBattleTokens} from '../../../services/ethService';
import {battleChallengeAfter, battleChallengeBetween, battleChallengeBefore} from '../../../services/battleChallenges';
import {toAddressColor, toReadableAddress} from '../../../utils/utils';

class BattleOverview extends React.Component {

  state = {}

  componentDidMount = async () => {
    const { plasmaTurnGameContract, channel, ethAccount, plasmaTokens } = this.props;
    const participantsTokens = await getBattleTokens(channel.channelId, plasmaTurnGameContract);

    const participants = Object.values(participantsTokens).map(v => v.address);
    const tokens = Object.values(participantsTokens).map(v => v.cryptoMon);
    const is1challengeable = participants[0] !== ethAccount && plasmaTokens.includes(tokens[0]);
    const is2challengeable = participants[1] !== ethAccount && plasmaTokens.includes(tokens[1]);

    this.setState({ participants, tokens, is1challengeable, is2challengeable });
  }

  challengeAfter = (channel, index) => () => {
    const {plasmaCMContract} = this.props;
    battleChallengeAfter(channel, index ,plasmaCMContract)
  }

  challengeBetween = (channel, index) => () => {
    const {plasmaCMContract} = this.props;
    battleChallengeBetween(channel, index ,plasmaCMContract)
  }

  challengeBefore = (channel, index) => () => {
    const {plasmaCMContract} = this.props;
    battleChallengeBefore(channel, index ,plasmaCMContract)
  }

  getChallengeActionsFor = (channel, index) => {
    return [{
        title: 'Challenge After',
        func: this.challengeAfter(channel, index),
      }, {
        title: 'Challenge Between',
        func: this.challengeBetween(channel, index),
      }, {
        title: 'Challenge Before',
        func: this.challengeBefore(channel, index),
      }]
  }

  render = () => {
    const { channel, actions } = this.props;
    const { participants, tokens, is1challengeable, is2challengeable } = this.state;

    if (!participants) {
      return (
      <div>
        Loading battle between <span style={{ color: toAddressColor(channel.players[0])}}>{toReadableAddress(channel.players[0])}</span> and <span style={{ color: toAddressColor(channel.players[1])}}>{toReadableAddress(channel.players[1])}</span>
      </div>
      )
    }

    return (
      <Paper style={{ display: 'table-caption', padding: '1em' }}>
        <DoubleCryptoMonCard
        token1={tokens[0]}
        owner1={participants[0]}
        token2={tokens[1]}
        owner2={participants[1]}
        actions1={is1challengeable ? this.getChallengeActionsFor(channel, 0) : []}
        actions2={is2challengeable ? this.getChallengeActionsFor(channel, 1) : []}
        />
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
  plasmaTokens: state.plasmaTokens
 });

const mapDispatchToProps = dispatch => ({ });

export default connect(mapStateToProps, mapDispatchToProps)(BattleOverview);