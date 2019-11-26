import React from 'react';

import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import io from 'socket.io-client';

import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from '@material-ui/core/DialogTitle';
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
const EthUtils	= require('ethereumjs-util');

import {
  addNextMove,
  CMBmover,
  getInitialCMBState, isCMBFinished,
  readyForBattleCalculation,
  toCMBBytes,
  transitionCMBState,
  transtionEvenToOdd,
  canIPlay,
  isAlreadyTransitioned, CMBfromBytesAndData, transitionOddToEven, initialTransition,
} from "../../../utils/CryptoMonsBattles"
import {getExitDataToBattleRLPData, hashChannelState, recover, sign} from "../../../utils/cryptoUtils";

import {
  battleForceMove,
  battleRespondWithMove,
  concludeBattle,
  fundBattle,
  getBattleTokens,
  getCryptomon,
  getPlasmaCoinId,
  withdrawBattleFunds,
  closeUnfundedBattle
} from '../../../services/ethService';
import { getBattleChallenges, respondBattleChallenge } from "../../../services/battleChallenges";
import {getBattlesFrom, getBattleFunds} from '../../redux/actions';
import {getExitData} from "../../../services/plasmaServices";
import {Typography} from '@material-ui/core';
import {fallibleSnackPromise, toAddressColor, toReadableAddress} from "../../../utils/utils";
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
  };

  componentWillUpdate(nextProps, nextState, nextContext) {
    const { loading, channelOpened, battleOpen } = this.state;
    if(loading || !channelOpened) return;

    const { ongoing } = nextProps.battles;

    let index = ongoing.findIndex((c) => c.channelId == channelOpened.channelId);
    if( index < 0 && battleOpen) {
      this.closeBattleDialog();
    } else if(this.hasForceMove(channelOpened) !== this.hasForceMove(ongoing[index])) {
      this.setState({ channelOpened: ongoing[index]});
    }
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
    if(newCurrentState.turnNum !== oldCurrentState.turnNum + 1) {
      console.error("RETRIEVING A TURN THAT IS MORE THAN 1 THE ONE I HAD, SOME CASES THIS MAY BE OK");
      oldCurrentState = newPrevState;
      calculatedState = newCurrentState;
    } else {
      calculatedState = this.generateCalculatedState(oldCurrentState, newCurrentState);
      if(!this.validateEqual(calculatedState, newCurrentState)) {
        console.error("STATE RECEIVED IS INVALID");
      }
      if(!this.verifySignature(calculatedState)) {
        console.error("STATE NOT CORRECTLY SIGNED")
      }
    }

    if(readyForBattleCalculation(ethAccount, calculatedState)) {
      calculatedState = this.semiTransitionWithBattleCalculation(calculatedState);
      oldCurrentState = newCurrentState;
    }

    this.setState({prevState: oldCurrentState, currentState: calculatedState});
  };

  generateCalculatedState =(prevState, currentState) => {
    if(!prevState) throw "Cant calculate from undefined";
    let nextState = _.cloneDeep(prevState);
    nextState.turnNum = nextState.turnNum + 1;
    nextState.signature = currentState.signature;

    if(prevState.turnNum === 0) {
      nextState.game.hashDecision = currentState.game.hashDecision;
    } else if(prevState.turnNum % 2 !== 0) {
      if(prevState.turnNum > 1) {
        nextState.game.hashDecision = prevState.game.nextHashDecision;
      }
      nextState.game.decisionPL = currentState.game.decisionPL;
      nextState.game.saltPL = currentState.game.saltPL;
      nextState.game.saltOP = undefined;
      nextState.game.decisionOP = undefined;
      nextState.game.nextHashDecision = undefined;
    } else if(prevState.turnNum % 2 === 0) {
      nextState.game = transtionEvenToOdd(nextState.game, undefined, undefined, currentState.game.decisionOP, currentState.game.saltOP);
      if(!isCMBFinished(nextState.game)) {
        nextState.game.nextHashDecision = currentState.game.nextHashDecision;
      }
    }

    return nextState;
  };

  validateEqual = (oneState, otherState) => {
      if(oneState.game.cryptoMonPL     != otherState.game.cryptoMonPL) return false;
      if(oneState.game.HPPL     != otherState.game.HPPL) return false;
      if(oneState.game.status1PL     != otherState.game.status1PL) return false;
      if(oneState.game.status2PL     != otherState.game.status2PL) return false;
      if(oneState.game.chargePL     != otherState.game.chargePL) return false;
      if(oneState.game.cryptoMonOP     != otherState.game.cryptoMonOP) return false;
      if(oneState.game.HPOP     != otherState.game.HPOP) return false;
      if(oneState.game.status1OP     != otherState.game.status1OP) return false;
      if(oneState.game.status2OP     != otherState.game.status2OP) return false;
      if(oneState.game.chargeOP     != otherState.game.chargeOP) return false;
      if(oneState.game.hashDecision     != otherState.game.hashDecision) return false;
      if(oneState.game.decisionPL     != otherState.game.decisionPL) return false;
      if(oneState.game.saltPL     != otherState.game.saltPL) return false;
      if(oneState.game.decisionOP     != otherState.game.decisionOP) return false;
      if(oneState.game.saltOP     != otherState.game.saltOP) return false;
      if(oneState.game.nextHashDecision     != otherState.game.nextHashDecision) return false;
      if(oneState.channelId       != otherState.channelId) return false;
      if(oneState.channelType       != otherState.channelType) return false;
      if(oneState.participants[0]        != otherState.participants[0]) return false;
      if(oneState.participants[1]        != otherState.participants[1]) return false;
      if(oneState.turnNum       != otherState.turnNum) return false;
      return oneState.signature == otherState.signature;
  };

  verifySignature = (state) => {
    const { channelOpened } = this.state;
    if(state.turnNum == 0) return true;
    if(!channelOpened) throw "NO CHANNELED OPENED";
    let index = state.turnNum%2;
    return recover(hashChannelState(state), state.signature).toLowerCase() === channelOpened.publicKeys[index].toLowerCase();
  };

  semiTransitionWithBattleCalculation = (state) => {
    state.game = transtionEvenToOdd(state.game, state.channelId, state.turnNum);
    state.turnNum = state.turnNum + 1;
    state.signature = undefined;
    state.game.nextHashDecision = undefined;
    return state
  };

  signState = (state) => {
    const { channelOpened } = this.state;
    const { ethAccount } = this.props;
    if(!channelOpened) throw "No channelOpenned";

    let keyIndex = state.participants[0].toLowerCase() == ethAccount ? 0 : 1;
    const hash = hashChannelState(state);
    const pk = localStorage.getItem(`battle_key_${channelOpened.publicKeys[keyIndex]}`);
    if(!pk) throw "Private key lost";
    let signature = EthUtils.ecsign(EthUtils.toBuffer(hash), EthUtils.toBuffer(pk));
    return EthUtils.toRpcSig(signature.v, signature.r, signature.s);
  };

  //Actions

  signAndSend = () => {
    this.play(undefined)
  }

  openBattleDialog = channel => this.setState({ battleOpen: true});

  closeBattleDialog = () => {
    if(this.socket) this.socket.close();
    this.socket = undefined;
    this.setState({ battleOpen: false });
  };

  battleRequest = channel => () => {
    const { ethAccount } = this.props;
    this.setState({ channelOpened: channel}, () => {
      if(!this.socket) {
        this.initSocket();
      }
      this.socket.emit("battleRequest", { owner: ethAccount, channelId: channel.channelId });
      this.openBattleDialog(channel);
    });
  };

  play = async (move) => {
    const { ethAccount, enqueueSnackbar, plasmaCMContract } = this.props;
    const { channelOpened, currentState } = this.state;

    if(channelOpened && this.hasForceMove(channelOpened)) {
      let fmState = channelOpened.forceMoveChallenge.state;
      fmState.turnNum = parseInt(fmState.turnNum);

      fmState.game = CMBfromBytesAndData(
        fmState.gameAttributes,
        currentState.game.cryptoMonPLInstance,
        currentState.game.cryptoMonOPInstance,
        currentState.game.cryptoMonPLData,
        currentState.game.cryptoMonOPData
      );

      if (CMBmover(fmState).toLowerCase() !== ethAccount) throw "CANT PLAY!";

      if(readyForBattleCalculation(ethAccount, fmState)) {
        fmState = this.semiTransitionWithBattleCalculation(fmState);
      }

      fmState = this.getSubmittableState(fmState, move);

      //TODO check if forcemove just before winning

      fallibleSnackPromise(
        battleRespondWithMove(plasmaCMContract, fmState),
        enqueueSnackbar,
        "Force Move answered",
        "Force Move answer failed"
      );
    } else {
      const { currentState } = this.state;

      if(!canIPlay(ethAccount, currentState)) throw "CANT PLAY!"

      const submittableState = this.getSubmittableState(currentState, move);
      this.socket.emit("play", submittableState);
    }
  };

  getSubmittableState = (state, move) => {
    const {ethAccount} = this.props;
    let currentState = state;

    if(isAlreadyTransitioned(ethAccount, currentState)) {
      if(!isCMBFinished(currentState.game)) {
        currentState.game = addNextMove(currentState.game, move, currentState.channelId, currentState.turnNum);
      }
    } else {
      currentState.game = transitionCMBState(currentState.game, currentState.channelId, currentState.turnNum, move);
      currentState.turnNum = currentState.turnNum + 1;
    }
    currentState.signature = this.signState(currentState);
    return currentState
  };

  fundBattle = (channelId, stake) => async () => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract } = this.props;

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

    if(isAlreadyTransitioned(ethAccount, currentState)) {
      currentState.signature = this.signState(currentState);
    }

    fallibleSnackPromise(
      concludeBattle(plasmaCMContract, prevState, currentState),
      enqueueSnackbar,
      "Battle closed successfully",
      "Error while closing battle"
    ).finally(this.closeBattleDialog);
  };

  hasForceMove = (channel) => {
    return channel && channel.forceMoveChallenge.state.channelId != '0';
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

  respondChallenge = async (challenge) => {
    const { plasmaCMContract, enqueueSnackbar } = this.props;
    const { challengedchannel } = this.state;
    const challengingBlock = challenge.challengingBlockNumber;
    fallibleSnackPromise(
      respondBattleChallenge(challengedchannel, challengingBlock, challenge.txHash, plasmaCMContract),
      enqueueSnackbar,
      `Battle challenged responded successfully`,
      "Challenge response failed"
    ).finally(this.closeRespondChallengeModal);
  };

  openRespondChallengeModal = (channel) => () => {
    const { enqueueSnackbar, plasmaCMContract } = this.props;
    this.setState({isFetchingChallenges: true, respondModalOpen: true});

    getBattleChallenges(channel.channelId, plasmaCMContract)
      .then(challenges => this.setState({challengedchannel: channel, isFetchingChallenges: false, challengesToRespond: challenges}))
      .catch(e => {
        enqueueSnackbar("Error fetching challenges", {variant: 'error'})
        this.closeRespondChallengeModal()
      });
  };

  closeUnfundedBattle = channelId => () => {
    const { enqueueSnackbar, plasmaCMContract } = this.props;
    closeUnfundedBattle(channelId, plasmaCMContract)
      .then(() => enqueueSnackbar("Battle closed successfully", {variant: 'success'}))
      .catch(() => enqueueSnackbar("Error closing battle", {variant: 'error'}))
  }

  closeRespondChallengeModal = () => this.setState({ respondModalOpen: false });

  renderRespondChallengeDialog = () => {
    const { isFetchingChallenges, respondModalOpen, challengesToRespond } = this.state;
    const { classes } = this.props;

    if(isFetchingChallenges) {
      return (
        <Dialog
          onClose={this.closeRespondChallengeModal}
          open={Boolean(respondModalOpen)} classes={{paper: classes.dialogPaper}}>
          <DialogTitle>Fetching challenges...</DialogTitle>
        </Dialog>
      );
    } else {
      return (
        <Dialog
        onClose={this.closeRespondChallengeModal}
        open={Boolean(respondModalOpen)} classes={{paper: classes.dialogPaper}}>
          <DialogTitle>Respond to challenges</DialogTitle>
          <Grid style={{padding: '1em', paddingTop: "0"}}>
          {(challengesToRespond || []).map(challenge => (
            <div
              key={challenge.txHash}
              style={{
                border: "2px solid black",
                borderRadius: "5px",
                margin: "0.5em",
                padding: "0.5em",
                display: "flex",
                flexDirection: "column"
              }}>

              <Typography style={{textAlign: "center", fontWeight: "bold"}}>
                <span style={{color: toAddressColor(challenge.owner)}}>{toReadableAddress(challenge.owner)} </span>
                challenged this Token in block {challenge.blockNumber}</Typography>
              <Button variant="contained" color="primary"
                      onClick={() => this.respondChallenge(challenge)}>Respond Challenge</Button>
            </div>
          ))}
          </Grid>
        </Dialog>
      )
    }
  };

  renderDialogBattle = () => {
    const { ethAccount, classes } = this.props;
    const { currentState, battleOpen, channelOpened } = this.state;
    if(!channelOpened) return (<div/>);

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
    const { loading, currentState, respondModalOpen } = this.state;
    const { battles, battleFunds } = this.props;
    const { opened, toFund, ongoing, challengeables, respondable } = battles;
    const battleFundsBN = new BN(battleFunds);

    if(loading) return <div>Loading...</div>

    return (
      <div style={{ padding: '1em' }}>
        {this.renderRespondChallengeDialog()}
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
            <div  style={{display: "flex", flexWrap: "wrap", justifyContent: "space-around", width: "100%"}}>
              {opened && opened.map(c =>
                <div key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    waiting
                    actions={[{
                      title: 'Close unfunded',
                      func: this.closeUnfundedBattle(c.channelId),
                    }]}
                  />
                </div>
              )}
              {toFund && toFund.map(c =>
                <div key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    actions={[{
                      title: 'Fund battle',
                      func: this.fundBattle(c.channelId, c.stake),
                    }]}
                  />
                </div>
              )}
            </div>

					</ExpansionPanelDetails>
				</ExpansionPanel>

        <ExpansionPanel
          expanded={(challengeables && challengeables.length > 0) || (respondable && respondable.length > 0)}
          disabled={!Boolean((challengeables && challengeables.length > 0) || (respondable && respondable.length > 0))}
          style={{ marginTop: '1em' }}
        >
					<ExpansionPanelSummary
						expandIcon={<ExpandMoreIcon />}>
						<Typography>Challengeable battles</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{ minHeight: '21em' }}>
            <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-around", width: "100%"}}>
              {challengeables && challengeables.map(c =>
                <div key={c.channel.channelId}>
                  <BattleOverview
                    key={c.channel.channelId}
                    channel={c.channel}
                    is1Challengeable={c.is1Challengeable}
                    is2Challengeable={c.is2Challengeable}
                  />
                </div>
              )}
              {respondable && respondable.map(c =>
                <React.Fragment key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    actions={[
                      {
                        title: "Respond challenge",
                        disabled: respondModalOpen,
                        func: this.openRespondChallengeModal(c)
                      }
                    ]}
                  />
                </React.Fragment>
              )}
            </div>
          </ExpansionPanelDetails>
        </ExpansionPanel>

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
            <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-around", width: "100%"}}>
              {ongoing && ongoing.map(c =>
                <React.Fragment key={c.channelId}>
                  <BattleOverview
                    key={c.channelId}
                    channel={c}
                    actions={[{
                      title: 'Select',
                      func: this.battleRequest(c),
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