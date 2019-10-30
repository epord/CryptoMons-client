import React from 'react';

import InitComponent from '../common/InitComponent.jsx';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';
import CryptoMonCard from '../common/CryptoMonCard.jsx';

import {getInitialCMBState, toCMBBytes} from "../../../utils/CryptoMonsBattles"
import TextField from "@material-ui/core/TextField";
import {getCryptomon, getCryptoMonsFrom, getPlasmaCoinId, initiateBattle} from "../../../services/ethService";
import {getExitDataToBattleRLPData} from "../../../utils/cryptoUtils";
import {getOwnedTokens} from "../../../services/plasmaServices";

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class HackSearchOpponentModal extends InitComponent {
  constructor(props) {
    super(props)
    this.state = {
      plasmaTokens: [],
    }
  }

  init = () => {

  };

  onOpponentChange = event => {
    let { cryptoMonsContract } = this.props;
    let opponent = event.target.value;
    getOwnedTokens(opponent, 'deposited').then(p => {
      this.setState({opponent, plasmaTokens: p})
    });
  };


  onBattleStart = opponentToken => async () => {
    this.setState({ startingBattle: true });

    const { opponent } = this.state;
    const {
      exitData, hackedSlot,
      plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract } = this.props;

    const tokenPLID = await getPlasmaCoinId(hackedSlot, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(opponentToken, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract);
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract);
    const exitRLPData = getExitDataToBattleRLPData(0, exitData);

    const initialState = getInitialCMBState(hackedSlot, tokenPLInstance, opponentToken, tokenOPInstance);
    await initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponent, 10, toCMBBytes(initialState), exitRLPData);
    this.props.history.push('/battles');
  };

  render = () => {
    const { open, handleClose, classes, startingBattle } = this.props;
    const { plasmaTokens, opponent } = this.state

    return (
      <Dialog open={open} onClose={handleClose} classes={{ paper: classes.dialogPaper }}>
        <TextField
          style={{ margin: '0 0.5em' }}
          value={opponent || ''}
          onChange={this.onOpponentChange}
          placeholder="Select Opponent" />

        <DialogTitle>Select a Cryptomon to battle with</DialogTitle>
        <div style={{ padding: '1em', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {plasmaTokens.map(token => (
              <div style={{ marginTop: '0.5em' }} key={token}>
                <CryptoMonCard
                  plasmaToken={token}
                  actions={[{
                    title: "Select",
                    disabled: startingBattle,
                    func: this.onBattleStart(token)
                  }]}
                />
              </div>
            ))}
        </div>

      </Dialog>
    )
  }

}

const mapStateToProps = state => ({
	ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
	plasmaCMContract: state.plasmaCMContract,
	plasmaTurnGameContract: state.plasmaTurnGameContract,
	cryptoMonsContract: state.cryptoMonsContract,
	rootChainContract: state.rootChainContract
});

const mapDispatchToProps = dispatch => ({});


export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(HackSearchOpponentModal)));