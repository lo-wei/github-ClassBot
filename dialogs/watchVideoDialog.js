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

// Some const
const chapterList = '1-1  什麼是人工智慧\n\n\
1-2  人工智慧的應用\n\n\
1-3  電腦眼中的世界 - 特徵\n\n\
2-1  整理資料很重要\n\n\
2-2  猜猜你幾歲 - 回歸分析 \n\n\
2-3  梯度下降法與學習率 \n\n\
2-4  鐵達尼號的生與死 - 淺談分類 \n\n\
3-1  多類別分類問題 \n\n\
3-2  分類結果的好壞 \n\n\
3-3  有關模型的評估 \n\n\
3-4  CSI犯罪現場 - 決策樹 \n\n\
3-5  強化你的決策樹 \n\n\
3-6  遠親不如近鄰 \n\n\
4-1  人工大腦 - 類神經網路 \n\n\
4-2  神經網路的種類 \n\n\
4-3  淺談深度學習 \n\n\
5-1  非監督式學習 \n\n\
5-2  物以類聚 - kmeans分群 \n\n\
5-3  k - means應用 \n\n\
5-4  自動編碼器 \n\n\
5-5  生成對抗網路 \n\n\
6-1  讀心術 - 猜數字 \n\n\
6-2  井字遊戲 \n\n\
6-3  AI技術的省思';

class WatchVideoDialog extends ComponentDialog {
    constructor(dialogId){
        super(dialogId);
        
        this.addDialog(new TextPrompt(CHAPTER_PROMPT));
        this.addDialog(new WaterfallDialog(dialogId, [
                this.askChapterStep.bind(this),
                this.chListStep.bind(this),
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
            const promptText = '請輸入章節or章節名稱\n\n(如 1-1 或 什麼是人工智慧)';
            const reply = MessageFactory.suggestedActions(['查詢章節列表', '回主選單'], promptText);
            return await stepContext.prompt(CHAPTER_PROMPT, reply);
        }
         
         return await stepContext.next(chapterEntities);
    } // askChapterStep()

    async chListStep(stepContext) {

        const chapterEntities = stepContext.options["entities"];

        if (chapterEntities != undefined) {
            return await stepContext.next(chapterEntities);
        }
        else if (stepContext.context.activity.text === '回主選單') {
            return await stepContext.endDialog();
        }
        else if (stepContext.context.activity.text === '查詢章節列表') {
            await stepContext.context.sendActivity(chapterList);

            const promptText = '請輸入章節or章節名稱';
            const reply = MessageFactory.suggestedActions(['回主選單'], promptText);
            return await stepContext.prompt(CHAPTER_PROMPT, reply);
        }

        return await stepContext.next()
    } // chListStep()
     
    async videoStep(stepContext) {

        let chapterEntities = stepContext.options["entities"];

        if (stepContext.context.activity.text === '回主選單') {
            return await stepContext.endDialog();
        }
         
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