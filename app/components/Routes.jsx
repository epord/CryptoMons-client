import React from 'react';
import { connect } from "react-redux";

import { HashRouter as Router, Route, Link } from "react-router-dom";

import App from './index.jsx';
import Hack from './Hack.jsx';
import History from './History.jsx';
import Swap from './Swap.jsx';

import Typography from '@material-ui/core/Typography';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import MenuIcon from '@material-ui/icons/Menu';
import BugReportIcon from '@material-ui/icons/BugReport';
import HomeIcon from '@material-ui/icons/Home';
import HistoryIcon from '@material-ui/icons/History';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';

import "core-js/stable";
import "regenerator-runtime/runtime";

import {
	subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset,
	subscribeToChallengeRespond, subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond,
	subscribeToSlashedBond, getChallengeable, subscribeToCryptoMonTransfer, subscribeToSubmittedSecretBlocks
} from '../../services/ethService';

import { getCryptoMonsFrom, getOwnedTokens, getExitingTokens, getExitedTokens, buyCryptoMon, loadContracts, getSwappingTokens } from '../redux/actions'

class Routes extends React.Component {
	state = { drawerOpen: false }

	componentDidMount = () => {
		const interval = setInterval(() => {
			if (web3.eth.defaultAccount) {
				this.ethAccount = web3.eth.defaultAccount;
				this.init();
				clearInterval(interval);
			}
		}, 100);
	};

	init = () => {
		this.loadContracts().then(() => {
			this.subscribeToEvents(this.ethAccount);
		});
	}

	loadContracts = async () => {
		const res = await this.props.loadContracts();
		return this.setState({
			rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
			cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
			vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address }
		});
	};

	subscribeToEvents = address => {
		const { rootChain, cryptoMons } = this.state;

		subscribeToCryptoMonTransfer(cryptoMons, address, (r => {
			const { getCryptoMonsFrom } = this.props;
			console.log("CryptoMon Transfer");
			getCryptoMonsFrom(address, cryptoMons);
		}));

		subscribeToDeposits(rootChain, address,(r => {
			console.log("DEPOSIT - Slot: " + r.returnValues.slot)
			const { getCryptoMonsFrom, getOwnedTokens } = this.props;
			getCryptoMonsFrom(address, cryptoMons);
			getOwnedTokens(address, 'deposited');
		}));

		subscribeToCoinReset(rootChain, address,(r => {
			console.log("Coin Reset - Slot: " + r.returnValues.slot)
			const { getOwnedTokens, getExitingTokens } = this.props;
			getOwnedTokens(address, 'deposited');
			getExitingTokens(address, rootChain);
			getChallengeable(this.ethAccount, rootChain);
			this.getChallengedFrom(this.ethAccount);
		}));

		subscribeToFinalizedExit(rootChain, address,(r => {
			console.log("Finalized Exit - Slot: " + r.returnValues.slot)
			const { getExitingTokens } = this.props;
			getExitingTokens(address, rootChain);
			getExitedTokens(address, rootChain);
		}));

		subscribeToStartedExit(rootChain, address,(r => {
			console.log("Started Exit - Slot: " + r.returnValues.slot)
			const { getOwnedTokens, getExitingTokens } = this.props;
			getOwnedTokens(address, 'deposited');
			getExitingTokens(address, rootChain);
		}));

		subscribeToSubmittedBlocks(rootChain,(r => {
			console.log("Block Submitted - BlockNumber: " + r.returnValues.blockNumber)
			const { getOwnedTokens, getSwappingTokens } = this.props;
			getOwnedTokens(address, 'deposited');
			getSwappingTokens(address)
		}));

		subscribeToSubmittedSecretBlocks(rootChain,(r => {
			console.log("Secret Block Submitted - BlockNumber: " + r.returnValues.blockNumber)
			const { getOwnedTokens, getSwappingTokens } = this.props;
			getOwnedTokens(address, 'deposited');
			getSwappingTokens(address)
		}));

		subscribeToWithdrew(rootChain, address,(r => {
			console.log("Withdrawal - Slot: " + r.returnValues.slot)
			const { getCryptoMonsFrom, getExitedTokens } = this.props;
			getCryptoMonsFrom(address, cryptoMons);
			getExitedTokens(address, rootChain);
		}));

		subscribeToFreeBond(rootChain, address, (r => {
			console.log('Free Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawableAmount > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
		}))

		subscribeToSlashedBond(rootChain, address, (r => {
			console.log('Slashed Bond event');
			this.getBalance().then(withdrawableAmount => {
				if (withdrawableAmount > 0) {
					/// TODO: uncomment when events aren't called 11+ times
					// withdrawBonds(rootChain).then(() => console.log(`You have withdrew ${withdrawableAmount} wei.`))
				}
			});
		}))

		subscribeToChallengeRespond(rootChain, address, (r => {
			getChallengeable(this.ethAccount, rootChain);
			this.getChallengedFrom(this.ethAccount);
			this.getBalance();
			console.log('RespondedExitChallenge event');
		}))
	};

	openDrawer = () => this.setState({ drawerOpen: true });

	closeDrawer = () => this.setState({ drawerOpen: false });

	renderDrawer = () => {
		const { drawerOpen } = this.state;

		return (
			<Drawer open={drawerOpen} onClose={this.closeDrawer} onClick={this.closeDrawer}>
				<List style={{ minWidth: '15em' }}>
					<Link to="/" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<HomeIcon />
							</ListItemIcon>
							<ListItemText primary="Home" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
					<Link to="/history" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<HistoryIcon />
							</ListItemIcon>
							<ListItemText primary="Review Token History" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
					<Link to="/hacks" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<BugReportIcon />
							</ListItemIcon>
							<ListItemText primary="Hacks" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
					<Link to="/swaps" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<SwapHorizIcon />
							</ListItemIcon>
							<ListItemText primary="Swaps" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
				</List>
			</Drawer>
		);
	}

	render() {
		const { cryptoMons, rootChain, vmc } = this.state
		return (
			<Router>
				{this.renderDrawer()}
				<AppBar position="static" style={{ background: '#CC0000', marginBottom: '1em' }}>
					<Toolbar>
						<IconButton edge="start" color="inherit" aria-label="menu" onClick={this.openDrawer}>
							<MenuIcon />
						</IconButton>
						<Typography variant="h6" style={{ flexGrow: 1 }}>
							CryptoMon
						</Typography>
					</Toolbar>
				</AppBar>
				<Route path="/" exact render={routeProps => <App ethAccount={this.ethAccount} cryptoMons={cryptoMons} rootChain={rootChain} vmc={vmc} {...routeProps} />} />
				<Route path="/history" component={History} />
				<Route path="/hacks" component={Hack} />
				<Route path="/swaps" component={Swap} />
			</Router>
		);
	}
}



const mapStateToProps = state => ({ });

const mapDispatchToProps = dispatch => ({
	loadContracts: () => dispatch(loadContracts()),
	buyCryptoMon: (address, cryptoMonsContract) => dispatch(buyCryptoMon(address, cryptoMonsContract)),
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
	getSwappingTokens: (address) => dispatch(getSwappingTokens(address)),
	getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Routes);
