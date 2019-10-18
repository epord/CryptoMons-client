import { randomHex256 } from "./utils";
import {keccak256} from "./cryptoUtils";
import BN from "bn.js";
const RLP = require('rlp');
import * as EthUtils from 'ethereumjs-util';

export const transitionRPSState = (turnNum, gameState, move) => {
  if(turnNum == 0) {
    return initialTransition(gameState, move);
  } else if(turnNum%2 == 0) {
      return transtionEvenToOdd(gameState, move);
  } else {
      return transitionOddToEven(gameState, move, turnNum == 1);
  }
}

const initialTransition = (game, move) => {
  const salt = randomHex256();
  localStorage.setItem('salt', salt)
  localStorage.setItem('move', move)
  const hashDecision = keccak256(
    EthUtils.setLengthLeft(new BN(move).toArrayLike(Buffer), 256/8),
    EthUtils.toBuffer(salt)
  );

  game.hashDecision = hashDecision

  return game;
};

const transtionEvenToOdd = (game, move) => {
  const oldSalt = localStorage.getItem('salt');
  const oldMove = localStorage.getItem('move');

  game.salt = oldSalt;
  game.decisionOP = oldMove;

  if(game.decisionPL == game.decisionOP) {
    ;
  } else if(
    (game.decisionPL == 0  && game.decisionOP == 2) ||
    (game.decisionPL == 1  && game.decisionOP == 0) ||
    (game.decisionPL == 2  && game.decisionOP == 1)
    ) {
      game.gamesToPlay = game.gamesToPlay - 1;
      game.scorePL = game.scorePL + 1;
  } else {
    game.gamesToPlay = game.gamesToPlay - 1;
    game.scoreOP = game.scoreOP + 1;
  }

  if(game.gamesToPlay > 0) {
    const newSalt = randomHex256();
    localStorage.setItem('salt', newSalt)
    localStorage.setItem('move', move)
    const newHashDecision = keccak256(
      EthUtils.setLengthLeft(new BN(move).toArrayLike(Buffer), 256/8),
      EthUtils.toBuffer(newSalt)
    );
    game.nextHashDecision = newHashDecision;
  }

  return game;
};

const transitionOddToEven = (game, move, isFirst) => {
  game.decisionPL = move;
  if(!isFirst) {
    game.hashDecision = game.nextHashDecision;
  }
  game.decisionOP = undefined;
  game.salt = undefined;
  game.newHashDecision = undefined;
  return game;
};

export const toBytes = (state) => {
  let params = [
    //TODO check if this can be less than 256 (using other than toUint() in solidity. Maybe to Address())?
    EthUtils.setLengthLeft(new BN(state.gamesToPlay).toArrayLike(Buffer), 256/8), 			// uint256 little endian
    EthUtils.setLengthLeft(new BN(state.scorePL).toArrayLike(Buffer), 256/8), 			// uint256 little endian
    EthUtils.setLengthLeft(new BN(state.scoreOP).toArrayLike(Buffer), 256/8), 			// uint256 little endian
  ];

  if(state.hashDecision) {
    params.push(EthUtils.toBuffer(state.hashDecision));
    if(state.decisionPL) {
      params.push(EthUtils.setLengthLeft(new BN(state.decisionPL).toArrayLike(Buffer), 256/8));
      if(state.decisionOP) {
        params.push(EthUtils.setLengthLeft(new BN(state.decisionOP).toArrayLike(Buffer), 256/8));
        params.push(EthUtils.toBuffer(state.salt));
        if(state.nextHashDecision) {
          params.push(EthUtils.toBuffer(state.nextHashDecision));
        }
      }
    }
  }

  return RLP.encode(params);
};