import React from "react";

class InitComponent extends React.Component {
  componentDidMount = () => {
		if(this.props.rootChainContract || this.props.plasmaCMContract || this.props.cryptoMonsContract) {
			this.init()
		}
	}

	componentDidUpdate = (prevProps) => {
		const { rootChainContract, plasmaCMContract, cryptoMonsContract,
			tokensLoaded,
			challengeableTokensLoaded,
			exitingTokensLoaded,
			exitedTokensLoaded,
			challengedTokensLoaded } = this.props;

			const contractsLoaded = rootChainContract && plasmaCMContract && cryptoMonsContract;
			const plasmaTokensLoaded = tokensLoaded && challengeableTokensLoaded && exitingTokensLoaded && exitedTokensLoaded && challengedTokensLoaded;
			const prevPlasmaTokensLoaded = prevProps.tokensLoaded && prevProps.challengeableTokensLoaded
				&& prevProps.exitingTokensLoaded && prevProps.exitedTokensLoaded && prevProps.challengedTokensLoaded;

		if (contractsLoaded && plasmaTokensLoaded && !prevPlasmaTokensLoaded) {
			this.init()
		}
  }

  init = () => {}

}

export default (InitComponent);