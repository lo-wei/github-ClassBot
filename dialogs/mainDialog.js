const { MessageFactory } = require('botbuilder');
const fs = require('fs');

// suggest button
const suggestion = ['查課綱', '看影片', '做題目']

// Instantiate a LuisRecognizer
const { LuisRecognizer } = require('botbuilder-ai');

const luisRecognizer = new LuisRecognizer({
    applicationId: process.env.LuisAppId,
    endpointKey: process.env.LuisAPIKey,
    endpoint: `https://${process.env.LuisAPIHostName}`
}, {}, true);

// import dialog
const { DialogSet,
        DialogTurnStatus,
        ComponentDialog,
        WaterfallDialog } = require('botbuilder-dialogs');
const { WatchVideoDialog } = require('./watchVideoDialog');
const { DoQuizDialog } = require('./doQuizDialog');

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WATCH_VIDEO_DIALOG = 'WATCH_VIDEO_DIALOG';
const DO_QUIZ_DIALOG = 'DO_QUIZ_DIALOG';

class MainDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super();

        // Create the state property accessors
        this.dialogInfoAccessor = conversationState.createProperty('DIALOG_INFO_PROPERTY');
        this.userInfoAccessor = userState.createProperty('USER_INFO_PROPERTY');

        // The state management object
        this.conversationState = conversationState;
        this.userState = userState;

        this.dialogs = new DialogSet(this.dialogInfoAccessor);

        this.dialogs.add(new WatchVideoDialog(WATCH_VIDEO_DIALOG))
            .add(new DoQuizDialog(DO_QUIZ_DIALOG))
            .add(new WaterfallDialog(WATERFALL_DIALOG, [
                this.startChildDialogStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    } // constructor()

    async run(turnContext) {
        const dialogContext = await this.dialogs.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(WATERFALL_DIALOG);
        }
    }

    async startChildDialogStep(stepContext) {
        console.log('startChildDialogStep');

        this.recordConversation(stepContext);
        
        // Get the result and intent of user input
        const luisResult = await luisRecognizer.recognize(stepContext.context);
        const intent = LuisRecognizer.topIntent(luisResult);
        switch (intent) {
            case 'DoQuiz': {
                return await stepContext.beginDialog(DO_QUIZ_DIALOG);
                break;
            } // case 'DoQuiz'

            case 'WatchVideo': {
                let chapterEntities = Object.keys(luisResult.entities.$instance)[0];
                if (chapterEntities != undefined) {
                    chapterEntities = chapterEntities.replace(/\s*/g, "");
                }
                console.log(`chapterEntities: ${chapterEntities}`);
                return await stepContext.beginDialog(WATCH_VIDEO_DIALOG, { entities: chapterEntities });
                break;
            } // case 'WatchVideo'

            case 'AskTeacher': {
                // 測試爬蟲?
                await stepContext.context.sendActivity('余執彰, 張元翔');
                return await stepContext.next();
            } // case 'AskTeacher'

            case 'AskSyllabus': {
                await stepContext.context.sendActivity(`這裡是課綱資訊 ${String.fromCharCode(0xD83D, 0xDC40)}`);
                await stepContext.context.sendActivity('https://cmap.cycu.edu.tw:8443/Syllabus/CoursePreview.html?yearTerm=1091&opCode=GE728A');
                return await stepContext.next();
            } // case 'AskSyllabus'

            default: {
                const replyText = '可以再說明白一點';
                await stepContext.context.sendActivity(replyText);
                return await stepContext.next();
            } // default
        } // switch(intent)
    } // startChildDialogStep()

    async finalStep(stepContext) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.sendSuggestedActions(stepContext.context);
        return await stepContext.endDialog();
    } // finalStep()

    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(suggestion, '還需要什麼服務嗎');
        await turnContext.sendActivity(reply);
    }

    async recordConversation(stepContext) {
        const user_name = stepContext.context.activity.from.name;
        const user_text = stepContext.context.activity.text;
        fs.readFile('log.json', function (err, log) {
            if (err) {
                return console.error(err);
            }
            //將二進制數據轉換為字串符
            var userInfo = log.toString();
            //將字符串轉換成JSON對象
            userInfo = JSON.parse(userInfo);

            if (suggestion.indexOf(user_text) === -1) { //如果使用者按建議按鈕，則不列入紀錄
                userInfo.push({ name: user_name, text: user_text });
            }

            //write back to JSON file
            var log_str = JSON.stringify(userInfo);
            fs.writeFile("log.json", log_str, 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing JSON Object to File.");
                    return console.log(err);
                }

                console.log("logjson file has been saved.");
            })
        })
    }
} // class MainDialog

module.exports.MainDialog = MainDialog;
