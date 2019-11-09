import {basicGet} from "./plasmaServices";

const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider);

export const setDefaultBattleAccount = (account) => {
	web3.eth.defaultAccount = account;
}

const ethContract = (data) => new web3.eth.Contract(data.abi, data.address).methods;

export const battleChallengeAfter = (channel, index, plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if (err) return reject(err);
			const exitBlock = exit.exitBlock;
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${exit.slot}&exitBlock=${exitBlock}`);

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const challengingBlockNumberBN = (challengingBlockNumber);

			ethContract(plasmaCM)
				.challengeAfter(channel.channelId, index, challengingTransaction, proof, signature, challengingBlockNumberBN)
				.send({from: web3.eth.defaultAccount},(err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const battleChallengeBetween = (channel, index, plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if (err) return reject(err);
			const parentBlock = exit.prevBlock;
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${exit.slot}&exitBlock=${parentBlock}`);

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const challengingBlockNumberBN = (challengingBlockNumber);

			ethContract(plasmaCM)
				.challengeBetween(channel.channelId, index, challengingTransaction, proof, signature, challengingBlockNumberBN)
				.send({from: web3.eth.defaultAccount},(err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
};

// export const battleRespondChallenge = (channel, index, challengingBlock, challengingTxHash,  rootChain) => {
//   return new Promise(async (resolve, reject) => {
// 		const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${challengingBlock}`);
// 		const challengeData = await response.json();

// 		const { challengingBlockNumber: respondingBlockNumber, challengingTransaction: respondingTransaction, proof, signature} = challengeData;
// 		const slotBN = (slot);
// 		const respondingBlockNumberBN = (respondingBlockNumber);

// 		ethContract(rootChain)
// 			.respondChallengeBefore(slotBN, challengingTxHash, respondingBlockNumberBN, respondingTransaction, proof, signature)
// 			.send({from: web3.eth.defaultAccount},(err, res) => {
// 				if (err) return reject(err)
// 				resolve(res);
// 			})
// 	})
// }

export const battleChallengeBefore = (channel, index, plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if (err) return reject(err);
			const parentBlock = exit.prevBlock;
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/before?slot=${exit.slot}&parentBlock=${parentBlock}`);

			battleChallengeBeforeWithExitData(channel, index, exitData, plasmaCM).then(resolve)
		})
	})
}

export const battleChallengeBeforeWithExitData = (channel, index, exitData, plasmaCM) => {
	const { challengingTransaction, proof, challengingBlockNumber } = exitData;
	const challengingBlockNumberBN = (challengingBlockNumber);

  return new Promise(async (resolve, reject) => {
		ethContract(plasmaCM)
			.challengeBefore(channel, index, challengingTransaction, proof, challengingBlockNumberBN).send({from: web3.eth.defaultAccount},
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
