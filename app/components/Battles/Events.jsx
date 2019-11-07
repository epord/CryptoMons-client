import React from 'react';
import { pokedex } from '../../../utils/pokedex';
import { Status } from '../../../utils/pokeUtils';
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
    if (code == 'Attack' && hit) {
      return `${pokemon.name.english} used with ${pokemon.type[type - 1].toLowerCase()} attack${hit ? `. ${effectiveMap[effective]}` : ', but missed...'}`;
    }
    if (code == 'Status') {
      return `${pokemon.name.english} used status '${Status[type-1].name.toLowerCase()}'${hit ? `.` : ', but missed...'}`;
    }
    if (code == 'Recharge') {
      return `${pokemon.name.english} recharged.`
    }
    if (code == 'Protected') {
      return `${pokemon.name.english} used protect.`
    }
    if (code == 'Cleanse') {
      return `${pokemon.name.english} used cleanse.`
    }
    if (code == 'ShieldBreak') {
      return `${pokemon.name.english} used shield break${hit ? `.` : ', but missed...'}`;
    }
    if (code == 'SPAttack' && hit) {
      return `${pokemon.name.english} used with ${pokemon.type[type - 1].toLowerCase()} special attack${hit ? `. ${effectiveMap[effective]}` : ', but missed...'}`;
    }
    if (code == 'EndTurnDMG') {
      console.log('END TURN DAMAGE', event)
      return `${pokemon.name.english} received end turn damage.`;
    }
    if (code == 'EndTurnHealing') {
      console.log('END TURN HEALING', event)
      return `${pokemon.name.english} received end turn HP.`;
    }
    if (code == 'ConfusedDMG') {
      console.log('Confused', event)
      return `${pokemon.name.english} is confused.`;
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
        {(events || []).map((event, i) => <Typography variant="body1">{this.createEventSentence(event)}</Typography>)}
      </div>
    )
  }

}

export default Events;