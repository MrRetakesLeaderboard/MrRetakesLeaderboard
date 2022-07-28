const mysql = require('mysql');
const db = mysql.createConnection({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	charset: 'utf8mb4_unicode_ci',
});

db.connect((err) => {
	if (err) {
		console.error(`DB error: ${err}`);
		return;
	}

	console.log('Connected to DB!');
});

exports.getPlayers = () =>
	new Promise((resolve, reject) => {
		db.query(
			'SELECT CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4), steam, score FROM rankme ORDER BY score DESC LIMIT 20',
			(err, res) => {
				if (err) {
					console.error(err);
					reject(err);
				}

				resolve(res);
			}
		);
	});
