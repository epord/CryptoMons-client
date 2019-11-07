import * as C from "./constants";
import {unique} from "../../utils/utils";

const initialState = {
	watchableTokens: [],
	myCryptoMons: [],
	plasmaTokens: [],
	exitingTokens: [],
	exitedTokens: [],
	challengeableTokens: [],
	swappingTokens: [],
	swappingRequests: [],
	challengedTokens: [],
  withdrawableAmount: '0',
};

const updatingWatchable = (state) => {
	state.watchableTokens = unique(
		[
		...state.plasmaTokens,
		...state.exitingTokens,
		...state.exitedTokens,
		...state.challengeableTokens,
		...state.challengedTokens.map(t => t.slot)
		]
	);

	return state;
};

const reducerMapper = {
	[C.GOT_ETH_ACCOUNT]: (state, action) => {
		return Object.assign({}, state, {
      ethAccount: action.payload
    });
	},
	[C.GOT_CRYPTOMONS]: (state, action) => {
		return Object.assign({}, state, {
      myCryptoMons: action.payload
    });
	},
	[C.GOT_OWNED_TOKENS]: (state, action) => {
		return updatingWatchable(Object.assign({}, state, {
      plasmaTokens: action.payload,
			tokensLoaded: true,
    }));
	},
	[C.GOT_CHALLENGEABLES]: (state, action) => {
		return updatingWatchable(Object.assign({}, state, {
			challengeableTokens: action.payload,
			challengeableTokensLoaded: true,
		}));
	},
	[C.GOT_EXITING_FROM]: (state, action) => {
		return updatingWatchable(Object.assign({}, state, {
      exitingTokens: action.payload,
			exitingTokensLoaded: true,
    }));
	},
	[C.GOT_EXITED]: (state, action) => {
		return updatingWatchable(Object.assign({}, state, {
      exitedTokens: action.payload,
			exitedTokensLoaded: true,
    }));
	},
	[C.GOT_SWAPPING]: (state, action) => {
		return Object.assign({}, state, {
      swappingTokens: action.payload
    });
	},
	[C.GOT_SWAPPING_REQUESTS]: (state, action) => {
		return Object.assign({}, state, {
      swappingRequests: action.payload
    });
	},
	[C.GOT_CHALLENGED_TOKENS]: (state, action) => {
		return updatingWatchable(Object.assign({}, state, {
      challengedTokens: action.payload,
			challengedTokensLoaded: true,
    }));
	},
	[C.GOT_BATTLES]: (state, action) => {
		return Object.assign({}, state, {
      battles: action.payload
    });
	},
  [C.GOT_BALANCE]: (state, action) => {
    return Object.assign({}, state, {
      withdrawableAmount: action.payload
    });
  },
	[C.GOT_CONTRACTS]: (state, action) => {
		return Object.assign({}, state, {
			rootChainContract: { ...action.payload.RootChain, address: action.payload.RootChain.networks['5777'].address },
			cryptoMonsContract: { ...action.payload.CryptoMons, address: action.payload.CryptoMons.networks['5777'].address },
			vmcContract: { ...action.payload.ValidatorManagerContract, address: action.payload.ValidatorManagerContract.networks['5777'].address },
			plasmaCMContract: { ...action.payload.PlasmaCMContract, address: action.payload.PlasmaCMContract.networks['5777'].address },
			plasmaTurnGameContract: { ...action.payload.PlasmaTurnGameContract, address: action.payload.PlasmaTurnGameContract.networks['5777'].address },
		});
	},
}

function reducer(state = initialState, action) {
	const mappedReducer = reducerMapper[action.type];
	if (mappedReducer) return mappedReducer(state, action);
  return state;
};

export default reducer;