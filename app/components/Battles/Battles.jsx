import React from 'react';
import { connect } from "react-redux";
import io from 'socket.io-client';
import { transitionCMBState, getInitialCMBState, toCMBBytes} from "../../../utils/CryptoMonsBattles"
import {hashChannelState, sign} from "../../../utils/cryptoUtils";
import InitComponent from '../common/InitComponent.jsx';
import { initiateBattle, fundBattle,
  concludeBattle, battleForceMove, battleRespondWithMove, getCryptomon, getPlasmaCoinId } from '../../../services/ethService';
import { getBattlesFrom } from '../../redux/actions';
import {Moves} from "../../../utils/BattleDamageCalculator";
import CurrentBattle from './CurrentBattle.jsx';

class Battles extends InitComponent {

  state = { loading: true }

  init = () => {
    const { ethAccount, plasmaTurnGameContract, plasmaCMContract, getBattlesFrom } = this.props;
    this.setState({ loading: false });
    getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract);
    this.setState({ tokenPL: '4365297341472105176', tokenOP: '5767501881849970565' })
  }

  initSocket = () => {

    this.socket = io(`http://localhost:4000`);

    this.socket.on('battleAccepted', (data) => {
      console.log('Battle accepted',  data);
      if(data.state) this.setState({ currentState: data.state, prevState: data.prevState });
    });

    this.socket.on('invalidAction', (data) => {
      console.log('Error ', data);
      if(data.state) this.setState({ currentState: data.state, prevState: data.prevState });
    });

    this.socket.on('battleEstablished', (data) => {
      console.log('battle established ', data);
      this.setState({ currentState: data.state, prevState: data.prevState });
    });

    this.socket.on('stateUpdated', (data) => {
      console.log('state updated ', data);
      this.setState({ currentState: data.state, prevState: data.prevState });
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
    const { ethAccount } = this.props;
    this.socket.emit("battleRequest", { channelId });
  };

  play = async (move) => {
    const newState = await this.transitionState(move);
    this.socket.emit("play", newState);
  };

  transitionState = async (move) => {
    const { currentState } = this.state;
    currentState.game = transitionCMBState(currentState.game, currentState.turnNum, move);
    currentState.turnNum = currentState.turnNum + 1;

    const hash = hashChannelState(currentState);
    currentState.signature = await sign(hash);
    return currentState;
  };

  initiateBattle = async () => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, ethAccount } = this.props;
    const { tokenPL, tokenOP } = this.state;
    const opponent = ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'

    const tokenPLID = await getPlasmaCoinId(tokenPL, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(tokenOP, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract)
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract)


    const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
    initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponent, 10, toCMBBytes(initialState));
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

    const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
    fundBattle(plasmaCMContract, channelId, stake, toCMBBytes(initialState));
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
        <button onClick={this.battleRequest}>Battle Request</button>
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
            {currentState && <button onClick={() => this.forceMove(c.channelId)}>Force Move</button>}
            {currentState && c.forceMoveChallenge.state.channelId != 0 && c.forceMoveChallenge.state.turnNum == currentState.turnNum && (
              <button onClick={() => this.respondForceMove(c.channelId, 0)}>Respond Force Move (Rock)</button>
            )}
            {currentState && c.forceMoveChallenge.state.channelId != 0 && c.forceMoveChallenge.state.turnNum == currentState.turnNum && (
              <button onClick={() => this.respondForceMove(c.channelId, 1)}>Respond Force Move (Paper)</button>
            )}
            {currentState && c.forceMoveChallenge.state.channelId != 0 && c.forceMoveChallenge.state.turnNum == currentState.turnNum && (
              <button onClick={() => this.respondForceMove(c.channelId, 2)}>Respond Force Move (Scissors)</button>
            )}
          </React.Fragment>
        )}

        <button onClick={this.concludeBattle}>CHECKOUT BATTLE</button>

        {currentState && (
          <div style={{ padding: '1em' }}>
            <CurrentBattle play={this.play} isPlayer1={ethAccount.toLowerCase() == currentState.participants[0].toLowerCase()} game={currentState.game} />
          </div>
        )}

      </React.Fragment>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount,
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