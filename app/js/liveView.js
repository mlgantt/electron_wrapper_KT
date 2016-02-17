/// <reference path="../../typings/threejs/three.d.ts" />

/////////////////////////////////////////////////////
// User Interface for Kinetic Telemetry
// Written by Miles Gantt and Kyle Carnahan
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
// *Add mailer to proper part of code. Adjust username and password as inputs
// var mailer = require('nodemailer');
// var player = require('play-audio');
// mailer.SMTP = {
//     host: 'host.com',
//     port: 587,
//     use_authentication: true,
//     user: 'carnahan.kyle@gmail.com',
//     pass: 'xxxxxx'
// };

// fs.readFile("./attachment.txt", function (err, data) {

//     mailer.send_mail({       
//         sender: 'sender@sender.com',
//         to: 'dest@dest.com',
//         subject: 'Attachment!',
//         body: 'mail content...',
//         attachments: [{'filename': 'attachment.txt', 'contents': data}]
//     }), function(err, success) {
//         if (err) {
//             // Handle error
//         }

//     }
// });
//////////////////////////////////////////////////////

// Change the ID to match you sensors
// var sensorIDs = ['da3d30d8cafd4dbab2e5c8a34a650119', 'c6f34d2f1e964704aa58166c6e9b1b83', '883dbef5f8f54c32b880e6bd78d5deed']
var sensorIDs = ['d0095ac349cc4100903640228d1b0f78', '4ddb2c0584ee468886d641407e3190ae', 'e2ab075e09cf401d8f0c54829df239bb']

var liveView = {
    DOM       : "containerLive",
    width     : window.innerWidth/2,
    container : null,
    camera    : null,
    controls  : null,
    scene     : null,
    renderer  : null,
    model     : null
}

var playbackView = {
    DOM       : "containerPlay",
    width     : window.innerWidth/2,
    container : null,
    camera    : null,
    controls  : null,
    scene     : null,
    renderer  : null,
    model     : null
}

var loadedFile = [];
var recordedFile = [];

var playing = false;
var recording = false;
var playCount = 0;

var quat1 = [0,0,0,0];
var quat2 = [0,0,0,0];
var quat3 = [0,0,0,0];
var ghost_quat1 = [0,0,0,0];
var ghost_quat2 = [0,0,0,0];
var ghost_quat3 = [0,0,0,0];

// Used to keep track centroid for scoring algorithm
var ArmPos = [0,0,0];
var GhostArmPos = [0,0,0];
var ForearmPos = [0,0,0];
var GhostForearmPos = [0,0,0];

init(liveView);
init(playbackView);
initGUI();

function init(viewObj) {

    viewObj.container = document.getElementById( viewObj.DOM );
    
    viewObj.scene = new THREE.Scene();
   
    viewObj.renderer = new THREE.WebGLRenderer( { antialias: true } );
    viewObj.renderer.setPixelRatio( window.devicePixelRatio );
    viewObj.renderer.setSize( viewObj.width, window.innerHeight-200 );
    viewObj.renderer.gammaInput = true;
    viewObj.renderer.gammaOutput = true;

    viewObj.camera = new THREE.PerspectiveCamera( 60, viewObj.width / (window.innerHeight-200), 1, 20000 );
    viewObj.camera.position.x = 0; viewObj.camera.position.y = 0; viewObj.camera.position.z = 150;

    viewObj.controls = new THREE.OrbitControls( viewObj.camera, viewObj.container );
    viewObj.controls.minDistance = 50;
    viewObj.controls.maxDistance = 500;
    viewObj.controls.maxPolarAngle = Math.PI / 2;

    // LIGHTS
    var light = new THREE.DirectionalLight( 0xaabbff, 0.6 );
    light.position.x = 300;
    light.position.y = 250;
    light.position.z = -500;
    viewObj.scene.add( light );
    
    hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 500, 0 );
    viewObj.scene.add( hemiLight );
    dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 50 );
    viewObj.scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadowMapWidth = 2048;
    dirLight.shadowMapHeight = 2048;

    var d = 50;
    dirLight.shadowCameraLeft = -d;
    dirLight.shadowCameraRight = d;
    dirLight.shadowCameraTop = d;
    dirLight.shadowCameraBottom = -d;
    dirLight.shadowCameraFar = 3500;
    dirLight.shadowBias = -0.0001;
    //dirLight.shadowCameraVisible = true;

    // SKYDOME
    var vertexShader = document.getElementById( 'vertexShader' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
    var uniforms = {
        topColor:    { type: "c", value: new THREE.Color( 0x0077ff ) },
        bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
        offset:      { type: "f", value: 400 },
        exponent:    { type: "f", value: 0.6 }
    };
    uniforms.topColor.value.copy( light.color );

    var skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
    var skyMat = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    } );

    var sky = new THREE.Mesh( skyGeo, skyMat );
    viewObj.scene.add( sky );

    // GROUND
    var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
    var groundMat = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x050505 } );
    groundMat.color.setHSL( 0.095, 1, 0.75 );

    var ground = new THREE.Mesh( groundGeo, groundMat );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = -100;
    viewObj.scene.add( ground );

    ground.receiveShadow = true;

    viewObj.container.appendChild( viewObj.renderer.domElement );


    createModel(viewObj);
    createBody(viewObj);

    animate();

    window.addEventListener( 'resize', onWindowResize, false );
}



    function onWindowResize() {

        liveView.camera.aspect = (window.innerWidth/2) / window.innerHeight-200;
        playbackView.camera.aspect = (window.innerWidth/2) / window.innerHeight-200;

        // liveView.camera.updateProjectionMatrix();
        // playbackView.camera.updateProjectionMatrix();

        liveView.renderer.setSize(  window.innerWidth/2, window.innerHeight-200);
        playbackView.renderer.setSize(  window.innerWidth/2, window.innerHeight-200);

    }


