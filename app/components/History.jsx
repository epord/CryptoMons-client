import React from 'react';
import {connect} from "react-redux";

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import {loadContracts} from '../redux/actions'
import {verifyToken} from "../../services/verifyHistory";

class History extends React.Component {

  state = { }

	verifyToken = async () => {
    const { rootChainContract } = this.props;
		const { tokenToVerify: token } = this.state;
    verifyToken(token, rootChainContract).then(
      ({lastOwner, transactionsHistory}) => {
        console.log(`Correct history! Last true owner: ${lastOwner}`);
        console.log(transactionsHistory)
        this.setState({historyValid: true, lastValidOwner: lastOwner});
      }).catch(err => {
      console.log(`Error in history! ${err.error}. Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
      this.setState({ historyValid: false, lastValidOwner: err.lastOwner, lastValidBlock: err.blockNumber })
    });
	};

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
  };

  render = () => {
    const { tokenToVerify, historyValid, lastValidOwner, lastValidBlock } = this.state;
    const { rootChainContract } = this.props;

    if (!rootChainContract) return <div>Loading...</div>

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
          <Button variant="outlined" disabled={!tokenToVerify} onClick={this.verifyToken}>Verify</Button>
          {tokenToVerify && historyValid === true && <Typography variant="body1" style={{ color: 'green' }}>Valid history! Last owner: {lastValidOwner}</Typography>}
          {tokenToVerify && historyValid === false && <Typography variant="body1" style={{ color: 'red' }}>Invalid history! Last owner: {lastValidOwner} in block {lastValidBlock}</Typography>}
        </Paper>
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