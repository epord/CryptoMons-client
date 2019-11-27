import React from 'react';
import {connect} from "react-redux";

import {
  battleForceMove,
  challengeBeforeWithExitData,
  createBattle,
  exitToken,
  exitTokenWithData,
  getCoinState
} from '../../../services/ethService';
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import {fastForwardBlockChain, getHistory} from "../../../services/plasmaServices";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import {doubleSpendTransactions, nonExistentTransactions} from "./HackUtils";
import {fallibleSnackPromise, toAddressColor, toReadableAddress} from "../../../utils/utils";
import SelectPlayerTokenModal from "../common/SelectPlayerTokenModal.jsx"
import {withSnackbar} from "notistack";
import InitComponent from "../common/InitComponent.jsx";
import withInitComponent from "../common/withInitComponent";

class Hack extends InitComponent {
  constructor(props) {
    super(props);
    this.state = { history: [], loading: true, openBattleModal: false }
  }

  static SaveForLater(prevState, currentState) {
    if(!currentState) return;
    let index = parseInt(localStorage.getItem("battleStateBaseIndex"));
    let channelId = localStorage.getItem("battleStateChannelId");
    if(isNaN(index) || channelId !== currentState.channelId) {
      index = prevState ? prevState.turnNum : currentState.turnNum;
      localStorage.setItem("battleStateBaseIndex", index.toString());
      localStorage.setItem("battleStateChannelId", currentState.channelId);
      localStorage.removeItem("oldBattleState");
      localStorage.removeItem("newBattleState");
    }

    if(currentState.turnNum === index || currentState.turnNum === index + 1){
      return localStorage.setItem("oldBattleState", JSON.stringify({prevState, currentState}));
    }

    if(currentState.turnNum === index + 2 || currentState.turnNum === index + 3) {
      return localStorage.setItem("newBattleState", JSON.stringify({prevState, currentState}));
    }

    let oldState = JSON.parse(localStorage.getItem("oldBattleState"));
    let newState = JSON.parse(localStorage.getItem("newBattleState"));

    if(currentState.turnNum === newState.currentState.turnNum + 1) {
      localStorage.setItem("oldBattleState", JSON.stringify({prevState: oldState.currentState, currentState: newState.prevState}));
      localStorage.setItem("newBattleState", JSON.stringify({prevState, currentState}));
    }

  }

  init = () => {
    this.setState({loading: false});
  };

  onSlotChanged = event => {
    const { rootChainContract } = this.props;

    let hackSlot = event.target.value;
    this.setState({ hackSlot: hackSlot });

    getHistory(hackSlot).then(res => this.setState({ history: res }));
    getCoinState(hackSlot, rootChainContract).then(response =>
      this.setState({ isHackSlotExiting: response == "EXITING" })
    );
  };

  forceOldExit = exitData => () => {
    const { rootChainContract } = this.props;
    exitTokenWithData(rootChainContract, exitData).then(() => console.log("Exit successful"));
  };

  useOldExitAndBattle = exitData => () => {
    this.setState({
      battleExitData: exitData,
      openBattleModal: true
    });
  };

  nonExistentTransactionsAndExit = () => {
    const { rootChainContract } = this.props;
    const { hackSlot } = this.state;
    nonExistentTransactions(hackSlot).then(d => exitToken(rootChainContract, d)
      .then(_ => console.log("Exit Successful")))
  };

  nonExistentTransactionsAndBattle = () => {
    const { hackSlot } = this.state;
    nonExistentTransactions(hackSlot).then(
      d => {
        this.setState({
          battleExitData: d,
          openBattleModal: true
        })
      }
    );
  };

  challengeBefore = (token, exitData) => () => {
    const { rootChainContract } = this.props;
    console.log(`Challenging Before: ${token}`)

    const newExitData = {
      slot: exitData.slot,
      challengingTransaction: exitData.exitingTxBytes,
      proof: exitData.exitingTxInclusionProof,
      challengingBlockNumber: exitData.exitingBlock,
      signature: exitData.signature
    };

    challengeBeforeWithExitData(newExitData, rootChainContract);
  };

