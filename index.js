import fetch from 'node-fetch'
import Discord, { MessageAttachment, MessageEmbed } from 'discord.js'
import * as champions from './json/champions.json' assert {type: "json"}
import * as queues from './json/queues.json' assert {type: "json"}
const client = new Discord.Client()
const token = null
const config = {mode: 'no-cors', method: 'GET', headers: {'X-Riot-Token': null}}
const urls = {
  summoner: 'https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/',
  liveGame: 'https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/',
  rank: 'https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/',
  masteries: 'https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/',
  matchList: 'https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/',
  matchDetail: 'https://europe.api.riotgames.com/lol/match/v5/matches/'
}
const rankImages = {
  UNRANKED: 'Emblem_Unranked.png',
  IRON: 'Emblem_Iron.png',
  BRONZE: 'Emblem_Bronze.png',
  SILVER: 'Emblem_Silver.png',
  GOLD: 'Emblem_Gold.png',
  PLATINUM: 'Emblem_Platinum.png',
  DIAMOND: 'Emblem_Diamond.png',
  MASTER: 'Emblem_Master.png',
  GRANDMASTER: 'Emblem_Grandmaster.png',
  CHALLENGER: 'Emblem_Challenger.png'
}
const masteryLevelImages = [
  'Champion_Mastery_Level_1_Flair.png',
  'Champion_Mastery_Level_2_Flair.png',
  'Champion_Mastery_Level_3_Flair.png',
  'Champion_Mastery_Level_4_Flair.png',
  'Champion_Mastery_Level_5_Flair.png',
  'Champion_Mastery_Level_6_Flair.png',
  'Champion_Mastery_Level_7_Flair.png'
]
const gameModeImages = {
  CLASSIC: 'summoners_rift.png',
  ARAM: 'howling_abyss.png',
  OTHERS: 'temporary_mode.png'
}
const roleImages = {
  TOP: 'Top_icon.png',
  JUNGLE: 'Jungle_icon.png',
  MIDDLE: 'Middle_icon.png',
  BOTTOM: 'Bottom_icon.png',
  UTILITY: 'Support_icon.png'
}
const tierOrder = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  DIAMOND: 2000,
  MASTER: 2400,
  GRANDMASTER: 2800,
  CHALLENGER: 3200
}
const rankOrder = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
}
const queueType = {
  RANKED_SOLO_5x5: 'Solo/Duo',
  RANKED_FLEX_SR: 'Flexible 5v5'
}

client.login(token)

client.on('message', message => {
  if (message.content === '!ping') {
    message.channel.send('Pong.')
  } else if (message.content.startsWith('!livegame')) {
    const arg = message.content.split(' ').slice(1).join(" ")
    getSummoner(arg).then(summonerData => {
      if (summonerData.status) {
        message.channel.send({
          embed: summonerNotFoundMessage(),
          files: [new MessageAttachment('./img/no_data.png')]
        })
      } else {
        getLiveGame(summonerData.id).then(liveGameData => {
          liveGameMessage(liveGameData).then(liveGameMessageData => {
            switch (liveGameData.gameMode) {
              case 'CLASSIC':
                var icon = new MessageAttachment('./img/' + gameModeImages.CLASSIC)
                break;
              case 'ARAM':
                var icon = new MessageAttachment('./img/' + gameModeImages.ARAM)
                break;
              case undefined:
                var icon = new MessageAttachment('./img/no_data.png')
                break;
              default:
                var icon = new MessageAttachment('./img/' + gameModeImages.OTHERS)
                break;
            }
            message.channel.send({
              embed: liveGameMessageData,
              files: [icon]
            })
          })
        })
      }
    })
  } else if (message.content.startsWith('!rank')) {
    const arg = message.content.split(' ').slice(1).join(" ")
    getSummoner(arg).then(summonerData => {
      if (summonerData.status) {
        message.channel.send({
          embed: summonerNotFoundMessage(),
          files: [new MessageAttachment('./img/no_data.png')]
        })
      } else {
        getRank(summonerData.id).then(rankData => {
          for (let i = 0; i < rankData.length; i++) {
            if (rankData[i].queueType != 'RANKED_TFT_PAIRS')  {
              message.channel.send({
                embed: rankMessage(rankData[i]),
                files: [new MessageAttachment('./img/' + rankImages[rankData[i].tier])]
              })
            }
          }
          if (rankData.length == 0) {
            message.channel.send({
              embed: rankMessage(rankData),
              files: [new MessageAttachment('./img/' + rankImages['UNRANKED'])]
            })
          }
        })
      }
    })
  } else if (message.content.startsWith('!masteries')) {
    const arg = message.content.split(' ').slice(1).join(" ")
    getSummoner(arg).then(summonerData => {
      if (summonerData.status) {
        message.channel.send({
          embed: summonerNotFoundMessage(),
          files: [new MessageAttachment('./img/no_data.png')]
        })
      } else {
        getMasteries(summonerData.id).then(masteriesData => {
          for (let i = 0; i <= 2; i++) {
            message.channel.send({
              embed: masteriesMessage(masteriesData[i]),
              files: [
                new MessageAttachment('http://ddragon.leagueoflegends.com/cdn/12.3.1/img/champion/' + getChampion(masteriesData[i].championId).id + '.png'),
                new MessageAttachment('./img/' + masteryLevelImages[masteriesData[i].championLevel - 1])
              ]
            })
          }
        })
      }
    })
  } else if (message.content.startsWith('!soloQ')) {
    const arg1 = message.content.split(' ').slice(1, 2)
    const arg2 = message.content.split(' ').slice(2).join(" ")
    getSummoner(arg2).then(summonerData => {
      if (summonerData.status) {
        message.channel.send({
          embed: summonerNotFoundMessage(),
          files: [new MessageAttachment('./img/no_data.png')]
        })
      } else {
        if (!isNaN(parseInt(arg1)) || arg1 == '24h' || arg1 == 'week') {
          getMatchList(summonerData.puuid, arg1, 420).then(matchListData => {
            historyMessage(matchListData, summonerData.id, arg1).then(historyMessageData => {
              message.channel.send({
                embed: historyMessageData,
                files: [new MessageAttachment('./img/' + historyMessageData.thumbnail.url.replace('attachment://', ''))]
              })
            })
          })
        } else {
          message.channel.send('Wrong argument... Check in the `!help` command.')
        }
      }
    })
  } else if (message.content === '!help') {
    message.channel.send({
      embed: helpMessage()
    })
  }
})

