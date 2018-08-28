// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.announceNewCafaArticle = functions.https.onRequest((req, res) => {
	if (req.query.articleId !== undefined && req.query.title !== undefined && req.query.nickname !== undefined) {
		admin.database().ref('chats').push({
			isNewCafeArticle : true,
			articleId : req.query.articleId,
			title : req.query.title,
			nickname : req.query.nickname
		});
	}
	res.status(200).send('DONE!');
});