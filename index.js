require('dotenv').config();
const buffer = require('buffer');
const fetch = (...args) =>
	import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { Client, GatewayIntentBits } = require('discord.js');
const SteamId = require('steamid');
const table = require('text-table');
const wcwidth = require('wcwidth');
const { getLeaderboard } = require('./database');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
	console.log('Ready!');
	const updateIntv = 1000 * 60 * 3;
	let msg;
	const intro = `Retakes Leaderboard - Updates every ${
		updateIntv / 1000 / 60
	} minutes
=============================================

`;
	setInterval(async () => {
		try {
			const channel = getChannel();

			if (channel) {
				const messages = await channel.messages.fetch({ limit: 1 });

				if (messages.size < 1) {
					msg = await channel.send('```' + intro + '```');
				} else {
					messages.forEach((message) => {
						if (message.author.id === process.env.BOT_ID) {
							msg = message;
						}
					});
				}

				const data = await getLeaderboard();
				const transformedData = await replaceSteamIdByName(data);

				if (transformedData) {
					const leaderboard = createTable(transformedData);
					console.log(leaderboard);

					msg.edit('```' + intro + leaderboard + '```');
				}
			}
		} catch (err) {
			console.log(err);
		}
	}, updateIntv);
});

client.login(process.env.BOT_TOKEN);

function getChannel() {
	let channel = client.channels.cache.get(process.env.CHANNEL_ID);

	if (!channel) {
		channel = client.channels.cache.find(
			(x) =>
				x.guild.id === process.env.GUILD_ID &&
				x.name.toUpperCase() === 'LEADERBOARD'
		);
	}

	return channel ?? null;
}

async function replaceSteamIdByName(data) {
	try {
		const ids = data.map((x) => new SteamId(x.steam).getSteamID64());

		const txt = await fetch(
			`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${
				process.env.STEAM_WEB_KEY
			}&steamids=${ids.join()}`
		);
		const res = await txt.json();

		return mapNameToRank(data, res.response.players);
	} catch (err) {
		console.log(err);
		return null;
	}
}

function mapNameToRank(data, players) {
	return data.map((x) => {
		const sid = new SteamId(x.steam).getSteamID64();
		const { personaname } = players.find(
			(account) => account.steamid === sid
		);

		x['name'] = personaname;

		return x;
	});
}

function createTable(data) {
	const tHead = ['Rank', 'Name', 'SteamID', 'Score'];
	const tRows = data.map((row, index) => [
		index + 1,
		row.name,
		row.steam,
		row.score,
	]);

	return table([tHead, ...tRows], {
		align: ['r', 'l', 'l', 'r'],
		stringLength: wcwidth,
		hsep: '		',
	});
}

module.exports = client;
