import React from 'react';
import {connect} from "react-redux";

import {withSnackbar} from 'notistack';

import {HashRouter as Router, Link, Route} from "react-router-dom";

import App from './index.jsx';
import Hack from './Hacks/Hack.jsx';
import History from './History.jsx';
import Swap from './Swap.jsx';
import Battles from './Battles';
import PlayerSearch from './PlayerSearch';
import SideChain from './SideChain';

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
import WhatshotIcon from '@material-ui/icons/Whatshot';
import SearchIcon from '@material-ui/icons/Search';

import "core-js/stable";
import "regenerator-runtime/runtime";

import _ from 'lodash';

import {
  setDefaultAccount,
  subscribeToChallenged,
  subscribeToChallengeRespond,
  subscribeToChannelFunded,
  subscribeToCMBRequested,
  subscribeToCoinReset,
  subscribeToCryptoMonTransfer,
  subscribeToDeposits,
  subscribeToFinalizedExit,
  subscribeToFreeBond,
  subscribeToSlashedBond,
  subscribeToStartedExit,
  subscribeToSubmittedBlocks,
  subscribeToSubmittedSecretBlocks,
  subscribeToWithdrew,
  subscribeToWithdrewBond
} from '../../services/ethService';
import {setDefaultBattleAccount} from '../../services/battleChallenges';

import {
  buyCryptoMon,
  getBalance,
  getBattlesFrom,
  getChallengeableTokens,
  getChallengedFrom,
  getCryptoMonsFrom,
  getEthAccount,
  getExitedTokens,
  getExitingTokens,
  getOwnedTokens,
  getSwappingRequests,
  getSwappingTokens,
  initApp,
} from '../redux/actions'
import {infoSnack, successSnack, warnSnack} from "../../utils/utils";

class Routes extends React.Component {
	state = { drawerOpen: false, subscribed: false }

	componentDidMount = () => {
		this.props.getEthAccount();
	};

	componentDidUpdate = (prevProps) => {
		const { ethAccount, watchableTokens, swappingRequests, enqueueSnackbar, swappingTokens } = this.props;
		const { rootChain, subscribed } = this.state;

		if (!prevProps.ethAccount && ethAccount) {
			this.init()
		}

		if(ethAccount && rootChain) {
			if(!subscribed || _.xor(prevProps.watchableTokens, watchableTokens).length > 0) {
			  console.log(watchableTokens);
        this.setState({subscribed: true});
				this.subscribeToEvents(ethAccount, watchableTokens);
			}
		}

		if(_.difference(swappingRequests.map(t => t.hash), prevProps.swappingRequests.map(t => t.hash)).length > 0) {
			enqueueSnackbar(`New Swapping request found`, { variant: 'info' })
		}

		if(_.difference(swappingTokens.map(t => t.hash), prevProps.swappingTokens.map(t => t.hash)).length > 0) {
			enqueueSnackbar(`New Swap committed`, { variant: 'info' })
		}


	};

	init = () => {
		this.loadContracts().then(() => {
			const {
				ethAccount,
				getChallengeableTokens,
				getExitingTokens,
				getExitedTokens,
				getOwnedTokens,
				getChallengedFrom,
				getSwappingTokens,
				getBalance
			} = this.props;

		const { rootChain } = this.state;

			getOwnedTokens(ethAccount, 'deposited');
			getChallengeableTokens(ethAccount, rootChain);
			getExitingTokens(ethAccount, rootChain);
			getExitedTokens(ethAccount, rootChain);
			getChallengedFrom(ethAccount, rootChain);
			getSwappingTokens(ethAccount)
			getBalance(rootChain);
		});

		setDefaultAccount(this.props.ethAccount);
		setDefaultBattleAccount(this.props.ethAccount);
	}

