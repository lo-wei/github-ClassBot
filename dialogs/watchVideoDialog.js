const { MessageFactory } = require('botbuilder');

// Instantiate a LuisRecognizer
const { LuisRecognizer } = require('botbuilder-ai');

const luisRecognizer = new LuisRecognizer({
    applicationId: process.env.LuisAppId,
    endpointKey: process.env.LuisAPIKey,
    endpoint: `https://${process.env.LuisAPIHostName}`
}, {}, true);

// import dialog
const { ComponentDialog,
        TextPrompt,
        WaterfallDialog } = require('botbuilder-dialogs');

const CHAPTER_PROMPT = 'CHAPTER_PROMPT';

// Import firebase package
var firebase = require('firebase');

firebase.initializeApp({
   databaseURL: "https://ai-introduction-28028.firebaseio.com/" 
});

const database = firebase.database();

class WatchVideoDialog extends ComponentDialog {
    constructor(dialogId){
        super(dialogId);
        
        this.addDialog(new TextPrompt(CHAPTER_PROMPT));
        this.addDialog(new WaterfallDialog(dialogId, [
                this.askChapterStep.bind(this),
                this.videoStep.bind(this)
            ]));
        
        this.initialDialogId = dialogId;
    } // constructor
    
    /**
     * If chapter has not been provided, prompt for one.
     */
    async askChapterStep(stepContext) {
        console.log('askChapterStep');
         const chapterEntities = stepContext.options["entities"];
         
        if (chapterEntities == undefined) {
            const promptText = '請輸入章節or章節名稱(如 1-1 或 什麼是人工智慧)';
            const reply = MessageFactory.suggestedActions(['不看了'], promptText);
            return await stepContext.prompt(CHAPTER_PROMPT, reply);
        }
         
         return await stepContext.next(chapterEntities);
     } // askChapterStep()
     
    async videoStep(stepContext) {
        console.log('videoStep');

        if (stepContext.context.activity.text === '不看了') {
            return await stepContext.endDialog();
        }

        let chapterEntities = stepContext.options["entities"];
         
         // 由於上一輪是text prompt, user result不定, 故此step再去luis找entities
        const luisResult = await luisRecognizer.recognize(stepContext.context);
        chapterEntities = Object.keys(luisResult.entities.$instance)[0];
         
        let replyText = 'init text';
         
        try {
            chapterEntities.replace(/\s*/g, "");

            if (chapterEntities === 'CH1' || chapterEntities === 'CH2'
                || chapterEntities === 'CH3' || chapterEntities === 'CH4'
                || chapterEntities === 'CH5' || chapterEntities === 'CH6') {
                let replys = [];
                await database.ref(`${chapterEntities}/url`).once('value', function (snapshot) {
                    console.log(snapshot.val());
                    snapshot.forEach(function (item) {
                        replys.push( item.val() );
                    })
                });

                var i;
                for (i = 0; i < replys.length; i++) {
                    await stepContext.context.sendActivity(replys[i]);
                }
            }
            else {
                await database.ref(`${chapterEntities}/url`).once('value', function (snapshot) {
                    replyText = snapshot.val();
                    console.log(replyText);
                });
                await stepContext.context.sendActivity(replyText);
            }
        }
        catch (err) {
            replyText = '不好意思~找不到此章節';
            await stepContext.context.sendActivity(replyText);
        }

         return await stepContext.endDialog();
     } // videoStep()
}

exports.WatchVideoDialog = WatchVideoDialog;