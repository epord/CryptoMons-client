import React from 'react';
import {connect} from "react-redux";

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import {loadContracts} from '../redux/actions'
import {HISTORY_VALIDITY, verifyToken} from "../../services/verifyHistory";
import { css } from '@emotion/core';
import PacmanLoader from 'react-spinners/PacmanLoader';

class History extends React.Component {

  state = { loading: false, transactionsHistory: [] };

	verifyToken = async () => {
    const { rootChainContract } = this.props;
		const { tokenToVerify: token } = this.state;
		this.setState({loading: true})
    verifyToken(token, rootChainContract).then(
      ({validity, lastOwner, transactionsHistory, swappingOwner}) => {
        console.log(`Correct history! Last true owner: ${lastOwner}`);
        console.log(transactionsHistory)
        this.setState({
          loading: false,
          transactionsHistory,
          historyValid: validity,
          lastValidOwner: lastOwner,
          swappingOwner
        });
      }).catch(err => {
      console.log(`Error in history! ${err.error}. Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
      this.setState({
        historyValid: HISTORY_VALIDITY.INVALID,
        lastValidOwner: err.lastOwner,
        lastValidBlock: err.blockNumber,
        loading: false
      })
    });
	};

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
  };

  render = () => {
    const { transactionsHistory, loading, tokenToVerify,
      historyValid, lastValidOwner, lastValidBlock, swappingOwner } = this.state;
    const { rootChainContract } = this.props;

    if (!rootChainContract) return <div>Loading...</div>
    const override = css`
      display: block;
      margin: 0 auto;
      border-color: red;
    `;

    return (
      <React.Fragment>
        <Paper style={{ margin: '1em', padding: '1em', display: 'inline-block' }}>
          <Typography variant="body1" style={{ display: "inline-block" }}>Verify token history:</Typography>
          <TextField
            style={{ margin: '0 0.5em' }}
            value={tokenToVerify || ''}
            onChange={event => {
              this.handleChange("tokenToVerify")(event);
              this.setState({ historyValid: undefined });
            }}
            placeholder="Token" />
          <Button variant="outlined" disabled={!tokenToVerify || loading} onClick={this.verifyToken}>Verify</Button>
          {tokenToVerify &&
          historyValid === HISTORY_VALIDITY.CORRECT &&
          <Typography variant="body1" style={{ color: 'green' }}>Valid history! Last owner: {lastValidOwner}</Typography>}

          {tokenToVerify &&
          historyValid === HISTORY_VALIDITY.WAITING_FOR_SWAP
          && <Typography variant="body1" style={{ color: 'green' }}>Waiting for swap! Last owner: {lastValidOwner}, otherOwner: {swappingOwner}</Typography>}

          {tokenToVerify &&
          historyValid === HISTORY_VALIDITY.INVALID &&
          <Typography variant="body1" style={{ color: 'red' }}>Invalid history! Last owner: {lastValidOwner} in block {lastValidBlock}</Typography>}
        </Paper>

        <PacmanLoader
          css={override}
          sizeUnit={"px"}
          size={30}
          color={'rgb(204, 0, 0)'}
          loading={loading}
        />

        { transactionsHistory.map(t => {
          console.log(t);
            if(t.depositBlock) return <span>DEPOSIT IN {t.depositBlock} to {t.to}</span>
            if(t.isSwap) return <span>SWAP IN {t.blockNumber} between {t.from} and {t.to} suceesful? {t.successfulSwap.toString()}</span>
            if(!t.isSwap) return <span>Transder IN {t.blockNumber} from {t.from} to {t.to}</span>
          })
        }
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => ({
  rootChainContract: state.rootChainContract
})

const mapDispatchToProps = dispatch => ({
	loadContracts: () => dispatch(loadContracts())
})

export default connect(mapStateToProps, mapDispatchToProps)(History);