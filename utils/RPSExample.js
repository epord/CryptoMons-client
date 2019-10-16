import { randomHex256 } from "./utils";
import {keccak256} from "./cryptoUtils";
import BN from "bn.js";
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