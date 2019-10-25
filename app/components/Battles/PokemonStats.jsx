import React from 'react';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import { pokedex } from '../../../utils/pokedex';

class PokemonStats extends React.Component {

  constructor(props) {
    super(props);
    this.state = { life: 100 };
    setInterval(this.looseLife, 500);
  }

  looseLife = () => {
    const { life } = this.state;
    if (life == 0) return;
    const diff = Math.ceil(Math.random() * 10);
    this.setState({ life: Math.max(0, life - diff) })
  }

  render = () => {
    const { life } = this.state;
    const { cryptoMon } = this.props;
    const {
      status1,
      status2,
      boost1,
      boost2,
      currentHP,
      hp,
      id,
    } = cryptoMon;

    const pokemonName = pokedex[id - 1].name.english;

    return (
      <div style={{ borderStyle: 'double', borderWidth: 'thick', background: 'white', display: 'table', alignSelf: 'center', padding: '0.5em' }}>
        <Typography>{pokemonName}</Typography>
        <LinearProgress color="secondary" variant="determinate" value={100 - (hp -currentHP) / hp * 100} />
        <Typography variant="caption">{currentHP}/{hp}</Typography>
      </div>
    )
  }
}

export default PokemonStats;