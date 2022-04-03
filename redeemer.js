const SteamUser = require('steam-user');
const bot = new SteamUser();
const config = require('./config.json');
const fs = require('fs');

// Set up login
let ownerID = config.owner;
const logOnOptions = {
	accountName: config.name,
	password: config.password,
	rememberPassword: true,
}

// Clean local files
fs.writeFile(__dirname + '/Results/successful.txt', '', err => {
	if(err) {
		console.log(err);
	}
});
fs.writeFile(__dirname + '/Results/failed.txt', '', err => {
	if(err) {
		console.log(err);
	}
});

// Perform login
bot.logOn(logOnOptions);

bot.on('loggedOn', () => {
	console.log('We`re rollin` in!');
	bot.setPersona(SteamUser.EPersonaState.Online);
	bot.gamesPlayed(["Library Boosted by WulfsGames.com",440]);

	// Get games from local file
	fs.readFile(__dirname + '/games.txt', 'utf8', (err, data) => {
		if(fs.statSync(__dirname + '/games.txt').size === 0) {
			return;
		}

		if (err) {
			console.error(err);
			return;
		}

		let games = [];

		// Separate by newline
		let localGames = data.split("\n");

		// Separate by identifier
		for (let x = 0; x < localGames.length; x++) {
			games.push(localGames[x].split('|').pop().trim());
		}

		status = 'busy';
		activator(games);
	});
});

// Redeemer
const redeemer = async(key) => {
	return new Promise((resolve, reject) => {
		bot.redeemKey(key, (err) => {
			if(err) {
				return reject(err);
			}

			resolve();
		})
	})
}

// Activator
function activator(games) {
	( async() => {
		for(let x = 0; x < games.length; x++) {
			if(x === games.length - 1) {
				status = '';
			}

			let iteration = x + 1;
			try {
				await redeemer(games[x]);
				console.log('Redeeming key #' + iteration + ' (' + games[x] +  ') - Succesful');
				fs.appendFile(__dirname + '/Results/succesful.txt', games[x] + '\r\n', err => {
					if(err) {
						console.log(err);
					}
				});
			} catch (err) {
				switch(err.purchaseResultDetails) {
					case 9:
						console.log('Redeeming key #' + iteration + ' (' + games[x] +  ') - Game Already owned')
						fs.appendFile(__dirname + '/Results/failed.txt', games[x] + '\r\n', err => {
							if(err) {
								console.log(err);
							}
						});
						await delay(1000);
						break;
					case 14:
						console.log('Invalid Code')
						await delay(1000);
						break;
					case 53:
						console.log('Redeeming key #' + iteration + ' (' + games[x] +  ') - Hourly limit reached, retrying...')
						x = x - 1;
						await delay(60 * 60 * 1000);
						break;
				}
			}
		}
	})();
}

// Wait it out
const delay = async (ms = 1000) =>
	new Promise(resolve => setTimeout(resolve, ms));

// Receive Messages
let status = '';
bot.on("friendMessage", function(steamID, message) {
	// Handle Admin Message
	let persona = steamID.getSteamID64();

	// Handle Bot Status
	if(status === 'busy') {
		console.log('Bot is busy.');
		return;
	}

	// Check for owner
	if(persona !== ownerID) {
		console.log('Received message from somebody else.');
		return;
	}

	// Check if games are stored locally
	if(fs.statSync(__dirname + '/games.txt').size !== 0) {
		console.log('There are games stored locally, cannot proceed with activation through chat. Please clean your games.txt file first.');
		return;
	}

	// Redeem Keys
	let games = [];
	let rawGames = message.split("\n");

	for (let x = 0; x < rawGames.length; x++) {
		games.push(rawGames[x].split('|').pop().trim());
	}

	status = 'busy';
	activator(games);
});