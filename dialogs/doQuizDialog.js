// import dialog
const { ComponentDialog,
        ChoiceFactory,
        ChoicePrompt,
        WaterfallDialog } = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';

// load JSON file
const rp = require('request-promise')

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

    async questionStep(stepContext) {

        const URL = 'http://52.185.173.84:5000/random';
        const quiz = await rp({ url: URL, json: true })

        quiz.question = quiz.question.replace(/\\n/gi, "\n\n"); // 取代\\n(g全部的/i忽略大小寫)，變成\n\n 
        stepContext.values.quiz = quiz;
        console.log(quiz);

        if (quiz.question_type === "1") { // 是非題
            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: quiz.question,
                retryPrompt: '請選擇答案選項',
                choices: ChoiceFactory.toChoices(['1', '2'])
            });
        }
        else {
            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: quiz.question,
                retryPrompt: '請選擇答案選項',
                choices: ChoiceFactory.toChoices(['1', '2', '3', '4'])
            });
        }
    } // askChapterStep()

    async checkStep(stepContext) {

        const quiz = stepContext.values.quiz;
        const userAns = stepContext.result.value;
        const rightAns = quiz.answer;

        if (userAns === rightAns) {
            await stepContext.context.sendActivity('答對了！');

            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: quiz.explanation,
                retryPrompt: '選擇"下一題"或"不做了"',
                choices: ChoiceFactory.toChoices(['下一題', '不做了'])
            });
        }
        else {
            await stepContext.context.sendActivity(`${String.fromCharCode(0x274C)}`); // wrong emoji
            await stepContext.context.sendActivity(`答案是 ${quiz.answer}`);

            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt: quiz.explanation,
                retryPrompt: '選擇"下一題"或"不做了"',
                choices: ChoiceFactory.toChoices(['下一題', '不做了'])
            });
        }
    } // checkStep()

    async finalStep(stepContext) {

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