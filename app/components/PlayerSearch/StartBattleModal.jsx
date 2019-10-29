import React from 'react';

import { connect } from "react-redux";
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';

import InitComponent from '../common/InitComponent.jsx';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';

import CryptoMonCard from '../common/CryptoMonCard.jsx';

import { getOwnedTokens } from '../../redux/actions';

import { getInitialCMBState, toCMBBytes } from "../../../utils/CryptoMonsBattles"
import { initiateBattle, getCryptomon, getPlasmaCoinId } from '../../../services/ethService';
import { getExitData } from "../../../services/plasmaServices";
import { getExitDataToBattleRLPData } from "../../../utils/cryptoUtils";

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class StartBattleModal extends InitComponent {

  init = () => {
    const { getOwnedTokens, ethAccount } = this.props;
		getOwnedTokens(ethAccount, 'deposited');
  }

  onBattleStart = ownToken => async () => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract, opponentToken, opponentAddress } = this.props;

    this.setState({ startingBattle: true })

    const tokenPLID = await getPlasmaCoinId(ownToken, rootChainContract);
    const tokenOPID = await getPlasmaCoinId(opponentToken, rootChainContract);
    const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMonsContract);
    const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMonsContract);
    const exitData = await getExitData(ownToken);
    const exitRLPData = getExitDataToBattleRLPData(0, exitData);

    const initialState = getInitialCMBState(ownToken, tokenPLInstance, opponentToken, tokenOPInstance);
    await initiateBattle(plasmaCMContract, plasmaTurnGameContract.address, opponentAddress, 10, toCMBBytes(initialState), exitRLPData);
    this.props.history.push('/battles');
  }

  render = () => {
    const { open, handleClose, plasmaTokens, classes, startingBattle } = this.props;

    console.log(this.props)

    return (
      <Dialog open={open} onClose={handleClose} classes={{ paper: classes.dialogPaper }}>
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
	rootChainContract: state.rootChainContract,
  plasmaTokens: state.plasmaTokens,
});

const mapDispatchToProps = dispatch => ({
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
});


export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(StartBattleModal)));