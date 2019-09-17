import * as C from "./constants";

export const gotEthAccount = (payload) => {
  return { type: C.GOT_ETH_ACCOUNT, payload };
}

export const gotCryptoMons = (payload) => {
  return { type: C.GOT_CRYPTOMONS, payload };
}