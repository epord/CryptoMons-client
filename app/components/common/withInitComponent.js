import {connect} from "react-redux";

const mapStateToProps = state => ({
   ethAccount: state.ethAccount? state.ethAccount.toLowerCase() : undefined,
   plasmaCMContract: state.plasmaCMContract,
   plasmaTurnGameContract: state.plasmaTurnGameContract,
   cryptoMonsContract: state.cryptoMonsContract,
   rootChainContract: state.rootChainContract,
   tokensLoaded: state.tokensLoaded,
   challengeableTokensLoaded: state.challengeableTokensLoaded,
   exitingTokensLoaded: state.exitingTokensLoaded,
   exitedTokensLoaded: state.exitedTokensLoaded,
   challengedTokensLoaded: state.challengedTokensLoaded
});

const mapDispatchToProps = dispatch => ({});

export default connect(mapStateToProps, mapDispatchToProps);