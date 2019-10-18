import React from 'react';
import { connect } from "react-redux";
import io from 'socket.io-client';
import { transitionRPSState } from "../../utils/RPSExample";
import {hashChannelState, sign} from "../../utils/cryptoUtils";

class Battles extends React.Component {

  state = {}

  initSocket = () => {

    this.socket = io(`http://localhost:4000`);

    this.socket.on('battleAccepted', (data) => {
      console.log('Battle accepted',  data);
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
      this.socket.close();
    });

    this.socket.on('authenticationRequest', (data) => {
      const { ethAccount } = this.props;
      console.log('Authentication Request', data);
      sign(data.nonce).then(message => this.socket.emit("authenticationResponse", {user: ethAccount, signature: message}))
    });

    this.socket.on("authenticated", () => console.log("authenticated"));
  };

  battleRequest = () => {
    const { ethAccount } = this.props;
    this.socket.emit("battleRequest", {
      user: ethAccount,
      opponent: ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'
    });
  };

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

  debugBattles = () => {
    this.socket.emit("debugBattles");
  };

  render = () => {
    return (
      <React.Fragment>
        <div>Battles</div>
        <button onClick={this.battleRequest}>Battle Request</button>
        <input
          value={this.state.turn}
          onChange={e => this.setState({ turn: e.target.value })}
        />
        <button onClick={this.initSocket}>Connect</button>
        <button onClick={this.debugBattles}>Debug</button>

        <button onClick={() => this.play(0)}>Rock</button>
        <button onClick={() => this.play(1)}>Paper</button>
        <button onClick={() => this.play(2)}>Scissors</button>

      </React.Fragment>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount
 });

const mapDispatchToProps = dispatch => ({
});

export default connect(mapStateToProps, mapDispatchToProps)(Battles);