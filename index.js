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
  console.log(story);
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
