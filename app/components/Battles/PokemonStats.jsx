import React from 'react';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Status, renderGenderIcon } from '../../../utils/pokeUtils';

class PokemonStats extends React.Component {

  render = () => {
    const { cryptoMon } = this.props;
    const {
      status1,
      status2,
      boost1,
      boost2,
      currentHP,
      hp,
      id,
      charge,
      type1,
      type2,
      name,
      shiny,
      gender,
    } = cryptoMon;

    // console.log(cryptoMon)

    const pokemonName = name.charAt(0).toUpperCase() + name.slice(1);

    const effects = (() => {
      const effects1 = status1 ? Status[status1].effects : [];
      const effects2 = status2 ? Status[status2].effects : [];
      return [...effects1, ...effects2].filter(effect => !effect.isBoost);
    })();
    const boosts = (() => {
      const boosts1 = boost1 ? Status[boost1].effects : [];
      const boosts2 = boost2 ? Status[boost2].effects : [];
      return [...boosts1, ...boosts2].filter(effect => effect.isBoost);
    })();

    const showStatus = effects.length > 0 || boosts.length > 0;

    return (
      <div>
        {showStatus && (
          <div
            style={{
              borderStyle: 'dotted',
              borderWidth: 'thin',
              background: 'white',
              display: 'table',
              alignSelf: 'center',
              padding: '0.2em',
              width: '8em',
            }}
          >
            {effects.map(effect => <Typography key={effect.name} variant="body2" style={{ color: 'red'}}>{effect.name}</Typography>)}
            {boosts.map(boost => <Typography key={boost.name} variant="body2" style={{ color: 'green'}}>{boost.name}</Typography>)}

          </div>
        )}
        <div
          style={{
            borderStyle: 'solid',
            borderWidth: 'medium',
            background: 'white',
            display: 'table',
            alignSelf: 'center',
            padding: '0.5em',
            width: '15em',
          }}
        >
          <Typography>{pokemonName}{renderGenderIcon(gender)}</Typography>
          <LinearProgress style={{ marginBottom: '5px' }} color="secondary" variant="determinate" value={100 - (hp -currentHP) / hp * 100} />
          {status1 && <Typography variant="caption">{Status[status1].icon}</Typography>}
          {status2 && <Typography variant="caption">{Status[status2].icon}</Typography>}
          <Typography variant="caption">{currentHP}/{hp}</Typography>
        </div>
      </div>
    )
  }
}

export default PokemonStats;