function createModel(viewObj) {

    var scene = viewObj.scene;

    ///////// INITIAL SETUP CODE ///////////
    var geo = new THREE.BoxGeometry(4,4,22);
    var geoFA = new THREE.BoxGeometry(3,3,20);
    geo.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI/2 ) );
    geo.applyMatrix( new THREE.Matrix4().makeTranslation(-12,0,0) );
    geoFA.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI/2 ) );
    geoFA.applyMatrix( new THREE.Matrix4().makeTranslation(-12,0,0) );
    var hand = new THREE.BoxGeometry(2,5,8);
    hand.applyMatrix(new THREE.Matrix4().makeRotationX( Math.PI));
    hand.applyMatrix(new THREE.Matrix4().makeRotationZ( 0 ));
    hand.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI/2) );
    hand.applyMatrix( new THREE.Matrix4().makeTranslation(-5,0,0) );

    var _mesh1 = new THREE.Mesh(geo, new THREE.MeshNormalMaterial());
    _mesh1.position.set(-11.5,17.5,0);
    scene.add(_mesh1);

    var _mesh2 = new THREE.Mesh(geoFA, new THREE.MeshNormalMaterial());
    _mesh2.position.set(-25,0,0);

    var _mesh3 = new THREE.Mesh(hand, new THREE.MeshNormalMaterial());
    _mesh3.position.set(-24,0,0);

    _mesh1.add(_mesh2);
    _mesh2.add(_mesh3);

    // put sphere at mesh origin
    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.5,20,20),
        new THREE.MeshNormalMaterial()
    );
    var sphere2 = new THREE.Mesh(
        new THREE.SphereGeometry(2.25,20,20),
        new THREE.MeshNormalMaterial()
    );
    var sphere3 = new THREE.Mesh(
        new THREE.SphereGeometry(2,20,20),
        new THREE.MeshNormalMaterial()
    );
    //sphere.position.set(_mesh1.position.x,_mesh1.position.y,_mesh1.position.z);
    _mesh1.add(sphere);
    _mesh2.add(sphere2);
    _mesh3.add(sphere3);


    var model = {
        shoulder :_mesh1,
        forearm  :_mesh2,
        hand     :_mesh3
    }
    viewObj.model = model;
}

function createBody(viewObj) {
    // texture
    var manager = new THREE.LoadingManager();
    manager.onProgress = function ( item, loaded, total ) {
        console.log( item, loaded, total );
    };

    var texture = new THREE.Texture();

    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) {
    };

    var loader = new THREE.ImageLoader( manager );
    loader.load( 'js/model/red.png', function ( image ) {

        texture.image = image;
        texture.needsUpdate = true;

    } );

    // model
    var loader = new THREE.OBJLoader( manager );
    loader.load( 'js/model/wooden_body.obj', function ( object ) {

        object.traverse( function ( child ) {

            if ( child instanceof THREE.Mesh ) {
                child.material.map = texture;
            }

        } );

        object.position.y = -50;
        object.scale.set(10,10,10);
        viewObj.scene.add( object );

    }, onProgress, onError );

    //

}

function animate() {
    requestAnimationFrame( animate );

    if(liveView.renderer){
        render(true,liveView);
    }
    if(playbackView.renderer){
       render(true,playbackView);

    }
}


