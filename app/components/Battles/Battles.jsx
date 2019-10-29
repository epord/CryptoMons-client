import React from 'react';
import { connect } from "react-redux";
import io from 'socket.io-client';
import {
  transitionCMBState, getInitialCMBState, toCMBBytes, shouldIAddMove, readyForBattleCalculation,
  addNextMove, CMBmover
} from "../../../utils/CryptoMonsBattles"
import {getExitDataToBattleRLPData, hashChannelState, sign} from "../../../utils/cryptoUtils";
import InitComponent from '../common/InitComponent.jsx';
import { initiateBattle, fundBattle,
  concludeBattle, battleForceMove, battleRespondWithMove, getCryptomon, getPlasmaCoinId } from '../../../services/ethService';
import { getBattlesFrom } from '../../redux/actions';
import { Moves } from "../../../utils/BattleDamageCalculator";
import CurrentBattle from './CurrentBattle.jsx';
import { getExitData } from "../../../services/plasmaServices";

class Battles extends InitComponent {

  state = { loading: true }

  init = () => {
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

    this.socket.on("authenticated", () => console.log("authenticated"));
  };

  battleRequest = channelId => {
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

  initiateBattle = async () => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, ethAccount } = this.props;
    const { tokenPL, tokenOP } = this.state;
    const opponent = ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'

    const tokenPLID = await getPlasmaCoinId(tokenPL, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(tokenOP, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract);
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract);
    const exitData = await getExitData(tokenPL);
    const exitRLPData = getExitDataToBattleRLPData(0, exitData);

    const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
    initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponent, 10, toCMBBytes(initialState), exitRLPData);
  }

  fundBattle = async (channelId, stake) => {
    //TODO decode this from the event
    //GetPastEvent filtering by channelId, get Tokens and retrieve data
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, ethAccount } = this.props;
    const { tokenPL, tokenOP } = this.state;
    const opponent = ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'

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

  debugBattles = () => {
    this.socket.emit("debugBattles");
  };

  render = () => {
    const { loading, currentState } = this.state;
    const { battles, ethAccount } = this.props;
  const { opened, toFund, ongoing } = battles;

    if(loading) return <div>Loading...</div>

    return (
      <React.Fragment>
        <div>Battles</div>
        <button onClick={this.initiateBattle}>Initiate Battle</button>
        <input
          placeholder="token player"
          value={this.state.tokenPL}
          onChange={e => this.setState({ tokenPL: e.target.value })}
        />
        <input
          placeholder="token opponent"
          value={this.state.tokenOP}
          onChange={e => this.setState({ tokenOP: e.target.value })}
        />

        <button onClick={this.initSocket}>Connect</button>
        <button onClick={this.debugBattles}>Debug</button>

        <button onClick={() => this.play(Moves.ATK1)}>ATTACK</button>
        <button onClick={() => this.play(Moves.PROTECT)}>PROTECT</button>
        <button onClick={() => this.play(Moves.STATUS1)}>STATUS</button>
        <button onClick={() => this.play(Moves.RECHARGE)}>RECHARGE</button>


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

        {ongoing && ongoing.map(c =>
          <React.Fragment key={c.channelId}>
            <div>{c.channelId} - {c.players[0]} vs {c.players[1]}</div>
            <button onClick={() => this.battleRequest(c.channelId)}>Select</button>
            { currentState &&  !this.hasForceMove(c) && <button onClick={() => this.forceMove(c.channelId)}>Force Move</button>}
            {currentState && this.hasForceMove(c) && !this.isMyTurn(c) && (
              <div>
                //TODO add others
                <button onClick={() => this.respondForceMove(c.channelId, 0)}>Respond Force Move (Rock)</button>
              </div>
            )}

            {currentState && this.hasForceMove(c) && this.isMyTurn(c) && c.forceMoveChallenge.expirationTime < Date.now() &&
              <button onClick={this.concludeBattle}>CHECKOUT BATTLE</button>}
          </React.Fragment>
        )}
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

export default connect(mapStateToProps, mapDispatchToProps)(Battles);