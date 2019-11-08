import React from 'react';

import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';

import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';

import CryptoMonCard from './common/CryptoMonCard.jsx';

import _ from 'lodash';
import async from 'async';

import {
  challengeAfter,
  challengeBefore,
  challengeBetween,
  createBattle,
  exitTokenWithData,
  finalizeExit,
  getChallenge,
  respondChallenge,
  withdraw
} from '../../services/ethService';
import {createAtomicSwap, getExitData, transferInPlasma} from '../../services/plasmaServices';
import SelectPlayerTokenModal from "./common/SelectPlayerTokenModal.jsx";
import ValidateHistoryModal from "./common/ValidateHistoryModal.jsx";
import {withSnackbar} from "notistack";
import {toAddressColor, toReadableAddress} from "../../utils/utils";
import {getSwappingRequests, getSwappingTokens} from "../redux/actions";

const styles = theme => ({
  dialogPaper: {
    maxWidth: '40em',
    width: '40em',
  },
});

class PlasmaTokens extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      transferModalOpen: false,
      swapModalOpen: false,
      onSwapClicked: false,
    }
  }

  transferInPlasma = async token => {
    const { transferAddress } = this.state;
    const { enqueueSnackbar } = this.props;
    console.log(`Transfering ${token} to ${transferAddress}`);

    transferInPlasma(token, transferAddress).then(() =>{
      console.log("Successful Submission, wait for mining");
      enqueueSnackbar(`Transfer submitted, wait for mining`, { variant: 'warning' })
      this.closeTransferModal();
    }).catch( e => {
      enqueueSnackbar(`Error Transfering the token`, {variant: 'error'})
      this.closeTransferModal();
    });
  };

  swapInPlasma = (token) => async (player, swapToken) => {
    const { enqueueSnackbar, getSwappingTokens, ethAccount } = this.props;
    console.log(`Swapping ${token} with ${swapToken}`);

    this.setState({ swapping: true });
    createAtomicSwap(token, swapToken).then(secret => {
      this.setState({ secret, swapping: false });
      enqueueSnackbar(`Swap submitted, wait for the other party to accept it`, { variant: 'warning' })
      getSwappingTokens(ethAccount);
    }).catch(err => {
      this.setState({ swapping: false })
      enqueueSnackbar(`Swap submission failed`, { variant: 'error' })
    })
  }

  exitToken = token => async () => {
    const { rootChainContract } = this.props;
    const exitData = await getExitData(token);

    exitTokenWithData(rootChainContract, exitData).then(
      () => console.log("Exit successful")
    );
  };

  finalizeExit = token => async () => {
    const { rootChainContract, enqueueSnackbar } = this.props;
    finalizeExit(rootChainContract, token)
      .then(r => enqueueSnackbar(`Token #${token} exit finalized successfully`, { variant: 'success' }))
      .catch(e => enqueueSnackbar(typeof e == "string"? e : "Finalize Exit failed", { variant: 'error' }));
  };

  challengeBefore = token => async () => {
    const { rootChainContract, enqueueSnackbar } = this.props;
    console.log(`Challenging Before: ${token}`);
    challengeBefore(token, rootChainContract)
      .then(r => enqueueSnackbar(`Token #${token} challenged successfully`, { variant: 'success' }))
      .catch(e => enqueueSnackbar(typeof e == "string"? e : "Challenge Before failed", { variant: 'error' }));
  };

  challengeBetween = token => () => {
    const { rootChainContract, enqueueSnackbar } = this.props;
    console.log(`Challenging Between: ${token}`);
    challengeBetween(token, rootChainContract)
      .then(r => enqueueSnackbar(`Token #${token} challenged successfully`, { variant: 'success' }))
      .catch(e => enqueueSnackbar(typeof e == "string"? e : "Challenge Between failed", { variant: 'error' }));
  };

  challengeAfter = token => () => {
    const { rootChainContract, enqueueSnackbar } = this.props;
    console.log(`Challenging After: ${token}`);
    challengeAfter(token, rootChainContract)
      .then(r => enqueueSnackbar(`Token #${token} challenged successfully`, { variant: 'success' }))
      .catch(e => enqueueSnackbar(typeof e == "string"? e : "Challenge After failed", { variant: 'error' }));
  };

  withdraw = token => async () => {
    const { rootChainContract } = this.props;
    await withdraw(rootChainContract, token);
    console.log("Withdrawn successful");
  };

  respondChallenge = async (token, hash) => {
    const { rootChainContract, enqueueSnackbar } = this.props;
    const challenge = await getChallenge(token, hash, rootChainContract);
    const challengingBlock = challenge[3];
    await respondChallenge(token, challengingBlock, hash, rootChainContract)
      .then(r => enqueueSnackbar(`Token #${token} challenged responded successfully`, { variant: 'success' }))
      .catch(e => enqueueSnackbar(typeof e == "string"? e : "Challenge response failed", { variant: 'error' }));
    this.closeRespondChallengeModal()
  };

  onBattleStart = ownToken => async (opponent, opponentToken) => {
    const { plasmaCMContract, plasmaTurnGameContract, cryptoMonsContract, rootChainContract } = this.props;
    await this.setState({ startingBattle: true });
    await createBattle(ownToken, opponentToken, opponent, undefined,
      rootChainContract, cryptoMonsContract, plasmaCMContract, plasmaTurnGameContract
    );
    this.props.history.push('/battles');
  };

  openTransferModal = token => () => this.setState({ transferModalOpen: true, tokenToTransact: token });

  closeTransferModal= () => this.setState({ transferModalOpen: false });

  openSwapModal = token => () => this.setState({ swapModalOpen: true, tokenToSwap: token });

  closeSwapModal = () => this.setState({ swapModalOpen: false, tokenToSwap: undefined, secret: undefined });

  openBattleModal = token => () => this.setState({ battleModalOpen: true, tokenToBattle: token });

  closeBattleModal = () => this.setState({ battleModalOpen: false, tokenToBattle: undefined });

  openValidateHistoryModal = (opponent, token) => this.setState({
    validateHistoryOpen: true,
    validatingToken: token,
  });

  closeValidateHistoryModal = () => this.setState({ validateHistoryOpen: false, validatingToken: undefined });

  openRespondChallengeModal = (challengedSlot, challengeHashes) => () => {
    //TODO add disable to button so no multiple fetches are being done
    const { rootChainContract } = this.props;
    const getChallenges = challengeHashes.map(hash => async cb => {
      const ans = await getChallenge(challengedSlot, hash, rootChainContract)
      const challenge = {
        owner: ans[0],
        challenger: ans[1],
        txHash: ans[2],
        blockNumber: ans[3],
      }
      cb(null, challenge);
    });
    async.parallel(getChallenges, (err, challenges) => {
      if (err) {
        console.error(err);
        this.closeRespondChallengeModal();
      }
      this.setState({
        respondModalOpen: true,
        challengedSlot,
        challengesToRespond: challenges
      });
    });
  }

  closeRespondChallengeModal = () => this.setState({ respondModalOpen: false });

  handleChange = fieldName => event => {
    this.setState({ [fieldName]: event.target.value });
  }

  renderRespondChallengeDialog = () => {
    const { respondModalOpen, challengedSlot, challengesToRespond } = this.state;
    const { classes } = this.props;
    const challengesCount = challengesToRespond ? challengesToRespond.length : 0;

    return (
      <Dialog
        onClose={this.closeRespondChallengeModal}
        open={Boolean(respondModalOpen)} classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>Respond to challenges</DialogTitle>
        <Grid style={{ padding: '1em', paddingTop: "0"}}>
        {(challengesToRespond || []).map(challenge => (
          <div
            key={challenge.txHash}
            style={{
            border: "2px solid black",
            borderRadius: "5px",
            margin: "0.5em",
            padding: "0.5em",
            display: "flex",
            flexDirection: "column"
          }}>

            <Typography style={{textAlign: "center", fontWeight: "bold"}}>
              <span style={{color: toAddressColor(challenge.owner)}}>{toReadableAddress(challenge.owner)} </span>
              challenged this Token in block {challenge.blockNumber}</Typography>
            <Button variant="contained" color="primary" onClick={() => this.respondChallenge(challengedSlot, challenge.txHash)}>Respond Challenge</Button>
          </div>
        ))}
        </Grid>
      </Dialog>
    )
  }

  renderTransferDialog = () => {
    const { transferModalOpen, tokenToTransact } = this.state;
    const { classes } = this.props;
    return (
      <Dialog onClose={this.closeTransferModal} open={Boolean(transferModalOpen)} classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>Transfer token</DialogTitle>
        <Grid container style={{ padding: '1em' }}>
          <Grid item xs={12} style={{ padding: '1em' }}>
            <TextField
              label="Transfer to"
              fullWidth
              onChange={this.handleChange('transferAddress')}
              value={this.state.transferAddress || ''}
              placeholder="Address" />
          </Grid>
          <Grid item xs={12} style={{ padding: '1em' }}>
            <Button color="primary" fullWidth onClick={() => this.transferInPlasma(tokenToTransact)} variant="outlined" size="small">Transfer</Button>
          </Grid>
        </Grid>
      </Dialog>
    )
  }

  secretDialog = (player, token) => {
    let {secret} = this.state;
    if(!token || !secret) {
      return (<div/>);
    } else {
      return (
        <div>
          <React.Fragment>
            <Typography variant="body1" style={{display: 'block', margin: 'auto'}}><b>IMPORTANT!</b></Typography>
            <Typography variant="body1" style={{display: 'block', margin: 'auto'}}>This is the random generated secret
              you will need to reveal in order to validate the transaction later:</Typography>
            <Typography variant="body1" style={{display: 'block', margin: 'auto'}}><b>{secret}</b></Typography>
          </React.Fragment>
        </div>
      )
    }
  };

  renderSwapDialog = () => {
    const { swapModalOpen, secret, swapping, validateHistoryOpen, tokenToSwap } = this.state;
    return (
      <React.Fragment>
        <SelectPlayerTokenModal
          title={"Select a Cryptomon to Swap with"}
          open={swapModalOpen}
          handleClose={this.closeSwapModal}
          actions = {[{
            title: "Select",
            disabled: swapping || Boolean(secret),
            func: this.swapInPlasma(tokenToSwap)
          },{
            title: "Validate History",
            disabled: validateHistoryOpen,
            func: this.openValidateHistoryModal
          }]}
          appendix={this.secretDialog}
        />
        {this.renderValidateHistoryDialog()}
      </React.Fragment>
    )
  };

  renderBattleDialog = () => {
    const { battleModalOpen, startingBattle, validateHistoryOpen, tokenToBattle } = this.state;
    return (
      <React.Fragment>
        <SelectPlayerTokenModal
          title={"Select a Cryptomon to Battle against"}
          open={battleModalOpen}
          handleClose={this.closeBattleModal}
          actions = {[{
            title: "Select",
            disabled: startingBattle,
            func: this.onBattleStart(tokenToBattle)
          },{
            title: "Validate History",
            disabled: validateHistoryOpen,
            func: this.openValidateHistoryModal
          }
          ]}
        />
        {this.renderValidateHistoryDialog()}
      </React.Fragment>
    )
  };

  renderValidateHistoryDialog = () => {
    const { validateHistoryOpen, validatingToken, } = this.state;
    return (
      (validateHistoryOpen &&
        <ValidateHistoryModal
          open={validateHistoryOpen}
          handleClose={this.closeValidateHistoryModal}
          token={validatingToken}
        />)
    )
  };


  render = () => {
    const { plasmaTokens, exitingTokens, challengeableTokens, exitedTokens, challengedTokens, swappingTokens, ethAccount } = this.props;
    const { validateHistoryOpen } = this.state;

    if (plasmaTokens.length + exitingTokens.length + challengeableTokens.length + exitedTokens.length + swappingTokens.length === 0) {
      return (
        <Typography style={{ margin: 'auto' }}  variant="body1">You do not have any Plasma token. Deposit one of your CryptoMons once you have one!</Typography>
      )
    }

    return (
      <React.Fragment>
        {this.renderTransferDialog()}
        {this.renderSwapDialog()}
        {this.renderRespondChallengeDialog()}
        {this.renderBattleDialog()}
        <Grid container spacing={3} alignContent="center" alignItems="flex-start">
          {plasmaTokens.map(token => (
            <Grid item key={token}>
              <CryptoMonCard
                plasmaToken={token}
                actions={[
                  {
                    title: "Transfer",
                    func: this.openTransferModal(token)
                  },{
                    title: "Swap",
                    func: this.openSwapModal(token)
                  },{
                    title: "Battle",
                    func: this.openBattleModal(token)
                  },{
                    title: "Exit",
                    func: this.exitToken(token)
                  }
                ]}
              />
            </Grid>
          ))}
          {_.uniqBy(swappingTokens, "slot").map(token => (
            <Grid item key={token.slot}>
              <CryptoMonCard
                plasmaToken={token.slot}
                swapping
                actions={[
                  {
                    title: "Validate History",
                    disabled: validateHistoryOpen,
                    func: () => this.openValidateHistoryModal(ethAccount, token.slot)
                  }
                ]}
              />
            </Grid>
          ))}
          {_.differenceWith(challengeableTokens, challengedTokens, (c1,c2) => c1 === c2.slot).map(token => (
            <Grid item key={token}>
              <CryptoMonCard
                plasmaToken={token}
                challengeable
                actions={[
                  {
                    title: "Challenge After",
                    func: this.challengeAfter(token)
                  },{
                    title: "Challenge Between",
                    func: this.challengeBetween(token)
                  },{
                    title: "Challenge Before",
                    func: this.challengeBefore(token)
                  },
                ]}
              />
            </Grid>
          ))}
          {_.difference(exitingTokens, challengedTokens.map(t=>t.slot)).map(token => (
            <Grid item key={token}>
              <CryptoMonCard
                plasmaToken={token}
                exiting
                actions={[
                  {
                    title: "Finalize Exit",
                    disabled: false, //TODO have 2 arrays, one for exiting, another for readyToExit
                    func: this.finalizeExit(token)
                  }
                ]} />
            </Grid>
          ))}
          {challengedTokens.map(({ slot, txHash }) => (
            <Grid item key={slot}>
              <CryptoMonCard
                plasmaToken={slot}
                challenged
                actions={[
                  {
                    title: "Respond Challenge",
                    func: this.openRespondChallengeModal(slot, txHash)
                  },{
                    title: "Finalize Exit",
                    func: this.finalizeExit(slot)
                  }
                ]}
              />
            </Grid>
          ))}
          {exitedTokens.map(token => (
            <Grid item key={token}>
              <CryptoMonCard
                plasmaToken={token}
                exited
                actions={[
                  {
                    title: "Withdraw",
                    func: this.withdraw(token)
                  }
                ]}
              />
            </Grid>
          ))}
        </Grid>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => ({
  plasmaTokens: state.plasmaTokens,
  exitingTokens: state.exitingTokens,
  challengeableTokens: state.challengeableTokens,
  exitedTokens: state.exitedTokens,
  swappingTokens: state.swappingTokens,
  challengedTokens: state.challengedTokens,
  rootChainContract: state.rootChainContract,
  cryptoMonsContract: state.cryptoMonsContract,
  ethAccount: state.ethAccount,
  plasmaCMContract: state.plasmaCMContract,
  plasmaTurnGameContract: state.plasmaTurnGameContract
});

const mapDispatchToProps = dispatch => ({
  getSwappingRequests: address => dispatch(getSwappingRequests(address)),
  getSwappingTokens: address => dispatch(getSwappingTokens(address))
});

export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(withSnackbar(PlasmaTokens))));