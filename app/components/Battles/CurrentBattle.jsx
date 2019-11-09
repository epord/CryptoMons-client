import React from 'react';
import {connect} from "react-redux";
import PokemonStats from './PokemonStats.jsx';
import Events from './Events.jsx';
import { pokedex } from '../../../utils/pokedex';
import { getTypeData, Type, Status } from '../../../utils/pokeUtils';
import { Moves } from "../../../utils/BattleDamageCalculator";
import { CMBmover } from "../../../utils/CryptoMonsBattles";

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import WarningIcon from '@material-ui/icons/Warning';

import './CurrentBattle.css';
import {battleForceMove, battleRespondWithMove} from "../../../services/ethService";

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
      boost2: otherStatus2 ? cryptoMonData.type1 : null,
      currentHP: HP,
      hp: cryptoMonInstance.stats.hp,
      id: cryptoMonInstance.id,
      charge,
      type1: cryptoMonData.type1,
      type2: cryptoMonData.type2,
      name: pokedex[cryptoMonInstance.id - 1].name.english.toLowerCase(),
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
    return CMBmover(forceMoveChallenge.state).toLowerCase() !== ethAccount
  }

  renderAttacks = () => {
    const { isPlayer1, game, play, turn, battleForceMove, battleRespondForceMove, forceMoveChallenge } = this.props;
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
      nextHashDecision,
    } = game;

    const notMyTurn = (isPlayer1 && turn % 2 === 0) || (!isPlayer1 && (nextHashDecision || turn == 1));

    if (notMyTurn && !(this.hasForceMove() && this.needsMyForceMoveResponse())) {
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
            <Button variant="outlined" onClick={() => play(Moves.STATUS1)} disabled={player.charge === 0}>{Status[player.type1].name}</Button>
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
              <Button variant="outlined" onClick={() => play(Moves.STATUS2)} disabled={player.charge === 0}>{Status[player.type2].name}</Button>
            </Grid>
          </Grid>
        )}
      </React.Fragment>
    )
  }

  render = () => {
    const { isPlayer1, game, concludeBattle, forceMoveChallenge } = this.props;
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
    } = game;


    let player = this.getCryptoMonData(
      cryptoMonPLInstance, cryptoMonPLData, cryptoMonOPData, HPPL, status1PL, status2PL, status1OP, status2OP, chargePL
    );

    let opponent = this.getCryptoMonData(
      cryptoMonOPInstance, cryptoMonOPData, cryptoMonPLData, HPOP, status1OP, status2OP, status1PL, status2PL, chargeOP
    );

    if(!isPlayer1) {
      [player, opponent] = [opponent, player];
    }

    // TODO: add dead pokemon
    const isBattleFinished = !this.hasForceMove() || forceMoveChallenge.expirationTime + '000' < Date.now();

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
        {!isBattleFinished && this.renderAttacks()}
        {isBattleFinished && <Button varaint="outlined" color="primary" onClick={concludeBattle}>Conclude battle</Button>}

      </div>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
 });

const mapDispatchToProps = dispatch => ({});

export default connect(mapStateToProps, mapDispatchToProps)(CurrentBattle);