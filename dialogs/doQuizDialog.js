// import dialog
const { ComponentDialog,
        ChoiceFactory,
        ChoicePrompt,
        WaterfallDialog } = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';

// load JSON file
const quiz = require('../quiz_new');

class DoQuizDialog extends ComponentDialog {
    constructor(dialogId) {
        super(dialogId);

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new WaterfallDialog(dialogId, [
            this.questionStep.bind(this),
            this.checkStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = dialogId;
    } // constructor

    //產生min到max之間的亂數
    getRandom(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async questionStep(stepContext) {
        console.log('questionStep');

        const randint = this.getRandom(0, quiz.length);
        console.log(`quiz_num: ${randint}`);
        stepContext.values.randint = randint;

        return await stepContext.prompt(CHOICE_PROMPT, {
            prompt: quiz[randint].question,
            choices: ChoiceFactory.toChoices(['A', 'B', 'C', 'D'])
        });
    } // askChapterStep()

    async checkStep(stepContext) {
        console.log('checkStep');

        const randint = stepContext.values.randint;

        const userAns = stepContext.result.value;
        const rightAns = quiz[randint].answer;

        if (userAns === rightAns) {
            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: '答對了！',
                choices: ChoiceFactory.toChoices(['下一題', '不做了'])
            });
        }
        else {
            stepContext.context.sendActivity(`${String.fromCharCode(0x274C)}`);

            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: `答案是 ${quiz[randint].answer}`,
                choices: ChoiceFactory.toChoices(['下一題', '不做了'])
            });
        }
    } // checkStep()

    async finalStep(stepContext) {
        console.log('finalStep');

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (stepContext.result.value === '下一題') {
            // Restart the doQuizDialog
            return await stepContext.replaceDialog(this.initialDialogId);
        }
        else if (stepContext.result.value === '不做了') {
            return await stepContext.endDialog();
        }
    } // finalStep()
}

exports.DoQuizDialog = DoQuizDialog;