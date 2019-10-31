import React from 'react';

import InitComponent from './InitComponent.jsx';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';
import CryptoMonCard from './CryptoMonCard.jsx';

import TextField from "@material-ui/core/TextField";
import {getOwnedTokens, getProofHistory} from "../../../services/plasmaServices";
import {verifyToken, verifyTokenWithHistory} from "../../../services/verifyHistory";
import { css } from '@emotion/core';
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
        //TODO BS is not updating the title
        this.forceUpdate();
        verifyTokenWithHistory(token, rootChainContract, h).then(
          ({lastOwner, transactionsHistory}) => {
            console.log(`Correct history! Last true owner: ${lastOwner}`);
            this.setState({loading: false, historyValid: true, lastValidOwner: lastOwner});
          }).catch(err => {
          console.log(`Error in history! ${err.error}. Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
          this.setState({
            loading: false,
            historyValid: false,
            lastValidOwner: err.lastOwner,
            lastValidBlock: err.blockNumber
          })
        });
      })
    });
  };

  render = () => {
    const { loading, blocks, historyValid, lastValidOwner, lastValidBlock } = this.state;
    const { open, token, classes, handleClose } = this.props;

    let result = <h1></h1>;
    if(!loading) {
      if(historyValid) {
        result = <h1>History validated, true owner: {lastValidOwner}</h1>;
      } else {
        result = <h1>History can't be validated after block ${lastValidBlock}, last known owner: {lastValidOwner}</h1>;
      }
    }
    const override = css`
      display: block;
      margin: 0 auto;
      border-color: red;
    `;

    return (<Dialog open={open} onClose={handleClose} classes={{ paper: classes.dialogPaper }}>
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

export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(ValidateHistoryModal)));