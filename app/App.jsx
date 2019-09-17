import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from "react-redux";
import store from "./redux/store";

import { HashRouter as Router, Route, Switch } from "react-router-dom";

import App from './index.jsx';
import Hack from './components/Hack.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

class Routes extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<Router>
					<Route path="/" exact component={App} />
					<Route path="/hacks/" component={Hack} />
				</Router>
			</Provider>
		)
	}
}

ReactDOM.render(<Routes />, document.getElementById('app'))