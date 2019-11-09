import web3Utils from 'web3-utils';
import async from 'async';
import { unique, zip } from '../utils/utils';

import {basicGet, getExitData, getOwnedTokens} from "./plasmaServices";
import { getExitDataToBattleRLPData, isSwapBytes } from '../utils/cryptoUtils';
import { getInitialCMBState, toCMBBytes } from "../utils/CryptoMonsBattles";

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

export const getPlasmaCoinDepositOwner = (slot, rootChain) => {
	const slotBN = (slot);
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getPlasmaCoin(slotBN).call((err, res) => {
			if (err) return reject(err);
			resolve(res[2]);
		});
	});
};

const getStateTokens = (filter, rootChain, state) => {
	return new Promise((resolve, reject) => {
		baseEthContract(rootChain).getPastEvents("StartedExit",
			{ filter: filter, fromBlock: 0, toBlock: 'latest' }, async (err, result) => {
			if(err) return reject(err);
			const uniques = _.uniqBy(result.reverse(), s => s.returnValues.slot);
			const callBacks = uniques.map((s) => getCoinState(s.returnValues.slot, rootChain));
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
let subscriptions = {};
let subscribed = {};

const subscribeToEvent = (event, volatile, filter, data, cb) => {
	let sub = async () => {
		if (!volatile && subscribed[event]) return;
		subscribed[event] = true;
		if (volatile && subscriptions[event]) {
			await subscriptions[event].unsubscribe();
		}

		let subscription = baseEthContract(data).events[event]({filter: filter}, (err, res) => {
			if (err) return console.error(err);
			let key = res.transactionHash + res.logIndex;
			if (!alreadyLogged[key]) {
				alreadyLogged[key] = true;
				cb(res)
			}
		});

		if (volatile) {
			subscriptions[event] = subscription;
		}
	}

	sub();
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
	subscribeToEvent("Transfer", false, {to: address}, cryptoMon, (r) => cb(r.returnValues))
};

export const subscribeToDeposits = (rootChain, address, cb) => {
	subscribeToEvent("Deposit", false, {from: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToSubmittedBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedBlock",false, {}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToSubmittedSecretBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedSecretBlock",false, {}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToStartedExit = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("StartedExit",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues))
	subscribeToEvent("StartedExit",false, {owner: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToCoinReset = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("CoinReset",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues))
	subscribeToEvent("CoinReset",false, {owner: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToFinalizedExit = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("FinalizedExit",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues))
	subscribeToEvent("FinalizedExit",false, {owner: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToWithdrew = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("Withdrew",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues))
	subscribeToEvent("Withdrew",false, {owner: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToFreeBond = (rootChain, address, cb) => {
	subscribeToEvent("FreedBond",false, {from: address}, rootChain, (r) => cb(r.returnValues));
}

export const subscribeToSlashedBond = (rootChain, address, cb) => {
	subscribeToEvent("SlashedBond",false, {from: address}, rootChain, (r) => cb(r.returnValues));
}

export const subscribeToWithdrewBond = (rootChain, address, cb) => {
	subscribeToEvent("WithdrewBonds",false, {from: address}, rootChain, (r) => cb(r.returnValues))
};

export const subscribeToChallenged = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("ChallengedExit",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues));
	subscribeToEvent("ChallengedExit",false, {owner: address}, rootChain, (r) => cb(r.returnValues));
}

export const subscribeToChallengeRespond = (rootChain, address, plasmaTokens, cb) => {
	subscribeToEvent("RespondedExitChallenge",true, {slot: plasmaTokens}, rootChain, (r) => cb(r.returnValues));
	subscribeToEvent("RespondedExitChallenge",false, {owner: address}, rootChain, (r) => cb(r.returnValues));
	subscribeToEvent("RespondedExitChallenge",false, {challenger: address}, rootChain, (r) => cb(r.returnValues));
}

export const subscribeToCMBRequested = (plasmaCM, address, cb) => {
	subscribeToEvent("CryptoMonBattleRequested",false, {player: address}, plasmaCM, (r) => cb(r.returnValues));
}

export const subscribeToCMBStarted = (plasmaCM, address, plasmaTokens, cb) => {
	subscribeToEvent("CryptoMonBattleFunded",false, {player: address}, plasmaCM, (r) => cb(r.returnValues));
	subscribeToEvent("CryptoMonBattleStarted",true, {CryptoMon: plasmaTokens}, plasmaCM, (r) => cb(r.returnValues));
}

export const subscribeToChannelConcluded = (plasmaCM, channels, cb) => {
	subscribeToEvent("ChannelConcluded",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};

export const subscribeToChannelChallenged = (plasmaCM, channels, cb) => {
	subscribeToEvent("ChannelChallenged",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};

export const subscribeToChannelChallengeRequest = (plasmaCM, channels, cb) => {
	subscribeToEvent("ChallengeRequest",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};

export const subscribeToChannelChallengeResponded = (plasmaCM, channels, cb) => {
	subscribeToEvent("ChallengeResponded",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};

export const subscribeToForceMoveRequested = (plasmaCM, channels, cb) => {
	subscribeToEvent("ForceMoveRequested",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};

export const subscribeToForceMoveResponded = (plasmaCM, channels, cb) => {
	subscribeToEvent("ForceMoveResponded",true, {channelId: channels}, plasmaCM, (r) => cb(r.returnValues));
};


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

export const withdrawBonds = (rootChain) => {
  return new Promise((resolve, reject) => {
  ethContract(rootChain).withdrawBonds().send({from: web3.eth.defaultAccount},async (err, res) => {
   if (err) return reject(err);
   resolve(res);
  });
 });
}

export const getChallengedFrom = (address, rootChain) => {
	return new Promise(async (resolve, reject) => {
		const exiting = await getExitingFrom(address, rootChain);
		const slotFilter = { slot: exiting };
		const [exitingEvents, ownedTokens] = await Promise.all([
			getExitingTokens(slotFilter, rootChain),
			getOwnedTokens(address, "EXITING")
		]);
		const tokens = unique([...exitingEvents.map(e => e.returnValues.slot), ...ownedTokens]);

		const challenges = await Promise.all(tokens.map(s => getChallenges(s, rootChain)));
		const result = zip(tokens, challenges.map(c => c.filter(p => p !== "0x0000000000000000000000000000000000000000000000000000000000000000")))
			.filter(e=> e[1].length > 0).map(e => ({ slot: e[0], txHash: e[1] }));
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
			if (err) return reject(err);
			const exitBlock = res[2];
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${exitBlock}`).catch(reject);

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
			if (err) return reject(err);
			const parentBlock = res[1];
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${parentBlock}`).catch(reject);

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
		const challengeData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${challengingBlock}`).catch(reject);

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
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/before?slot=${slot}&parentBlock=${parentBlock}`).catch(reject);

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

export const getBattleFunds = (address, plasmaCM) => {
	return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getFunds(address).call(async (err, res) => {
			if (err) return reject(err);
			resolve(res);
		});
	});
}

export const getBlock = (blockNumber, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).getBlock(blockNumber).call(async (err, res) => {
			if (err) return reject(err);
			resolve({root: res[0], createdAt: res[1]});
		});
	});
};

export const getSecretBlock = (blockNumber, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getSecretBlock(blockNumber).call(async (err, res) => {
			if (err) return reject(err);
			resolve({root: res[0], createdAt: res[1]});
		});
	});
}

export const checkEmptyBlock = (blockNumber, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getBlock(
			blockNumber).call(
			(err, res) => {
			if (err) return resolve(false);
			resolve(res[0] == "0x6f35419d1da1260bc0f33d52e8f6d73fc5d672c0dca13bb960b4ae1adec17937");
		});
	});
};

export const checkTXValid = (blockNumber, data, rootChain) => {
  const { transactionBytes, proof } = data;

	return new Promise((resolve, reject) => {
		ethContract(rootChain).checkTX(
      transactionBytes,
      proof,
			blockNumber).call(
			(err, res) => {
				if (err) return resolve(false);
				resolve(true);
			});
	});
};

export const checkBasicInclusion = (txHash, blockNumber, slot, proof, rootChain) => {
  return new Promise((resolve, reject) => {
		ethContract(rootChain).checkInclusion(
			txHash || web3Utils.soliditySha3(0),
			blockNumber,
			slot,
			proof).call(
			(err, res) => {
			if (err) return resolve(false);
			resolve(res); // true or false
		});
	});
};

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

export const getBattlesFrom = (address, plasmaTokens, plasmaTurnGame, plasmaCM) => {
  return new Promise((resolve, reject) => {
		baseEthContract(plasmaTurnGame).getPastEvents("CryptoMonBattleRequested",
		 { filter: { CryptoMon: plasmaTokens }, fromBlock: 0, toBlock: 'latest' },
			(err, games ) => {
				if(err) return reject(err);
				const battleIds = games.map(g => g.returnValues.gameId);
				const battles = games.reduce((result, g) => {
					if(result[g.returnValues.gameId]) result[g.returnValues.gameId].push({player: g.returnValues.player.toLowerCase(), cryptoMon: g.returnValues.CryptoMon});
					result[g.returnValues.gameId] = [{player: g.returnValues.player.toLowerCase(), cryptoMon: g.returnValues.CryptoMon}];
					return result;
				}, {});

				let ChannelState = { INITIATED: '0', FUNDED: '1', SUSPENDED: '2', CLOSED: '3', CHALLENGED: '4' }
				async.parallel(battleIds.map(id => cb => getChannel(id, plasmaCM).then(r => cb(null, r))),
					(err, results) => {
						if (err) return reject(err);
						const games = {
							opened: [],
							toFund: [],
							ongoing: [],
							challengeables: [],
							respondable: []
						};

						results.forEach(c => {
							switch (c.state) {
								case ChannelState.INITIATED:
									if(c.players[0].toLowerCase() === address.toLowerCase()) games.opened.push(c);
									if(c.players[1].toLowerCase() === address.toLowerCase()) games.toFund.push(c);
									break;

								case ChannelState.FUNDED:
									if(c.players[0].toLowerCase() === address.toLowerCase()) {
										games.ongoing.push(c);
									} else if(c.players[1].toLowerCase() === address.toLowerCase()) {
										games.ongoing.push(c);
									}

									let battle = battles[c.channelId];
									if( battle.length > 0 && battle[0].player !== address.toLowerCase() && plasmaTokens.includes(battles[0].cryptoMon))
										 games.challengeables.push({ channel: c, index: battle[0].player === c.players[0].toLowerCase() ? 0 : 1 });
									if( battle.length > 1 && battle[1].player !== address.toLowerCase() && plasmaTokens.includes(battles[1].cryptoMon))
										games.challengeables.push({ channel: c, index: battle[1].player === c.players[0].toLowerCase() ? 0 : 1 })
									break;

								case ChannelState.SUSPENDED:
									games.respondable.push(c);
									break;

								case ChannelState.CHALLENGED:
								case ChannelState.CLOSED:
									break;
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

export const createBattle = (tokenPL, tokenOP, opponentAddress, exitData, rootChain, cryptoMons, plasmaCM, plasmaTurnGame) => {
	return new Promise(async (resolve, reject) => {
		const tokenPLID = await getPlasmaCoinId(tokenPL, rootChain);
		const tokenOPID = await getPlasmaCoinId(tokenOP, rootChain);
		const tokenPLInstance = await getCryptomon(tokenPLID, cryptoMons);
		const tokenOPInstance = await getCryptomon(tokenOPID, cryptoMons);
		exitData = exitData || await getExitData(tokenPL);
		const exitRLPData = getExitDataToBattleRLPData(exitData);

		const initialState = getInitialCMBState(tokenPL, tokenPLInstance, tokenOP, tokenOPInstance);
		await initiateBattle(plasmaCM, plasmaTurnGame.address, opponentAddress, 10, toCMBBytes(initialState), exitRLPData);
		resolve();
	});
};

const initiateBattle = (plasmaCM, channelType, opponent, stake, initialGameAttributes, exitRLPData) => {
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

export const getBattleTokens = (gameId, plasmaTurnGame) => {
	return new Promise((resolve, reject) => {
		baseEthContract(plasmaTurnGame).getPastEvents("CryptoMonBattleRequested",
			{ filter: { gameId }, fromBlock: 0, toBlock: 'latest' }, async (err, result) => {
			if(err) return reject(err);
			if(result.length < 2) return reject("2 events should be found");
			resolve({
				player: {
					address: result[0].returnValues.player.toLowerCase(),
					cryptoMon: result[0].returnValues.CryptoMon
				},
				opponent: {
					address: result[1].returnValues.player.toLowerCase(),
					cryptoMon: result[1].returnValues.CryptoMon
				}
			})
		});
	});
};