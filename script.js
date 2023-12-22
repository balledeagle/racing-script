// ==UserScript==
// @name          Balled Eagle's Racing UI
// @version       1.0
// @include       *://*.koalabeast.com*
// @include		  *://*.newcompte.fr:*
// @author        Balled Eagle
// @require       https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

// IMAGES FOR SCOREBOARD BASE
var racingClock = "https://i.imgur.com/mBYecwD.png";
var currentLap = "https://i.imgur.com/i1oBLBi.png";
var ledLap = "https://i.imgur.com/T0me3iD.png";
var trailedLap = "https://i.imgur.com/tlgbpc8.png";

function waitForInitialized(fn) {
    if (!tagpro) {
        setTimeout(function() {
            waitForInitialized(fn);
        }, 10);
    } else {
        fn();
    }
}

waitForInitialized(function() {
    tagpro.ready(function() {
        tagpro.socket.on('map', function(data) {
            if (data.info.name == "Ski Cross"){
                hideElements();
                //this should be the only setting you may need to adjust
                //if the race length is different, change this. it's in minutes
                var raceLength = 3;

                //some other variables we'll use later
                var windowWidth = window.innerWidth;
                var windowHeight = window.innerHeight;
                var windowTop = windowHeight * 0.05;
                var windowMiddle = (windowHeight - 660)/2;
                var canvasLeft = 320;
                var canvasTop = 77.5;

                var laps = 0;
                var lap1Time = 0;
                var lap2Time = 0;
                var lap3Time = 0;

                var leader = 0;
                var leaderLaps = 0;

                var playerCount = 0;

                //this bit puts up the clock
                var element = document.getElementById("loadingMessage");
                var newElement = '<div id="clock" style="position:relative; margin:auto; margin-top:' + windowTop + 'px; width:370px; height:78px; z-index:20; background-image:url(' + racingClock + ');"> \
<div id="timer" style="position:absolute; top:22px; left:9px; width:60px; text-align:center; z-index:25; font-size:26px; color:white; font-family:\'Chivo Mono\';">0:00</div> \
<div id="lap1" style="position:absolute; top:8px; left:87px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\';">0:00.000</div> \
<div id="lap2" style="position:absolute; top:8px; left:182px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\'; display:none;">0:00.000</div> \
<div id="lap3" style="position:absolute; top:8px; left:277px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\'; display:none;">0:00.000</div> \
<div id="lap1bg" style="position:absolute; top:0px; left:62px; z-index:22; width:121px; height:36px; background-image:url(' + currentLap + '); display:none;"></div> \
<div id="lap2bg" style="position:absolute; top:0px; left:157px; z-index:22; width:121px; height:36px; background-image:url(' + currentLap + '); display:none;"></div> \
<div id="lap3bg" style="position:absolute; top:0px; left:252px; z-index:22; width:121px; height:36px; background-image:url(' + currentLap + '); display:none;"></div> \
<div id="gap1" style="position:absolute; top:50px; left:87px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\'; display:none;">+  0.000</div> \
<div id="gap2" style="position:absolute; top:50px; left:182px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\'; display:none;">+  0.000</div> \
<div id="gap3" style="position:absolute; top:50px; left:277px; z-index:25; font-size:16px; color:white; font-family:\'Chivo Mono\'; display:none;">+  0.000</div> \
</div> \
<div id="cards" style="position:absolute; top:' + windowMiddle + 'px; left:10px; opacity:0.8; width:250px; height:660px;"><div id="cardsStart"></div></div>';

                element.insertAdjacentHTML('afterend', newElement);

                //adds special font family. because I'm extra like that

                element = document.getElementsByTagName('head');
                newElement = "<style>@font-face {font-family: 'Chivo Mono Variable';  font-style: normal;  font-display: swap;  font-weight: 100 900;  src: url(https://cdn.jsdelivr.net/fontsource/fonts/chivo-mono:vf@latest/latin-wght-normal.woff2) format('woff2-variations');  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}</style>";
                element[0].insertAdjacentHTML('afterend', newElement);

                var players = []
                setupOnScoreFunction();

                // update timer text
                requestAnimationFrame(function updateTimerText() {
                    requestAnimationFrame(updateTimerText);
                    updateTimer();
                });

                //who is in the game, even
                function createPlayers () {
                    playerCount = 0;
                    for (var p in tagpro.players){
                        playerCount++;
                        var player = {
                            id : tagpro.players[p].id,
                            name : tagpro.players[p].name,
                            laps : tagpro.players[p]['s-captures'],
                            position : playerCount,
                            lapStart : 0,
                            lapTime : 0,
                            time : 0,
                            gap : 0
                        };
                        if (tagpro.state == 1) { player.lapStart = tagpro.gameEndsAt - (raceLength * 60000); }
                        if (tagpro.state == 3) { player.lapStart = tagpro.gameEndsAt; }
                        players.push(player);
                        createPlayerCard(player);
                    }
                }

                //for when new players join
                function findNewPlayers () {
                    for (var p in tagpro.players) {
                        var idFound = false;
                        for (var q in players) {
                            if (tagpro.players[p].id == players[q].id) { idFound = true }
                        }
                        if (idFound == false) {
                            playerCount++;
                            var player = {
                                id : tagpro.players[p].id,
                                name : tagpro.players[p].name,
                                laps : tagpro.players[p]['s-captures'],
                                position : playerCount,
                                lapStart : 0,
                                lapTime : 0,
                                time : 0,
                                gap : 0
                            };
                            if (tagpro.state == 1) { player.lapStart = tagpro.gameEndsAt - (raceLength * 60000); }
                            if (tagpro.state == 3) { player.lapStart = tagpro.gameEndsAt; }
                            players.push(player);
                            createPlayerCard(player);
                        }
                    }
                }

                //this part makes the sidebar showing player positions each lap
                function createPlayerCard (pdata) {
                    var cardTop = (pdata.position - 1) * 80;
                    var cardId = "player" + pdata.id;
                    element = document.getElementById('cardsStart');
                    newElement = '<div id="' + cardId + '" style="position:absolute; top:' + cardTop + 'px; left:5px; width:230px; height:65px; background-image:linear-gradient(#888888,#000000); color:white; font-family:\'Chivo Mono\'; z-index:20; font-size:16px; border:2px solid white; border-radius:10px;"> \
<div id="' + cardId + 'pos" style="position:absolute; top:5px; left:10px; font-weight:bold; font-size:40px;">' + pdata.position + '</div> \
<div id="' + cardId + 'name" style="position:absolute; top:5px; left:40px; width:190px; text-align:center;">' + pdata.name + '</div> \
<div id="' + cardId + 'time" style="position:absolute; top:30px; left:80px; width:145px; padding-top:3px; padding-left:15px; border-radius:0px 0px 10px 0px; height:30px; font-size:20px; background-color:black; text-align:center;">' + parseLapTime(pdata.lapTime) + '</div> \
<div id="' + cardId + 'chev" style="position:absolute; top:30px; left:50px; width:48px; height:30px; clip-path: polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%); background-color:#214294; font-size:8px; text-align:center;">LAP<br /><b id="' + cardId + 'laps" style="font-size:18px;">' + (pdata.laps + 1) + '</div> \
</div>';
                    element.insertAdjacentHTML('afterend', newElement);

                    if (pdata.id == myId) { $("#" + cardId).css({"color": "#fdf170", "border": "2px solid #fdf170"}); }
                }


                //someone left? who would do that
                tagpro.socket.on('playerLeft', function(data) {
                    for (var l in players) {
                        if (players[l].id == data) {
                            var leftPos = players[l].position;
                            players[l].position = 100;
                            for (var m in players) {
                                if (players[m].position > leftPos) {
                                    players[m].position = players[m].position - 1; //everyone behind them moves up 1 slot
                                    var positionA = "player" + String(players[m].id) + "pos";
                                    document.getElementById(positionA).innerHTML = players[m].position;
                                }
                            }
                            reorderPlayers();
                            players.splice(l, 1); //get em outta the player array
                        }
                    }
                    playerCount--;
                });

                function hideSpectatorInfo1() {
                    if (tagpro.ui.sprites.spectatorInfo1 != undefined) {
                        setTimeout(function() {tagpro.ui.sprites.spectatorInfo1.visible = false;}, 0);
                    } else {
                        setTimeout(hideSpectatorInfo1, 200);
                    }
                }
                function hideSpectatorInfo2() {
                    if (tagpro.ui.sprites.spectatorInfo2 != undefined) {
                        setTimeout(function() {tagpro.ui.sprites.spectatorInfo2.visible = false;}, 0);
                    } else {
                        setTimeout(hideSpectatorInfo2, 200);
                    }
                }
                function hideRedScore() {
                    if (tagpro.ui.sprites.redScore != undefined) {
                        setTimeout(function() {tagpro.ui.sprites.redScore.visible = false;}, 0);
                    } else {
                        setTimeout(hideRedScore, 200);
                    }
                }
                function hideBlueScore() {
                    if (tagpro.ui.sprites.blueScore != undefined) {
                        setTimeout(function() {tagpro.ui.sprites.blueScore.visible = false;}, 0);
                    } else {
                        setTimeout(hideBlueScore, 200);
                    }
                }
                function hidePlayerIndicators() {
                    if (tagpro.ui.sprites.playerIndicators != undefined) {
                        setTimeout(function() {tagpro.ui.sprites.playerIndicators.visible = false;}, 0);
                    } else {
                        setTimeout(hidePlayerIndicators, 200);
                    }
                }
                function hideElements() {
                    hideSpectatorInfo1();
                    hideSpectatorInfo2();
                    hideRedScore();
                    hideBlueScore();
                    hidePlayerIndicators();

                }


                function createFontColorElement(num, size, color) {
                    return '<div style="text-align:center; z-index:26; font-weight:bold; color:' + color + '; font-family:\'Chivo Mono\'; font-size:' + size + '">' + num + '</div>';
                }

                var myId = 0;
                var myTime = 0;

                tagpro.socket.on('id', function(id) {
                    myId = id;
                });

                function whoScored(scoreTime) {
                    var capper = ''
                    for (var p in tagpro.players){
                        for (var q in players) {
                            if (tagpro.players[p].id == players[q].id) { //we found a match
                                if (tagpro.players[p]['s-captures'] > players[q].laps) { //they're who scored. let's update some stuff
                                    capper = players[q].id;
                                    players[q].laps = tagpro.players[p]['s-captures'];
                                    if (players[q].laps <= 3) {
                                        players[q].time = scoreTime - (tagpro.gameEndsAt - (raceLength * 60000));
                                        if (players[q].id == myId) { myTime = players[q].time }
                                        players[q].lapTime = scoreTime - players[q].lapStart;
                                        players[q].lapStart = scoreTime;
                                        var lapsDiv = "player" + String(players[q].id) + "laps";
                                        var lapsOuterDiv = "player" + String(players[q].id) + "chev";
                                        document.getElementById(lapsDiv).innerHTML = (players[q].laps + 1); //update the laps for the player who just scored
                                        if (players[q].laps == 3) { document.getElementById(lapsDiv).innerHTML = "F"; $("#"+lapsOuterDiv).css({"background-color":"#ebb40e", "color":"black"}); }
                                    }

                                    //this function will re-position each player after a lap is completed
                                    if (players[q].position > 1 && players[q].laps < 4) {
                                        for (var r = players[q].position; r > 0; r--){
                                            for (var s in players) {
                                                if(players[s].position == r && players[q].id != players[s].id){
                                                    if (players[q].laps > players[s].laps) {
                                                        players[s].position = players[q].position
                                                        players[q].position = r
                                                        var positionA = "player" + String(players[q].id) + "pos";
                                                        var positionB = "player" + String(players[s].id) + "pos";
                                                        document.getElementById(positionA).innerHTML = players[q].position;
                                                        document.getElementById(positionB).innerHTML = players[s].position;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    reorderPlayers();


                                    if (players[q].laps > leaderLaps) { //they're the first to complete this lap
                                        leader = players[q].id;
                                        leaderLaps = players[q].laps;
                                        if (leaderLaps == 1) {lap1Time = scoreTime}
                                        if (leaderLaps == 2) {lap2Time = scoreTime}
                                        if (leaderLaps == 3) {lap3Time = scoreTime}
                                        var lapDiv = "player" + String(players[q].id) + "time";
                                        document.getElementById(lapDiv).innerHTML = parseLapTime(players[q].time);
                                    } else {
                                        if (players[q].laps == 1) {players[q].gap = scoreTime - lap1Time}
                                        if (players[q].laps == 2) {players[q].gap = scoreTime - lap2Time}
                                        if (players[q].laps == 3) {players[q].gap = scoreTime - lap3Time}
                                        var gapDiv = "player" + String(players[q].id) + "time";
                                        document.getElementById(gapDiv).innerHTML = parseGapTime(players[q].gap);
                                        if (players[q].laps == 3) { document.getElementById(gapDiv).innerHTML = parseLapTime(players[q].time); }

                                        if (players[q].position == 2 && leader == myId) { //the first person to complete a lap after the user
                                            var leadDiv = "gap" + players[q].laps;
                                            document.getElementById(leadDiv).innerHTML = parseLeadTime(players[q].gap);
                                            $("#" + leadDiv).show();
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return capper;
                }

                function reorderPlayers() {
                    for (var o in players) {
                        var divName = "#player" + players[o].id;
                        var divPos = (players[o].position - 1) * 80
                        $(divName).animate({top: divPos},500);
                    }
                }

                function setupOnScoreFunction() {
                    tagpro.socket.on('score', function(score) { //score updates happen here
                        var scoreTime = Date.now();

                        setTimeout(() => {
                            var capperId = whoScored(scoreTime);
                            if (capperId == myId && laps < 3) { //user scored
                                laps = tagpro.players[myId]['s-captures'];
                                if (laps >= 1) { $("#lap2").show(); $("#lap1bg").stop(); $("#lap1bg").remove(); }
                                if (laps >= 2) { $("#lap3").show(); $("#lap2bg").stop(); $("#lap2bg").remove(); }
                                var element = document.getElementById("timer");
                                var newElement;
                                var lapOffset = 95 * laps - 35;
                                if (leader == myId) { //user is the leader
                                    newElement = '<div style="position:absolute; top:43px; left:' + lapOffset + 'px; width:121px; height:35px; z-index:22; background-image:url(' + ledLap + ');"></div>';
                                } else {
                                    newElement = '<div style="position:absolute; top:43px; left:' + lapOffset + 'px; width:121px; height:35px; z-index:22; background-image:url(' + trailedLap + ');"></div>';
                                    var gapDiv = "gap" + String(tagpro.players[myId]['s-captures']);
                                    for (var q in players) {
                                        if (players[q].id == myId) { document.getElementById(gapDiv).innerHTML = parseGapTime(players[q].gap); $("#" + gapDiv).show()}
                                    }
                                }
                                element.insertAdjacentHTML('afterend', newElement);
                            }
                            if (capperId == myId && laps == 3) { $("#lap3bg").stop(); $("#lap3bg").remove(); }
                        },25);
                    });
                }

                // ### TIMER ZONE ###
                function updateTimer() {
                    if (tagpro.state == 1) {
                        if(players.length == 0) { createPlayers(); }
                        if (checkFinal() == "0:00.0") {
                            if (getTime().substring(0,1) == "+") { document.getElementById("timer").innerHTML = createFontColorElement(getTime(), "26px", "#32cd32"); }
                            else { document.getElementById("timer").innerHTML = createFontColorElement("0.0", "26px", "#32cd32"); }
                        } else if (getTime().slice(getTime().length-2) == "00" && getTime() != "0:00") {
                            document.getElementById("timer").innerHTML = createFontColorElement(getTime(), "26px", "#32cd32");

                        } else if (getTime().substring(0,1) == "0") {
                            if (getTime().substring(2,3) == "5" || getTime().substring(2,3) == "4" || getTime().substring(2,3) == "3") {
                                document.getElementById("timer").innerHTML = createFontColorElement(getTime30(), "26px", "#ffd700");

                            } else {
                                document.getElementById("timer").innerHTML = createFontColorElement(getTime30(), "26px", "#ff2400");
                            }
                        } else {
                            document.getElementById("timer").innerHTML = createFontColorElement(getTime(), "26px", "white");
                        }
                        if (laps < 3) { document.getElementById("lap" + (laps + 1)).innerHTML = getThousandths(); }
                        var currentLapDiv = "lap" + (laps + 1) + "bg";
                        $("#" + currentLapDiv).fadeIn(1000).fadeOut(1000); //just an animation to subtly highlight the current lap
                    } else if (tagpro.state == 3) { document.getElementById("lap1").innerHTML = ""; } //prerace
                    if (Object.keys(tagpro.players).length != playerCount) { findNewPlayers(); } //for when players join or leave
                }

                function getTime() {
                    var millis = 0;
                    var min = 0;
                    var sec = 0;
                    millis = Math.max(0, tagpro.gameEndsAt - Date.now());
                    min = (millis/1000/60) << 0;
                    sec = fixSeconds(((millis/1000) % 60 << 0));
                    return min + ":" + sec;
                }

                function getTime30() {
                    var millis = Math.max(0, tagpro.gameEndsAt - Date.now());
                    var min = (millis/1000/60) << 0;
                    var sec = ((millis/1000) % 60 << 0);
                    var tenth = ((millis/100) % 10) << 0;
                    return sec + "." + tenth;
                }

                function checkFinal() {
                    var millis = Math.max(0, tagpro.gameEndsAt - Date.now());
                    var min = (millis/1000/60) << 0;
                    var sec = fixSeconds(((millis/1000) % 60 << 0));
                    var tenth = ((millis/100) % 10) << 0;
                    return min + ":" + sec + "." + tenth;
                }

                function getThousandths() {
                    var millis = Math.max(0,(Date.now() - (tagpro.gameEndsAt - (raceLength * 60000)) - myTime));
                    var min = (millis/1000/60) << 0;
                    var sec = fixSeconds(((millis/1000) % 60 << 0));
                    var thous = (millis % 1000) << 0;
                    if (thous < 10) { thous = thous + "00" }
                    else if (thous < 100) {thous = thous + "0" }
                    return min + ":" + sec + "." + thous;
                }

                function parseLapTime(time) {
                    if (time > 0) {
                        var min = (time/1000/60) << 0;
                        var sec = fixSeconds(((time/1000) % 60 << 0));
                        var thous = (time % 1000) << 0;
                        if (thous < 10) { thous = thous + "00" }
                        else if (thous < 100) {thous = thous + "0" }
                        return min + ":" + sec + "." + thous;
                    } else { return ""; }
                }

                function parseGapTime(time) {
                    var sec = (time/1000) << 0;
                    if (sec < 10) { sec = "+&nbsp;&nbsp;" + sec; }
                    else if (sec < 100) { sec = "+ " + sec;}
                    else {sec = "+" + sec;}
                    var thous = (time % 1000) << 0;
                    if (thous < 10) { thous = thous + "00" }
                    else if (thous < 100) {thous = thous + "0" }
                    return sec + "." + thous;
                }

                function parseLeadTime(time) {
                    var sec = (time/1000) << 0;
                    if (sec < 10) { sec = "-&nbsp;&nbsp;" + sec; }
                    else if (sec < 100) { sec = "- " + sec;}
                    else {sec = "-" + sec;}
                    var thous = (time % 1000) << 0;
                    if (thous < 10) { thous = thous + "00" }
                    else if (thous < 100) {thous = thous + "0" }
                    return sec + "." + thous;
                }


                function fixSeconds(seconds) {
                    if (seconds < 10) {
                        seconds = "0" + seconds;
                    }
                    return seconds;
                }
                }
        });

    });
});
