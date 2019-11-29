import React from 'react';
import {connect} from "react-redux";
import {withSnackbar} from "notistack";
import PokemonStats from './PokemonStats.jsx';
import Events from './Events.jsx';
import { pokedex } from '../../../utils/pokedex';
import { getTypeData, Type, Status } from '../../../utils/pokeUtils';
import { fallibleSnackPromise } from '../../../utils/utils';
import { Moves } from "../../../utils/BattleDamageCalculator";
import { CMBmover, canIPlay, toCMBBytes } from "../../../utils/CryptoMonsBattles";
import { refuteBattle } from '../../../services/ethService';

const EthUtils	= require('ethereumjs-util');

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import WarningIcon from '@material-ui/icons/Warning';

import './CurrentBattle.css';

class CurrentBattle extends React.Component {
  getCryptoMonData = (
    cryptoMonInstance,
    cryptoMonData,
    otherCryptoMonData,
    HP,
    status1,
    status2,
    otherStatus1,
    otherStatus2,
    charge
  ) => {

    return {
      status1: status1 ? otherCryptoMonData.type1 : null,
      status2: status2 ? otherCryptoMonData.type2 : null,
      boost1: otherStatus1 ? cryptoMonData.type1 : null,
      boost2: otherStatus2 ? cryptoMonData.type2 : null,
      currentHP: HP,
      hp: cryptoMonInstance.stats.hp,
      id: cryptoMonInstance.id,
      charge,
      type1: cryptoMonData.type1,
      type2: cryptoMonData.type2,
      name: pokedex[cryptoMonInstance.id - 1].name.english.toLowerCase().replace('. ', '-').replace('\'', ''),
      shiny: cryptoMonInstance.isShiny,
      gender: cryptoMonInstance.gender,
    }
  }

  hasForceMove = () => {
    const { forceMoveChallenge } = this.props;
    return forceMoveChallenge.state.channelId != "0";
  }

  needsMyForceMoveResponse = () => {
    const { ethAccount, forceMoveChallenge } = this.props;
    return CMBmover(forceMoveChallenge.state).toLowerCase() === ethAccount
  }

  isOver = () => {
    const { game } = this.props.currentState;
    return game.HPOP == 0 || game.HPPL == 0;
  }

  amIWinner = () => {
    const { currentState, ethAccount, isPlayer1, forceMoveChallenge } = this.props;

    if(!this.canConclude()) {
      return false;
    }

    if(this.isOver()) {
      return isPlayer1 ? currentState.game.HPOP == 0 : currentState.game.HPPL == 0;
    }

    return forceMoveChallenge.winner.toLowerCase() == ethAccount;
  }

  canConclude = () => {
    const { forceMoveChallenge } = this.props;
    return this.isOver() || (this.hasForceMove() && forceMoveChallenge.expirationTime + '000' < Date.now());
  }

  getLastOpponentState = () => {
    const { isPlayer1, currentState, prevState, ethAccount } = this.props;
    if (isPlayer1) return canIPlay(ethAccount, currentState) ? currentState : prevState;
    return prevState;
  }

  battleRefute = () => {
    const { plasmaCMContract, enqueueSnackbar, ethAccount } = this.props;

    const refutingState = this.getLastOpponentState();

    fallibleSnackPromise(
      refuteBattle(plasmaCMContract, refutingState),
      enqueueSnackbar,
      "Battle refuted successfully",
      "Error while refuting battle"
    );
  }

