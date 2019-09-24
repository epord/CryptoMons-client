import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from "react-redux";
import store from "./redux/store";

import { HashRouter as Router, Route, Link } from "react-router-dom";

import App from './index.jsx';
import Hack from './components/Hack.jsx';

import Typography from '@material-ui/core/Typography';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';

import "core-js/stable";
import "regenerator-runtime/runtime";

class Routes extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<Router>
					<React.Fragment>
						<AppBar position="static" style={{ background: '#CC0000', marginBottom: '1em' }}>
							<Toolbar>
								<IconButton edge="start" color="inherit" aria-label="menu">
									<MenuIcon />
								</IconButton>
								<Typography variant="h6" style={{ flexGrow: 1 }}>
									CryptoMon
								</Typography>
								<Link to="/hacks/" style={{ textDecoration: 'none', color: 'white' }}>
									<Button color="inherit">Hacks</Button>
								</Link>
							</Toolbar>
						</AppBar>
						<Route path="/" exact component={App} />
						<Route path="/hacks/" component={Hack} />
					</React.Fragment>
				</Router>
			</Provider>
		)
	}
}

ReactDOM.render(<Routes />, document.getElementById('app'))