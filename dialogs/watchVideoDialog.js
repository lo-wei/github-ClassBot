// import dialog
const { ComponentDialog, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

const CHAPTER_PROMPT = 'CHAPTER_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

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
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.askChapterStep.bind(this),
                this.videoStep.bind(this)
            ]));
        
        this.initialDialogId = WATERFALL_DIALOG;
        
    } // constructor
    
    /**
     * If chapter has not been provided, prompt for one.
     */
     async askChapterStep(stepContext) {
         const chapterEntities = stepContext.options["entities"];
         
         if (chapterEntities == undefined) {
             // return await stepContext.context.sendActivity('請問要看哪一章節的影片呢?');
             return await stepContext.prompt(CHAPTER_PROMPT, '請問要看哪一章節的影片呢?');
         }
         
         return await stepContext.next(chapterEntities);
     } // askChapterStep()
     
     async videoStep(stepContext) {
         let chapterEntities = stepContext.options["entities"];
         
         // 由於上一輪是text prompt, user result不定, 故此step再去luis找entities
         const luisResult = await stepContext.options["recognizer"].recognize(stepContext.context); */
         chapterEntities = Object.keys(luisResult.entities.$instance)[0].replace(/\s*/g,"");
         
         let replyText = 'init text';
         
         try {
             await database.ref(`${chapterEntities}/url`).once('value', function (snapshot) {
                 replyText = snapshot.val();
             });
         }
         catch(err) {
             replyText = '不好意思~找不到此章節';
         }
         
         await stepContext.context.sendActivity(replyText);
         return await stepContext.endDialog();
     } // videoStep()
}

exports.WatchVideoDialog = WatchVideoDialog;