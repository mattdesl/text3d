!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.messages=e():"undefined"!=typeof global?global.messages=e():"undefined"!=typeof self&&(self.messages=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={CONNECT:"connection",CREATE_ROOM:"createRoom",JOIN_ROOM:"joinRoom",LEAVE_ROOM:"leaveRoom",DATA_CHANGE_ROOM:"roomDataChange",DATA_CHANGE_USER:"userDataChange",ERRORS:{NO_ROOM:"no room with that id ",NO_ROOM_FOR_PIN:"no room for that pin",ROOM_FULL:"room is full",INCORRECT_PIN:"incorrect pin"}};
},{}],2:[function(require,module,exports){
var BASE_MESSAGES=require("./BASE_MESSAGES"),HOP_MESSAGES=Object.create(BASE_MESSAGES);HOP_MESSAGES.JOIN_PAIRED_ROOM="joinPairedRoom",HOP_MESSAGES.PAIRED_ROOM_FULL="pairedRoomFull",HOP_MESSAGES.OTHER_DEVICE_JOINED_PAIRED_ROOM="otherJoinedPairedRoom",HOP_MESSAGES.OTHER_DEVICE_HAS_NOT_JOINED_PAIRED_ROOM="otherNOTJoinedPairedRoom",HOP_MESSAGES.PAIRED_DEVICE_DISCONNECTED="pairedDeviceDisconnected",HOP_MESSAGES.JOIN_CANVAS_ROOM="joinCanvasRoom",HOP_MESSAGES.LEAVE_CANVAS_ROOM="leaveCanvasRoom",HOP_MESSAGES.SHOOT="shoot",HOP_MESSAGES.SHOT="shot",HOP_MESSAGES.SHOT_SAVE_ERROR="shotSaveErr",HOP_MESSAGES.TUTORIAL_COMPLETED="tutorialCompleted",HOP_MESSAGES.TUTORIAL_STARTED="tutorialStarted",HOP_MESSAGES.OTHER_DEVICE_LEFT_CONTRIBUTE="otherDeviceLeftContribute",HOP_MESSAGES.OTHER_DEVICE_ENTERED_CONTRIBUTE="otherDeviceEnteredContribute",HOP_MESSAGES.GO_TO_CONTRIBUTE="goToContribute",HOP_MESSAGES.OTHER_DEVICE_SYNC_COMPLETE="otherDeviceSyncComplete",HOP_MESSAGES.SHARE="share",HOP_MESSAGES.SIGN_OUT="signOut",module.exports=HOP_MESSAGES;
},{"./BASE_MESSAGES":1}]},{},[2])
(2)
});
;