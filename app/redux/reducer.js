import * as C from "./constants";

const initialState = {
	myCryptoMons: []
};

const reducerMapper = {
	[C.GOT_CRYPTOMONS]: (state, action) => {
		return Object.assign({}, state, {
      myCryptoMons: action.payload
    });
	},
	[C.GOT_ETH_ACCOUNT]: (state, action) => {
		state.ethAccount = action.payload;
		return state;
	}
}

function reducer(state = initialState, action) {
	const mappedReducer = reducerMapper[action.type];
	if (mappedReducer) return mappedReducer(state, action);
  return state;
};

export default reducer;