function processQuat(rot) {
    var x, y, z, w;
    var id = rot[0];
    w = parseFloat(rot[1]);
    x = parseFloat(rot[2]);
    y = parseFloat(rot[3]);
    z = parseFloat(rot[4]);

    if(id == sensorIDs[0]) {
        quat1 = [w,x,y,z];
    }

    if(id == sensorIDs[1]) {
        quat2 = [w,x,y,z];
    }

    if(id == sensorIDs[2]) {
        quat3 = [w,x,y,z];
    }

    if(recording){
        var newString = rot[0]+ ' : '+rot[1]+'|'+rot[2]+'|'+rot[3]+'|'+rot[4]+'\n';
        recordedFile.push(newString);
    };
}

function processPlay(rot) {

    var x, y, z, w;
    var id = rot.split(' : ')[0].toString();
    var vals = rot.split(' : ')[1];
    var val = vals.split('|');
    w = parseFloat(val[0]);
    x = parseFloat(val[1]);
    y = parseFloat(val[2]);
    z = parseFloat(val[3]);


    if(id == sensorIDs[0]) {
        ghost_quat1 = [w,x,y,z];
    }

    if(id == sensorIDs[1]) {
        ghost_quat2 = [w,x,y,z];
    }

    if(id == sensorIDs[2]) {
        ghost_quat3 = [w,x,y,z];
    }

}


var _tick = 0;
function render(rotateBool, viewObj) {

    viewObj.controls.update();
    viewObj.renderer.render( viewObj.scene, viewObj.camera );

    if (rotateBool) {
        var quaternion1 = new THREE.Quaternion();
        var quaternion2 = new THREE.Quaternion();
        var quaternion3 = new THREE.Quaternion();

        quaternion1.set(quat1[2],quat1[3],quat1[1],quat1[0])
        quaternion2.set(quat2[2],quat2[3],quat2[1],quat2[0])
        quaternion3.set(quat3[2],quat3[3],quat3[1],quat3[0])

        ///////// RENDER CODE ///////////
        liveView.model.shoulder.setRotationFromQuaternion(quaternion1);
        liveView.model.forearm.setRotationFromQuaternion(quaternion2);
        liveView.model.hand.setRotationFromQuaternion(quaternion3);
        ///////// END OF RENDER CODE ///////////
        
        ///////// SCORING CORE //////////
        ArmPos = [liveView.model.shoulder.position.x, liveView.model.shoulder.position.y, liveView.model.shoulder.position.z];
        ForearmPos = [liveView.model.forearm.position.x, liveView.model.forearm.position.y, liveView.model.forearm.position.z];
        ///////// END OF SCORING CORE /////////
    }

    if(loadedFile.length){

      processPlay(loadedFile[playCount]);
      // To sleep
        // setTimeout(function(){
        //     processPlay(loadedFile[playCount]);
        // }, 1);
      //
      
        var ghost_quaternion1 = new THREE.Quaternion();
        var ghost_quaternion2 = new THREE.Quaternion();
        var ghost_quaternion3 = new THREE.Quaternion();

        ghost_quaternion1.set(ghost_quat1[2],ghost_quat1[3],ghost_quat1[1],ghost_quat1[0]);
        ghost_quaternion2.set(ghost_quat2[2],ghost_quat2[3],ghost_quat2[1],ghost_quat2[0]);
        ghost_quaternion3.set(ghost_quat3[2],ghost_quat3[3],ghost_quat3[1],ghost_quat3[0]);
        
        // PLAYBACK RENDER CORE
        playbackView.model.shoulder.setRotationFromQuaternion(ghost_quaternion1);
        playbackView.model.forearm.setRotationFromQuaternion(ghost_quaternion2);
        playbackView.model.hand.setRotationFromQuaternion(ghost_quaternion3);
        // END PLAYBACK RENDER CORE
      
        GhostArmPos = [playbackView.model.shoulder.position.x, playbackView.model.shoulder.position.y, playbackView.model.shoulder.position.z];
        GhostForearmPos = [playbackView.model.forearm.position.x, playbackView.model.shoulder.position.y, playbackView.model.forearm.position.z];
       
       // //somewhat of a scoring?
       //  var ArmDif = [GhostArmPos[0]-ArmPos[0], GhostArmPos[1]-ArmPos[1], GhostArmPos[2]-ArmPos[2]];
       //  var ForearmDif = [GhostForearmPos[0]-ForearmPos[0], GhostForearmPos[1]-ForearmPos[1], GhostForearmPos[2]-ForearmPos[2]];
       //  var corrDistArm = Math.sqrt(ArmDif[0]*ArmDif[0]+ArmDif[1]*ArmDif[1]+ArmDif[2]*ArmDif[2]);
       //  var corrDistFA = Math.sqrt(ForearmDif[0]*ForearmDif[0]+ForearmDif[1]*ForearmDif[1]+ForearmDif[2]*ForearmDif[2]);
   
       //  if (corrDistArm>5){
       //    console.log("Arm is too far off center");
       //    // player('armErr.mp3').autoplay(); //CURRENTLY CAUGHT IN FEEDBACK LOOP WITH AUDIO
       //    // DO SOMETHING
       //  }
       //  else if (corrDistFA>5) {
       //    console.log("Forearm is too far off center");
       //    playbackView.model.forearm.material.visible = false;
       //    // player('armErr.mp3').autoplay(); //CURRENTLY CAUGHT IN FEEDBACK LOOP WITH AUDIO
       //    // DO SOMETHING TO CHANGE ARM COLOR
       //  }

        if(playing){
            if(playCount < loadedFile.length-2){
                playCount++;
                $( "#slider-range-min" ).slider({value: playCount});
            } else {
                playCount = 0;
                playing = false;
                ghost_quat1 = [0,0,0,0];
                ghost_quat2 = [0,0,0,0];
                ghost_quat3 = [0,0,0,0];
            }
        }
    }
    _tick++;
}

