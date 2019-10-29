import React from 'react';
import { connect } from "react-redux";

import InitComponent from '../common/InitComponent.jsx';

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import StartBattleModal from './StartBattleModal.jsx';

import CryptoMonCard from '../common/CryptoMonCard.jsx';

import { getOwnedTokens } from '../../../services/plasmaServices';

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
        {cryptoMons.map(token =>
          <div key={token}>
            <CryptoMonCard
              plasmaToken={token}
              actions={[{
                title: "Start Battle",
                func: this.openBattleModal(token)
              }]}
            />
          </div>
        )}
      </React.Fragment>
    )
  }

}



const mapStateToProps = state => ({
  cryptoMonsContract: state.cryptoMonsContract,
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(PlayerSearch);
