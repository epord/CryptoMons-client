import React from 'react';
import { connect } from "react-redux";
import io from 'socket.io-client';

class Battles extends React.Component {

  state = {}

  componentDidMount() {
    this.initSocket();
  }

  initSocket = () => {
    this.socket = io(`http://localhost:4000`);

    this.socket.on('battleAccepted', (data) => {
      console.log('Battle accepted',  data);
    });

    this.socket.on('invalidAction', (data) => {
      console.log('Error ', data);
    });

    this.socket.on('battleEstablished', (data) => {
      console.log('Battle established', data);
    });

    this.socket.on('stateUpdated', (data) => {
      console.log('State updated', data);
    });

    this.socket.on('battleFinished', (data) => {
      console.log('Battle finished', data);
    });
  }

  battleRequest = () => {
    const { ethAccount } = this.props;
    this.socket.emit("battleRequest",{
      user: ethAccount,
      opponent: ethAccount == '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d' ? '0x4f821cfb4c995b5d50208b22963698ce06a07bc9' : '0x2bd8f0178cd41fb953fa26d4a8b372d98d5c864d'
    });
  }

  play = () => {
    this.socket.emit("play",{
      turn: this.state.turn
    });
  }

  debugBattles = () => {
    this.socket.emit("debugBattles");
  }

  render = () => {
    return (
      <React.Fragment>
        <div>Battles</div>
        <button onClick={this.battleRequest}>Battle Request</button>
        <input
          value={this.state.turn}
          onChange={e => this.setState({ turn: e.target.value })}
        />
        <button onClick={this.play}>Play</button>
        <button onClick={this.debugBattles}>Debug</button>
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