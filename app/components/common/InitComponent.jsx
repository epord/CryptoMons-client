import React from "react";

export default class InitComponent extends React.Component {
  componentDidMount = () => {
		if(this.props.rootChainContract || this.props.plasmaCMContract || this.props.cryptoMonsContract) {
			this.init()
		}
	}

	componentDidUpdate = (prevProps) => {
		const { rootChainContract, plasmaCMContract, cryptoMonsContract } = this.props;
		if (
				(!prevProps.rootChainContract && rootChainContract)
				|| (!prevProps.plasmaCMContract && plasmaCMContract)
				|| (!prevProps.cryptoMonsContract && cryptoMonsContract)
			) {
			this.init()
		}
  }

  init = () => {}

}