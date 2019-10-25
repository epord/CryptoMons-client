import React from 'react';
import PokemonStats from './PokemonStats.jsx';
import { pokedex } from '../../../utils/pokedex';
import { Type } from '../../../utils/pokeUtils';
import { Moves } from "../../../utils/BattleDamageCalculator";

class CurrentBattle extends React.Component {
  getCryptoMonData(
    cryptoMonInstance,
    cryptoMonData,
    otherCryptoMonData,
    HP,
    status1,
    status2,
    otherStatus1,
    otherStatus2,
    charge) {

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
      shiny: cryptoMonInstance.shiny
    }
  }

  render = () => {
    const { isPlayer1, game, play } = this.props;
    const {
      cryptoMonPLInstance,
      cryptoMonOPInstance,
      cryptoMonPLData,
      cryptoMonOPData,
      HPOP,
      HPPL,
      status1OP, status1PL, status2OP, status2PL, chargePL, chargeOP  } = game;

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
        <div style={{ display: 'flex' }}>
          <PokemonStats cryptoMon={opponent} />
          <img
            style={{ height: '120px', imageRendering: 'pixelated', margin: '1em' }}
            src={`https://img.pokemondb.net/sprites/black-white/anim/${opponent.shiny ? 'shiny' : 'normal'}/${opponent.name}.gif`} alt={opponent.name}
          />
        </div>
        <div style={{ display: 'flex' }}>
          <img
            style={{ height: '120px', imageRendering: 'pixelated', margin: '1em' }}
            src={`https://img.pokemondb.net/sprites/black-white/anim/${player.shiny ? 'back-shiny' : 'back-normal'}/${player.name}.gif`} alt={player.name}
          />
          <PokemonStats cryptoMon={player}/>
        </div>
        <div>
          <button onClick={() => play(Moves.RECHARGE)}>Recharge</button>
          <button onClick={() => play(Moves.PROTECT)}>Protect</button>
          <button onClick={() => play(Moves.CLEANSE)} disabled={player.charge === 0}>Cleanse</button>
          <button onClick={() => play(Moves.SHIELD_BREAK)} disabled={player.charge === 0}>Shield Break</button>

          <button onClick={() => play(Moves.ATK1)} disabled={player.charge === 0}>Attack</button>
          <button onClick={() => play(Moves.SPATK1)} disabled={player.charge === 0}>Special Attack</button>
          <button onClick={() => play(Moves.STATUS1)} disabled={player.charge === 0}>Status</button>

          {player.type2 != Type.Unknown && (
            <React.Fragment>
              <button onClick={() => play(Moves.ATK2)} disabled={player.charge === 0}>Attack</button>
              <button onClick={() => play(Moves.SPATK2)} disabled={player.charge === 0}>Special Attack</button>
              <button onClick={() => play(Moves.STATUS2)} disabled={player.charge === 0}>Status</button>
            </React.Fragment>
          )}
        </div>
      </div>
    )
  }

}

export default CurrentBattle;