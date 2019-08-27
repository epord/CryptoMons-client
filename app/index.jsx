import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import Title from './Title.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

import { subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset,
	subscribeToFinalizedExit, subscribeToWithdrew,
	depositToPlasma, getCryptoMonsFrom, getExitingFrom, getExitedFrom, approveCryptoMons, buyCryptoMon,
	exitToken, finalizeExit, withdraw } from '../services/ethService';
import { generateTransactionHash, sign } from '../utils/cryptoUtils';

class App extends React.Component {

	constructor(props) {
		super(props)
		this.state = { myCryptoMons: [], myPlasmaTokens: [], myExitingTokens: [], myExitedTokens: [] }
	}

	componentDidMount = () => {
		this.loadContracts(() => {
			this.subscribeToEvents(web3.eth.defaultAccount);
			this.getCryptoMonsFrom(web3.eth.defaultAccount);
			this.getPlasmaTokensFrom(web3.eth.defaultAccount);
			this.getExitingFrom(web3.eth.defaultAccount);
			this.getExitedFrom(web3.eth.defaultAccount);
		});
	}


	loadContracts = cb => {
		fetch(`${process.env.API_URL}/api/contracts`).then(response => {
			response.json().then(res => {
				this.setState({
					rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
					cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
					vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address }
				}, cb)
			})
		})
	}

	subscribeToEvents = address => {
		const { rootChain } = this.state;

		subscribeToDeposits(rootChain, address,(r => {
			console.log("DEPOSIT - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToCoinReset(rootChain, address,(r => {
			console.log("Coin Reset - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToFinalizedExit(rootChain, address,(r => {
			console.log("Finalized Exit - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToStartedExit(rootChain, address,(r => {
			console.log("Started Exit - Slot: " + r.args.slot.toFixed())
		}));

		subscribeToSubmittedBlocks(rootChain, address,(r => {
			console.log("Block Submitted - BlockNumber: " + r.args.blockNumber.toFixed())
		}));

		subscribeToWithdrew(rootChain, address,(r => {
			console.log("Withdrawal - Slot: " + r.args.slot.toFixed())
		}));



	}

	buyCryptoMon = () => {
		const { cryptoMons } = this.state;

		buyCryptoMon(cryptoMons).then(res => {
			this.getCryptoMonsFrom(web3.eth.defaultAccount);
		}).catch(console.error);
	}

	depositToPlasma = token => {
		const { cryptoMons, rootChain } = this.state;

		depositToPlasma(token, cryptoMons, rootChain).then(() => {
			this.getCryptoMonsFrom(web3.eth.defaultAccount);
			this.getPlasmaTokensFrom(web3.eth.defaultAccount);
		}).catch(console.error);
	}

	getCryptoMonsFrom = address => {
		const { cryptoMons } = this.state;

		getCryptoMonsFrom(address, cryptoMons).then(res => {
			this.setState({ myCryptoMons: res })
		}).catch(console.error);
	};

	getPlasmaTokensFrom = address => {
		fetch(`${process.env.API_URL}/api/tokens/owned-by/${address}`).then(response => {
			response.json().then(res => {
				this.setState({ myPlasmaTokens: res })
			})
		})
	}

  getExitingFrom = address => {
		const { rootChain } = this.state;
		getExitingFrom(address, rootChain).then(res => {
		  console.log(res)
      this.setState({ myExitingTokens: res })
    })
	}

  getExitedFrom = address => {
    const { rootChain } = this.state;
    getExitedFrom(address, rootChain).then(res => {
      console.log(res)
      this.setState({ myExitedTokens: res })
    })
  }

	approveCryptoMons = () => {
		const { cryptoMons, vmc } = this.state;

		approveCryptoMons(cryptoMons, vmc);
	}

	finalizeExit = token => {
		const { rootChain } = this.state;
		finalizeExit(rootChain, token).then(response => {
			console.log("Finalized exit: " + response);
		}).catch(console.error);
	}

	withdraw = token => {
		const { rootChain } = this.state;
		withdraw(rootChain, token).then(response => {
			console.log("Withdraw exit: " + response);
		}).catch(console.error);
	}

	exitToken = token => {
		console.log("exiting token")
		fetch(`${process.env.API_URL}/api/exit/data/${token}`).then(response => {
			response.json().then(exitData => {
				console.log("calling root chain exit")
				const { rootChain } = this.state;

				const cb = (data) => {
					exitToken(rootChain, data).then(response => {
						console.log("Exit successful: ", response);
					}).catch(console.error);
				}

				if (!exitData.signature) {
					console.log("signing")
					sign(exitData.lastTransactionHash).then(signature => {
						console.log("signed")
						exitData.signature = signature;
						cb(exitData);
					})
				} else {
					cb(exitData);
				}

			});
		})
	}

	transferInPlasma = token => {
		const fieldKey = `transferAddress${token}`;
		const receiverAddress = this.state[fieldKey];
		console.log(`transfering ${token} to ${receiverAddress}`)

		fetch(`${process.env.API_URL}/api/tokens/${token}/last-transaction`).then(response => {
			response.json().then(lastTransaction => {

				const hash = generateTransactionHash(token, lastTransaction.minedBlock, receiverAddress)

				sign(hash).then(signature => {
					const body = {
						"slot": token,
						"owner": web3.eth.defaultAccount,
						"recipient": receiverAddress,
						"hash": hash,
						"blockSpent": lastTransaction.minedBlock,
						"signature": signature
					};

					fetch(`${process.env.API_URL}/api/transactions/create`, {
						method: 'POST',
						body: JSON.stringify(body),
						headers: {
							'Content-Type': 'application/json'
						}
					})
					.then(response => console.log('Success:', response))
					.catch(error => console.error('Error:', error));

				})
				.catch(error => console.error('Error:', error))
			});
		});
	};

	onTransferAddressChanged = token => event => {
		const fieldKey = `transferAddress${token}`;
		this.setState({ [fieldKey]: event.target.value });
	}

	render() {
		const { rootChain, cryptoMons, vmc, deposits, myCryptoMons, myPlasmaTokens, myExitingTokens, myExitedTokens } = this.state;
		return (
			<React.Fragment>
				<Title text="Hello World!" />
				<p>Calling with address: {web3.eth.defaultAccount}</p>
				<button onClick={this.loadContracts}>Load contracts</button>
				<p>RootChain address: {rootChain && rootChain.address}</p>
				<p>CryptoMon address: {cryptoMons && cryptoMons.address}</p>
				<p>VMC address: {vmc && vmc.address}</p>
				<button onClick={this.buyCryptoMon}>Buy CryptoMon</button>
				<button onClick={this.approveCryptoMons}>Approve</button>

				<button onClick={() => this.getCryptoMonsFrom(web3.eth.defaultAccount)}>Get my CryptoMons</button>
				<p>My CryptoMons:</p>
				{myCryptoMons.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<button onClick={() => this.depositToPlasma(token)}>Deposit to Plasma</button>
					</div>
				))}
				<p>My Plasma Tokens:</p>
				{myPlasmaTokens.map(token => (
					<div key={token}>
						<p style={{ display: "inline" }}>{token}</p>
						<input
							style={{ marginLeft: '1em', minWidth: '25em' }}
							onChange={this.onTransferAddressChanged(token)}
							value={this.state[`transferAddress${token}`] || ''}
							placeholder="Address" />
						<button onClick={() => this.transferInPlasma(token)}>Transfer</button>
						<button onClick={() => this.exitToken(token)}>Exit</button>
					</div>
				))}
        <p>My Exiting Tokens:</p>
        {myExitingTokens.map(token => (
          <div key={token}>
            <p style={{ display: "inline" }}>{token}</p>
            <button onClick={() => this.finalizeExit(token)}>Finalize Exit</button>
          </div>
        ))}

        <p>My Exited Tokens:</p>
        {myExitedTokens.map(token => (
          <div key={token}>
            <p style={{ display: "inline" }}>{token}</p>
            <button onClick={() => this.withdraw(token)}>Withdraw</button>
          </div>
        ))}

			</React.Fragment>
		)
	}
}

ReactDOM.render(<App />, document.getElementById('app'))
