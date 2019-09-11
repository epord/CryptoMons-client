import web3Utils from 'web3-utils';
import async from 'async';
import { zip, unique } from '../utils/utils';

import { getOwnedTokens } from "./plasmaServices";

const ethContract = (data) => web3.eth.contract(data.abi).at(data.address);

export const getCoinState = (slot, rootChain) => {
	const slotBN = web3.toBigNumber(slot);
	const states = ["NOT_EXITING", "EXITING", "EXITED"];

	return new Promise((resolve, reject) => {
		ethContract(rootChain).getPlasmaCoin(slotBN, (err, res) => {
			if (err) return reject(err);
			resolve(states[res[3]]);
		});
	});
};

const getStateTokens = (filter, rootChain, state) => {
	return new Promise((resolve, reject) => {
		const rcContract = ethContract(rootChain);
		const blockFilter = { fromBlock: 0, toBlock: 'latest' };

		//TODO: if the coin is exiting, another call to getExit to check the owner coincides should be made
		rcContract.StartedExit(filter, blockFilter).get(async (err, result) => {
			if(err) return reject(err);
			const callBacks = result.map((s) => getCoinState(s.args.slot, rootChain));
			const exitingBool = await Promise.all(callBacks);
			resolve(zip(result, exitingBool).filter(e => e[1] == state).map(e => e[0]));
		});
	});
};

const getExitingTokens = (filter, rootChain) => getStateTokens(filter, rootChain, "EXITING");
const getExitedTokens = (filter, rootChain) => getStateTokens(filter, rootChain, "EXITED");


export const depositToPlasma = (token, cryptoMons, rootChain) => {
	const rootChainAddress = rootChain.address;
	const sender = web3.eth.accounts[0];

	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).safeTransferFrom(sender, rootChainAddress, token, (err, res) => {
			if (err) return reject(err);
			resolve(res)
		})
	})
};

const subscribeToEvent = (event, filter, rootChain, cb) => {
	const rcContract = ethContract(rootChain);
	rcContract[event](filter).watch((err, res) => {
		if(err) return console.error(err);
		cb(res)
	})
};

export const subscribeToDeposits = (rootChain, address, cb) => {
	subscribeToEvent("Deposit", {from: address}, rootChain, cb)
};

export const subscribeToSubmittedBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedBlock", {}, rootChain, cb)
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

export const getChallengeable = (address, rootChain) => {
  return new Promise(async (resolve, reject) => {
		const exiting = await getOwnedTokens(address, true);
		const slotFilter = { slot: exiting };
		const filteredTokens = await getExitingTokens(slotFilter, rootChain);
		resolve(unique(
			filteredTokens.filter(e => e.args.owner.toLowerCase() !== address.toLowerCase())
			.map(e=> e.args.slot.toFixed()))
		);
	});
};

export const getChallenges = (slot, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getChallenges(slot, (err, result) => {
			if(err) return reject(err);
			resolve(result);
		});
	});
};

export const getChallenge = (slot, txHash, rootChain) => {
	return new Promise((resolve, reject) => {
		ethContract(rootChain).getChallenge(slot, txHash, (err, result) => {
			if(err) return reject(err);
			resolve(result);
		});
	});
};

/// TODO: Shouldn't return all exits, but should return multiple times the same slot if there are multiple challengeBefore going on
export const getChallengedFrom = (address, rootChain) => {
	return new Promise(async (resolve, reject) => {
		const exiting = await getOwnedTokens(address, true);
		const slotFilter = { slot: exiting };
		const filteredTokens = unique((await getExitingTokens(slotFilter, rootChain)).map(t => t.args.slot));
		const challenges = await Promise.all(filteredTokens.map(s => getChallenges(s, rootChain)));
		const result = zip(filteredTokens, challenges).filter(e=> e[1].length > 0).map(e => ({ slot: e[0].toFixed(), txHash: e[1] }));
		const filtered = unique(result, (s1) => (s2) => s1.slot == s2.slot);
		resolve(filtered)
	});
};

export const getExitingFrom = (address, rootChain)  => {
	return new Promise(async (resolve, reject) => {
		const ownerFilter = { owner: address };
		const filteredExits = await getExitingTokens(ownerFilter, rootChain);
		resolve(unique(filteredExits.map(e=> e.args.slot.toFixed())));
	})
};

export const getExitedFrom = (address, rootChain)  => {
	return new Promise(async (resolve, reject) => {
		const ownerFilter = { owner: address };
		const filteredExits = await getExitedTokens(ownerFilter, rootChain);
		resolve(unique(filteredExits.map(e=> e.args.slot.toFixed())));
	})
};