  renderAttacks = () => {
    const { isPlayer1, currentState, play, battleForceMove, ethAccount } = this.props;
    const {
      cryptoMonPLInstance,
      cryptoMonOPInstance,
      cryptoMonPLData,
      cryptoMonOPData,
      HPOP,
      HPPL,
      status1OP,
      status1PL,
      status2OP,
      status2PL,
      chargePL,
      chargeOP,
    } = currentState.game;

    if (!canIPlay(ethAccount, currentState) && !(this.hasForceMove() && this.needsMyForceMoveResponse())) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Typography>Waiting for the other player...</Typography>
          <Button
            disabled={this.hasForceMove()}
            variant="outlined"
            size="small"
            style={{ margin: '0 1em' }}
            onClick={() => battleForceMove()}
          >
            Force Move
          </Button>
        </div>
      )
    }


    let player = this.getCryptoMonData(
      cryptoMonPLInstance, cryptoMonPLData, cryptoMonOPData, HPPL, status1PL, status2PL, status1OP, status2OP, chargePL
    );

    let opponent = this.getCryptoMonData(
      cryptoMonOPInstance, cryptoMonOPData, cryptoMonPLData, HPOP, status1OP, status2OP, status1PL, status2PL, chargeOP
    );

    if(!isPlayer1) {
      [player, opponent] = [opponent, player];
    }

    const type1 = getTypeData(player.type1);
    const type2 = getTypeData(player.type2);
    const opponentType1 = getTypeData(opponent.type1);
    const opponentType2 = getTypeData(opponent.type2);

    const isStatusBlocked = (opponentType1.name == 'Ice' && player.status1) || (opponentType2.name == 'Ice' && player.status2)

    return (
      <React.Fragment>
        <p>Charges: {player.charge}/3</p>
        <Grid container style={{ margin: '0 0.5em' }} align="row" spacing={2}>
          <Grid item>
            <Button variant="outlined" disabled={player.charge === 3} onClick={() => play(Moves.RECHARGE)}>Recharge</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.PROTECT)}>Protect</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.CLEANSE)} disabled={player.charge === 0}>Cleanse</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.SHIELD_BREAK)} disabled={player.charge === 0}>Shield Break</Button>
          </Grid>
        </Grid>

        <Grid container style={{ margin: '0 0.5em' }} align="row" spacing={2}>
          <Grid item style={{ width: '8.2em' }}>
            <Typography style={{ textAlign: 'center' }}>{type1.name} attacks</Typography>
            <img src={type1.image} alt={type1.name} style={{ display: 'block', margin: 'auto' }} />
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.ATK1)} disabled={player.charge === 0}>Attack</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.SPATK1)} disabled={player.charge === 0}>Special Attack</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => play(Moves.STATUS1)} disabled={player.charge === 0 || isStatusBlocked}>{Status[player.type1].name}</Button>
          </Grid>
        </Grid>

        {player.type2 != Type.Unknown && (
          <Grid container style={{ margin: '0 0.5em' }} align="row" spacing={2}>
            <Grid item style={{ width: '8.2em' }}>
              <Typography style={{ textAlign: 'center' }}>{type2.name} attacks</Typography>
              <img src={type2.image} alt={type2.name} style={{ display: 'block', margin: 'auto' }} />
            </Grid>
            <Grid item>
              <Button variant="outlined" onClick={() => play(Moves.ATK2)} disabled={player.charge === 0}>Attack</Button>
            </Grid>
            <Grid item>
              <Button variant="outlined" onClick={() => play(Moves.SPATK2)} disabled={player.charge === 0}>Special Attack</Button>
            </Grid>
            <Grid item>
              <Button variant="outlined" onClick={() => play(Moves.STATUS2)} disabled={player.charge === 0 || isStatusBlocked}>{Status[player.type2].name}</Button>
            </Grid>
          </Grid>
        )}
      </React.Fragment>
    )
  }

  render = () => {
    const { isPlayer1, currentState , concludeBattle, signAndSend, forceMoveChallenge } = this.props;
    const {
      cryptoMonPLInstance,
      cryptoMonOPInstance,
      cryptoMonPLData,
      cryptoMonOPData,
      HPOP,
      HPPL,
      status1OP,
      status1PL,
      status2OP,
      status2PL,
      chargePL,
      chargeOP,
      events,
    } = currentState.game;

    const FMTurnNum = forceMoveChallenge.state.turnNum;
    const lastOpponentState = this.getLastOpponentState();

    const hasForceMoveChallenge = forceMoveChallenge.state.channelId != '0';

    const showRefuteButton =
      hasForceMoveChallenge
      && lastOpponentState
      && this.needsMyForceMoveResponse()
      && (
          parseInt(FMTurnNum) < lastOpponentState.turnNum
          || (
            parseInt(FMTurnNum) == lastOpponentState.turnNum
            && forceMoveChallenge.state.gameAttributes != EthUtils.bufferToHex(toCMBBytes(lastOpponentState.game)).toLowerCase()
          )
        );

    console.log({hasForceMoveChallenge, lastOpponentState, forceMoveChallenge, showRefuteButton})

    let player = this.getCryptoMonData(
      cryptoMonPLInstance, cryptoMonPLData, cryptoMonOPData, HPPL, status1PL, status2PL, status1OP, status2OP, chargePL
    );

    let opponent = this.getCryptoMonData(
      cryptoMonOPInstance, cryptoMonOPData, cryptoMonPLData, HPOP, status1OP, status2OP, status1PL, status2PL, chargeOP
    );

    if(!isPlayer1) {
      [player, opponent] = [opponent, player];
    }

    return (
      <div style={{ borderStyle: 'double', borderWidth: 'thick', background: 'white', display: 'flex', flexDirection: 'column', padding: '1em' }}>
        {this.hasForceMove() && this.needsMyForceMoveResponse() && (
          <div style={{ display: 'flex', alignContent: 'center' }}>
            <WarningIcon fontSize="small" style={{ margin: "0.2em", color: 'coral' }} />
            <Typography style={{ color: 'coral', display: 'inline' }} variant="body1">Force Move issued, please respond</Typography>
          </div>
        )}
        {this.hasForceMove() && !this.needsMyForceMoveResponse() && (
          <div style={{ display: 'flex', alignContent: 'center' }}>
            <WarningIcon fontSize="small" style={{ margin: "0.2em", color: 'coral' }} />
            <Typography style={{ color: 'coral', display: 'inline' }} variant="body1">Waiting for other to respond Force Move</Typography>
          </div>
        )}

        <div style={{ display: 'flex' }}>
          <PokemonStats cryptoMon={opponent} />
          <img
            className="pokemonGif"
            src={`https://img.pokemondb.net/sprites/black-white/anim/${opponent.shiny ? 'shiny' : 'normal'}/${opponent.name}.gif`} alt={opponent.name}
          />
        </div>
        <div style={{ display: 'flex' }}>
          <img
            className="pokemonGif"
            src={`https://img.pokemondb.net/sprites/black-white/anim/${player.shiny ? 'back-shiny' : 'back-normal'}/${player.name}.gif`} alt={player.name}
          />
          <PokemonStats cryptoMon={player}/>
        </div>
        <Events events={events} />
        {!this.canConclude() && showRefuteButton && <Button variant="outlined" color="primary" onClick={this.battleRefute}>Refute Force Move</Button>}
        {!this.canConclude() && !showRefuteButton && this.renderAttacks()}
        {this.canConclude() && !this.amIWinner() && !isPlayer1 && <Button variant="outlined" color="primary" onClick={signAndSend}>Sign and notify</Button>}
        {this.canConclude() && !this.amIWinner() && isPlayer1 && <Typography style={{ color: 'coral', display: 'inline' }} variant="body1">Waiting for opponent to conclude battle</Typography>}
        {this.canConclude() && this.amIWinner() && <Button variant="outlined" color="primary" onClick={concludeBattle}>Conclude battle</Button>}
      </div>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
	plasmaCMContract: state.plasmaCMContract,
 });

const mapDispatchToProps = dispatch => ({});

export default connect(mapStateToProps, mapDispatchToProps)(withSnackbar(CurrentBattle));