import React from 'react';

import Block from './Block.jsx';

import {getBlocks} from '../../../services/plasmaServices';
import InitComponent from '../common/InitComponent.jsx';

class SideChain extends InitComponent {

  state = {
    blocks: []
  }

  componentDidMount = async () => {
    const blocks = await getBlocks();
    this.setState({ blocks });
  }

  render = () => {
    const { blocks } = this.state;
    return (
      <React.Fragment>
        {blocks.map(block => <Block key={block.blockNumber} block={block}/>)}
      </React.Fragment>
    )
  }
}

export default SideChain;