  doubleSpend = (token, transactionHash) => async() => {
    const { ethAccount, rootChainContract } = this.props;
    doubleSpendTransactions(token, ethAccount, transactionHash)
      .then(exitData => exitTokenWithData(rootChainContract, exitData)
        .then(() => console.log("Exit successful")));
  };

  doubleSpendAndBattle = (token, transactionHash) => async() => {
    const { ethAccount, rootChainContract } = this.props;
    doubleSpendTransactions(token, ethAccount, transactionHash).then(
      d => {
        this.setState({
          battleExitData: d,
          openBattleModal: true
        })
      }
    );
  };

  onBattleStart = async (opponent, opponentToken) => {
    await this.setState({ startingBattle: true });

    const { battleExitData, hackSlot } = this.state;
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract } = this.props;
    await createBattle(
      hackSlot,
      opponentToken,
      opponent,
      battleExitData,
      rootChainContract, cryptoMonsContract, plasmaCMContract, plasmaTurnGameContract);
    this.props.history.push('/battles');
  };

  closeBattleModal = () => this.setState({ openBattleModal: false });

  fastForwardTime = (seg) => () => {
    const { enqueueSnackbar } = this.props;
    fastForwardBlockChain(seg).then(
      enqueueSnackbar(`Time Fastforward to ${seg/60/60/24} days`, { variant: 'info' })
    )
  };

  forceMoveOld = () => {
    const { ethAccount, enqueueSnackbar, plasmaCMContract } = this.props;

    let prevState;
    let currentState;
    let oldState = JSON.parse(localStorage.getItem("oldBattleState"));
    let newState = JSON.parse(localStorage.getItem("newBattleState"));

    if(oldState.currentState.participants[0].toLowerCase() == ethAccount) {
      if(oldState.prevState.turnNum%2 === 1) {
        prevState = oldState.prevState;
        currentState = oldState.currentState;
      } else {
        prevState = oldState.currentState;
        currentState = newState.prevState;
      }
    } else {
      if(oldState.prevState.turnNum%2 === 0) {
        prevState = oldState.prevState;
        currentState = oldState.currentState;
      } else {
        prevState = oldState.currentState;
        currentState = newState.prevState;
      }
    }

    console.log(prevState, currentState)
    fallibleSnackPromise(
      battleForceMove(plasmaCMContract, prevState, currentState),
      enqueueSnackbar,
      "Move forced",
      "There was an error forcing the move"
    );
  }

  render = () => {
    const { loading, hackSlot, history, isHackSlotExiting, openBattleModal, startingBattle } = this.state;
    if (loading) return (<div>Loading...</div>);
    let newStateS = localStorage.getItem("newBattleState");
    let newState = newStateS ? JSON.parse(newStateS) : undefined;
    let baseStateIndex = parseInt(localStorage.getItem("battleStateBaseIndex"));

    return(
      <div style={{ padding: '1em' }}>
        <SelectPlayerTokenModal
          title={"Select a Cryptomon to battle with"}
          open={openBattleModal}
          handleClose={this.closeBattleModal}
          actions = {[{
            title: "Select",
            disabled: startingBattle,
            func: this.onBattleStart
          }]}
        />
        <Typography variant="h5" gutterBottom>HACKS!</Typography>
        <Button variant="contained" onClick={this.fastForwardTime(302400)}>
          FastForward half a week
        </Button>

        <Button variant="contained" onClick={this.fastForwardTime(604800)}>
          FastForward a week
        </Button>

        {newState && newState.currentState.turnNum > baseStateIndex + 3 &&
        <Button variant="contained" onClick={this.forceMoveOld}>
          ForceMove Old BattleState
        </Button>}

        <Paper style={{ margin: '1em', padding: '1em', display: 'inline-block' }}>

          <TextField
            style={{ margin: '0 0.5em' }}
            value={hackSlot || ''}
            onChange={this.onSlotChanged}
            placeholder="Slot To Hack" />
        </Paper>

        {hackSlot &&
        (<div style={{ padding: '1em'}}>
            <div style={{ padding: '2em'}}>
              <Typography variant="h5" gutterBottom>History</Typography>
              <Button variant="contained" onClick={this.nonExistentTransactionsAndExit}>
                Create Non-Existant Transactions And Exit
              </Button>
              {history.map(event => (
                  <div style={{margin: "0.3em",borderStyle: "solid", display: "flex"}} key={event.transaction.minedBlock}>
                    <div style={{ padding: '0.3em'}}>
                      Block: <b>{event.transaction.minedBlock}</b> -
                      from: <span style={{color: toAddressColor(event.transaction.owner)}}>{toReadableAddress(event.transaction.owner)}</span> -
                      to: <span style={{color: toAddressColor(event.transaction.recipient)}}>{toReadableAddress(event.transaction.recipient)}</span>
                    </div>

                    <div style={{display: "flex", justifyContent: "space-around"}}>
                      {event.transaction.recipient.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
                      <React.Fragment>
                        <Button style={{margin: "0.4em"}} size="small" variant="contained" onClick={this.forceOldExit(event.exitData)}>Force Old Exit</Button>
                        <Button style={{margin: "0.4em"}} size="small" variant="contained" onClick={this.doubleSpend(hackSlot, event.transaction.hash)}>Create Double Spend Exit</Button>
                      </React.Fragment>
                      }
                      {isHackSlotExiting
                      && event.transaction.minedBlock != history[0].transaction.minedBlock
                      && (history.length > 1 && event.transaction.minedBlock != history[1].transaction.minedBlock)
                      && <Button style={{margin: "0.4em"}} size="small" variant="contained" onClick={this.challengeBefore(hackSlot, event.exitData)}>Challenge Before</Button>}
                    </div>
                  </div>
                )
              )}
            </div>

            <div style={{ padding: '2em'}}>
              <Typography variant="h5" gutterBottom>Battles</Typography>
              <Button variant="contained" onClick={this.nonExistentTransactionsAndBattle}>
                Create Non-Existant Transactions And Battle
              </Button>
              {history.map(event => (
                  <div style={{margin: "0.3em",borderStyle: "solid", display: "flex"}} key={event.transaction.minedBlock}>
                    <div style={{ padding: '0.3em'}}>
                      Block: <b>{event.transaction.minedBlock}</b> -
                      from: <span style={{color: toAddressColor(event.transaction.owner)}}>{toReadableAddress(event.transaction.owner)}</span> -
                      to: <span style={{color: toAddressColor(event.transaction.recipient)}}>{toReadableAddress(event.transaction.recipient)}</span>
                    </div>

                    <div style={{display: "flex", justifyContent: "space-around"}}>
                      {event.transaction.recipient.toLowerCase() == web3.eth.defaultAccount.toLowerCase() &&
                      <React.Fragment>
                        <Button style={{margin: "0.4em"}} size="small" variant="contained" onClick={this.useOldExitAndBattle(event.exitData)}>Force Old Exit</Button>
                        <Button style={{margin: "0.4em"}} size="small" variant="contained" onClick={this.doubleSpendAndBattle(hackSlot, event.transaction.hash)}>Create Double Spend Exit</Button>
                      </React.Fragment>
                      }
                      </div>
                  </div>
                )
                //TODO Challenge before a battle
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
  plasmaCMContract: state.plasmaCMContract,
  plasmaTurnGameContract: state.plasmaTurnGameContract,
  cryptoMonsContract: state.cryptoMonsContract,
  rootChainContract: state.rootChainContract
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withSnackbar(withInitComponent(Hack)));