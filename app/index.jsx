import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import web3Utils from 'web3-utils';

import Title from './Title.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

import async from 'async';

class App extends React.Component{

    constructor (props) {
        super(props)
        this.state = { deposits: [], myCryptoMons: []}
    }

    componentDidMount = () => {
        this.loadContracts(() => {
            this.getCryptoMonsFrom(web3.eth.accounts[0]);
            this.getDepositsFrom(web3.eth.accounts[0]);
        });
    }

    zip = (arr1, arr2) => arr1.map((e,i) => [e, arr2[i]])

    loadContracts = cb => {
        fetch('http://localhost:8082/api/contracts').then(response => {
            console.log(response)
            response.json().then(res => {
                console.log(res)
                this.setState({
                    rootChain: {...res.RootChain, address: res.RootChain.networks['5777'].address},
                    cryptoMons: {...res.CryptoMons, address: res.CryptoMons.networks['5777'].address},
                    vmc: {...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address}
                }, cb)
            })
        })
    }

    buyCryptoMon = () => {
        const { cryptoMons } = this.state;
        const cryptoMonsAddress = cryptoMons.address;
        const cryptoMonsAbi = cryptoMons.abi;
        web3.eth.contract(cryptoMonsAbi).at(cryptoMonsAddress).buyCryptoMon({
            from: web3.eth.accounts[0],
            value: web3Utils.toWei('0.01', 'ether')
        }, (err, res) => {
            if (err) return console.error(err)
            console.log(res)
            this.getCryptoMonsFrom(web3.eth.accounts[0]);
        })
    }

    depositToPlasma = token => async () => {
        const { cryptoMons, rootChain } = this.state;
        const cryptoMonsAddress = cryptoMons.address;
        const rootChainAddress = rootChain.address;
        const cryptoMonsAbi = cryptoMons.abi;
        const sender = web3.eth.accounts[0];
         web3.eth.contract(cryptoMonsAbi).at(cryptoMonsAddress).safeTransferFrom(sender, rootChainAddress, token, (err, res) => {
            if (err) return console.error(err)
            console.log(res)
            this.getCryptoMonsFrom(web3.eth.accounts[0]);
            this.getDepositsFrom(web3.eth.accounts[0]);
        })
    }

    getDepositsFrom = address => {
        const { cryptoMons, rootChain } = this.state;
        const rootChainAddress = rootChain.address;
        web3.eth.contract(rootChain.abi).at(rootChainAddress).Deposit({
            from: address
       }, {
           fromBlock: 0,
           toBlock: 'latest'
       }).get((err, res) => {
           if (err) return console.error(err)
           this.setState({ deposits: res.map(deposit => deposit.args.slot.toFixed()) });
       })
    }

    getCryptoMonsFrom = address => {
        const { cryptoMons, rootChain } = this.state;
        const cryptoMonsAddress = cryptoMons.address;
        web3.eth.contract(cryptoMons.abi).at(cryptoMonsAddress).Transfer({
            to: address
       }, {
           fromBlock: 0,
           toBlock: 'latest'
       }).get((err, res) => {
           if (err) return console.error(err)
           const tokens = res.map(transfer => transfer.args.tokenId.toFixed())
           async.parallel(
                tokens.map(tokenId => cb => web3.eth.contract(cryptoMons.abi).at(cryptoMonsAddress).ownerOf(tokenId, cb)),
                (err, res) => {
                    if (err) return console.error(err);
                    this.setState({ myCryptoMons: this.zip(tokens, res).filter((e) => e[1] == address).map(e => e[0])})
                }
            )
       })
    }

    approveCryptoMons = () => {
        const { cryptoMons, rootChain, vmc } = this.state;

        const cryptoMonsAddress = cryptoMons.address;

        const vmcAddress = vmc.address;
        const vmcAbi = vmc.abi;

        const sender = web3.eth.accounts[0];

         web3.eth.contract(vmcAbi).at(vmcAddress).toggleToken(cryptoMonsAddress, (err, res) => {
            if (err) return console.error(err)
            console.log(res)
        })

    }

    render() {
        const { rootChain, cryptoMons, vmc, deposits, myCryptoMons } = this.state;
        return(
            <React.Fragment>
                <Title text="Hello World!"/>
                <p>Calling with address: {web3.eth.accounts[0]}</p>
                <button onClick={this.loadContracts}>Load contracts</button>
                <p>RootChain address: {rootChain && rootChain.address}</p>
                <p>CryptoMon address: {cryptoMons && cryptoMons.address}</p>
                <p>VMC address: {vmc && vmc.address}</p>
                <button onClick={this.buyCryptoMon}>Buy CryptoMon</button>
                <button onClick={this.approveCryptoMons}>Approve</button>

                <button onClick={() => this.getDepositsFrom(web3.eth.accounts[0])}>Get my deposits</button>
                <button onClick={() => this.getCryptoMonsFrom(web3.eth.accounts[0])}>Get my CryptoMons</button>
                <p>Deposits:</p>
                {deposits.map(deposit => <p key={deposit}>{deposit}</p>)}
                <p>My CryptoMons:</p>
                {myCryptoMons.map(token => (
                    <div key={token}>
                        <p style={{ display: "inline" }}>{token}</p>
                        <button onClick={this.depositToPlasma(token)}>Deposit to Plasma</button>
                    </div>
                ))}
            </React.Fragment>
        )
    }
}

ReactDOM.render(<App />, document.getElementById('app'))
