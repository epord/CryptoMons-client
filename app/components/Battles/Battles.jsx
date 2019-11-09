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
const BN = require('bn.js');

import {
  addNextMove,
  CMBmover,
  getInitialCMBState,
  readyForBattleCalculation,
  shouldIAddMove,
  shouldIMove,
  toCMBBytes,
  transitionCMBState,
  transitionOddToEven,
  transtionEvenToOdd,
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
import {getBattlesFrom} from '../../redux/actions';
import {getExitData} from "../../../services/plasmaServices";
import {Typography} from '@material-ui/core';

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class Battles extends InitComponent {

  state = { loading: true, events: [] }

  init = async () => {
    const { ethAccount, plasmaTurnGameContract, plasmaCMContract, getBattlesFrom } = this.props;
    this.setState({ loading: false });
    getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract);
    this.setState({ tokenPL: '4365297341472105176', tokenOP: '5767501881849970565' })
  }

  stateUpdate = (prevState, currentState) => {
    const { ethAccount } = this.props;

    console.log("MY TURN?,", shouldIMove(ethAccount, currentState));
    console.log(currentState.turnNum)
    if(shouldIMove(ethAccount, currentState)) {
      this.validateTransition(prevState, currentState);
    }
    //if(valid) {}
    if(currentState) this.setState({ currentState, prevState }, async () => {
      const { ethAccount } = this.props;
      if(currentState && readyForBattleCalculation(ethAccount, currentState)) {
        prevState = currentState;
        currentState = await this.transitionState(undefined);
        this.setState({ currentState: currentState, prevState: prevState });
      }
    });
    //Else INVALID STATE RECEIVED FORCE MOVE!
  }

  validateTransition = (prevState, currentState) => {
    if(currentState.turnNum == 0) {
      //Validate initial conditions
    } else if(prevState.turnNum == 0) {
      //validate first move
    }else if(prevState.turnNum%2 == 0) {
      let calculatedState = transtionEvenToOdd(prevState.game, currentState.game.decisionOP, currentState.game.saltOP);
      this.setState({ events: calculatedState.events });
      console.log('EVENTS1:', calculatedState.events);
    } else {
      let calculatedState = transitionOddToEven(prevState.game, currentState.game.decisionPL, prevState.turNum == 1);
      //Validate initial conditions
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

  openBattleDialog = () => this.setState({ battleOpen: true })

  closeBattleDialog = () => this.setState({ battleOpen: false })

  battleRequest = channelId => () => {
    this.socket.emit("battleRequest", { channelId });
    this.openBattleDialog();
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

    const calculatedState = transitionCMBState(currentState.game, currentState.turnNum, move);
    this.setState({ events: calculatedState.events });
    console.log('EVENTS2:', calculatedState.events);
    currentState.game = calculatedState;
    currentState.turnNum = currentState.turnNum + 1;

    if(!shouldIAddMove(ethAccount, currentState)) {
      const hash = hashChannelState(currentState);
      currentState.signature = await sign(hash);
    }
    return currentState;
  };

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

  concludeBattle = () => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    concludeBattle(plasmaCMContract, prevState, currentState).then(res => console.log("Battle concluded ", res));
  }

  forceMove = channelId => () => {
    const { plasmaCMContract } = this.props;
    const { prevState, currentState } = this.state;
    battleForceMove(plasmaCMContract, channelId, prevState, currentState).then(res => console.log("Move forced ", res));
  }

  respondForceMove = (channelId) => async (move) => {
    const { plasmaCMContract } = this.props;
    const newState = await this.transitionState(move);
    battleRespondWithMove(plasmaCMContract, channelId, newState).then(res => console.log("Responded force move ", res));
  }

  hasForceMove = (channel) => {
    return channel.forceMoveChallenge.state.channelId > 0;
  }

  needsMyForceMoveResponse = (channel) => {
    const { ethAccount } = this.props;
    return CMBmover(channel.forceMoveChallenge.state).toLowerCase() === ethAccount
  }

  renderDialogBattle = () => {
    const { ethAccount, classes } = this.props;
    const { currentState, battleOpen, events } = this.state;

    return (
      <Dialog open={Boolean(battleOpen)} onClose={this.closeBattleDialog} classes={{ paper: classes.dialogPaper }}>
        <div style={{ padding: '1em' }}>
          <CurrentBattle
            play={this.play}
            isPlayer1={ethAccount.toLowerCase() == currentState.participants[0].toLowerCase()}
            game={currentState.game}
            turn={currentState.turnNum}
            events={events}
            battleForceMove={this.forceMove(currentState.channelId)}
            battleRespondForceMove={this.respondForceMove(currentState.channelId)}
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
              <Button color="primary" variant="contained" size="small" onClick={this.withdrawBonds}>Withdraw all bonds</Button>
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
            {challengeables && challengeables.map(c =>
              <React.Fragment key={c.channelId}>
                <BattleOverview
                  key={c.channelId}
                  channel={c}
                  waiting
                  actions={[{
                    title: 'Challenge',
                    func: () => 'TODO',
                  }]}
                />
              </React.Fragment>
            )}
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
                      func: this.battleRequest(c.channelId),
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
 });

const mapDispatchToProps = dispatch => ({
  getBattlesFrom: (ethAccount, plasmaTurnGameContract, plasmaCMContract) => dispatch(getBattlesFrom(ethAccount, plasmaTurnGameContract, plasmaCMContract))
});

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(withInitComponent(Battles)));