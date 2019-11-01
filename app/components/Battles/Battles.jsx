import React from 'react';

import {connect} from "react-redux";
import io from 'socket.io-client';

import InitComponent from '../common/InitComponent.jsx';
import withInitComponent from '../common/withInitComponent.js';

import BattleOverview from './BattleOverview.jsx';
import CurrentBattle from './CurrentBattle.jsx';

import {
  addNextMove,
  CMBmover,
  getInitialCMBState,
  readyForBattleCalculation,
  shouldIAddMove,
  toCMBBytes,
  transitionCMBState
} from "../../../utils/CryptoMonsBattles"
import {getExitDataToBattleRLPData, hashChannelState, sign} from "../../../utils/cryptoUtils";

import {
  battleForceMove,
  battleRespondWithMove,
  concludeBattle,
  fundBattle,
  getBattleTokens,
  getCryptomon,
  getPlasmaCoinId,
} from '../../../services/ethService';
import { getBattlesFrom } from '../../redux/actions';
import { getExitData } from "../../../services/plasmaServices";
import { Typography } from '@material-ui/core';
import { battleChallengeAfter } from '../../../services/battleChallenges.js';

class Battles extends InitComponent {

  state = { loading: true }

  init = async () => {
    const { ethAccount, plasmaTurnGameContract, plasmaCMContract, getBattlesFrom } = this.props;
    this.setState({ loading: false });
    getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract);
    this.setState({ tokenPL: '4365297341472105176', tokenOP: '5767501881849970565' })
  }

  stateUpdate = (prevState, currentState) => {
    if(currentState) this.setState({ currentState, prevState }, async () => {
      const { ethAccount } = this.props;
      if(currentState && readyForBattleCalculation(ethAccount, currentState)) {
        prevState = currentState;
        currentState = await this.transitionState(undefined);
        this.setState({ currentState: currentState, prevState: prevState });
        console.log('transition before move')
      }
    });
  }

  initSocket = () => {

    this.socket = io(`http://localhost:4000`);

    this.socket.on('battleAccepted', (data) => {
      console.log('Battle accepted',  data);
      this.stateUpdate(data.prevState, data.state);
    });

    this.socket.on('invalidAction', (data) => {
      console.log('Error ', data);
      this.stateUpdate(data.prevState, data.state);
    });

    this.socket.on('battleEstablished', (data) => {
      console.log('battle established ', data);
      this.stateUpdate(data.prevState, data.state);
    });

    this.socket.on('stateUpdated', (data) => {
      console.log('state updated ', data);
      this.stateUpdate(data.prevState, data.state);
    });

    this.socket.on('battleFinished', (data) => {
      console.log('Battle finished', data);
    });

    this.socket.on('authenticationRequest', (data) => {
      const { ethAccount } = this.props;
      console.log('Authentication Request', data);
      sign(data.nonce).then(message => {
        this.socket.emit("authenticationResponse", {user: ethAccount, signature: message})
      })
    });

    this.socket.on("authenticated", () => this.setState({ authenticated: true }));
  };

  battleRequest = channelId => () => {
    this.socket.emit("battleRequest", { channelId });
  };

  play = async (move) => {
    const { ethAccount } = this.props;
    const { currentState } = this.state;

    let newState = currentState;
    if(shouldIAddMove(ethAccount, currentState)) {
      newState.game = addNextMove(currentState.game, move);
      const hash = hashChannelState(newState);
      newState.signature = await sign(hash);
    } else {
      newState = await this.transitionState(move);
    }
    this.socket.emit("play", newState);
  };

  transitionState = async (move) => {
    const { currentState } = this.state;
    const { ethAccount } = this.props;

    currentState.game = transitionCMBState(currentState.game, currentState.turnNum, move);
    currentState.turnNum = currentState.turnNum + 1;

    if(!shouldIAddMove(ethAccount, currentState)) {
      const hash = hashChannelState(currentState);
      currentState.signature = await sign(hash);
    }
    return currentState;
  };

  fundBattle = async (channelId, stake) => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, ethAccount } = this.props;

    const {player, opponent} = await getBattleTokens(channelId, plasmaTurnGameContract);
    const tokenOP = opponent.cryptoMon;
    const tokenPL = player.cryptoMon;

    const tokenPLID = await getPlasmaCoinId(tokenPL, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(tokenOP, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract)
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract)
    const exitData = await getExitData(tokenOP);
    const exitRLPData = getExitDataToBattleRLPData(1, exitData);

    const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
    fundBattle(plasmaCMContract, channelId, stake, toCMBBytes(initialState), exitRLPData);
  }

  concludeBattle = () => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    concludeBattle(plasmaCMContract, prevState, currentState).then(res => console.log("Battle concluded ", res));
  }

  forceMove = channelId => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    battleForceMove(plasmaCMContract, channelId, prevState, currentState).then(res => console.log("Move forced ", res));
  }

  respondForceMove = async(channelId, move) => {
    const { plasmaCMContract } = this.props;
    const newState = await this.transitionState(move);
    battleRespondWithMove(plasmaCMContract, channelId, newState).then(res => console.log("Responded force move ", res));
  }

  hasForceMove = (channel) => {
    return channel.forceMoveChallenge.state.channelId > 0;
  }

  isMyTurn = (channel) => {
    const { ethAccount } = this.props;
    return CMBmover(channel.forceMoveChallenge.state).toLowerCase() === ethAccount
  }

  render = () => {
    const { loading, currentState, authenticated } = this.state;
    const { battles, ethAccount } = this.props;
    const { opened, toFund, ongoing, challengeables } = battles;

    console.log(battles)

    if(loading) return <div>Loading...</div>

    return (
      <React.Fragment>
        <div>Battles</div>

        <button onClick={this.initSocket}>Connect</button>

        {opened && opened.map(c =>
          <React.Fragment key={c.channelId}>
            <div>{c.channelId} - Waiting for {c.players[1]}</div>
            <button>Close unfunded</button>
          </React.Fragment>
        )}

        {toFund && toFund.map(c =>
          <React.Fragment key={c.channelId}>
            <div>{c.channelId} - Accept battle from {c.players[0]}</div>
            <button onClick={() => this.fundBattle(c.channelId, c.stake)}>Accept</button>
          </React.Fragment>
        )}

        {challengeables && challengeables.map(c =>
          <React.Fragment key={c.channelId}>
            <Typography>Challengeables</Typography>
            <BattleOverview
              key={c.channelId}
              channel={c}
            />
          </React.Fragment>
        )}

        {ongoing && ongoing.map(c =>
          <React.Fragment key={c.channelId}>
            <Typography>Ongoing</Typography>
            <BattleOverview
              key={c.channelId}
              channel={c}
              actions={[{
                title: 'Select',
                func: this.battleRequest(c.channelId),
              }]}
            />
          </React.Fragment>

          // <React.Fragment key={c.channelId}>
          //   <div>{c.channelId} - {c.players[0]} vs {c.players[1]}</div>
          //   <button onClick={() => this.battleRequest(c.channelId)}>Select</button>
          //   { currentState &&  !this.hasForceMove(c) && <button onClick={() => this.forceMove(c.channelId)}>Force Move</button>}
          //   {currentState && this.hasForceMove(c) && !this.isMyTurn(c) && (
          //     <div>
          //       //TODO add others
          //       <button onClick={() => this.respondForceMove(c.channelId, 0)}>Respond Force Move (Rock)</button>
          //     </div>
          //   )}

          //   {currentState && this.hasForceMove(c) && this.isMyTurn(c) && c.forceMoveChallenge.expirationTime < Date.now() &&
          //     <button onClick={this.concludeBattle}>CHECKOUT BATTLE</button>}
          // </React.Fragment>
        )}

        {/* TODO: show in modal */}
        {currentState && (
          <div style={{ padding: '1em' }}>
            <CurrentBattle
              play={this.play}
              isPlayer1={ethAccount.toLowerCase() == currentState.participants[0].toLowerCase()}
              game={currentState.game}
            />
          </div>
        )}

      </React.Fragment>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
	plasmaCMContract: state.plasmaCMContract,
	plasmaTurnGameContract: state.plasmaTurnGameContract,
	cryptoMonsContract: state.cryptoMonsContract,
	rootChainContract: state.rootChainContract,
	battles: state.battles || {},
 });

const mapDispatchToProps = dispatch => ({
  getBattlesFrom: (ethAccount, plasmaTurnGameContract, plasmaCMContract) => dispatch(getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract))
});

export default connect(mapStateToProps, mapDispatchToProps)(withInitComponent(Battles));