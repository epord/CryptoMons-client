import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from "react-redux";
import store from "./redux/store";

import { HashRouter as Router, Route, Link } from "react-router-dom";

import App from './index.jsx';
import Hack from './components/Hack.jsx';
import History from './components/History.jsx';

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

import "core-js/stable";
import "regenerator-runtime/runtime";

class Routes extends React.Component {
	state = { drawerOpen: false }

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
				</List>
			</Drawer>
		);
	}

	render() {
		return (
			<Provider store={store}>
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
				</Router>
			</Provider>
		);
	}
}

ReactDOM.render(<Routes />, document.getElementById('app'))