	loadContracts = async () => {
		const res = await this.props.loadContracts();
		return this.setState({
			rootChain: { ...res.RootChain, address: res.RootChain.networks['5777'].address },
			cryptoMons: { ...res.CryptoMons, address: res.CryptoMons.networks['5777'].address },
			vmc: { ...res.ValidatorManagerContract, address: res.ValidatorManagerContract.networks['5777'].address },
			plasmaCM: { ...res.PlasmaCMContract, address: res.PlasmaCMContract.networks['5777'].address },
			plasmaTurnGame: { ...res.PlasmaTurnGameContract, address: res.PlasmaTurnGameContract.networks['5777'].address },
		});
	};

	subscribeToEvents = (address, plasmaTokens) => {
		const { rootChain, cryptoMons, plasmaCM, plasmaTurnGame } = this.state;

		subscribeToCryptoMonTransfer(cryptoMons, address, r => {
			const { getCryptoMonsFrom, enqueueSnackbar } = this.props;
			infoSnack(enqueueSnackbar, `New CryptoMon Transfer: #${r.tokenId}`);
			getCryptoMonsFrom(address, cryptoMons);
		});

		subscribeToDeposits(rootChain, address,(r => {
			const { getCryptoMonsFrom, getOwnedTokens, enqueueSnackbar } = this.props;
			infoSnack(enqueueSnackbar, `Coin #${r.slot} deposited`);
			getCryptoMonsFrom(address, cryptoMons);
			getOwnedTokens(address, 'deposited');
		}));

		subscribeToCoinReset(rootChain, address, plasmaTokens,(r => {
			const { enqueueSnackbar, getOwnedTokens, getExitingTokens, getChallengedFrom, getChallengeableTokens } = this.props;
			infoSnack(enqueueSnackbar, `Coin ${r.slot} reset. Exit was challenged`);
			getOwnedTokens(address, 'deposited');
			getExitingTokens(address, rootChain);
      getChallengedFrom(address, rootChain);
      getChallengeableTokens(address, rootChain);
		}));

		subscribeToFinalizedExit(rootChain, address, plasmaTokens,(r => {
			const { enqueueSnackbar, getExitingTokens, getExitedTokens } = this.props;
			infoSnack(enqueueSnackbar, `Coin #${r.slot} finalized exit`);
			getExitingTokens(address, rootChain);
			getExitedTokens(address, rootChain);
		}));

		subscribeToStartedExit(rootChain, address, plasmaTokens,(r => {
			const { enqueueSnackbar, getOwnedTokens, getExitingTokens, getChallengedFrom, getChallengeableTokens } = this.props;
			infoSnack(enqueueSnackbar, `Exit started for coin #${r.slot}`);
			getOwnedTokens(address, 'deposited');
			getExitingTokens(address, rootChain);
      getChallengedFrom(address, rootChain);
      getChallengeableTokens(address, rootChain);
		}));

		subscribeToSubmittedBlocks(rootChain,(r => {
			const { enqueueSnackbar, getOwnedTokens, getSwappingTokens, getSwappingRequests } = this.props;
			enqueueSnackbar(`New block mined #${r.blockNumber}`, { autoHideDuration: 1000 });
			getOwnedTokens(address, 'deposited');
			getSwappingTokens(address);
			getSwappingRequests(address);
		}));

		subscribeToSubmittedSecretBlocks(rootChain,(r => {
			const { getOwnedTokens, getSwappingTokens, enqueueSnackbar } = this.props;
			enqueueSnackbar(`New Secret block mined #${r.blockNumber}`, { autoHideDuration: 1000 });
			getOwnedTokens(address, 'deposited');
			getSwappingTokens(address)
		}));

		subscribeToWithdrew(rootChain, address, plasmaTokens,(r => {
			const { enqueueSnackbar, getCryptoMonsFrom, getExitedTokens } = this.props;
			successSnack(enqueueSnackbar, "Slot withdrawn:  #" + r.slot)
			getCryptoMonsFrom(address, cryptoMons);
			getExitedTokens(address, rootChain);
		}));

		subscribeToFreeBond(rootChain, address, (r => {
			const { getBalance, enqueueSnackbar } = this.props;
			infoSnack(enqueueSnackbar, "Bond freed");
			getBalance(rootChain)
		}));

		subscribeToSlashedBond(rootChain, address, (r => {
			const { getBalance, enqueueSnackbar } = this.props;
			infoSnack(enqueueSnackbar, "Bond slashed");
			getBalance(rootChain)
		}));

		subscribeToWithdrewBond(rootChain, address, (r => {
			const { getBalance, enqueueSnackbar } = this.props;
			successSnack(enqueueSnackbar, "Bond withdrawn");
			getBalance(rootChain)
		}));

		subscribeToChallenged(rootChain, address, plasmaTokens, (r => {
			const { getChallengedFrom, getChallengeableTokens, enqueueSnackbar } = this.props;
			warnSnack(enqueueSnackbar, `Token #${r.slot} being challenged`);
			getChallengeableTokens(address, rootChain);
			getChallengedFrom(address, rootChain);
		}));

		subscribeToChallengeRespond(rootChain, address, plasmaTokens, (r => {
      const { enqueueSnackbar, getChallengedFrom, getChallengeableTokens, getBalance } = this.props;
			successSnack(enqueueSnackbar, `Token #${r.slot}'s challenged answered`);
			getChallengeableTokens(address, rootChain);
			getChallengedFrom(address, rootChain);
			getBalance(rootChain);
		}));

		subscribeToCMBRequested(plasmaTurnGame, address, (r => {
			const { enqueueSnackbar, getBattlesFrom } = this.props;
			infoSnack(enqueueSnackbar, `New Battle requested`);
			getBattlesFrom(address, plasmaTurnGame, plasmaCM)
		}));

		subscribeToChannelFunded(plasmaCM, address, (r => {
			const { enqueueSnackbar, getBattlesFrom } = this.props;
			successSnack(enqueueSnackbar, `New Battle started`);
			getBattlesFrom(address, plasmaTurnGame, plasmaCM)
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
					<Link to="/battles" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<WhatshotIcon />
							</ListItemIcon>
							<ListItemText primary="Battles" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
					<Link to="/players" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<SearchIcon />
							</ListItemIcon>
							<ListItemText primary="Search Players" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
						</ListItem>
					</Link>
					<Link to="/side-chain" style={{ textDecoration: 'none' }}>
						<ListItem button align="center">
							<ListItemIcon>
								<SearchIcon />
							</ListItemIcon>
							<ListItemText primary="Side Chain" style={{ color: 'rgba(0, 0, 0, 0.87)' }} />
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
				<Route path="/players" component={PlayerSearch} />
				<Route path="/side-chain" component={SideChain} />
			</Router>
		);
	}
}



const mapStateToProps = state => ({
	ethAccount: state.ethAccount,
	watchableTokens: state.watchableTokens,
	swappingRequests: state.swappingRequests,
	swappingTokens: state.swappingTokens
 });

const mapDispatchToProps = dispatch => ({
	loadContracts: () => dispatch(initApp()),
	buyCryptoMon: (address, cryptoMonsContract) => dispatch(buyCryptoMon(address, cryptoMonsContract)),
	getOwnedTokens: (address, state) => dispatch(getOwnedTokens(address, state)),
	getSwappingTokens: (address) => dispatch(getSwappingTokens(address)),
  getSwappingRequests: address => dispatch(getSwappingRequests(address)),
	getCryptoMonsFrom: (address, cryptoMonsContract) => dispatch(getCryptoMonsFrom(address, cryptoMonsContract)),
	getExitingTokens: (address, rootChainContract) => dispatch(getExitingTokens(address, rootChainContract)),
	getExitedTokens: (address, rootChainContract) => dispatch(getExitedTokens(address, rootChainContract)),
  getChallengeableTokens: (address, rootChainContract) => dispatch(getChallengeableTokens(address, rootChainContract)),
	getEthAccount: () => dispatch(getEthAccount()),
	getBattlesFrom: (address, plasmaTurnGame, plasmaCM) => dispatch(getBattlesFrom(address, plasmaTurnGame, plasmaCM)),
  getChallengedFrom: (address, rootChainContract) => dispatch(getChallengedFrom(address, rootChainContract)),
	getBalance: (address, rootChainContract) => dispatch(getBalance(address, rootChainContract)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withSnackbar(Routes));
