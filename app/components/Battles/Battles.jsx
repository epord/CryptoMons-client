import React from 'react';

import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import io from 'socket.io-client';

import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Dialog from "@material-ui/core/Dialog";
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import InitComponent from '../common/InitComponent.jsx';
import withInitComponent from '../common/withInitComponent.js';

import BattleOverview from './BattleOverview.jsx';
import CurrentBattle from './CurrentBattle.jsx';
import _ from 'lodash';
const BN = require('bn.js');

import {
  addNextMove,
  CMBmover,
  getInitialCMBState, isCMBFinished,
  readyForBattleCalculation,
  toCMBBytes,
  transitionCMBState,
  transtionEvenToOdd,
  canIPlay,
  isAlreadyTransitioned,
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
  withdrawBattleFunds
} from '../../../services/ethService';
import {getBattlesFrom, getBattleFunds} from '../../redux/actions';
import {getExitData} from "../../../services/plasmaServices";
import {Typography} from '@material-ui/core';
import {fallibleSnackPromise} from "../../../utils/utils";
import {withSnackbar} from "notistack";

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
    width: '40em',
	},
	dialogPaperWithForceMove: {
		maxWidth: '40em',
    width: '40em',
    border: 'coral 3px solid',
	},
});

class Battles extends InitComponent {

  state = { loading: true };

