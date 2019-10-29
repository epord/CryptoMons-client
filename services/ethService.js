import web3Utils from 'web3-utils';
import async from 'async';
import { zip, unique } from '../utils/utils';

import {getExitData, getOwnedTokens} from "./plasmaServices";
import { isSwapBytes } from '../utils/cryptoUtils';
import {toCMBBytes} from "../utils/CryptoMonsBattles";

const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider);

export const setDefaultAccount = (account) => {
	web3.eth.defaultAccount = account;
}

const ethContract = (data) => new web3.eth.Contract(data.abi, data.address).methods;
const baseEthContract = (data) => new web3.eth.Contract(data.abi, data.address);

export const getCoinState = (slot, rootChain) => {
	const slotBN = (slot);
	const states = ["NOT_EXITING", "EXITING", "EXITED"];

	return new Promise((resolve, reject) => {
		ethContract(rootChain).getPlasmaCoin(slotBN).call((err, res) => {
			if (err) return reject(err);
			resolve(states[res[3]]);
		});
	});
};

export const getPlasmaCoinId = (slot, rootChain) => {
	const slotBN = (slot);
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getPlasmaCoin(slotBN).call((err, res) => {
			if (err) return reject(err);
			resolve(res[0]);
		});
	});
};

const getStateTokens = (filter, rootChain, state) => {
	return new Promise((resolve, reject) => {
		const blockFilter = { fromBlock: 0, toBlock: 'latest' };

		//TODO: if the coin is exiting, another call to getExit to check the owner coincides should be made
		baseEthContract(rootChain).getPastEvents("StartedExit",
			{ filter: filter, fromBlock: 0, toBlock: 'latest' }, async (err, result) => {
			if(err) return reject(err);
			const callBacks = result.map((s) => getCoinState(s.returnValues.slot, rootChain));
			const exitingBool = await Promise.all(callBacks);
			resolve(zip(result, exitingBool).filter(e => e[1] == state).map(e => e[0]));
		});
	});
};

const getExitingTokens = (filter, rootChain) => getStateTokens(filter, rootChain, "EXITING");
const getExitedTokens = (filter, rootChain) => getStateTokens(filter, rootChain, "EXITED");


export const depositToPlasma = (token, cryptoMons, rootChain) => {
	const rootChainAddress = rootChain.address;
	const sender = web3.eth.defaultAccount;

	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).safeTransferFrom(sender, rootChainAddress, token).send({from: web3.eth.defaultAccount},(err, res) => {
			if (err) return reject(err);
			resolve(res)
		})
	})
};

let alreadyLogged = {};
const subscribeToEvent = (event, filter, data, cb) => {
	baseEthContract(data).events[event]({ filter: filter}, (err, res) => {
		if(err) return console.error(err);
		let key = res.transactionHash + res.logIndex;
		if(!alreadyLogged[key]) {
		  alreadyLogged[key] = true;
      cb(res)
    }
	})
};

export const getCryptomon = (slot, cryptoMons) => {
	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).getCryptomon(slot).call((err, res) => {
			if (err) return reject(err);
			resolve(res)
		})
	})
}

export const getPokemonData = (id, cryptoMons) => {
	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).getPokemonData(id).call((err, res) => {
			if (err) return reject(err);
			resolve(res)
		})
	})
}

export const subscribeToCryptoMonTransfer = (cryptoMon, address, cb) => {
	subscribeToEvent("Transfer", {to: address}, cryptoMon, cb)
};

export const subscribeToDeposits = (rootChain, address, cb) => {
	subscribeToEvent("Deposit", {from: address}, rootChain, cb)
};

export const subscribeToSubmittedBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedBlock", {}, rootChain, cb)
};

export const subscribeToSubmittedSecretBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedSecretBlock", {}, rootChain, cb)
};

export const subscribeToStartedExit = (rootChain, address, cb) => {
	subscribeToEvent("StartedExit", {owner: address}, rootChain, cb)
};

export const subscribeToCoinReset = (rootChain, address, cb) => {
	subscribeToEvent("CoinReset", {owner: address}, rootChain, cb)
};

export const subscribeToFinalizedExit = (rootChain, address, cb) => {
	subscribeToEvent("FinalizedExit", {owner: address}, rootChain, cb)
};

export const subscribeToWithdrew = (rootChain, address, cb) => {
	subscribeToEvent("Withdrew", {owner: address}, rootChain, cb)
};

export const subscribeToFreeBond = (rootChain, address, cb) => {
	subscribeToEvent("FreedBond", {from: address}, rootChain, cb);
}

export const subscribeToSlashedBond = (rootChain, address, cb) => {
	subscribeToEvent("SlashedBond", {from: address}, rootChain, cb);
}

