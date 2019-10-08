import React from 'react';
import { connect } from "react-redux";

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import {checkEmptyBlock, checkInclusion, checkSecretsIncluded} from '../../services/ethService';
import { getProofHistory } from '../../services/plasmaServices';
import {
  recover,
  decodeTransactionBytes,
  decodeSwapTransactionBytes,
  generateTransactionHash,
  generateSwapHash,
  isSwapBytes, getHash
} from '../../utils/cryptoUtils';

import { loadContracts } from '../redux/actions'

import async from 'async';

class History extends React.Component {

  state = { }

	verifyToken = async () => {
    const { rootChainContract } = this.props;
		const { tokenToVerify: token } = this.state;
		const { history } = await getProofHistory(token);

		console.log(`validating ${Object.keys(history).length} blocks`);

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

		let swapped = (await Promise.all(
		  Object.keys(history).map( async blockNumber => {
        const { transactionBytes } = history[blockNumber];
        if(transactionBytes && isSwapBytes(transactionBytes)) {
          const result = await checkSecretsIncluded(blockNumber, history[blockNumber], rootChainContract);
          return {blockNumber, result}
        } else {
          return {}
        }

      })
    )).filter(v => v.blockNumber);

    swapped = swapped.reduce(function(result, item) {
      result[item.blockNumber] = item.result;
      return result;
    }, {});


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

				if (await checkInclusion(transactionBytes, hash, depositBlock, token, proof, rootChainContract)) {
					return cb(null, recipient);
				} else {
					return cb({error: "Validation failed", blockNumber: blockSpent, lastOwner: owner})
				}

			},
			// Other blocks
			...transactions.slice(1).map(blockNumber => async (owner, cb) => {
				const { transactionBytes, signature, hash, hashSecretA, hashSecretB } = history[blockNumber];

				if (transactionBytes) {
				  if(isSwapBytes(transactionBytes)) {
				    const { slotA, blockSpentA, B, slotB, blockSpentB, A, signatureB } =
              decodeSwapTransactionBytes(transactionBytes);

            const generatedHashA = generateSwapHash(slotA, blockSpentA, hashSecretA, B, slotB);
            const generatedHashB = generateSwapHash(slotB, blockSpentB, hashSecretB, A, slotA);

            if (generatedHashA.toLowerCase() != hash.toLowerCase()) {
              return cb({error: "Hash does not match", blockNumber: blockNumber, lastOwner: owner})
            }

            if (recover(hash, signature) != owner.toLowerCase()) {
              return cb({error: "Not signed correctly", blockNumber: blockNumber, lastOwner: owner})
            }

            if (recover(generatedHashB, signatureB) != B.toLowerCase()) {
              return cb({error: "Not signed by counterpart correctly", blockNumber: blockNumber, lastOwner: owner})
            }

            if(!swapped[blockNumber]) {
              return cb(null, A);
            }

            return cb(null, B);

          } else {
            const {slot, blockSpent, recipient} = decodeTransactionBytes(transactionBytes);
            const generatedHash = generateTransactionHash(slot, blockSpent, recipient);

            if (generatedHash.toLowerCase() != hash.toLowerCase()) {
              return cb({error: "Hash does not match", blockNumber: blockNumber, lastOwner: owner})
            }

            if (recover(hash, signature) != owner.toLowerCase()) {
              return cb({error: "Not signed correctly", blockNumber: blockNumber, lastOwner: owner})
            }

            return cb(null, recipient);
          }
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