  init = async () => {
    const { ethAccount, plasmaTurnGameContract, plasmaCMContract, getBattlesFrom } = this.props;
    this.setState({ loading: false });
    getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract);
  }

  initSocket = () => {

    this.socket = io(`http://localhost:4000`);

    this.socket.on('battleAccepted', (data) => {
      console.log('Battle accepted',  data);
      this.stateUpdate(data.prevState, data.state);
    });

    this.socket.on('invalidAction', (data) => {
      console.log('Error ', data);
      if(data.state) {
        this.stateUpdate(data.prevState, data.state);
      }
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

  stateUpdate = (newPrevState, newCurrentState) => {
    const { ethAccount } = this.props;
    let { currentState: oldCurrentState } = this.props;

    if(!newCurrentState) return;

    if(!oldCurrentState) {
      if(!newPrevState) {
        //TODO validate initial conditions if is initial state
        return  this.setState({currentState: newCurrentState});
      } else {
        oldCurrentState = newPrevState;
      }
    }

    let calculatedState;
    //TODO delete this
    if(newCurrentState.turnNum !== oldCurrentState.turnNum + 1) {
      console.error("RETRIEVING A TURN THAT IS MORE THAN 1 THE ONE I HAD, SOME CASES THIS MAY BE OK");
      oldCurrentState = newPrevState;
      calculatedState = newCurrentState;
    } else {
      calculatedState = this.generateCalculatedState(oldCurrentState, newCurrentState);
      //ValidateEqual(calculatedState, newCurrentState)
      //ValidateSigned(calculatedState)
      //I can trust calculatedState now.
    }

    //Si soy player, tengo impar
    //Si soy opponet, tengo par, tengo que transicionarlo
    if(readyForBattleCalculation(ethAccount, calculatedState)) {
      calculatedState.game = transtionEvenToOdd(calculatedState.game, calculatedState.channelId, calculatedState.turnNum);

      calculatedState.turnNum = calculatedState.turnNum + 1;
      calculatedState.signature = undefined;
      calculatedState.game.nextHashDecision = undefined;
      oldCurrentState = newCurrentState;
    }

    this.setState({prevState: oldCurrentState, currentState: calculatedState});
  };

  generateCalculatedState =(prevState, currentState) => {
    if(!prevState) throw "Cant calculate from undefined";
    let nextState = _.cloneDeep(prevState);
    nextState.turnNum = prevState.turnNum + 1;
    nextState.signature = currentState.signature;

    if(prevState.turnNum === 0) {
      nextState.game.hashDecision = currentState.game.hashDecision;
    } else if(prevState.turnNum % 2 !== 0) {
      if(prevState.turnNum > 1) {
        nextState.game.hashDecision = nextState.game.nextHashDecision;
      }
      nextState.game.decisionPL = currentState.game.decisionPL;
      nextState.game.saltPL = currentState.game.saltPL;
    } else if(prevState.turnNum % 2 === 0) {
      nextState.game = transtionEvenToOdd(nextState.game, undefined, undefined, currentState.game.decisionOP, currentState.game.saltOP);
      if(!isCMBFinished(nextState.game)) {
        nextState.game.nextHashDecision = currentState.game.nextHashDecision;
      }
    }

    return nextState;
  };

  signAndSend = async () => {
    const { currentState } = this.state;

    const hash = hashChannelState(currentState);
    currentState.signature = await sign(hash);
    this.socket.emit("play", currentState);
  }

  openBattleDialog = channel => this.setState({ battleOpen: true , channelOpened: channel})

  closeBattleDialog = () => this.setState({ battleOpen: false })

  battleRequest = channel => () => {
    this.socket.emit("battleRequest", { channelId: channel.channelId });
    this.openBattleDialog(channel);
  };

  play = async (move) => {
    const { ethAccount, enqueueSnackbar, plasmaCMContract } = this.props;
    const { channelOpened } = this.state;

    if(channelOpened && this.hasForceMove(channelOpened)) {
      let fmState = forceMoveChallenge.state;
      if(CMBmover(fmState).toLowerCase() !== ethAccount) throw "CANT PLAY!";

      fmState.game = transitionCMBState(fmState.game, fmState.channelId, fmState.turnNum, move);
      fmState.turnNum = fmState.turnNum + 1;

      const hash = hashChannelState(fmState);
      currentState.signature = await sign(hash);

      fallibleSnackPromise(
        enqueueSnackbar,
        battleRespondWithMove(plasmaCMContract, currentState),
        "Force Move answered",
        "Force Move answer failed"
      );
    } else {
      const { currentState } = this.state;

      if(!canIPlay(ethAccount, currentState)) throw "CANT PLAY!"
      if(isCMBFinished(currentState.game)) throw "CONCLUDE INSTEAD OF PLAYING"

      const submittableState = await this.getSubmittableState(move);
      this.socket.emit("play", submittableState);
    }
  };

  getSubmittableState = async (move) => {
    const {ethAccount} = this.props;
    const {currentState} = this.state;

    if(isAlreadyTransitioned(ethAccount, currentState)) {
      if(!isCMBFinished(currentState.game)) {
        currentState.game = addNextMove(currentState.game, move, currentState.channelId, currentState.turnNum);
      }
    } else {
      currentState.game = transitionCMBState(currentState.game, currentState.channelId, currentState.turnNum, move);
      currentState.turnNum = currentState.turnNum + 1;
    }

    const hash = hashChannelState(currentState);
    currentState.signature = await sign(hash);

    return currentState
  }

  fundBattle = (channelId, stake) => async () => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, ethAccount } = this.props;

    const {player, opponent} = await getBattleTokens(channelId, plasmaTurnGameContract);
    const tokenOP = opponent.cryptoMon;
    const tokenPL = player.cryptoMon;

    const tokenPLID = await getPlasmaCoinId(tokenPL, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(tokenOP, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract)
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract)
    const exitData = await getExitData(tokenOP);
    const exitRLPData = getExitDataToBattleRLPData(exitData);

    const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
    fundBattle(plasmaCMContract, channelId, stake, toCMBBytes(initialState), exitRLPData);
  }

  forceMove = () => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    battleForceMove(plasmaCMContract, prevState, currentState).then(res => console.log("Move forced ", res));
  }

  concludeBattle = async () => {
    const { plasmaCMContract, enqueueSnackbar, ethAccount } = this.props;
    let { prevState, currentState } = this.state;

    debugger
    if(isAlreadyTransitioned(ethAccount, currentState)) {
      const hash = hashChannelState(currentState);
      currentState.signature = await sign(hash);
    }

    fallibleSnackPromise(
      concludeBattle(plasmaCMContract, prevState, currentState),
      enqueueSnackbar,
      "Battle closed successfully",
      "Error while closing battle"
    ).finally(this.closeBattleDialog);
  };

  hasForceMove = (channel) => {
    return channel.forceMoveChallenge.state.channelId != '0';
  }

  withdrawFunds = () => {
    const {enqueueSnackbar, plasmaCMContract, ethAccount, getBattleFunds } = this.props;
    fallibleSnackPromise(
      withdrawBattleFunds(plasmaCMContract),
      enqueueSnackbar,
      "Funds Withdrawn successfully",
      "Error withdrawing funds"
    ).then(r => getBattleFunds(ethAccount, plasmaCMContract));
  }

  renderDialogBattle = () => {
    const { ethAccount, classes } = this.props;
    const { currentState, battleOpen, channelOpened } = this.state;
    const dialogPaperStyle = this.hasForceMove(channelOpened) ? classes.dialogPaperWithForceMove : classes.dialogPaper;

    return (
      <Dialog open={Boolean(battleOpen)} onClose={this.closeBattleDialog} classes={{ paper: dialogPaperStyle }}>
        <div style={{ padding: '1em' }}>
          <CurrentBattle
            play={this.play}
            forceMoveChallenge={channelOpened.forceMoveChallenge}
            isPlayer1={ethAccount.toLowerCase() == currentState.participants[0].toLowerCase()}
            currentState={currentState}
            battleForceMove={this.forceMove}
            concludeBattle={this.concludeBattle}
            signAndSend={this.signAndSend}
          />
        </div>
      </Dialog>
    )

  }

  render = () => {
    const { loading, currentState, authenticated } = this.state;
    const { battles, battleFunds } = this.props;
    const { opened, toFund, ongoing, challengeables } = battles;
    const battleFundsBN = new BN(battleFunds);

    if(loading) return <div>Loading...</div>

    return (
      <div style={{ padding: '1em' }}>
        <Typography variant="h5">Battles</Typography>
        <Grid item>
          {(
            <React.Fragment>
              <Typography style={{ display: 'inline-block', marginRight: '0.5em' }}>You have {battleFundsBN.div(new BN("1000000000000000000")).toString()} ETH to withdraw</Typography>
              <Button color="primary" variant="contained" size="small" onClick={this.withdrawFunds}>Withdraw funds</Button>
            </React.Fragment>
          )}
        </Grid>

				<ExpansionPanel
          expanded={Boolean((opened && opened.length > 0) || (toFund && toFund.length > 0))}
          disabled={!Boolean((opened && opened.length > 0) || (toFund && toFund.length > 0))}
          style={{ marginTop: '1em' }}
        >
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Unfunded battles</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
            <div>
              {opened && opened.map(c =>
                <React.Fragment key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    waiting
                    actions={[{
                      title: 'Close unfunded',
                      func: () => 'TODO',
                    }]}
                  />
                </React.Fragment>
              )}
              {toFund && toFund.map(c =>
                <React.Fragment key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    actions={[{
                      title: 'Fund battle',
                      func: this.fundBattle(c.channelId, c.stake),
                    }]}
                  />
                </React.Fragment>
              )}
            </div>

					</ExpansionPanelDetails>
				</ExpansionPanel>

        <ExpansionPanel
          expanded={challengeables && challengeables.length > 0}
          disabled={!Boolean(challengeables && challengeables.length > 0)}
          style={{ marginTop: '1em' }}
        >
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Challengeable battles</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
            <div>
              {challengeables && challengeables.map(c =>
                <React.Fragment key={c.channel.channelId}>
                  <BattleOverview
                    key={c.channel.channelId}
                    channel={c.channel}
                    waiting
                    actions={[{
                      title: 'Challenge',
                      func: () => 'TODO',
                    }]}
                  />
                </React.Fragment>
              )}
            </div>
          </ExpansionPanelDetails>
        </ExpansionPanel>

        <Button onClick={this.initSocket} style={{ marginTop: '1em' }} color="primary" variant="contained" size="small">Connect</Button>
				<ExpansionPanel defaultExpanded style={{ marginTop: '1em' }}>
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Ongoing battles</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
            {(!ongoing || ongoing.length === 0) && (
              <React.Fragment>
                <Grid container direction="column" style={{ margin: 'auto' }} alignItems="center">
                  <Grid item>
                    <Typography variant="body1">You don't have any active battle</Typography>
                  </Grid>
                </Grid>
              </React.Fragment>
            )}
            <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-around"}}>
              {ongoing && ongoing.map(c =>
                <React.Fragment key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    actions={[{
                      title: 'Select',
                      func: this.battleRequest(c),
                      disabled: !authenticated
                    }]}
                  />
                </React.Fragment>
              )}
            </div>
					</ExpansionPanelDetails>
				</ExpansionPanel>

        {/* TODO: show in modal */}
        {currentState && this.renderDialogBattle()}

      </div>
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
  battleFunds: state.battleFunds
 });

const mapDispatchToProps = dispatch => ({
  getBattleFunds: (ethAccount, plasmaCMContract) => dispatch(getBattleFunds(ethAccount, plasmaCMContract)),
  getBattlesFrom: (ethAccount, plasmaTurnGameContract, plasmaCMContract) => dispatch(getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract))
});

export default
  withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(
      withInitComponent(
        withSnackbar(
          Battles
        )
      )
    )
  );