export const subscribeToChallengeRespond = (rootChain, address, cb) => {
	//TODO add filter?
	subscribeToEvent("RespondedExitChallenge", {}, rootChain, cb);
}

export const subscribeToCMBRequested = (plasmaCM, address, cb) => {
	subscribeToEvent("CryptoMonBattleRequested", {player: address}, plasmaCM, cb);
}

export const subscribeToChannelFunded = (plasmaCM, address, cb) => {
	subscribeToEvent("ChannelFunded", {creator: address}, plasmaCM, cb);
	subscribeToEvent("ChannelFunded", {opponent: address}, plasmaCM, cb);
}

export const getChallengeable = (address, rootChain) => {
  return new Promise(async (resolve, reject) => {
		const exiting = await getOwnedTokens(address, 'exiting');
		const slotFilter = { slot: exiting };
		const filteredTokens = await getExitingTokens(slotFilter, rootChain);
		resolve(unique(
			filteredTokens.filter(e => e.returnValues.owner.toLowerCase() !== address.toLowerCase())
			.map(e=> e.returnValues.slot))
		);
	});
};

export const getChallenges = (slot, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getChallenges(slot).call((err, result) => {
			if(err) return reject(err);
			resolve(result);
		});
	});
};

export const getChallenge = (slot, txHash, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getChallenge(slot, txHash).call((err, result) => {
			if(err) return reject(err);
			resolve(result);
		});
	});
};

/// TODO: Shouldn't return all exits, but should return multiple times the same slot if there are multiple challengeBefore going on
export const getChallengedFrom = (address, rootChain) => {
	return new Promise(async (resolve, reject) => {
		const exiting = await getExitingFrom(address, rootChain);
		const slotFilter = { slot: exiting };
		const filteredTokens = unique((await getExitingTokens(slotFilter, rootChain)).map(t => t.returnValues.slot));
		const challenges = await Promise.all(filteredTokens.map(s => getChallenges(s, rootChain)));
		const result = zip(filteredTokens, challenges).filter(e=> e[1].length > 0).map(e => ({ slot: e[0], txHash: e[1] }));
		const filtered = unique(result, (s1) => (s2) => s1.slot == s2.slot);
		resolve(filtered)
	});
};

export const getExitingFrom = (address, rootChain)  => {
	return new Promise(async (resolve, reject) => {
		const ownerFilter = { owner: address };
		const filteredExits = await getExitingTokens(ownerFilter, rootChain);
		resolve(unique(filteredExits.map(e=> e.returnValues.slot)));
	})
};

export const getExitedFrom = (address, rootChain)  => {
	return new Promise(async (resolve, reject) => {
		const ownerFilter = { owner: address };
		const filteredExits = await getExitedTokens(ownerFilter, rootChain);
		resolve(unique(filteredExits.map(e=> e.returnValues.slot)));
	})
};

