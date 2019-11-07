import * as C from "./constants";
import * as EthService from '../../services/ethService';
import * as PlasmaService from '../../services/plasmaServices';

const gotCryptoMons = cryptoMons => {
  return { type: C.GOT_CRYPTOMONS, payload: cryptoMons };
}

const gotOwnedTokens = tokens => {
  return { type: C.GOT_OWNED_TOKENS, payload: tokens };
}

const gotExitingFrom = tokens => {
  return { type: C.GOT_EXITING_FROM, payload: tokens };
}

const gotContracts = contracts => {
  return { type: C.GOT_CONTRACTS, payload: contracts };
}

const gotChallengeables = tokens => {
  return { type: C.GOT_CHALLENGEABLES, payload: tokens };
}

const gotExited = tokens => {
  return { type: C.GOT_EXITED, payload: tokens };
}

const gotSwappingTokens = tokens => {
  return { type: C.GOT_SWAPPING, payload: tokens };
}

const gotSwappingRequests = tokens => {
  return { type: C.GOT_SWAPPING_REQUESTS, payload: tokens };
}

const gotEthAccount = account => {
  return { type: C.GOT_ETH_ACCOUNT, payload: account };
}

const gotChallengedTokens = tokens => {
  return { type: C.GOT_CHALLENGED_TOKENS, payload: tokens };
}

const gotBattles = battles => {
  return { type: C.GOT_BATTLES, payload: battles };
}

const gotBalance = balance => {
  return { type: C.GOT_BALANCE, payload: balance };
}

export const getEthAccount = () => (dispatch, getState) => {
  return window.ethereum.enable().then((account) =>{
    dispatch(gotEthAccount(account[0]));
  });
}

export const getCryptoMonsFrom = (address, cryptoMonsContract) => (dispatch, getState) => {
  return EthService
    .getCryptoMonsFrom(address, cryptoMonsContract)
    .then(cryptoMons => dispatch(gotCryptoMons(cryptoMons)));
}

export const getOwnedTokens = (address, state) => (dispatch, getState) => {
  return PlasmaService
    .getOwnedTokens(address, state)
    .then(tokens => {
      dispatch(gotOwnedTokens(tokens));
      return tokens;
      }
    );
}

export const getExitingTokens = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .getExitingFrom(address, rootChainContract)
    .then(tokens => dispatch(gotExitingFrom(tokens)));
}

const loadAllCryptoMons = (rootChain) => (dispatch, getState) => {
  const ethAccount = getState().ethAccount;

  dispatch(getOwnedTokens(ethAccount, 'deposited'))
  dispatch(getChallengeableTokens(ethAccount, rootChain))
  dispatch(getExitingTokens(ethAccount, rootChain))
  dispatch(getExitedTokens(ethAccount, rootChain))
  dispatch(getChallengedFrom(ethAccount, rootChain))
}

export const initApp = () => (dispatch, getState) => {
	return new Promise((resolve, reject) => {
    dispatch(loadContracts()).then(res => {
      const rootChain = { ...res.RootChain, address: res.RootChain.networks['5777'].address };
      dispatch(loadAllCryptoMons(rootChain))
      resolve(res)
    })
  })
}

export const loadContracts = () => (dispatch, getState) => {
  return PlasmaService
    .loadContracts()
    .then(res => {
      dispatch(gotContracts(res))
      return res
    });
}

export const getChallengeableTokens = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .getChallengeable(address, rootChainContract)
    .then(tokens => dispatch(gotChallengeables(tokens)));
}

export const getExitedTokens = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .getExitedFrom(address, rootChainContract)
    .then(tokens => dispatch(gotExited(tokens)));
}

export const buyCryptoMon = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .buyCryptoMon(rootChainContract);
}

export const revealSecret = (token, secret) => (dispatch, getState) => {
  return PlasmaService
    .revealSecret(token, secret);
}

export const cancelSecret = (token, secret) => (dispatch, getState) => {
  return PlasmaService
    .cancelSecret(token, secret);
}

export const getSwappingTokens = (address) => (dispatch, getState) => {
  return PlasmaService
    .getSwappingTokens(address)
    .then(tokens => dispatch(gotSwappingTokens(tokens)))
}

export const getSwappingRequests = (address) => (dispatch, getState) => {
  return PlasmaService
    .getSwappingRequests(address)
    .then(tokens => dispatch(gotSwappingRequests(tokens)))
}

export const getChallengedFrom = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .getChallengedFrom(address, rootChainContract)
    .then(tokens => {
      dispatch(gotChallengedTokens(tokens))
    })
}

export const getBattlesFrom = (address, plasmaTurnGameContract, plasmaCMContract) => (dispatch, getState) => {
  const plasmaTokens = getState().plasmaTokens;
  return EthService
    .getBattlesFrom(address, plasmaTokens, plasmaTurnGameContract, plasmaCMContract)
    .then(battles => {
      dispatch(gotBattles(battles))
    })
}

export const getBalance = (rootChainContract) => (dispatch, getState) => {
  return EthService
    .getBalance(rootChainContract)
    .then(balance => dispatch(gotBalance(balance)));
}