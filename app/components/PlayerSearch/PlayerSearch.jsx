import React from 'react';
import {connect} from "react-redux";

import InitComponent from '../common/InitComponent.jsx';
import withInitComponent from '../common/withInitComponent.js';

import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import StartBattleModal from './StartBattleModal.jsx';

import CryptoMonCard from '../common/CryptoMonCard.jsx';

import {getOwnedTokens} from '../../../services/plasmaServices';

class PlayerSearch extends InitComponent {

  constructor(props) {
    super(props);
    this.state = {
      cryptoMons: [],
      playerId: '',
      startBattleModalOpen: false,
    }
  }

  handleChange = field => event => {
    this.setState({ [field]: event.target.value });
  }

  searchPlayer = () => {
    const { playerId } = this.state;
    getOwnedTokens(playerId, 'deposited').then(cryptoMons => this.setState({ cryptoMons, searchedPlayer: playerId }))
  }

  openBattleModal = token => () => this.setState({ startBattleModalOpen: true, selectedToken: token });
  closeBattleModal = () => this.setState({ startBattleModalOpen: false });

  render = () => {
    const { playerId, cryptoMons, startBattleModalOpen, selectedToken, searchedPlayer } = this.state;

    return (
      <React.Fragment>
        <StartBattleModal
          open={startBattleModalOpen}
          opponentToken={selectedToken}
          opponentAddress={searchedPlayer}
          handleClose={this.closeBattleModal}
        />
        <Paper style={{ margin: '1em', padding: '1em', display: 'inline-block' }}>
          <Typography variant="body1" style={{ display: "inline-block" }}>Search player:</Typography>
          <TextField
            style={{ margin: '0 0.5em' }}
            value={playerId}
            onChange={this.handleChange("playerId")}
            placeholder="Player ID"
          />
          <Button
            variant="outlined"
            disabled={!playerId}
            onClick={this.searchPlayer}
          >
            Search
          </Button>
        </Paper>
        <Grid container spacing={4} direction="row">
        {cryptoMons.map(token =>
          <Grid item key={token}>
            <CryptoMonCard
              plasmaToken={token}
              actions={[{
                title: "Start Battle",
                func: this.openBattleModal(token)
              }]}
            />
          </Grid>
        )}
        </Grid>
      </React.Fragment>
    )
  }

}



const mapStateToProps = state => ({
  cryptoMonsContract: state.cryptoMonsContract,
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withInitComponent(PlayerSearch));
