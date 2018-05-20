var Discord = require('discord.js');
var fs = require('fs');
var bot = new Discord.Client({autoReconnect: true});

var stories = getStories('./stories');

// Read everything into memory, move this out some other time.

function getStories (dir) {
  var storyFiles = fs.readdirSync(dir);
  var stories = {};
  for (var storyFileIndex = 0; storyFileIndex < storyFiles.length; storyFileIndex++) {
    var story = storyFiles[storyFileIndex];
    var filename = dir + '/' + story;
    if (!fs.statSync(filename).isDirectory()) {
      var contents = fs.readFileSync(filename, 'utf8');
      stories[filename] = parseStory(contents);
    }
  }
  return stories;
}

function parseStory (story) {
  var storyObj = {};
  storyObj['scenes'] = {};
  var currentState = '';
  var currentText = '';
  var lines = story.split('\n');
  for (var lineNo = 0; lineNo < lines.length(); lineNo++) {
    var line = lines[lineNo];
    var newState = determineState(line);
    if (newState !== 'NO STATE' && currentState !== newState) {
      // Parse the current buffer depending on the current state
      switch (currentState) {
        case 'TITLE':
          // Got content with shape TITLE - AUTHOR
          var titleRegex = /((?:\w+\s*-?\s)*)\s*-\s*((?:\w+\s*)*)\.?\s*/g; // owo what's this?
          var match = titleRegex.exec(line);
          if (match) {
            storyObj['title'] = match[1];
            storyObj['author'] = match[2];
          } else {
            console.error('Title not compliant!');
          }
          break;
        case 'TRANSITIONS':
          var transitions = currentText.split('\n');
          for (var transitionIndex = 0; transitionIndex < transitions.length; transitionIndex++) {
            var transitionRegex = /:([\w_]*):\s*->\s*(\d*)/g;
            var transMatch = transitionRegex.exec(line);
            if (match) {
              storyObj['scenes'][currentState]['transitions'][transMatch[1]] = transMatch[2];
            } else {
              console.error('Transition not compliant!');
            }
          }
          break;
        case 'DESCRIPTION':
          storyObj[currentState.toLowerCase()] = currentText;
          break;
        default:
          if (currentState === '' || currentState === 'THE END') break;
          // Probably a number, hold it.
          if (!isNaN(currentState)) {
            storyObj['scenes'][currentState]['story'] = currentText;
            storyObj['scenes'][currentState]['transitions'] = {};
          } else {
            // Uh oh
            console.error('State not understood! Uh oh!');
          }
      }
      // Flush current buffer, no longer needed.
      currentText = '';
      // Update state as required
      currentState = newState;
    } else {
      // Update buffer with new content
      currentText = (currentText === '' ? line : currentText + '\n' + line);
    }
  }
  console.log(storyObj);
  return storyObj;
}

function determineState (line) {
  if (!isNaN(line)) {
    return parseInt(line);
  }
  // Use this for reading in state swaps from comments
  var stateDeclareRegex = /^\/\/\s*((?:\w+\s*)*)$/g;
  var match = stateDeclareRegex.exec(line);
  return match === null ? 'NO STATE' : match[1].trim().toUpperCase();
}

bot.login(process.env.TOKEN);

bot.on('ready', function (event) {
  console.log('Logged in as %s - %s\n', bot.user.username, bot.user.id);
});

bot.on('message', function (message) {
  if (!message.author.bot && message.content) {
    message.channel.send('All systems are go!');
  }
});
