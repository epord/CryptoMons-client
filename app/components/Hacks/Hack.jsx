import React from 'react';
import {connect} from "react-redux";

import {
  challengeBeforeWithExitData,
  exitToken,
  exitTokenWithData,
  getCoinState, getCryptomon,
  getPlasmaCoinId, initiateBattle
} from '../../../services/ethService';
import {loadContracts} from '../../redux/actions';
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import {getHistory} from "../../../services/plasmaServices";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import {doubleSpendTransactions, nonExistentTransactions} from "./HackUtils";
import {toAddressColor, toReadableAddress} from "../../../utils/utils";
import SelectPlayerTokenModal from "../common/SelectPlayerTokenModal.jsx"
import {getExitDataToBattleRLPData} from "../../../utils/cryptoUtils";
import {getInitialCMBState, toCMBBytes} from "../../../utils/CryptoMonsBattles";

class Hack extends React.Component {
  constructor(props) {
    super(props);
    this.state = { history: [], openBattleModal: false }
  }

  onSlotChanged = event => {
    let hackSlot = event.target.value;
    this.setState({ hackSlot: hackSlot });

    getHistory(hackSlot).then(res => this.setState({ history: res.history }));
    getCoinState(hackSlot, this.props.rootChainContract).then(response =>
      this.setState({ isHackSlotExiting: response == "EXITING" })
    );
  };

  forceOldExit = exitData => () => {
    const { rootChainContract } = this.props;
    exitTokenWithData(rootChainContract, exitData).then(() => console.log("Exit successful"));
  };

  useOldExitAndBattle = exitData => () => {
    const { rootChainContract } = this.props;
    exitTokenWithData(rootChainContract, exitData).then(
      d => {
        this.setState({
          battleExitData: d,
          openBattleModal: true
        })
      }
    );
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
    //TODO change web3 for ethAccount
    doubleSpendTransactions(token, web3.eth.defaultAccount, transactionHash)
      .then(exitData => exitTokenWithData(this.state.rootChain, exitData)
        .then(() => console.log("Exit successful")));
  };

  doubleSpendAndBattle = (token, transactionHash) => async() => {
    doubleSpendTransactions(token, web3.eth.defaultAccount, transactionHash).then(
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

    const tokenPLID = await getPlasmaCoinId(hackSlot, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(opponentToken, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract);
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract);
    const exitRLPData = getExitDataToBattleRLPData(0, battleExitData);

    const initialState = getInitialCMBState(hackSlot, tokenPLInstance, opponentToken, tokenOPInstance);
    await initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponent, 10, toCMBBytes(initialState), exitRLPData);
    this.props.history.push('/battles');
  };

  closeBattleModal = () => this.setState({ openBattleModal: false });

  render = () => {
    const { rootChainContract } = this.props;
    const { hackSlot, history , isHackSlotExiting, openBattleModal, startingBattle } = this.state;

    if (!rootChainContract) return <div>Loading...</div>

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
              ).reverse()}
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
              ).reverse()}
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
  loadContracts: () => dispatch(loadContracts())
})

export default connect(mapStateToProps, mapDispatchToProps)(Hack);