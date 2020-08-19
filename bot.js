// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, ActionTypes, ActivityTypes, CardFactory, MessageFactory } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

// Import firebase package
var firebase = require('firebase');

firebase.initializeApp({
   databaseURL: "https://ai-introduction-28028.firebaseio.com/" 
});

const database = firebase.database();
                
class EchoBot extends ActivityHandler {
    constructor() {
        super();

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            let replyText = 'init text';

            // Instantiate a LuisRecognizer
            const recognizer = new LuisRecognizer({
                applicationId: process.env.LuisAppId,
                endpointKey: process.env.LuisAPIKey,
                endpoint: `https://${ process.env.LuisAPIHostName }`
            }, {}, true);
            
            // Get the result and intent of user input
            const luisResult = await recognizer.recognize(context);
            const intent = LuisRecognizer.topIntent(luisResult);
            switch (intent) {
                case 'WatchVideo': {
                    try {
                        const entities = Object.keys(luisResult.entities.$instance)[0].replace(/\s*/g,"");
                        await database.ref(`${entities}/url`).once('value', function (snapshot) {
                            replyText = snapshot.val();
                        });
                    }
                    catch(err) {
                        replyText = '不好意思～找不到此章節';
                    }
                    
                    break;
                } // case 'WatchVideo'
                default: {
                    replyText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ intent })`;
                } // default
            } // switch (intent)
            
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                    
                    const reply = { type: ActivityTypes.Message };
                    const attach_name = '人工智慧導論_簡介影片';
                    const attach_type = 'video/mp4';
                    const attach_url = 'https://drive.google.com/file/d/1zPYTX2AvSMHXGdNWgYExEdgMVMNbK_QI/view?usp=sharing';
                    reply.text = '先來看一段課程介紹影片';
                    reply.attachments = [this.getInternetAttachment(attach_name, attach_type, attach_url)];
                    await context.sendActivity(reply);
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    } // constructor()
    
    getInternetAttachment(attach_name, attach_type, attach_url) {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: attach_name,
            contentType: attach_type,
            contentUrl: attach_url
        };
    }
} // class EchoBot extends ActivityHandler

module.exports.EchoBot = EchoBot;