function summonerNotFoundMessage() {
  return new MessageEmbed()
    .setTitle('This summoner does not exist...')
    .setThumbnail('attachment://no_data.png')
}

async function getSummoner(summonerName) {
  const response = await fetch(urls.summoner + summonerName, config)
  return response.json()
}

async function getLiveGame(summonerId) {
  const response = await fetch(urls.liveGame + summonerId, config)
  return response.json()
}

async function getRank(summonerId) {
  const response = await fetch(urls.rank + summonerId, config)
  return response.json()
}

async function getMasteries(summonerId) {
  const response = await fetch(urls.masteries + summonerId, config)
  return response.json()
}

async function getMatchList(puuId, select = 20, queue = null) {
  if (select == '24h') {
    var selectParam = 'count=100&startTime=' + Math.round(new Date(new Date().valueOf() - 1000*60*60*24).getTime() / 1000)
  } else if (select == 'week') {
    var selectParam = 'count=100&startTime=' + Math.round(new Date(new Date().valueOf() - 1000*60*60*24*7).getTime() / 1000)
  } else if (!isNaN(parseInt(select))) {
    if (parseInt(select) < 1) {
      select = 1
    } else if (parseInt(select) > 100) {
      select = 100
    }
    var selectParam = 'count=' + select
  }
  const response = await fetch(urls.matchList + puuId + '/ids?' + (selectParam ? selectParam : '') + (queue ? '&queue=' + queue : ''), config)
  return response.json()
}

async function getMatchDetail(matchId) {
  const response = await fetch(urls.matchDetail + matchId, config)
  return response.json()
}

async function liveGameMessage(liveGameData) {
  var embed = new MessageEmbed()
  if (liveGameData.status != undefined) {
    embed.setTitle('This summoner is not currently playing!')
      .setThumbnail('attachment://no_data.png')
    return embed
  }
  embed.setTitle(getGameMode(liveGameData.gameQueueConfigId))
  var team1 = liveGameData.participants.filter(player => player.teamId == 100)
  var team2 = liveGameData.participants.filter(player => player.teamId == 200)
  var teams = [ team1, [], team2 ]
  var playersRanks = []
  for (let i = 0; i < team1.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (teams[j].length == 0) {
        embed.addField('\u200B', '\u200B', true)
        continue
      }
      const summoner = await getSummoner(teams[j][i].summonerName)
      const rankData = await getRank(summoner.id)
      const bestRank = getSpecificRank(rankData, liveGameData.gameQueueConfigId)
      if (bestRank.length == 0) {
        var rankMessage = 'Unranked'
      } else {
        playersRanks.push(bestRank)
        var rankMessage = bestRank.tier + (isMasterOrHigher(bestRank.tier) ? '' : ' ' + bestRank.rank) + ' - ' + bestRank.leaguePoints + 'LP (' + queueType[bestRank.queueType] + ')'
      }
      embed.addField(
        teams[j][i].summonerName + ' (' + getChampion(teams[j][i].championId).id + ')',
        rankMessage,
        true
      )
    }
  }
  embed.setFooter('Tier average: ' + getAverageRank(playersRanks))
  switch (liveGameData.gameMode) {
    case 'CLASSIC':
      embed.setThumbnail('attachment://' + gameModeImages.CLASSIC)
      break;
    case 'ARAM':
      embed.setThumbnail('attachment://' + gameModeImages.ARAM)
      break;
    default:
      embed.setThumbnail('attachment://' + gameModeImages.OTHERS)
      break;
  }
  return embed
}

