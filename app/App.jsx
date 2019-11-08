import React from 'react';
import ReactDOM from 'react-dom';

import {Provider} from "react-redux";
import {SnackbarProvider} from 'notistack';
import store from "./redux/store";

import Routes from './components/Routes.jsx';

import "core-js/stable";
import "regenerator-runtime/runtime";

class App extends React.Component {
	state = { drawerOpen: false }

	render() {
		return (
			<SnackbarProvider autoHideDuration={1000}>
				<Provider store={store}>
					<Routes />
				</Provider>
			</SnackbarProvider>
		);
	}
}

ReactDOM.render(<App />, document.getElementById('app'));