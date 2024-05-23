function getIRIParameterValue(requestedKey){
    // substring(1) after ?  (?username)
    let pageIRI = window.location.search.substring(1);
    // separate IRI by '&'
    let pageIRIVariables = pageIRI.split('&');
    for (let i = 0; i < pageIRIVariables.length; i++) {
        let data = pageIRIVariables[i].split('=');
        let key = data[0];
        let value = data[1];
        if (key === requestedKey) {
            return value;
        }
    }
    return null;
}

let username = decodeURI(getIRIParameterValue('username'));
if ((typeof username == 'undefined') || (username === null) || (username === 'null')) {
    username = "Anonymous_"+Math.floor(Math.random()*1000);
}

let chatRoom = decodeURI(getIRIParameterValue('game_id'));
if ((typeof chatRoom == 'undefined') || (chatRoom === null) || (chatRoom === 'null')) {
    chatRoom = 'Lobby';
}

let colorList = {};

// chat button is disabled until user enters input
let messageInput = document.querySelector("#chatMessage");
let chatbt = document.querySelector("#chatButton");
function textEnable() {
    if (messageInput.value.trim() === "") {
        chatbt.disabled = true;
    } else {
        chatbt.disabled = false;
    }
}
// // chat button works even user clicks "enter"
// messageInput.addEventListener("keypress", function(e) {
//     if (e.key === "Enter") {
//         e.preventDefault();
//         chatbt.click();
//     }
// })

function pickColor(color) {
    colorList[socket.id] = color;
}

// $('#messages').prepend('<b>'+username+':</b>');

/* Set up the socket.io connection to the server */
let socket = io();
socket.on('log', function(array) {
    console.log.apply(console,array);
});

function makeInviteButton() {
    let newHTML = "<button type='button' class='btn btn-outline-primary'>Invite</button>";
    let newNode = $(newHTML);
    return newNode;
}

socket.on('join_room_response', (payload) =>{
    if(( typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not send a payload');
        return;
    }
    if(payload.result === 'fail') {
        console.log(payload.message);
        return;
    }

    /* If we are being notified our ourselves then ignore the message and return */ 
    if (payload.socket_id === socket.id) {
        return;
    }

    let domElements = $('.socket_'+payload.socket_id);
    /* If we being repeat notified then return */
    if (domElements.length !== 0) {
        return;
    }

    /*
        <div class="row align-items-center">
            <div class="col text-end">
                Don
            </div>
            <div class="col text-end">
                <button type="button" class="btn btn-primary">Invite</button>
            </div>
        </div>
    */

    let nodeA = $("<div></div>");
    nodeA.addClass("row");
    nodeA.addClass("align-items-center");
    nodeA.addClass("socket_"+payload.socket_id);
    nodeA.hide();

    let nodeB = $("<div></div>");
    nodeB.addClass("col");
    nodeB.addClass("text-end");
    nodeB.addClass("socket_"+payload.socket_id);
    nodeB.append('<h4>'+payload.username+'</h4>');

    let nodeC = $("<div></div>");
    nodeC.addClass("col");
    nodeC.addClass("text-start");
    nodeC.addClass("socket_"+payload.socket_id);
    let buttonC = makeInviteButton();
    nodeC.append(buttonC);

    nodeA.append(nodeB);
    nodeA.append(nodeC);

    $("#players").append(nodeA);
    nodeA.show("fade", 1000);


    /* Announcing in the chat that someone has arrived */
    let newHTML = '<p class=\'join_room_response\'>'+payload.username+' joined the '+payload.room+'. (There are '+payload.count+' users in this room)</p>';
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade", 500);
})

socket.on('player_disconnected', (payload) =>{
    if(( typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not send a payload');
        return;
    }

    if(payload.socket_id === socket.id) {
        return;
    }

    let domElements = $('.socket_'+payload.socket_id);
    if(domElements.length !== 0) {
        domElements.hide("fade", 500);
    }

    let newHTML = '<p class=\'left_room_response\'>'+payload.username+' left the '+payload.room+'. (There are '+payload.count+' users in this room)</p>';
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade", 500);
})

function sendChatMessage() {
    let request = {};
    // send chat to lobby
    request.room = chatRoom;
    request.username = username;
    // input
    request.message = $('#chatMessage').val();

    request.color = colorList[socket.id]; //
    console.log('**** Client log message, sending \'send_chat_message\' command: '+JSON.stringify(request));
    socket.emit('send_chat_message',request);
    // clear input and disable button 
    // document.getElementById("chatMessage").value = "";
    $('#chatMessage').val("");
    chatbt.disabled = true;
}

socket.on('send_chat_message_response', (payload) =>{
    if(( typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not send a payload');
        return;
    }
    if(payload.result === 'fail') {
        console.log(payload.message);
        return;
    }
    if (!payload.color) {
        payload.color = 'black';
    }
    let newHTML = '<p class=\'\'><img class=\'img-fluid profile flex-shrink-0\'src=\'assets/images/'+payload.color+'-icon.png\'/><span class=\'d-inline-block message_group\'><b class=\'chat_message\'>'+payload.username+'</b>:<br><span class=\'chat_m p-1\'>'+payload.message+'</span></span></p>';
    // let newHTML = '<p class=\'test row\'><span class=\'d-inline-block message_group\'><b class=\'chat_message\'>'+payload.username+'</b>:<br>'+payload.message+'</span><img class=\'img-fluid profile flex-shrink-0\'src=\'assets/images/'+payload.color+'-icon.png\'/></p>';
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    // animation test
    newNode.show("fade", 500);
})

/* Request to join the chat room */
$( () => {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log('**** Client log message, sending \'join_room\' command: '+JSON.stringify(request));
    socket.emit('join_room', request);

    $('#lobbyTitle').html(username+"'s Lobby");

    $('#chatMessage').keypress(function(e) {
        if ($('#chatMessage').val().trim() != "") {
            let key = e.which;
            if (key == 13) { //the enter key
            $('button[id = chatButton]').click();
            return false;
            }
        }
    });
});