async function historyMessage(matchListData, summonerId, select) {
  var embed = new MessageEmbed()
    .setTitle('Solo/Duo')
  if (isNaN(select)) {
    if (select == '24h') {
      embed.setDescription('Summary of the games during last 24 hours.')
    } else if (select == 'week') {
      embed.setDescription('Summary of the games during last 7 days.')
    }
  } else {
    if (select < 1) {
      select = 1
    } else if (select > 100) {
      select = 100
    }
    embed.setDescription('Summary of the ' + select + ' last games.')
  }
  var victoryCount = 0
  var loseCount = 0
  var kills = 0
  var deaths = 0
  var assists = 0
  var roles = {
    TOP: 0,
    JUNGLE: 0,
    MIDDLE: 0,
    BOTTOM: 0,
    UTILITY: 0
  }
  var champions = {}
  var championsVictory = {}
  for (let i = 0; i < matchListData.length; i++) {
    const matchDetailData = await getMatchDetail(matchListData[i])
    if (matchDetailData.info) {
      const playerInfo = matchDetailData.info.participants.find(player => player.summonerId == summonerId)
      kills += playerInfo.kills
      deaths += playerInfo.deaths
      assists += playerInfo.assists
      if (playerInfo.teamPosition) {
        roles[playerInfo.teamPosition]++
      }
      champions[playerInfo.championName] = champions[playerInfo.championName] ? champions[playerInfo.championName] + 1 : 1
      const team = matchDetailData.info.teams.find(team => team.teamId == playerInfo.teamId)
      if (team.win) {
        victoryCount++
        championsVictory[playerInfo.championName] = championsVictory[playerInfo.championName] ? championsVictory[playerInfo.championName] + 1 : 1
      } else {
        loseCount++
        championsVictory[playerInfo.championName] = championsVictory[playerInfo.championName] ? championsVictory[playerInfo.championName] : 0
      }
    }
  }
  const mostPlayedRole = Object.keys(roles).find(role => roles[role] == Math.max(...Object.values(roles)))
  const mostPlayedChampion = Object.keys(champions).find(champion => champions[champion] == Math.max(...Object.values(champions)))
  embed.setThumbnail('attachment://' + roleImages[mostPlayedRole])
    .addFields(
      {
        name: 'Winrate',
        value: victoryCount + 'W - ' + loseCount + 'L (' + (victoryCount / (victoryCount + loseCount) * 100).toFixed(2) + '%)',
        inline: true
      },
      {
        name: 'KDA',
        value: ((kills + assists) / deaths).toFixed(2) + ' (' + (kills / matchListData.length).toFixed(1) + ' / '
          + (deaths / matchListData.length).toFixed(1) + ' / ' + (assists / matchListData.length).toFixed(1) + ')',
        inline: true
      },
      {
        name: 'Most played champion',
        value: mostPlayedChampion + ' (' + champions[mostPlayedChampion] + ' games - ' + (championsVictory[mostPlayedChampion] / champions[mostPlayedChampion] * 100).toFixed(2) + '% winrate)',
        inline: true
      }
    )
  return embed
}

function rankMessage(rankData) {
  var embed = new MessageEmbed()
  if (rankData.length == 0) {
    embed.addField(
      'UNRANKED',
      '\u200B'
    )
      .setThumbnail('attachment://' + rankImages['UNRANKED'])
    return embed
  }
  embed.setTitle(rankData.summonerName)
    .setDescription(queueType[rankData.queueType])
    .addField(
      rankData.tier + (isMasterOrHigher(rankData.tier) ? '' : ' ' + rankData.rank) + ' - ' + rankData.leaguePoints + 'LP',
      rankData.wins + 'W - ' + rankData.losses + 'L (' + (rankData.wins / (rankData.wins + rankData.losses) * 100).toFixed(2) + '% winrate)'
    )
    .setThumbnail('attachment://' + rankImages[rankData.tier])
  return embed
}

