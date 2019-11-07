import React from 'react';

import Transaction from './Transaction.jsx';

class Block extends React.Component {

  state = {}

  render = () => {
    const { block } = this.props;
    const { blockNumber, transactions } = block;
    return (
      <React.Fragment>
        <div>{block.blockNumber}</div>
        <p>Trasactions:</p>
        {transactions.map(transaction => <Transaction key={transaction.hash} transaction={transaction} />)}
      </React.Fragment>

    )
  }
}

export default Block;