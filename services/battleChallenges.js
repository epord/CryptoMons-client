import {basicGet} from "./plasmaServices";

const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider);
import web3Utils from 'web3-utils';
import async from 'async';

export const setDefaultBattleAccount = (account) => {
	web3.eth.defaultAccount = account;
}

const ethContract = (data) => new web3.eth.Contract(data.abi, data.address).methods;
const baseEthContract = (data) => new web3.eth.Contract(data.abi, data.address);

export const battleChallengeAfter = (channel, index, plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if (err) return reject(err);
			const exitBlock = exit.exitBlock;
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${exit.slot}&exitBlock=${exitBlock}`).catch(reject);

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
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${exit.slot}&exitBlock=${parentBlock}`).catch(reject);

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

export const closeChallengedChannel = (channel,  plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM)
		.closeChallengedChannel(channel.channelId)
		.send({from: web3.eth.defaultAccount},(err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
}

export const respondBattleChallenge = (channel, challengingBlock, challengingTxHash, plasmaCM) => {
  return new Promise((resolve, reject) => {
		let index = 0;
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if(err) return reject(err);
			if(exit.slot == 0) return reject(err);

			const challengeData = await basicGet(`${process.env.API_URL}/api/challenges/after?slot=${exit.slot}&exitBlock=${challengingBlock}`).catch(reject); //TODO: remove these catch
			const { challengingBlockNumber: respondingBlockNumber, challengingTransaction: respondingTransaction, proof, signature} = challengeData;

			ethContract(plasmaCM)
			.respondChallengeBefore(channel.channelId, index, challengingTxHash, respondingBlockNumber, respondingTransaction, proof, signature)
			.send({from: web3.eth.defaultAccount},(err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
		})
	})
}

export const battleChallengeBefore = (channel, index, plasmaCM) => {
  return new Promise((resolve, reject) => {
		ethContract(plasmaCM).getExit(channel.channelId, index).call(async (err, exit) => {
			if (err) return reject(err);
			const parentBlock = exit.prevBlock;
			const exitData = await basicGet(`${process.env.API_URL}/api/challenges/before?slot=${exit.slot}&parentBlock=${parentBlock}`).catch(reject);

			battleChallengeBeforeWithExitData(channel, index, exitData, plasmaCM).then(resolve)
		})
	})
}

export const battleChallengeBeforeWithExitData = (channel, index, exitData, plasmaCM) => {
	const { challengingTransaction, proof, challengingBlockNumber } = exitData;
	const challengingBlockNumberBN = (challengingBlockNumber);

  return new Promise(async (resolve, reject) => {
		ethContract(plasmaCM)
			.challengeBefore(channel.channelId, index, challengingTransaction, proof, challengingBlockNumberBN).send({from: web3.eth.defaultAccount},
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

export const getBattleChallenges = (channelId, plasmaCM) => {
	return new Promise((resolve, reject) => {
		baseEthContract(plasmaCM).getPastEvents("ChallengeRequest",
			{ filter: { channelId }, fromBlock: 0, toBlock: 'latest' }, async (err, result) => {
			if(err) return reject(err);
			if(!result) return reject("No result");
			async.parallel(
				result.map(e => cb => ethContract(plasmaCM).getChallenge(channelId, e.returnValues.txHash).call(cb)),
				(err, challenges) => {
					if(err) return reject(err);
					resolve(challenges.filter(c => c.challengingBlockNumber > 0));
				}
			)
		});
	});
};