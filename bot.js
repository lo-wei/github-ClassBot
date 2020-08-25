// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
                
class MyBot extends ActivityHandler {
    constructor(conversationState, userState, mainDialog) {
        super();
        if (!conversationState) throw new Error('[MyBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[MyBot]: Missing parameter. userState is required');
        if (!mainDialog) throw new Error('[MyBot]: Missing parameter. mainDialog is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.mainDialog = mainDialog;

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            console.log('onMessage.');

            // Run the Dialog with the new message Activity.
            await this.mainDialog.run(context);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hi~我是人工智慧導論的小幫手';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                    this.sendSuggestedActions(context);

                    /*
                    const reply = { type: ActivityTypes.Message };
                    const attach_name = '人工智慧導論_簡介影片';
                    const attach_type = 'video/mp4';
                    const attach_url = 'https://drive.google.com/file/d/1zPYTX2AvSMHXGdNWgYExEdgMVMNbK_QI/view?usp=sharing';
                    reply.text = '先來看一段課程介紹影片';
                    reply.attachments = [this.getInternetAttachment(attach_name, attach_type, attach_url)];
                    await context.sendActivity(reply);
                    */
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    } // constructor()

    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['查課綱', '老師是誰', '看影片'], '您可以使用以下幾種服務');
        await turnContext.sendActivity(reply);
    }

    getInternetAttachment(attach_name, attach_type, attach_url) {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: attach_name,
            contentType: attach_type,
            contentUrl: attach_url
        };
    }
} // class MyBot extends ActivityHandler

module.exports.MyBot = MyBot;
