import {randomHex256} from "./utils";
import {keccak256} from "./cryptoUtils";
import BN from "bn.js";
import * as EthUtils from 'ethereumjs-util';
import { calculateBattle } from "./BattleDamageCalculator";

const RLP = require('rlp');
const abi = require('ethereumjs-abi');

export const isAlreadyTransitioned = (me, state) => {
  return state.turnNum %2 == 1 && me.toLowerCase() == state.participants[1].toLowerCase()
}

export const readyForBattleCalculation = (me, state) => {
  return state.turnNum % 2 == 0 && state.turnNum > 0 && me.toLowerCase() == state.participants[1].toLowerCase()
}

//ONLY FOR USE WITH CURRENT STATE THAT SOME TIMES IS TRANSITIONED
export const canIPlay = (me, state) => {
  if(state.participants[0].toLowerCase() == me.toLowerCase()) {
    return state.turnNum % 2 == 1;
  } else if(state.turnNum <= 1){
      return state.game.hashDecision === undefined;
  } else {
     return state.game.nextHashDecision === undefined;
  }
}

export const CMBmover = (state) => {
  return state.turnNum%2 === 1 ? state.participants[0]: state.participants[1];
}

export const isCMBFinished = (game) => {
  return game.HPPL === 0 || game.HPOP === 0;
}

export const CMBWinner = (state) => {
  if(state.game.HPOP === 0) {
    return state.participants[0];
  } else {
    return state.participants[1];
  }
}


export const transitionCMBState = (gameState, gameId, turnNum, move) => {
  if(turnNum == 0) {
    return initialTransition(gameState, gameId, move);
  } else if(turnNum%2 == 0) {
    if(move) throw "Please transition before moving" + move;
    return transtionEvenToOdd(gameState, gameId, turnNum);
  } else {
      return transitionOddToEven(gameState, move, turnNum == 1);
  }
}

const initialTransition = (game, gameId, move) => {
  const salt = randomHex256();
  localStorage.setItem(`salt-${gameId}-0`, salt)
  localStorage.setItem(`move-${gameId}-0`, move)
  const hashDecision = keccak256(
    EthUtils.setLengthLeft(new BN(move).toArrayLike(Buffer), 256/8),
    EthUtils.toBuffer(salt)
  );

  game.hashDecision = hashDecision

  return game;
};

const gameToState = (game, gameId, turnNum, move, salt) => {
  const oldSalt = salt !== undefined ? salt : localStorage.getItem(`salt-${gameId}-${turnNum-2}`);
  const oldMove = move !== undefined ? move : localStorage.getItem(`move-${gameId}-${turnNum-2}`);
  game.saltOP = oldSalt;
  game.decisionOP = parseInt(oldMove);

  const state = {
    player: {
      hp: game.HPPL,
      status1: game.status1PL,
      status2: game.status2PL,
      charges: game.chargePL,
      cryptoMon: game.cryptoMonPLInstance,
      data: game.cryptoMonPLData,
      move: game.decisionPL,
    },
    opponent: {
      hp: game.HPOP,
      status1: game.status1OP,
      status2: game.status2OP,
      charges: game.chargeOP,
      cryptoMon: game.cryptoMonOPInstance,
      data: game.cryptoMonOPData,
      move: game.decisionOP,
    },
    random: abi.soliditySHA3(['bytes32', 'bytes32'], [game.saltPL, game.saltOP]),
  };

  return state;
}

export const transtionEvenToOdd = (game, gameId, turnNum, move, salt) => {
  const state = gameToState(game, gameId, turnNum, move, salt);
  const [nextState, events] = calculateBattle(state);

  const oddState = {
    cryptoMonPL: game.cryptoMonPL,
    cryptoMonPLInstance: game.cryptoMonPLInstance,
    cryptoMonPLData: game.cryptoMonPLData,
    HPPL: nextState.player.hp,
    status1PL: nextState.player.status1,
    status2PL: nextState.player.status2,
    chargePL: nextState.player.charges,
    cryptoMonOP: game.cryptoMonOP,
    cryptoMonOPInstance: game.cryptoMonOPInstance,
    cryptoMonOPData: game.cryptoMonOPData,
    HPOP: nextState.opponent.hp,
    status1OP: nextState.opponent.status1,
    status2OP: nextState.opponent.status2,
    chargeOP: nextState.opponent.charges,
    hashDecision: game.hashDecision,
    decisionPL: game.decisionPL,
    saltPL: game.saltPL,
    decisionOP: game.decisionOP,
    saltOP: game.saltOP,
    events
  };

  return oddState;
};

export const addNextMove = (state, move, gameId, turnNum) => {
  const newSalt = randomHex256();
  localStorage.setItem(`salt-${gameId}-${turnNum-1}`, newSalt)
  localStorage.setItem(`move-${gameId}-${turnNum-1}`, move)
  const newHashDecision = keccak256(
    EthUtils.setLengthLeft(new BN(move).toArrayLike(Buffer), 256/8),
    EthUtils.toBuffer(newSalt)
  );
  if(turnNum == 1) {
    state.hashDecision = newHashDecision;
  } else {
    state.nextHashDecision = newHashDecision;
  }
  return state;
}

export const transitionOddToEven = (game, move, isFirst) => {
  game.decisionPL = move;
  if(!isFirst) {
    game.hashDecision = game.nextHashDecision;
  }
  game.saltPL = randomHex256();
  game.decisionOP = undefined;
  game.saltOP = undefined;
  game.nextHashDecision = undefined;

  return game;
};

export const toCMBBytes = (state) => {

  let params = [
    new BN(state.cryptoMonPL).toArrayLike(Buffer),
    new BN(state.HPPL).toArrayLike(Buffer),
    new BN(booltoInt(state.status1PL)).toArrayLike(Buffer),
    new BN(booltoInt(state.status2PL)).toArrayLike(Buffer),
    new BN(state.chargePL).toArrayLike(Buffer),
    new BN(state.cryptoMonOP).toArrayLike(Buffer),
    new BN(state.HPOP).toArrayLike(Buffer),
    new BN(booltoInt(state.status1OP)).toArrayLike(Buffer),
    new BN(booltoInt(state.status2OP)).toArrayLike(Buffer),
    new BN(state.chargeOP).toArrayLike(Buffer)
  ];

  if(state.hashDecision != undefined) {
    params.push(EthUtils.toBuffer(state.hashDecision));
    if(state.decisionPL != undefined) {
      params.push(new BN(state.decisionPL).toArrayLike(Buffer));
      params.push(EthUtils.toBuffer(state.saltPL));
      if(state.decisionOP != undefined) {
        params.push(new BN(state.decisionOP).toArrayLike(Buffer));
        params.push(EthUtils.toBuffer(state.saltOP));
        if(state.nextHashDecision != undefined) {
          params.push(EthUtils.toBuffer(state.nextHashDecision));
        }
      }
    }
  }
  return RLP.encode(params);
};

const booltoInt = (bool) => {
  if(bool) return 1;
  return 0;
}

export const getInitialCMBState = (
  cryptoMonPLPlasmaId,
  cryptoMonPLInstance,
  cryptoMonOPPlasmaId,
  cryptoMonOPInstance) => {

  return {
    cryptoMonPL: cryptoMonPLPlasmaId,
    HPPL: cryptoMonPLInstance.stats.hp,
    status1PL: false,
    Status2PL: false,
    chargePL: 1,
    cryptoMonOP: cryptoMonOPPlasmaId,
    HPOP: cryptoMonOPInstance.stats.hp,
    status1OP: false,
    status2OP: false,
    chargeOP: 1,
  }
}