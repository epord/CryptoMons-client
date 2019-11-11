import React from 'react';
import {connect} from "react-redux";
import {withSnackbar} from "notistack";

import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";

import DoubleCryptoMonCard from '../common/DoubleCryptoMonCard.jsx';

import {getBattleTokens} from '../../../services/ethService';
import {battleChallengeAfter, battleChallengeBefore, battleChallengeBetween} from '../../../services/battleChallenges';
import {toAddressColor, toReadableAddress, fallibleSnackPromise} from '../../../utils/utils';
import { Typography } from '@material-ui/core';

class BattleOverview extends React.Component {

  state = {}

  componentDidMount = async () => {
    const { plasmaTurnGameContract, channel } = this.props;
    const participantsTokens = await getBattleTokens(channel.channelId, plasmaTurnGameContract);

    const participants = Object.values(participantsTokens).map(v => v.address);
    const tokens = Object.values(participantsTokens).map(v => v.cryptoMon);

    this.setState({ participants, tokens});
  };

  challengeAfter = (channel, index) => () => {
    const {plasmaCMContract, enqueueSnackbar} = this.props;
    fallibleSnackPromise(
      battleChallengeAfter(channel, index ,plasmaCMContract),
      enqueueSnackbar,
      `Channel challenged successfully`,
      "Challenge After failed"
    );
  };

  challengeBetween = (channel, index) => () => {
    const {plasmaCMContract, enqueueSnackbar} = this.props;
    fallibleSnackPromise(
      battleChallengeBetween(channel, index ,plasmaCMContract),
      enqueueSnackbar,
      `Channel challenged successfully`,
      "Challenge Between failed"
    );

  };

  challengeBefore = (channel, index) => () => {
    const {plasmaCMContract, enqueueSnackbar} = this.props;
    fallibleSnackPromise(
      battleChallengeBefore(channel, index, plasmaCMContract),
      enqueueSnackbar,
      `Channel challenged successfully`,
      "Challenge Before failed"
    );

  };

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

  hasForceMove = () => {
    return this.props.channel.forceMoveChallenge.state.channelId > 0;
  }

  render = () => {
    const { channel, actions, waiting, is1Challengeable, is2Challengeable } = this.props;
    const { participants, tokens } = this.state;

    if (!participants) {
      return (
      <div>
        Loading battle between <span style={{ color: toAddressColor(channel.players[0])}}>{toReadableAddress(channel.players[0])}</span> and <span style={{ color: toAddressColor(channel.players[1])}}>{toReadableAddress(channel.players[1])}</span>
      </div>
      )
    }

    return (
      <Paper style={{ padding: '1em', border: this.hasForceMove() ? 'coral 3px solid' : 'unset' }}>
        <DoubleCryptoMonCard
          token1={tokens[0]}
          owner1={participants[0]}
          token2={tokens[1]}
          owner2={participants[1]}
          actions1={is1Challengeable ? this.getChallengeActionsFor(channel, 0) : []}
          actions2={is2Challengeable ? this.getChallengeActionsFor(channel, 1) : []}
        />
        {waiting && (
          <Typography
            variant="caption"
            style={{ display: 'block', textAlign: 'center' }}
          >
            Waiting for player to accept...
          </Typography>
        )}
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

export default connect(mapStateToProps, mapDispatchToProps)(withSnackbar(BattleOverview));