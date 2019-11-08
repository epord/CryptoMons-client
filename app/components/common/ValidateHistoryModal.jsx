import React from 'react';

import InitComponent from './InitComponent.jsx';
import withInitComponent from './withInitComponent.js';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';

import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import HistoryIcon from '@material-ui/icons/History';
import CancelIcon from '@material-ui/icons/Cancel';

import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';

import {getProofHistory} from "../../../services/plasmaServices";
import {HISTORY_VALIDITY, verifyTokenWithHistory} from "../../../services/verifyHistory";
import {css} from '@emotion/core';
import PacmanLoader from 'react-spinners/PacmanLoader';

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class ValidateHistoryModal extends InitComponent {
  constructor(props) {
    super(props)
    this.state = { blocks: undefined }
  }

  init = () => {
    const { token } = this.props;
    this.setState({loading: true})
    this.validateHistory(token);
    console.log("Searching");
  };

  validateHistory = token => {
    const { rootChainContract } = this.props;
    getProofHistory(token).then(h => {
      this.setState({blocks: Object.keys(h).length}, () => {
        this.forceUpdate();
        verifyTokenWithHistory(token, h, rootChainContract).then(
          ({validity, lastOwner, blockNumber, transactionsHistory, swappingOwner}) => {
            console.log(`Correct history! Last true owner: ${lastOwner}`);
            console.log(transactionsHistory)
            this.setState({loading: false, historyValid: validity, lastValidOwner: lastOwner, swappingOwner, lastValidBlock: blockNumber});
          }).catch(err => {
          console.log(`Error in history! ${err.error}. Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
          this.setState({
            loading: false,
            historyValid: HISTORY_VALIDITY.INVALID,
            lastValidOwner: err.lastOwner,
            lastValidBlock: err.blockNumber
          })
        });
      });
    });
  };

  render = () => {
    const { loading, blocks, historyValid, lastValidOwner, lastValidBlock, swappingOwner } = this.state;
    const { open, token, classes, handleClose } = this.props;

    let result = <h1 />;


// import CheckCircleIcon from '@material-ui/icons/CheckCircle';
// import HistoryIcon from '@material-ui/icons/History';
// import CancelIcon from '@material-ui/icons/Cancel';
    if(!loading) {
      if(historyValid === HISTORY_VALIDITY.CORRECT) {
        result = (
          <div style={{ color: 'green', margin: '1em' }}>
            <CheckCircleIcon />
            <Typography style={{ display: 'contents' }}>History validated, true owner: {lastValidOwner}</Typography>
          </div>
        );
      } else if(historyValid === HISTORY_VALIDITY.WAITING_FOR_SWAP) {
        result = (
          <div style={{ color: 'orange', margin: '1em' }}>
            <HistoryIcon />
            <Typography style={{ display: 'contents' }}>Waiting for swap on block {lastValidBlock}, last known owner: {lastValidOwner}, swappingOwner: {swappingOwner}</Typography>
          </div>
        );
      } else {
        result = (
          <div style={{ color: 'red', margin: '1em' }}>
            <CancelIcon />
            <Typography style={{ display: 'contents' }}>History can't be validated after block {lastValidBlock}, last known owner: {lastValidOwner}</Typography>
          </div>
        );
      }
    }
    const override = css`
      display: block;
      margin: 0 auto;
      border-color: red;
    `;

    return (<Dialog open={Boolean(open)} onClose={handleClose} classes={{ paper: classes.dialogPaper }}>
      {!blocks &&  <DialogTitle>Fetching History</DialogTitle>}
      {blocks &&  <DialogTitle>Validating {blocks} blocks</DialogTitle>}
      <PacmanLoader
        css={override}
        sizeUnit={"px"}
        size={30}
        color={'rgb(204, 0, 0)'}
        loading={loading}
      />

      {result}
    </Dialog>)
  }

}

const mapStateToProps = state => ({
  rootChainContract: state.rootChainContract,
});

const mapDispatchToProps = dispatch => ({
});

export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(withInitComponent(ValidateHistoryModal))));