function masteriesMessage(masteriesData) {
  const lastplayed = new Date(masteriesData.lastPlayTime)
  var embed = new MessageEmbed()
    .setTitle(getChampion(masteriesData.championId).id)
    .addField(
      'Mastery level ' + masteriesData.championLevel,
      masteriesData.championPoints + ' points (last played ' + lastplayed.toDateString() + ')'
    )
    .setThumbnail('attachment://' + masteryLevelImages[masteriesData.championLevel - 1])
    .setImage('attachment://' + getChampion(masteriesData.championId).id + '.png')
  return embed
}

function getChampion(championId) {
  return Object.values(champions.default.data).filter(champion => champion.key == championId)[0]
}

function getGameMode(queueId) {
  return queues.default.filter(queue => queue.queueId == queueId)[0].description.replace(' games', '')
}

function getBestRank(rankData) { // If there is not TFT rank in data
  if (rankData.length == 2) {
    if (rankData[0].tier == rankData[1].tier) {
      if (rankData[0].rank == rankData[1].rank) {
        if (rankData[0].leaguePoints == rankData[1].leaguePoints) {
          return rankData.filter(rank => rank.queueType == 'RANKED_SOLO_5x5')[0]
        } else if (rankData[0].leaguePoints > rankData[1].leaguePoints) {
          return rankData[0]
        } else if (rankData[0].leaguePoints < rankData[1].leaguePoints) {
          return rankData[1]
        }
      } else if (rankOrder[rankData[0].rank] > rankOrder[rankData[1].rank]) {
        return rankData[0]
      } else if (rankOrder[rankData[0].rank] < rankOrder[rankData[1].rank]) {
        return rankData[1]
      }
    } else if (tierOrder[rankData[0].tier] > tierOrder[rankData[1].tier]) {
      return rankData[0]
    } else if (tierOrder[rankData[0].tier] < tierOrder[rankData[1].tier]) {
      return rankData[1]
    }
  } else if (rankData.length == 1) {
    return rankData[0]
  } else {
    return rankData
  }
}

function getSpecificRank(rankData, queueId) {
  if (queueId == 420) {
    return rankData.filter(rank => rank.queueType == 'RANKED_SOLO_5x5')[0]
  } else if (queueId == 440) {
    return rankData.filter(rank => rank.queueType == 'RANKED_FLEX_SR')[0]
  } else {
    return getBestRank(rankData)
  }
}

function isMasterOrHigher(tier) {
  return [ 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)
}

function getAverageRank(playersRanks) {
    var sum = 0
    for (let i = 0; i < playersRanks.length; i++) {
      if (isMasterOrHigher(playersRanks[i].tier)) {
        sum += 2400 + playersRanks[i].leaguePoints
        continue
      }
      sum += tierOrder[playersRanks[i].tier] + rankOrder[playersRanks[i].rank] + playersRanks[i].leaguePoints
    }
    var avg = Math.round(sum / playersRanks.length)
    for (let i = 0; i <= 2400; i += 400) {
      if (avg < i) {
        var tierAvg = Object.keys(tierOrder).find(tier => tierOrder[tier] == i - 400)
        for (let j = i - 400; j <= i; j += 100) {
          if (avg < j) {
            var rankAvg = Object.keys(rankOrder).find(rank => rankOrder[rank] == (j - 100) % 400)
            return tierAvg + ' ' + rankAvg + ' - ' + (avg % 100) + 'LP'
          } else {
            continue
          }
        }
      } else {
        continue
      }
    }
    return 'MASTER/GRANDMASTER/CHALLENGER ' + ' - ' + (avg - 2400) + 'LP'
}

function helpMessage() {
  return new MessageEmbed()
    .setTitle('Commands')
    .setDescription('Always use `!` as prefix.')
    .addFields(
      { name: 'Rank', value: '`!rank <summoner_name>` to get the ranks of a player' },
      { name: 'Live game', value: '`!livegame <summoner_name>` to get the game infos of a player' },
      { name: 'Masteries', value: '`!masteries <summoner_name>` to get the top 3 masteries level of a player' },
      { name: 'Solo/Duo summary', value: '`!soloQ <number_between_1_&_100|24h|week> <summoner_name>` to get some statistics about last ranked games of a player'}
    )
}
