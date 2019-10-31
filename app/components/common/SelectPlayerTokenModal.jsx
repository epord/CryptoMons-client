import React from 'react';

import InitComponent from './InitComponent.jsx';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import {connect} from "react-redux";
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';
import CryptoMonCard from './CryptoMonCard.jsx';

import TextField from "@material-ui/core/TextField";
import {getOwnedTokens} from "../../../services/plasmaServices";

const styles = theme => ({
	dialogPaper: {
		maxWidth: '40em',
		width: '40em',
	},
});

class SelectPlayerTokenModal extends InitComponent {
  constructor(props) {
    super(props)
    this.state = {
      plasmaTokens: [],
    }
  }

  init = () => {

  };

  onPlayerChange = event => {
    let player = event.target.value;
    getOwnedTokens(player, 'deposited').then(p => {
      console.log(p);
      this.setState({player, plasmaTokens: p})
    });
  };

  render = () => {
    const { open, handleClose, classes, actions, title } = this.props;
    const { plasmaTokens, player } = this.state;

    return (
      <Dialog open={open} onClose={handleClose} classes={{ paper: classes.dialogPaper }}>
        <TextField
          style={{ margin: '0 0.5em' }}
          value={player || ''}
          onChange={this.onPlayerChange}
          placeholder="Select Opponent" />

        <DialogTitle>{title}</DialogTitle>
        <div style={{ padding: '1em', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {plasmaTokens.map(token => (
              <div style={{ marginTop: '0.5em' }} key={token}>
                <CryptoMonCard
                  plasmaToken={token}
                  actions={actions.map(o => ({ ...o, func: o.func(player, token) }))}
                />
              </div>
            ))}
        </div>

      </Dialog>
    )
  }

}

const mapStateToProps = state => ({
});

const mapDispatchToProps = dispatch => ({
});

export default withRouter(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(SelectPlayerTokenModal)));