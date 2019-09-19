import * as C from "./constants";

const initialState = {
	myCryptoMons: [],
	plasmaTokens: [],
	exitingTokens: [],
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
	[C.GOT_OWNED_TOKENS]: (state, action) => {
		return Object.assign({}, state, {
      exitingTokens: action.payload
    });
	},
}

function reducer(state = initialState, action) {
	const mappedReducer = reducerMapper[action.type];
	if (mappedReducer) return mappedReducer(state, action);
  return state;
};

export default reducer;