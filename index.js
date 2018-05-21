var Discord = require('discord.js');
var fs = require('fs');
var tr = require('./translations.json');
var bot = new Discord.Client({autoReconnect: true});

var stories = getStories('./stories');
var listeningTo = {};

bot.on('message', function (message) {
  var channelId = message.channel.id.toString();
  if (!message.author.bot && message.content === tr.intro) {
    listeningTo[channelId] = {
      messageId: null,
      storyInFocus: null,
      sceneInFocus: null
    };
    message.channel.send(tr.introResponse).then(function (message) {
      message.channel.send(printStories(stories));
    });
  } else if (channelId in listeningTo) {
    var channelInfo = listeningTo[channelId];
    if (channelInfo['storyInFocus'] === null) {
      var value = parseInt(message.content);
      if (value <= stories.length && value > 0) {
        // Fetch!
        channelInfo['storyInFocus'] = stories[value - 1];
        message.channel.send(tr.giveDescription + channelInfo['storyInFocus'].description + '\n' + tr.wbu).then(function (message) {
          message.react('🙆');
          message.react('🙅');
          channelInfo['messageId'] = message.id;
        });
      }
    }
  }
});

bot.on('messageReactionAdd', function (messageReaction, user) {
  var message = messageReaction.message;
  var channelID = message.channel.id.toString();
  if (channelID in listeningTo) {
    var channelInfo = listeningTo[channelID];
    if (channelInfo['messageId'] === message.id) {
      if (channelInfo['storyInFocus'] !== null && channelInfo['sceneInFocus'] === null && !user.bot) {
        if (messageReaction.emoji.name === '🙆') {
          channelInfo['sceneInFocus'] = '1';
          message.channel.send(tr.lki + channelInfo['storyInFocus']['scenes']['1']['story']).then(function (message) {
            channelInfo['messageId'] = message.id;
          });
        } else if (messageReaction.emoji.name === '🙅') {
          channelInfo['messageId'] = null;
          channelInfo['storyInFocus'] = null;
          message.channel.send(tr.naw).then(function (message) {
            message.channel.send(printStories(stories));
          });
        }
      }
    }
  }
});

function printStories (stories) {
  var msg = '';
  var story;
  for (var i = 0; i < stories.length; i++) {
    story = stories[i];
    msg += '\n**' + (i + 1) + '. ' + story.title + '** - *' + story.author + '*';
  }
  return msg;
}

// Read everything into memory, move this out some other time.

function getStories (dir) {
  var storyFiles = fs.readdirSync(dir);
  var stories = [];
  for (var storyFileIndex = 0; storyFileIndex < storyFiles.length; storyFileIndex++) {
    var story = storyFiles[storyFileIndex];
    var filename = dir + '/' + story;
    if (!fs.statSync(filename).isDirectory()) {
      var contents = fs.readFileSync(filename, 'utf8');
      stories.push(parseStory(contents))
    }
  }
  return stories;
}

function parseStory (story) {
  var storyObj = {};
  storyObj['scenes'] = {};
  var currentState = '';
  var currentText = '';
  var lastScene = '';
  story = story.replace(/\r/g, '');
  var lines = story.split('\n');
  for (var lineNo = 0; lineNo < lines.length; lineNo++) {
    var line = lines[lineNo];
    var newState = determineState(line);
    if (newState !== 'NO STATE' && currentState !== newState) {
      // Parse the current buffer depending on the current state
      switch (currentState) {
        case 'TITLE':
          // Got content with shape TITLE - AUTHOR
          var titleRegex = /((?:\w+\s*-?\s)*)\s*-\s*((?:\w+\s*)*)\.?\s*/g; // owo what's this?
          var match = titleRegex.exec(currentText);
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
            var transMatch = transitionRegex.exec(transitions[transitionIndex]);
            if (transMatch) {
              storyObj['scenes'][lastScene]['transitions'][transMatch[1]] = transMatch[2];
            } else {
              if (line !== '') {
                console.error('Transition ' + line + ' not compliant!');
              };
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
            storyObj['scenes'][currentState] = {
              story: currentText,
              transitions: {}
            };
            lastScene = currentState;
          } else {
            // Uh oh
            console.error('State ' + currentState + ' not understood! Uh oh!');
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
  if (line === '') return 'NO STATE';
  if (!isNaN(line)) {
    return parseInt(line);
  }
  // Use this for reading in state swaps from comments
  var stateDeclareRegex = /\/\/\s*((?:\w+\s*)*)/g;
  var match = stateDeclareRegex.exec(line);
  return match === null ? 'NO STATE' : match[1].trim().toUpperCase();
}

bot.login(process.env.TOKEN);

bot.on('ready', function (event) {
  console.log('Logged in as %s - %s\n', bot.user.username, bot.user.id);
});
