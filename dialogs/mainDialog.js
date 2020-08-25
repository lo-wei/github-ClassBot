const { MessageFactory } = require('botbuilder');

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

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WATCH_VIDEO_DIALOG = 'WATCH_VIDEO_DIALOG';

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
        // Get the result and intent of user input
        const luisResult = await luisRecognizer.recognize(stepContext.context);
        const intent = LuisRecognizer.topIntent(luisResult);
        switch(intent) {
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
                await stepContext.context.sendActivity(`這裡是課綱資訊 ${String.fromCharCode(0xD83D, 0xDE00)}`);
                await stepContext.context.sendActivity('https://cmap.cycu.edu.tw:8443/Syllabus/CoursePreview.html?yearTerm=1091&opCode=GE728A');
                return await stepContext.next();
            } // case 'AskSyllabus'

            default: {
                const replyText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${intent})`;
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
        var reply = MessageFactory.suggestedActions(['查課綱', '老師是誰', '看影片'], '還需要什麼服務嗎');
        await turnContext.sendActivity(reply);
    }
} // class MainDialog

module.exports.MainDialog = MainDialog;
