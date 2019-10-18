import React from 'react';
import { connect } from "react-redux";
import io from 'socket.io-client';
import { transitionRPSState, getInitialRPSState, toRPSBytes, isRPSFinished, RPSWinner } from "../../utils/RPSExample";
import {hashChannelState, sign} from "../../utils/cryptoUtils";
import InitComponent from './common/InitComponent.jsx';
import { battleDeposit, battleHasDeposit, battleRetrieveDeposit, initiateBattle, fundBattle, concludeBattle } from '../../services/ethService';
import { getBattlesFrom } from '../redux/actions';

class Battles extends InitComponent {

  state = { loading: true }

  init = () => {
    const { ethAccount, plasmaTurnGameContract, plasmaCMContract, getBattlesFrom } = this.props;
    this.updateDeposited();
    this.setState({ loading: false });
    getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract);
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
        console.log('response')
        this.socket.emit("authenticationResponse", {user: ethAccount, signature: message})
      })
    });

    this.socket.on("authenticated", () => console.log("authenticated"));
  };

  battleRequest = channelId => {
    const { ethAccount } = this.props;
    this.socket.emit("battleRequest", { channelId });
  };

  updateDeposited = () => {
    const { plasmaCMContract } = this.props;
    battleHasDeposit(plasmaCMContract).then(deposited => {
      console.log('update deposit', deposited)
      this.setState({ deposited })
    });
  }

  play = async (move) => {
    const newState = await this.transitionState(move);
    this.socket.emit("play", newState);
  };

  transitionState = async (move) => {
    const { currentState } = this.state;
    currentState.game = transitionRPSState(currentState.turnNum, currentState.game, move);
    currentState.turnNum = currentState.turnNum + 1;

    const hash = hashChannelState(currentState);
    console.log(hash);
    currentState.signature = await sign(hash);
    return currentState;
  };

  makeDeposit = async () => {
    const { plasmaCMContract } = this.props;
    battleDeposit(plasmaCMContract).then(res => {
      setTimeout(this.updateDeposited(), 2000);
      console.log('deposit made', res);
    })
  }

  retrieveDeposit = async () => {
    const { plasmaCMContract } = this.props;
    battleRetrieveDeposit(plasmaCMContract).then(res => {
      setTimeout(this.updateDeposited(), 2000);
      console.log('deposit retrieved', res);
    })
  }

  initiateBattle = () => {
    const { plasmaCMContract, plasmaTurnGameContract, ethAccount } = this.props;
    const opponent = ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'
    const initialState = getInitialRPSState(3);
    initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponent, 0.05, toRPSBytes(initialState));
  }

  fundBattle = (channelId, stake) => {
    const { plasmaCMContract } = this.props;
    const initialState = getInitialRPSState(3);
    fundBattle(plasmaCMContract, channelId, stake, toRPSBytes(initialState));
  }

  concludeBattle = () => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    concludeBattle(plasmaCMContract, prevState, currentState).then(res => console.log("Battle concluded ", res));
  }

  debugBattles = () => {
    this.socket.emit("debugBattles");
  };

  render = () => {
    const { loading, deposited, currentState } = this.state;
    const { battles, ethAccount } = this.props;
    const { opened, toFund, ongoing } = battles;

    if(loading) return <div>Loading...</div>
    if (currentState) console.log(RPSWinner(currentState))
    return (
      <React.Fragment>
        <div>Battles</div>
        <button onClick={this.battleRequest}>Battle Request</button>
        <button onClick={this.initiateBattle}>Initiate Battle</button>
        <input
          value={this.state.turn}
          onChange={e => this.setState({ turn: e.target.value })}
        />
        {deposited === false && <button onClick={this.makeDeposit}>Deposit</button>}
        {deposited === true && <button onClick={this.retrieveDeposit}>Retrieve Deposit</button>}

        <button onClick={this.initSocket}>Connect</button>
        <button onClick={this.debugBattles}>Debug</button>

        <button onClick={() => this.play(0)}>Rock</button>
        <button onClick={() => this.play(1)}>Paper</button>
        <button onClick={() => this.play(2)}>Scissors</button>


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
          </React.Fragment>
        )}

        {currentState && isRPSFinished(currentState.game) && RPSWinner(currentState).toLowerCase() == ethAccount.toLowerCase() && (
          <button onClick={this.concludeBattle}>CHECKOUT BATTLE</button>
        )}

      </React.Fragment>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount,
	plasmaCMContract: state.plasmaCMContract,
	plasmaTurnGameContract: state.plasmaTurnGameContract,
	battles: state.battles || {},
 });

const mapDispatchToProps = dispatch => ({
  getBattlesFrom: (ethAccount, plasmaTurnGameContract, plasmaCMContract) => dispatch(getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract))
});

export default connect(mapStateToProps, mapDispatchToProps)(Battles);