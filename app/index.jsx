import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

import Title from './Title.jsx';

class App extends React.Component{
    render() {
        return(
            <React.Fragment>
                <Title text="Hello World!"/>
            </React.Fragment>
        )
    }
}

ReactDOM.render(<App />, document.getElementById('app'))
