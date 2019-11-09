import React from 'react';
import {connect} from "react-redux";

import {getCryptoMonFromPlasmaId} from '../../../services/pokemonService';
import withInitComponent from '../common/withInitComponent.js';
import InitComponent from '../common/InitComponent.jsx';

class Transaction extends InitComponent {

  state = {}

  init = async () => {
    const { cryptoMonsContract, rootChainContract, transaction } = this.props;
    const { slot } = transaction;
    const { cryptoMonData, cryptoMonInstance } = await getCryptoMonFromPlasmaId(slot, cryptoMonsContract, rootChainContract);
    this.setState({ cryptoMonData, cryptoMonInstance })
  }

  render = () => {
    const { transaction } = this.props;
    const { cryptoMonData, cryptoMonInstance } = this.state;
    return (
      <React.Fragment>
        <div>slot: {transaction.slot}</div>
        {cryptoMonData && <img src={cryptoMonData.imageUrl} />}
        <div>owner: {transaction.owner}</div>
        <div>recipient: {transaction.recipient}</div>
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  cryptoMonsContract: state.cryptoMonsContract,
  rootChainContract: state.rootChainContract,
 });

const mapDispatchToProps = dispatch => ({ });

export default connect(mapStateToProps, mapDispatchToProps)(withInitComponent(Transaction));