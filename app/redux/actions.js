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

export const getCryptoMonsFrom = (address, cryptoMonsContract) => (dispatch, getState) => {
  EthService
    .getCryptoMonsFrom(address, cryptoMonsContract)
    .then(cryptoMons => dispatch(gotCryptoMons(cryptoMons)));
}

export const getOwnedTokens = (address, exiting) => (dispatch, getState) => {
  PlasmaService
    .getOwnedTokens(address, exiting)
    .then(tokens => dispatch(gotOwnedTokens(tokens)));
}

export const getExitingFrom = (address, rootChainContract) => (dispatch, getState) => {
  EthService
    .getExitedFrom(address, rootChainContract)
    .then(tokens => dispatch(gotExitingFrom(tokens)));
}
