// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.announceNewArticle = functions.https.onRequest((req, res) => {
	admin.database().ref('chats').push(req.query);
	res.status(200).send('DONE!');
});