export const challengeAfter = (slot, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getExit(slot).call(async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const exitBlock = res[2];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${exitBlock}`);
			if(response.status >=400) return reject("Challenge After could not be completed");

			const exitData = await response.json();
			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = (slot);
			const challengingBlockNumberBN = (challengingBlockNumber);

			ethContract(rootChain)
				.challengeAfter(slotBN, challengingTransaction, proof, signature, challengingBlockNumberBN).send({from: web3.eth.defaultAccount},(err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const challengeBetween = (slot, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getExit(slot).call(async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const parentBlock = res[1];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${parentBlock}`);
			if(response.status >=400) return reject("Challenge Between could not be completed");
			const exitData = await response.json();

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = (slot);
			const challengingBlockNumberBN = (challengingBlockNumber);

			ethContract(rootChain)
				.challengeBetween(slotBN, challengingTransaction, proof, signature, challengingBlockNumberBN).send({from: web3.eth.defaultAccount},(err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const respondChallenge = (slot, challengingBlock, challengingTxHash,  rootChain) => {

  return new Promise(async (resolve, reject) => {
		const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${challengingBlock}`);
		const challengeData = await response.json();

		const { challengingBlockNumber: respondingBlockNumber, challengingTransaction: respondingTransaction, proof, signature} = challengeData;
		const slotBN = (slot);
		const respondingBlockNumberBN = (respondingBlockNumber);

		ethContract(rootChain)
			.respondChallengeBefore(slotBN, challengingTxHash, respondingBlockNumberBN, respondingTransaction, proof, signature)
			.send({from: web3.eth.defaultAccount},(err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
}

export const challengeBefore = (slot, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getExit(slot).call(async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const parentBlock = res[1];
			const response = await fetch(`${process.env.API_URL}/api/challenges/before?slot=${slot}&parentBlock=${parentBlock}`);
			const exitData = await response.json();

			challengeBeforeWithExitData(exitData, rootChain)
				.then(resolve)
				.catch(reject);
		})
	})
}

export const getBalance = (rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getBalance().call(async (err, res) => {
			if (err) return reject(err);
			const withdrawable = res[1];
			resolve(withdrawable);
		});
	});
}

export const getBlockRoot = (blockNumber, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getBlockRoot(blockNumber).call(async (err, res) => {
			if (err) return reject(err);
			resolve(res);
		});
	});
}

export const checkEmptyBlock = (blockNumber, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getBlockRoot(
			blockNumber).call(
			(err, res) => {
			if (err) return reject(err);
			resolve(res == "0x6f35419d1da1260bc0f33d52e8f6d73fc5d672c0dca13bb960b4ae1adec17937");
		});
	});
};

export const checkSecretsIncluded = (blockNumber, data, rootChain) => {
  const { transactionBytes, proof } = data;

	return new Promise((resolve, reject) => {
		ethContract(rootChain).checkValidationAndInclusion(
      transactionBytes,
      proof,
			blockNumber).call(
			(err, res) => {
				if (err) return resolve(false);
				resolve(true);
			});
	});
};

const checkBasicInclusion = (txHash, blockNumber, slot, proof, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).checkInclusion(
			txHash || web3Utils.soliditySha3(0),
			blockNumber,
			slot,
			proof).call(
			(err, res) => {
			if (err) return reject(err);
			resolve(res); // true or false
		});
	});
}

export const checkInclusion = (transactionBytes, txHash, blockNumber, slot, proof, rootChain) => {
	if(isSwapBytes(transactionBytes)) {
		console.log("SWAP IN ", blockNumber)
		return Promise.resolve(true);
	} else {
		return checkBasicInclusion(txHash, blockNumber, slot, proof, rootChain)
	}
}

export const withdrawBonds = (rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).withdrawBonds().send({from: web3.eth.defaultAccount},async (err, res) => {
			if (err) return reject(err);
			resolve(res);
		});
	});
}

export const challengeBeforeWithExitData = (exitData, rootChain) => {
	const { slot, challengingTransaction, proof, challengingBlockNumber } = exitData;

	const slotBN = (slot);
	const challengingBlockNumberBN = (challengingBlockNumber);


  return new Promise(async (resolve, reject) => {
		ethContract(rootChain)
			.challengeBefore(slotBN, challengingTransaction, proof, challengingBlockNumberBN).send({from: web3.eth.defaultAccount},
			{
				from: web3.eth.defaultAccount,
				value: web3Utils.toWei('0.1', 'ether')
			},
			(err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
}

export const getCryptoMonsFrom = (address, cryptoMons) => {
  return new Promise((resolve, reject) => {
    baseEthContract(cryptoMons).getPastEvents("Transfer", { filter: { to: address }, fromBlock: 0, toBlock: 'latest' },
			(err, res) => {
        if(err) return reject(err)

				const tokens = unique(res.map(transfer => transfer.returnValues.tokenId))
        async.parallel(
          tokens.map(tokenId => cb => ethContract(cryptoMons).ownerOf(tokenId).call(cb)),
          (err, res) => {
            if (err) return reject(err);
            resolve(zip(tokens, res).filter((e) => e[1].toLowerCase() == address.toLowerCase()).map(e => e[0]))
          });
      });
  });
}

export const getBattlesFrom = (address, plasmaTurnGame, plasmaCM) => {
  return new Promise((resolve, reject) => {
		baseEthContract(plasmaTurnGame).getPastEvents("CryptoMonBattleRequested", { filter: { player: address }, fromBlock: 0, toBlock: 'latest' },
			(err, games ) => {
				if(err) return reject(err);
				const battleIds = games.map(g => g.returnValues.gameId);
				async.parallel(battleIds.map(id => cb => getChannel(id, plasmaCM).then(r => cb(null, r)).catch(cb)),
					(err, result) => {
						if (err) return reject(err);
						const games = {
							opened: [],
							toFund: [],
							ongoing: [],
						};

						result.forEach(c => {
							if(c.state == 0) {
								if(c.players[0].toLowerCase() == address.toLowerCase()) {
									games.opened.push(c);
								} else {
									games.toFund.push(c);
								}
							} else if(c.state == 1) {
								games.ongoing.push(c);
							}
						});
						resolve(games);
				});
			})
	});
}

export const finalizeExit = (rootChain, slot) => {
	const slotBN = (slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain).finalizeExit(slotBN).send({from: web3.eth.defaultAccount},(err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
}

export const withdraw = (rootChain, slot) => {
	const slotBN = (slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain).withdraw(slotBN).send({from: web3.eth.defaultAccount},(err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
};

export const buyCryptoMon = cryptoMons => {
	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).buyCryptoMon().send({from: web3.eth.defaultAccount},{
			from: web3.eth.defaultAccount,
			value: web3Utils.toWei('0.001', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
};
export const exitTokenWithData = (rootChain, exitData) => {
	if (!exitData.signature) {
		return exitDepositToken(rootChain, exitData.slot);
	} else {
		return exitToken(rootChain, exitData)
	}
};

export const exitDepositToken = (rootChain, slot) => {
	const slotBN = (slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain)
			.startDepositExit(slotBN).send({from: web3.eth.defaultAccount},{
				from: web3.eth.defaultAccount,
				value: web3Utils.toWei('0.1', 'ether')
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
};
export const exitToken = (rootChain, {slot, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature,
	prevBlock, exitingBlock}) => {
	const slotBN = (slot);
	const _blocks = [
			(prevBlock),
			(exitingBlock),
		];

	return new Promise((resolve, reject) => {
		ethContract(rootChain)
		.startExit(slotBN, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature, _blocks).send({from: web3.eth.defaultAccount},{
			from: web3.eth.defaultAccount,
			value: web3Utils.toWei('0.1', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
};


// Battles

export const battleDeposit = (plasmaCM) => {
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.makeDeposit().send({from: web3.eth.defaultAccount}, {
				from: web3.eth.defaultAccount,
				value: web3Utils.toWei('0.1', 'ether')
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
		})
	});
}

export const initiateBattle = (plasmaCM, channelType, opponent, stake, initialGameAttributes, exitRLPData) => {
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.initiateChannel(channelType, opponent, web3Utils.toWei(stake.toString(), 'ether'), initialGameAttributes, exitRLPData)
      .send({from: web3.eth.defaultAccount}, {
				from: web3.eth.defaultAccount,
				value: web3Utils.toWei(stake.toString(), 'ether')
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
		})
	});
}

export const fundBattle = (plasmaCM, channelId, stake, initialGameAttributes, exitRLPData) => {
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.fundChannel(channelId, initialGameAttributes, exitRLPData).send({from: web3.eth.defaultAccount}, {
				from: web3.eth.defaultAccount,
				value: stake
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
		})
	});
}

export const concludeBattle = (plasmaCM, prevState, currentState) => {

	const _prevState = {
		channelId: prevState.channelId,
		channelType: prevState.channelType,
		participants: prevState.participants,
		turnNum: prevState.turnNum,
		gameAttributes: toCMBBytes(prevState.game)
	}

	const _currentState = {
		channelId: currentState.channelId,
		channelType: currentState.channelType,
		participants: currentState.participants,
		turnNum: currentState.turnNum,
		gameAttributes: toCMBBytes(currentState.game)
	}

	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.conclude(currentState.channelId, _prevState, _currentState, [prevState.signature || '0x', currentState.signature]).send({from: web3.eth.defaultAccount}, {
				from: web3.eth.defaultAccount
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
		})
	});
}

export const battleForceMove = (plasmaCM, channelId, prevState, currentState) => {

	const _currentState = {
		channelId: currentState.channelId,
		channelType: currentState.channelType,
		participants: currentState.participants,
		turnNum: currentState.turnNum,
		gameAttributes: toCMBBytes(currentState.game)
	};

	if (!prevState) {
		console.log('force first move');
		return new Promise((resolve, reject) => {
			ethContract(plasmaCM)
				.forceFirstMove(channelId, _currentState)
				.send({from: web3.eth.defaultAccount}, (err, res) => {
					if (err) return reject(err);
					resolve(res);
				})
		});
	}

	const _prevState = {
		channelId: prevState.channelId,
		channelType: prevState.channelType,
		participants: prevState.participants,
		turnNum: prevState.turnNum,
		gameAttributes: toCMBBytes(prevState.game)
	};

	console.log('force move');
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.forceMove(channelId, _prevState, _currentState, [prevState.signature || '0x', currentState.signature])
			.send({from: web3.eth.defaultAccount}, (err, res) => {
				if (err) return reject(err);
				resolve(res);
			})
	});
}

export const battleRespondWithMove = (plasmaCM, channelId, nextState) => {
	const _nextState = {
		channelId: nextState.channelId,
		channelType: nextState.channelType,
		participants: nextState.participants,
		turnNum: nextState.turnNum,
		gameAttributes: toCMBBytes(nextState.game)
	}

	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.respondWithMove(channelId, _nextState, nextState.signature)
			.send({from: web3.eth.defaultAccount}, (err, res) => {
				if (err) return reject(err);
				resolve(res);
		})
	})
}

export const getChannel = (channelId, plasmaCM) => {
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
			.getChannel(channelId).call((err, res) => {
				if (err) return reject(err)
				resolve(res);
		})
	});
}