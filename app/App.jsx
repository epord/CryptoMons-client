import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from "react-redux";
import store from "./redux/store";

import Routes from './components/Routes.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

class App extends React.Component {
	state = { drawerOpen: false }

	render() {
		return (
			<Provider store={store}>
				<Routes />
			</Provider>
		);
	}
}

ReactDOM.render(<App />, document.getElementById('app'));