function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];

    if (f) {
        var r = new FileReader();
        r.onload = function (e) {
            var contents = e.target.result;
            loadedFile = contents.split('\n');
            playbackMode();
        }
        r.readAsText(f);
    } else {
        alert("Failed to load file");
    }
    $('#modal').dialog( "close" );

}

function playbackMode (){
    $( "#slider-range-min" ).slider({
      range: "min",
      value: 0,
      min: 1,
      max: loadedFile.length - 1,
      slide: function( event, ui ) {
          playing = false;
          playCount = ui.value;
      }
    });
    $('.play_controls').show();
}

function initGUI() {
    document.getElementById('fileinput').addEventListener('change', readSingleFile, false);

    $( "#modal" ).dialog({
      autoOpen: false,
      modal: true,
      show: {
        effect: "fade",
        duration: 300
      },
      hide: {
        effect: "fade",
        duration: 300
      }
    });


    $('#loadBtn').button({
      icons: {
        primary: "ui-icon-folder-open"
      }
    }).click(function(event) {
        event.preventDefault();
        $('#modal').dialog( "open" );
    });


    $('#playBtn').button({
      icons: {
        primary: "ui-icon-play"
      },
      text: false
    }).click(function(event) {
        event.preventDefault();

        if(playing){
            playing = false;
            $("#playBtn .ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");
        } else {
            playing = true;
            $("#playBtn .ui-icon").removeClass("ui-icon-play").addClass("ui-icon-pause");
        }
    });


    $('#resetBtn').button({
      icons: {
        primary: "ui-icon-seek-prev"
      },
      text: false
    }).click(function(event) {
        event.preventDefault();
        playing = false;
        playCount = 0;
        ghost_quat1 = [0,0,0,0];
        ghost_quat2 = [0,0,0,0];
        ghost_quat3 = [0,0,0,0];
        $( "#slider-range-min" ).slider({value: playCount});
        $("#playBtn .ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");

    });

    $('#recordBtn').button({
      icons: {
        primary: "ui-icon-video"
      }
    }).click(function(event) {
        event.preventDefault();

        if(recording){
            recording = false;
            $("#recordBtn .ui-button-text").text('Record');
            $("#recordBtn .ui-icon").removeClass("ui-icon-stop").addClass("ui-icon-video");
            $("#save-confirm").dialog("open");
            clearTimeout(t);
            $('.recordTime').text("00:00:00");
            seconds = 0; minutes = 0; hours = 0;
        } else {
            recording = true;
            $("#recordBtn .ui-button-text").text('Stop');
            $("#recordBtn .ui-icon").removeClass("ui-icon-video").addClass("ui-icon-stop");
            timer();
        }

    });


    var seconds = 0, minutes = 0, hours = 0, t;
    function timer() {
        t = setTimeout(function(){
            seconds++;
            if (seconds >= 60) {
                seconds = 0;
                minutes++;
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                }
            }

            $('.recordTime').text((hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds));

            timer();
        }, 1000);
    }

    $("#save-confirm").dialog({
      resizable: false,
      autoOpen: false,
      dialogClass: "no-close",
      modal: true,
      buttons: {
        "Save": function() {
            $( this ).dialog( "close" );
            var blob = new Blob(recordedFile, {type: "text/plain;charset=utf-8"});

            var now = new Date().toJSON().slice(0,19);
            saveAs(blob, "KT_"+now+".txt");
            recordedFile = [];
        },
        Cancel: function() {
          $( this ).dialog( "close" );
          recordedFile = [];
        }
      }
    });

    $(window).keypress(function (e) {
      if (e.keyCode === 0 || e.keyCode === 32) {
        e.preventDefault()
        ZeroSensors();
      }
    })
}
