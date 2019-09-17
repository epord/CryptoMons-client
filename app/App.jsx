import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import { HashRouter as Router, Route, Switch } from "react-router-dom";

import App from './index.jsx';
import Hack from './Hack.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

class Routes extends React.Component {
	render() {
		return (
			<Router>
				<Route path="/" exact component={App} />
				<Route path="/hacks/" component={Hack} />
			</Router>
		)
	}
}

ReactDOM.render(<Routes />, document.getElementById('app'))