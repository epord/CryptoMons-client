import React from 'react';

import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import CryptoMonCard from './CryptoMonCard.jsx';

const DoubleCryptoMonCard = ({ token1, token2, actions1, owner1, owner2, actions2, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <CryptoMonCard plasmaToken={token1} owner={owner1} actions={actions1}/>
      {icon || <CompareArrowsIcon fontSize="large" />}
      <CryptoMonCard plasmaToken={token2} owner={owner2} actions={actions2}/>
    </div>
  )

export default DoubleCryptoMonCard;