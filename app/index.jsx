import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import Title from './Title.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

import { depositToPlasma, getDepositsFrom, getCryptoMonsFrom, getExitingFrom, getExitedFrom, approveCryptoMons, buyCryptoMon,
	exitToken, finalizeExit, withdraw } from '../services/ethService';
import { generateTransactionHash, sign } from '../utils/cryptoUtils';

import async from 'async';

class App extends React.Component {

	constructor(props) {
		super(props)
		this.state = { deposits: [], myCryptoMons: [], myPlasmaTokens: [], myExitingTokens: [], myExitedTokens: [] }
	}

	componentDidMount = () => {
		this.loadContracts(() => {
			this.getCryptoMonsFrom(web3.eth.defaultAccount);
			this.getDepositsFrom(web3.eth.defaultAccount);
			this.getPlasmaTokensFrom(web3.eth.defaultAccount);
			this.getExitingFrom(web3.eth.defaultAccount);
			this.getExitedFrom(web3.eth.defaultAccount);
		});
	}


	loadContracts = cb => {
		fetch('http://localhost:8082/api/contracts').then(response => {
			response.json().then(res => {
				this.setState({
					rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
					cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
					vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address }
				}, cb)
			})
		})
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
			this.getDepositsFrom(web3.eth.defaultAccount);
			this.getPlasmaTokensFrom(web3.eth.defaultAccount);
		}).catch(console.error);
	}

	getDepositsFrom = address => {
		const { rootChain } = this.state;

		getDepositsFrom(address, rootChain).then(res => {
			this.setState({ deposits: res.map(deposit => deposit.args.slot.toFixed()) })
		}).catch(console.error);
	}

	getCryptoMonsFrom = address => {
		const { cryptoMons } = this.state;

		getCryptoMonsFrom(address, cryptoMons).then(res => {
			this.setState({ myCryptoMons: res })
		}).catch(console.error);
	};

	getPlasmaTokensFrom = address => {
		fetch('http://localhost:8082/api/tokens/owned-by/' + address).then(response => {
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
		fetch(`http://localhost:8082/api/exit/data/${token}`).then(response => {
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

		fetch(`http://localhost:8082/api/tokens/${token}/last-transaction`).then(response => {
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

					fetch('http://localhost:8082/api/transactions/create', {
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

				<button onClick={() => this.getDepositsFrom(web3.eth.defaultAccount)}>Get my deposits</button>
				<button onClick={() => this.getCryptoMonsFrom(web3.eth.defaultAccount)}>Get my CryptoMons</button>
				<p>Deposits:</p>
				{deposits.map(deposit => <p key={deposit}>{deposit}</p>)}
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