export const challengeAfter = (slot, rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const exitBlock = res[2];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${exitBlock}`);
			if(response.status >=400) return reject("Challenge After could not be completed");

			const exitData = await response.json();
			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = web3.toBigNumber(slot);
			const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);

			ethContract(rootChain)
				.challengeAfter(slotBN, challengingTransaction, proof, signature, challengingBlockNumberBN, (err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const challengeBetween = (slot, rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const parentBlock = res[1];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${parentBlock}`);
			if(response.status >=400) return reject("Challenge Between could not be completed");
			const exitData = await response.json();

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = web3.toBigNumber(slot);
			const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);

			ethContract(rootChain)
				.challengeBetween(slotBN, challengingTransaction, proof, signature, challengingBlockNumberBN, {
					from: web3.eth.accounts[0]
				}, (err, res) => {
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
		const slotBN = web3.toBigNumber(slot);
		const respondingBlockNumberBN = web3.toBigNumber(respondingBlockNumber);

		ethContract(rootChain)
			.respondChallengeBefore(slotBN, challengingTxHash, respondingBlockNumberBN, respondingTransaction, proof, signature, {
				from: web3.eth.accounts[0]
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
}

export const challengeBefore = (slot, rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
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
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.getBalance(async (err, res) => {
			if (err) return reject(err);
			const withdrawable = res[1];
			resolve(withdrawable);
		});
	});
}

export const getBlockRoot = (blockNumber, rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.getBlockRoot(blockNumber, async (err, res) => {
			if (err) return reject(err);
			const rootHash = res;
			resolve(rootHash);
		});
	});
}

export const checkEmptyBlock = (blockNumber, rootChain) => {
	const rcContract = ethContract(rootChain);

	return new Promise((resolve, reject) => {
		rcContract.getBlockRoot(
			blockNumber,
			(err, res) => {
			if (err) return reject(err);
			resolve(res == "0x6f35419d1da1260bc0f33d52e8f6d73fc5d672c0dca13bb960b4ae1adec17937");
		});
	});
}

export const checkInclusion = (txHash, blockNumber, slot, proof, rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.checkInclusion(
			txHash || web3Utils.soliditySha3(0),
			blockNumber,
			slot,
			proof,
			(err, res) => {
			if (err) return reject(err);
			resolve(res); // true or false
		});
	});
}

export const withdrawBonds = (rootChain) => {
	const rcContract = ethContract(rootChain);

  return new Promise((resolve, reject) => {
		rcContract.withdrawBonds(async (err, res) => {
			if (err) return reject(err);
			resolve(res);
		});
	});
}

export const challengeBeforeWithExitData = (exitData, rootChain) => {
	const { slot, challengingTransaction, proof, challengingBlockNumber } = exitData;

	const slotBN = web3.toBigNumber(slot);
	const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);


  return new Promise(async (resolve, reject) => {
		ethContract(rootChain)
			.challengeBefore(slotBN, challengingTransaction, proof, challengingBlockNumberBN, {
				from: web3.eth.accounts[0],
				value: web3Utils.toWei('0.1', 'ether')
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
}

export const getCryptoMonsFrom = (address, cryptoMons) => {
  return new Promise((resolve, reject) => {
    ethContract(cryptoMons).Transfer({ to: address }, { fromBlock: 0, toBlock: 'latest' })
      .get((err, res) => {
        if(err) return reject(err)

        const tokens = unique(res.map(transfer => transfer.args.tokenId.toFixed()))
        async.parallel(
          tokens.map(tokenId => cb => ethContract(cryptoMons).ownerOf(tokenId, cb)),
          (err, res) => {
            if (err) return reject(err);
            resolve(zip(tokens, res).filter((e) => e[1] == address).map(e => e[0]))
          });
      });
  });
}

export const finalizeExit = (rootChain, slot) => {
	const slotBN = web3.toBigNumber(slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain).finalizeExit(slotBN, (err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
}

export const withdraw = (rootChain, slot) => {
	const slotBN = web3.toBigNumber(slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain).withdraw(slotBN, (err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
};

export const buyCryptoMon = cryptoMons => {
	return new Promise((resolve, reject) => {
		ethContract(cryptoMons).buyCryptoMon({
			from: web3.eth.accounts[0],
			value: web3Utils.toWei('0.01', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
};

export const exitDepositToken = (rootChain, slot) => {
	const slotBN = web3.toBigNumber(slot);

	return new Promise((resolve, reject) => {
		ethContract(rootChain)
			.startDepositExit(slotBN, {
				from: web3.eth.accounts[0],
				value: web3Utils.toWei('0.1', 'ether')
			}, (err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
};
export const exitToken = (rootChain, {slot, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature,
	prevBlock, exitingBlock}) => {
	const slotBN = web3.toBigNumber(slot);
	const _blocks = [
			web3.toBigNumber(prevBlock),
			web3.toBigNumber(exitingBlock),
		];

	return new Promise((resolve, reject) => {
		ethContract(rootChain)
		.startExit(slotBN, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature, _blocks, {
			from: web3.eth.accounts[0],
			value: web3Utils.toWei('0.1', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
};