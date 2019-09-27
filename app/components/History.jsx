import React from 'react';
import { connect } from "react-redux";

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import { checkEmptyBlock, checkInclusion } from '../../services/ethService';
import { getProofHistory } from '../../services/plasmaServices';
import { recover, decodeTransactionBytes, generateTransactionHash } from '../../utils/cryptoUtils';

import { loadContracts } from '../redux/actions'

import async from 'async';

class History extends React.Component {

  state = { }

  componentDidMount() {
    const { rootChainContract, loadContracts } = this.props;
    if (!rootChainContract) loadContracts();
  }

	verifyToken = async () => {
    const { rootChainContract } = this.props;
		const { tokenToVerify: token } = this.state;
		const { history } = await getProofHistory(token);
		console.log(history)

		console.log(`validating ${Object.keys(history).length} blocks`)

		let included = await Promise.all(
		  Object.keys(history).map(blockNumber => {
        const { transactionBytes, hash, proof } = history[blockNumber];
        if (!transactionBytes && proof == "0x0000000000000000") {
          return checkEmptyBlock(blockNumber, rootChainContract);
        } else {
          return checkInclusion(transactionBytes, hash, blockNumber, token, proof, rootChainContract)
        }
      })
		);
		console.log(included)
		let fail = included.indexOf(false);
		//TODO API returns block before they are propagated
    if(fail != -1 && fail != included.length - 1) {
      let blockNumber = Object.keys(history)[fail];
      console.log(`Error in history! Fail validation in block ${blockNumber}`);
      return this.setState({ historyValid: false, lastValidOwner: "unknown", lastValidBlock: blockNumber });
    }

    let transactions = Object.keys(history).filter(blockNumber => history[blockNumber].transactionBytes);

		async.waterfall([
			async cb => {
				// Deposit
				const depositBlock = Object.keys(history)[0];
				const { transactionBytes, proof } = history[depositBlock];
				const { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
				const hash = generateTransactionHash(slot, blockSpent, recipient);

				if (await checkInclusion(hash, depositBlock, token, proof, rootChainContract)) {
					return cb(null, recipient);
				} else {
					return cb({error: "Validation failed", blockNumber: blockSpent, lastOwner: owner})
				}

			},
			// Other blocks
			...transactions.slice(1).map(blockNumber => async (owner, cb) => {
				const { transactionBytes, signature, hash } = history[blockNumber];

				if (transactionBytes) {
					const { slot, blockSpent, recipient } = decodeTransactionBytes(transactionBytes);
					const generatedHash = generateTransactionHash(slot, blockSpent, recipient);

					if(generatedHash.toLowerCase() != hash.toLowerCase()) {
            return cb({error: "Hash does not match", blockNumber: blockSpent, lastOwner: owner})
          }

					if(recover(hash, signature) != owner.toLowerCase()) {
						return cb({error: "Not signed correctly", blockNumber: blockSpent, lastOwner: owner})
					}

          return cb(null, recipient);
				}
			})
		], (err, lastOwner) => {
				if (err) {
					console.log(`Error in history! Last true owner: ${err.lastOwner} in block ${err.blockNumber}`);
					this.setState({ historyValid: false, lastValidOwner: err.lastOwner, lastValidBlock: err.blockNumber })
				} else {
          console.log(`Correct history! Last true owner: ${lastOwner}`);
          this.setState({historyValid: true, lastValidOwner: lastOwner});
        }

			});
	}

	handleChange = fieldName => event => {
		this.setState({ [fieldName]: event.target.value });
  }

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