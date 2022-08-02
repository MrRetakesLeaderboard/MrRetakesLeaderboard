require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const GraphemeSplitter = require('grapheme-splitter');
const table = require('text-table');
const { getPlayers } = require('./database');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
	console.log('Ready!');

	const updateIntv = 1000 * 60 * 3;

	setInterval(async () => {
		try {
			await updateLeaderboard(updateIntv);
			console.log('Leaderboard updated!');
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

async function updateLeaderboard(updateIntv) {
	try {
		let msg;
		const intro = `Retakes Leaderboard - Updates every ${
			updateIntv / 1000 / 60
		} minutes
=============================================

`;

		const channel = getChannel();

		if (channel) {
			const messages = await channel.messages.fetch({ limit: 1 });

			if (messages.size < 1) {
				msg = await channel.send('```' + intro + '```');
			} else {
				msg = messages.get([...messages.keys()][0]);
			}

			const data = await getPlayers();

			if (data) {
				const leaderboard = createTable(data);

				msg.edit('```' + intro + leaderboard + '```');
			}
		}
	} catch (err) {
		console.log(err);
	}
}

function createTable(data) {
	const tHead = ['Rank', 'Name', 'SteamID', 'Score'];
	const tRows = data.map((row, index) => {
		const name =
			row[
				'CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4)'
			];

		const decodedName = sanitizeUsername(name);

		return [index + 1, decodedName, row.steam, row.score];
	});

	return table([tHead, ...tRows], {
		align: ['r', 'l', 'l', 'r'],
		hsep: '		',
		stringLength: (string) =>
			new GraphemeSplitter().splitGraphemes(string).length,
	});
}

function sanitizeUsername(name) {
	let encodedName = encodeURIComponent(name);

	if (encodedName.includes('%F3%A0%81%B3%E2%81%A7%E2%81%A7')) {
		encodedName = encodedName.replace('%F3%A0%81%B3%E2%81%A7%E2%81%A7', '');
	}

	return decodeURIComponent(encodedName).replace(
		/\p{Emoji_Presentation}/gu,
		''
	);
}

module.exports = client;
