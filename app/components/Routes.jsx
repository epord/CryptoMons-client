import React from 'react';
import { connect } from "react-redux";

import { HashRouter as Router, Route, Link } from "react-router-dom";

import App from './index.jsx';
import Hack from './Hack.jsx';
import History from './History.jsx';
import Swap from './Swap.jsx';
import Battles from './Battles.jsx';

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
	subscribeToDeposits, subscribeToSubmittedBlocks, subscribeToStartedExit, subscribeToCoinReset, subscribeToChannelFunded,
	subscribeToChallengeRespond, subscribeToFinalizedExit, subscribeToWithdrew, subscribeToFreeBond, subscribeToRPSRequested,
	subscribeToSlashedBond, getChallengeable, subscribeToCryptoMonTransfer, subscribeToSubmittedSecretBlocks, setDefaultAccount
} from '../../services/ethService';

import { getCryptoMonsFrom, getOwnedTokens, getExitingTokens, getExitedTokens, buyCryptoMon,
	loadContracts, getSwappingTokens, getSwappingRequests, getEthAccount, getBattlesFrom } from '../redux/actions'

class Routes extends React.Component {
	state = { drawerOpen: false }

	componentDidMount = () => {
		this.props.getEthAccount();
	};

	componentDidUpdate = (prevProps) => {
		const { ethAccount } = this.props;
		if (!prevProps.ethAccount && ethAccount) {
			this.init()
		}
  }

	init = () => {
		this.loadContracts().then(() => {
			this.subscribeToEvents(this.props.ethAccount);
		});

		setDefaultAccount(this.props.ethAccount);
	}

	loadContracts = async () => {
		const res = await this.props.loadContracts();
		return this.setState({
			rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
			cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
			vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address },
			plasmaCM: { ...res.PlasmaCMContract, address: res.PlasmaCMContract.networks['5777'].address },
			plasmaTurnGame: { ...res.PlasmaTurnGameContract, address: res.PlasmaTurnGameContract.networks['5777'].address }
		});
	};

	subscribeToEvents = address => {
		const { rootChain, cryptoMons, plasmaCM, plasmaTurnGame } = this.state;

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
			getChallengeable(this.props.ethAccount, rootChain);
			this.getChallengedFrom(this.props.ethAccount);
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
			const { getOwnedTokens, getSwappingTokens, getSwappingRequests } = this.props;
			getOwnedTokens(address, 'deposited');
			getSwappingTokens(address);
			getSwappingRequests(address);
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
			this.getBalance()
		}))

		subscribeToSlashedBond(rootChain, address, (r => {
			console.log('Slashed Bond event');
			this.getBalance()
		}))

		subscribeToChallengeRespond(rootChain, address, (r => {
			getChallengeable(this.props.ethAccount, rootChain);
			this.getChallengedFrom(this.props.ethAccount);
			this.getBalance();
			console.log('RespondedExitChallenge event');
		}))

		subscribeToRPSRequested(plasmaTurnGame, address, (r => {
			console.log('RPSRequested event');
			this.props.getBattlesFrom(address, plasmaTurnGame, plasmaCM)
		}))

		subscribeToChannelFunded(plasmaCM, address, (r => {
			console.log('ChannelFunded event');
			this.props.getBattlesFrom(address, plasmaTurnGame, plasmaCM)
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
				<Route path="/" exact component={App} />
				<Route path="/history" component={History} />
				<Route path="/hacks" component={Hack} />
				<Route path="/swaps" component={Swap} />
				<Route path="/battles" component={Battles} />
			</Router>
		);
	}
}



const mapStateToProps = state => ({
	ethAccount: state.ethAccount
 });

const mapDispatchToProps = dispatch => ({
	loadContracts: () => dispatch(loadContracts()),
	buyCryptoMon: (address, cryptoMonsContract) => dispatch(buyCryptoMon(address, cryptoMonsContract)),
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
	getSwappingTokens: (address) => dispatch(getSwappingTokens(address)),
  getSwappingRequests: address => dispatch(getSwappingRequests(address)),
	getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
	getEthAccount: () => dispatch(getEthAccount()),
	getBattlesFrom: (address, plasmaTurnGame, plasmaCM) => dispatch(getBattlesFrom(address, plasmaTurnGame, plasmaCM)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Routes);
