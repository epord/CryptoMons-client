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





export const getCryptoMonsFrom = (address, cryptoMonsContract) => (dispatch, getState) => {
  return EthService
    .getCryptoMonsFrom(address, cryptoMonsContract)
    .then(cryptoMons => dispatch(gotCryptoMons(cryptoMons)));
}

export const getOwnedTokens = (address, exiting) => (dispatch, getState) => {
  return PlasmaService
    .getOwnedTokens(address, exiting)
    .then(tokens => dispatch(gotOwnedTokens(tokens)));
}

export const getExitingTokens = (address, rootChainContract) => (dispatch, getState) => {
  return EthService
    .getExitingFrom(address, rootChainContract)
    .then(tokens => dispatch(gotExitingFrom(tokens)));
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
    .buyCryptoMon(rootChainContract)
    .then(() => dispatch(getCryptoMonsFrom(address, rootChainContract)));
}

export const revealSecret = (token, secret) => (dispatch, getState) => {
  return PlasmaService
    .revealSecret(token, secret);
}