import * as C from "./constants";

const initialState = {
	myCryptoMons: [],
	plasmaTokens: [],
	exitingTokens: [],
	exitedTokens: [],
	challengeableTokens: [],
};

const reducerMapper = {
	[C.GOT_ETH_ACCOUNT]: (state, action) => {
		state.ethAccount = action.payload;
		return state;
	},
	[C.GOT_CRYPTOMONS]: (state, action) => {
		return Object.assign({}, state, {
      myCryptoMons: action.payload
    });
	},
	[C.GOT_OWNED_TOKENS]: (state, action) => {
		return Object.assign({}, state, {
      plasmaTokens: action.payload
    });
	},
	[C.GOT_CHALLENGEABLES]: (state, action) => {
		return Object.assign({}, state, {
			challengeableTokens: action.payload
		});
	},
	[C.GOT_EXITING_FROM]: (state, action) => {
		return Object.assign({}, state, {
      exitingTokens: action.payload
    });
	},
	[C.GOT_EXITED]: (state, action) => {
		return Object.assign({}, state, {
      exitedTokens: action.payload
    });
	},
	[C.GOT_CONTRACTS]: (state, action) => {
		state.rootChain = { ...action.payload.RootChain, address: action.payload.RootChain.networks['5777'].address };
		state.cryptoMons = { ...action.payload.CryptoMons, address: action.payload.CryptoMons.networks['5777'].address };
		state.vmc = { ...action.payload.ValidatorManagerContract, address: action.payload.ValidatorManagerContract.networks['5777'].address };
		return state;
	},
}

function reducer(state = initialState, action) {
	const mappedReducer = reducerMapper[action.type];
	if (mappedReducer) return mappedReducer(state, action);
  return state;
};

export default reducer;