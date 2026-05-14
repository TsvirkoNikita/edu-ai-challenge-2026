# AI Learning Assistant Bot

A Telegram bot that helps you learn from any URL by summarising content and quizzing you on it.

**Bot link:** [t.me/AILearningAssistantChallengeBot](https://t.me/AILearningAssistantChallengeBot)

---

## Commands

### `/start`
Send this to the bot to get a welcome message and a list of available commands.

### `/learn [URL]`
Submit any article, tutorial, or documentation page to learn from.

**Example:**
```
/learn https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Promises
```

The bot will reply with a structured summary including a title, difficulty level, key concepts, and the main takeaways. The material is saved so you can quiz yourself on it later.

> If the URL does not contain educational content (e.g. a homepage or login page), the bot will tell you and nothing will be saved.

### `/quiz`
Start a quiz on one of your saved materials.

1. The bot shows a list of your saved topics as buttons — tap one to select it.
2. Five multiple-choice questions are generated from that material.
3. Questions arrive one at a time with answer buttons (A, B, C, D).
4. After each answer you get instant feedback — correct answers are confirmed, wrong answers include an explanation.
5. After the last question the bot sends your final score and a per-question breakdown.

---

## Example Session

```
You:  /start
Bot:  Welcome to your AI Learning Assistant! 🎓
      Commands:
      /learn [URL] - Submit a learning material
      /quiz - Take a quiz on saved materials

You:  /learn https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Promises
Bot:  ✅ Material saved!
      📚 JavaScript Promises Guide
      🎯 Difficulty: intermediate
      Key Points:
      1. Promises represent eventual completion or failure of async operations
      2. ...

You:  /quiz
Bot:  Select a topic to quiz yourself on:
      [JavaScript Promises Guide]

You:  [tap the button]
Bot:  📝 Question 1 of 5
      What does a Promise represent in JavaScript?
      [A) A synchronous value]
      [B) An eventual completion or failure of an async operation]
      [C) A callback function]
      [D) An event listener]

You:  [tap B]
Bot:  ✅ Correct!
      📝 Question 2 of 5 ...

Bot:  🎉 Quiz Complete!
      📊 Score: 4/5 (80%)
      ...
```
