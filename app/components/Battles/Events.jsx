import React from 'react';
import { pokedex } from '../../../utils/pokedex';
import { Status, Type } from '../../../utils/pokeUtils';
import { Typography } from '@material-ui/core';

const effectiveMap = {
  0: "It's not effective at all.",
  1: "It's not effective.",
  2: "It's not very effective.",
  3: "",
  4: "It's super effective!",
  5: "It's mega effective!"
};

class Events extends React.Component {
  createEventSentence = event => {
    const { code, id, damage, hit, crit, type, effective } = event;
    const pokemon = pokedex[id - 1];
    const typeName = pokemon.type[type - 1];
    const typeId = Type[typeName];

    if (code == 'Attack') {
      return `${pokemon.name.english} used ${typeName.toLowerCase()} attack${hit ? `. ${effectiveMap[effective]}` : ', but missed...'} ${hit && crit ? 'A critical hit!' : ''}`;
    }
    if (code == 'Status') {
      return `${pokemon.name.english} used ${Status[typeId].name.toUpperCase()}${hit ? `.` : ', but missed...'}`;
    }
    if (code == 'Recharge') {
      return `${pokemon.name.english} recharged.`
    }
    if (code == 'Protect') {
      return `${pokemon.name.english} used protect.`
    }
    if (code == 'Cleanse') {
      return `${pokemon.name.english} used cleanse.`
    }
    if (code == 'ShieldBreak') {
      return `${pokemon.name.english} used shield break${hit ? `.` : ', but missed...'}`;
    }
    if (code == 'SPAttack') {
      return `${pokemon.name.english} used ${typeName.toLowerCase()} special attack${hit ? `. ${effectiveMap[effective]}` : ', but missed...'} ${hit && crit ? 'A critical hit!' : ''}`;
    }
    if (code == 'EndTurnDMG') {
      return `${pokemon.name.english} received additional damage.`;
    }
    if (code == 'EndTurnHealing') {
      return `${pokemon.name.english} recovered some health.`;
    }
    if (code == 'ConfusedDMG') {
      return `${pokemon.name.english} hurt itself in confusion!`;
    }
  }

  render = () => {
    const { events } = this.props;

    if (!events || events.length == 0) return null;

    return (
      <div style={{
        borderStyle: 'solid',
        borderWidth: '2px',
        padding: '0.5em',
        borderRadius: '5px',
      }}>
        {(events || []).map((event, i) => <Typography key={i} variant="body1">{this.createEventSentence(event)}</Typography>)}
      </div>
    )
  }

}

export default Events;