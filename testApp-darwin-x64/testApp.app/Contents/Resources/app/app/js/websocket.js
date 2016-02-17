$(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#readings');

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://127.0.0.1:1337');

    connection.onopen = function () {

    };

    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.' } ));
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        addSimpleMessage(message);
        processQuat(getSensorData(message));
    };


    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
    setInterval(function() {
        if (connection.readyState !== 1) {
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
        }
    }, 3000)


    /**
     * Add message to the chat window
     */
    function addSimpleMessage(message) {
        var sensorData = JSON.parse(cleanData(message.data));
        
        content.html('<p>Reading Data!</p>');
    }

    /**
     * Add message to the chat window
     */
    function getSensorData(message) {
        var sensorData = JSON.parse(cleanData(message.data));
        
        return [sensorData.id, sensorData.w, sensorData.x,sensorData.y,sensorData.z];
    }
    
    
    function cleanData(data){
        var cleanData = data.replace(/\\u0000/g, '');
        cleanData = cleanData.replace(/'."'/g, '\"');
        return cleanData;
    }

});
